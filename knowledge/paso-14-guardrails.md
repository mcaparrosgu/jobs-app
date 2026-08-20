---
type: Tarea
title: Paso 14 — Guardrails en capas
description: Las 7 capas de guardrails del método aplicadas a los dos únicos puntos de entrada de IA de Jobs App (lib/ia.ts), con las capas de relevancia/seguridad/moderación implementadas como reglas deterministas (sin llamadas nuevas al modelo, decisión confirmada con Mar) y los dos disparadores de intervención humana adaptados a un producto sin panel de administración.
tags: [jobs-app, guardrails, ia, seguridad, paso-14, okf]
timestamp: 2026-08-20T12:00:00Z
---

# Qué se construyó

Las barreras de seguridad (guardrails) que pide el Paso 14, organizadas en
las 7 capas del método y aplicadas a los dos únicos puntos de entrada de IA
que tiene Jobs App: `extraerPerfil` y `generarCvYCarta` (`lib/ia.ts`). No
parte de cero — antes de este paso ya existían varias defensas reales
(esquemas JSON estrictos, `validarPerfil`/`validarGeneracion`,
`lib/verificarCv.ts`, defensa contra inyección en el propio prompt, idioma
decidido por código). Este paso las organiza en las 7 capas, y rellena los
huecos que la exploración reveló: la carta generada nunca se verificaba
(solo el CV), no había tope de tamaño de entrada, no había filtro de datos
de contacto, ni moderación de contenido, ni un recordatorio de revisión
incondicional antes de descargar.

# La decisión que condiciona todo el diseño

Preguntado explícitamente a Mar (regla de `CLAUDE.md`, [[feedback_ask_explicit_choice]]):
¿las capas de relevancia, seguridad y moderación se implementan con un
clasificador de IA aparte (una llamada extra al modelo antes de la
principal) o con reglas deterministas en código? Eligió **reglas
deterministas, sin ninguna llamada nueva a un modelo**.

Motivo por el que esa es también la opción recomendada: `docs/05-ia.md` ya
identifica el límite de ~6.000 tokens/minuto de Groq como el cuello de
botella real del sistema (§5) y rechaza expresamente subir de peldaño por
coste y fiabilidad (§3, "no hay ningún peldaño superior al 1"). Un
clasificador de IA aparte duplicaría o triplicaría el consumo de cuota por
cada CV o cada oferta procesados, y reintroduciría justo la complejidad que
ese documento ya rechazó por escrito. Es la misma filosofía que el propio
proyecto ya aplica en `docs/05-ia.md` §6.1, defensa 1 ("quitarle la
decisión"): si algo lo puede decidir el código con una regla simple, no
hace falta pedírselo a un modelo.

# Restricción de spec que condiciona los disparadores de intervención humana

`docs/03-spec.md` §2 es explícito: **no hay panel de administración
visible para nadie**, ni siquiera para Mar. Por tanto "intervención
humana" en Jobs App no puede significar una pantalla de gestión nueva —
solo puede significar: un log distinguible en el servidor (que Mar revisa
en Vercel) y, cuando aplica, un mensaje distinto para la usuaria.

# Las 7 capas

| # | Capa | Dispara | Qué pasa | Qué ve la usuaria | Dónde |
|---|------|---------|----------|--------------------|-------|
| 1 | Relevancia (ámbito) | CV pegado > 40.000 caracteres, o predominantemente código/marcado (≥3 patrones de `PATRONES_CODIGO`) | Se rechaza ANTES de llamar al modelo | 400 con mensaje claro | `evaluarAmbitoCv` en `lib/guardrails.ts`, comprobado en `app/api/extraer-perfil/route.ts` y de nuevo dentro de `extraerPerfil` (defensa en profundidad para cualquier otro llamador, p. ej. los evals) |
| 2 | Seguridad (inyección) | El CV o la descripción de la oferta contienen una frase de intento de manipulación conocida | NO bloquea — el prompt ya sabe tratarlo como dato (`evals/casos-dificiles.md` caso 1). Se registra por log; en la generación (no en la extracción) se añade además un aviso visible | En `extraerPerfil`: nada nuevo, la usuaria ya revisa el resultado siempre (regla de negocio 4). En `generarCvYCarta`: aviso añadido a la caja "Revisa esto antes de enviarlo" | `detectarIntentoDeInyeccion` en `lib/guardrails.ts`, usado en ambas funciones de `lib/ia.ts`; el aviso se añade en `app/api/generar/route.ts` |
| 3 | Filtro de datos personales | El CV o la carta generados mencionan una cifra, un nombre propio, un email o un teléfono que no está en el CV original ni en la oferta | Se guarda igual, con un aviso | Caja ámbar "Revisa esto antes de enviarlo" | `lib/verificarCv.ts` — ya existía para cifras/nombres del CV (T54/T55); este paso añade la carta a la comprobación y el filtro nuevo de contacto (`verificarDatosDeContacto`) |
| 4 | Moderación de contenido | El CV o la carta generados contienen un término de una lista corta y conservadora (insultos, sexual explícito, incitación a la violencia) | Se trata como fallo de generación: no se guarda, se reintenta | Mensaje de error + "Reintentar" (circuito ya existente) | `contieneContenidoInapropiado` en `lib/guardrails.ts`, usado dentro de `validarGeneracion` (`lib/ia.ts`) |
| 5 | Salvaguardas por herramienta | — | No aplica: Jobs App no tiene herramientas de IA ([[paso-11-no-aplica]]) | — | — |
| 6 | Reglas deterministas simples | Ya existían (límite diario de 5, `lib/generaciones.ts`; 8-20 palabras clave, `lib/palabras-clave.ts`; longitudes mínimas/máximas) | — | — | Este paso añade el tope de tamaño de entrada (capa 1 arriba) |
| 7 | Validación de la salida | Estructura/tipos (ya existía) + marcadores de relleno sin resolver (`[tu nombre]`, `[fecha]`), que el prompt prohibía pero no se comprobaba en código | Fallo de generación: reintento | Mensaje de error + "Reintentar" | `validarGeneracion` en `lib/ia.ts` |

# Los dos disparadores de intervención humana

- **Umbral de fallos**: tres fallos seguidos generando la misma oferta para
  la misma usuaria (`intentos_fallidos`, columna nueva en `generaciones`,
  migración `0013`) disparan un `console.error('[GUARDRAIL:fallos-repetidos] ...')`
  y cambian el mensaje que ve la usuaria a uno que sugiere que el problema
  puede ser de esa oferta en concreto, no algo pasajero — sin bloquear
  nada, sigue pudiendo reintentar. Solo cuenta fallos reales de la llamada a
  la IA (el `catch` de `app/api/generar/route.ts`), no los casos de datos
  faltantes (CV vacío, oferta borrada), que no mejoran reintentando.
- **Acción sensible o irreversible**: la única del sistema es que el
  documento generado llegue a una empresa real — `docs/05-ia.md` §6.2 ya
  prometía por escrito "la web avisa de que hay que revisar el documento
  antes de enviarlo", pero esa promesa solo se cumplía cuando
  `verificarCv` encontraba algo sospechoso. Se añadió un recordatorio fijo
  en `components/TarjetaOferta.tsx`, visible siempre que el documento está
  `listo`, no solo cuando hay avisos — cumple la promesa de forma
  incondicional, sin bloquear la descarga (la usuaria sigue decidiendo,
  coherente con `docs/03-spec.md` §1: "no decide por ella").

# Aviso de fricción para usuarias legítimas

- El tope de 40.000 caracteres es holgado frente a cualquier CV real,
  incluido uno exportado de LinkedIn con recomendaciones; no debería tocar
  a nadie del grupo de 5 personas de la prueba.
- La detección de inyección puede dar un falso positivo si alguien pega,
  dentro de su CV real, una frase que casualmente coincida con una de la
  lista (poco probable). Por diseño **nunca bloquea** por esto solo —
  registra o avisa.
- La moderación de contenido sí bloquea (se trata como fallo). La lista es
  deliberadamente corta e inequívoca para que el riesgo de rechazar un CV o
  una carta legítimos sea prácticamente nulo.

# Qué queda pendiente, fuera de este paso

- El Paso 15 (red-team, `OWASP Top 10 para LLM`) es quien de verdad pone a
  prueba estas capas contra el modelo real, más allá de las pruebas
  unitarias deterministas que ya se ejecutan aquí.

La migración `0013_generaciones_intentos_fallidos.sql` ya está aplicada en
Supabase (confirmado por Mar el 20/08/2026).

# Relacionado

- [`docs/05-ia.md`](../docs/05-ia.md) §6 — las cuatro defensas y los seis
  fallos conocidos, la base sobre la que se organiza este paso.
- [`docs/03-spec.md`](../docs/03-spec.md) §2 — la restricción de "sin panel
  de administración" que fija cómo son los disparadores de intervención
  humana.
- [[paso-11-no-aplica]] — por qué la capa 5 (herramientas) no aplica.
- [[paso-10-prompts-produccion]] — la defensa contra inyección ya escrita
  en el propio prompt, capa 4 de docs/05-ia.md §6.1, sobre la que se apoya
  la capa 2 de este paso.
- [[decision-rol-ia]] — la decisión de fondo de no subir de peldaño, la
  misma razón por la que aquí no se añaden llamadas nuevas al modelo.
- `lib/guardrails.ts` — el código nuevo de este paso: capas 1, 2 y 4.
- `lib/verificarCv.ts` — capa 3, extendida en este paso (carta + contacto).
