---
type: Decision
title: Mistral La Plateforme (de pago) entra como RESPALDO de IA, no como principal (opción C1)
description: El 02/09/2026 Mar abrió el presupuesto 0 €/mes —solo para esto— y contrató Mistral La Plateforme en pay-as-you-go con un tope de 10 €, para dejar de depender solo de Cloudflare (inestable, con tope diario y sin respaldo real — T112). El plan era Mistral de principal, pero Mistral ya no sirve por API el mistral-small-3.1 contra el que se afinó el pipeline; sus modelos actuales (mistral-small-2603, mistral-medium-2604) no pasan la puerta de evals como principales (el pequeño inventa años de experiencia; el mediano saca CVs escuetos). Decisión de Mar (opción C1): Cloudflare sigue de PRINCIPAL —su ruta y la puerta VERDE del 31/08 quedan intactas— y Mistral entra como segundo de la cascada, antes de OpenRouter, cubriendo el hueco que dejaba T112.
tags: [jobs-app, ia, mistral, decision, okf]
timestamp: 2026-09-02T10:00:00Z
---

# El problema que lo motiva

Cloudflare Workers AI fue **proveedor único** de las dos llamadas de IA desde
el 23/08/2026 (ver [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md)).
Dos cosas lo hacían mal compañero para abrir la prueba con las cinco
compañeras de clase:

1. **Inestabilidad.** Documentado en `CLAUDE.md` ("Antes de creerte una tanda"):
   la misma petición, el mismo código y el mismo modelo salieron en 12,9 s por
   la mañana y se colgaron 181 s una hora después. El bucle de relleno hasta
   agotar el techo de tokens (T117/T119) es una patología de ese endpoint
   concreto.
2. **Tope diario de cuota.** ~10.000 "neuronas" al día. El uso real de cinco
   personas cabe, pero una tanda de evals se lleva la mitad, y no hay respaldo
   gratuito viable detrás (T112: los 17 modelos `:free` de OpenRouter medidos,
   ninguno genera; 8 los bloquea su propia política de privacidad).

La decisión pendiente era T112. Mar la resolvió el 02/09/2026 abriendo el
presupuesto **solo para esto**.

# La decisión (dos etapas el mismo día)

**Etapa 1 — el contrato.** Mar contrató **Mistral La Plateforme, pay-as-you-go,
con un tope de gasto de 10 €** en la consola. Elegido explícitamente entre
cuatro opciones (Mistral de pago, Claude Haiku 4.5, Cloudflare de pago, Groq de
pago). Esto revierte para la IA la restricción "presupuesto 0 €/mes" de
`CLAUDE.md`, que el propio documento permite "salvo que Mar lo pida
expresamente" — no es una apertura general, es un proveedor de pago con tope
para las dos llamadas de IA.

**Etapa 2 — el papel (opción C1).** El plan era Mistral de principal. No salió
(ver "Por qué acabó de respaldo", más abajo): sus modelos de API actuales no
pasan la puerta de evals como principales. Mar eligió la **opción C1**:
Cloudflare sigue de **principal** —su ruta en `lib/ia.ts` y la puerta VERDE del
31/08 quedan intactas, sin re-evaluar— y **Mistral entra como segundo de la
cascada**, entre Cloudflare y OpenRouter. Solo se llama cuando Cloudflare falla,
que es exactamente el hueco que no estaba cubierto (T112: OpenRouter devuelve
429 en 0,4 s y no respalda nada).

# Por qué Mistral y no las otras

La premisa al elegir (que resultó ser falsa en parte): **es el MISMO modelo que
ya estaba en producción.** `generarCvYCarta` y `extraerPerfil` usaban
`@cf/mistralai/mistral-small-3.1-24b-instruct` servido por Cloudflare, así que
pasar a Mistral parecía cambiar *dónde* se ejecuta, no *qué* modelo responde.
Además:

- **API compatible con OpenAI** (`response_format: json_schema` estricto),
  igual que Cloudflare y OpenRouter: entra en `llamarModelo` de `lib/ia.ts`
  como un proveedor más, sin función ni esquema aparte.
- **Infra dedicada.** Sin el tope diario de neuronas y sin las rachas de
  latencia de la infra compartida (2-6 s medidos, frente a 32-41 s de Cloudflare).
- **Barato.** `mistral-small` ≈ 0,10–0,15 $/millón de tokens de entrada,
  0,30–0,60 $/salida. Con cinco personas al límite de la app (5 documentos/día),
  10 € duran del orden de un año; al ritmo de prueba, dos.
- **Datos en la UE, RGPD nativo, sin entrenar por defecto en el nivel de pago**
  (ver "Política de datos", abajo).
- Claude Haiku 4.5 era la alternativa sólida pero exigía una rama de código
  nueva (API con otra forma) y un día más de trabajo.
- Cloudflare de pago no arregla la inestabilidad de latencia, solo el tope.
- Gemini ya se descartó por calidad el 23/08 ("inventaba demasiado"). Groq se
  apartó como generador el 28/08 y su política de datos no era contractual.

Lo que la premisa no contempló: **Mistral ya no sirve por API el
`mistral-small-3.1`.** `GET /v1/models` en la cuenta de Mar solo ofrece
`mistral-small-2603` (marzo 2026, más nuevo) y `mistral-medium-2604`. Ninguno se
comporta como el 3.1 en esta tarea.

# Política de datos (verificado el 02/09/2026)

Regla de `CLAUDE.md`: comprobar la política real de cualquier proveedor nuevo
antes de mandarle un CV, no basta con que sea barato.

| Punto | Mistral, nivel de pago |
| :-- | :-- |
| **Entrenamiento** | El nivel de pago (pay-as-you-go) está **excluido del entrenamiento por defecto** (varios análisis de 2026 coinciden; el nivel gratuito "Experiment" es al revés, entrena salvo opt-out). El texto legal genérico menciona que existe un opt-out, así que la jugada segura es dejar marcado explícitamente el opt-out en Admin Console → Privacy. **Hecho por Mar el 02/09/2026** — el opt-out queda marcado además del "por defecto". |
| **Retención** | 30 días rodantes para vigilar abusos y después se borra (salvo que se active Zero Data Retention). Coincide con la regla 10 de la spec ("los datos se borran al mes"). |
| **Jurisdicción** | Datos en la UE por defecto, empresa sujeta al RGPD de forma nativa. Mejor que Cloudflare (empresa de EE. UU.) en este punto. |

Opcional, no bloqueante: activar Zero Data Retention en la cuenta elimina
incluso la ventana de 30 días.

Fuentes: política de privacidad de Mistral (`legal.mistral.ai/terms/privacy-policy`),
análisis de retención de 2026 (Meetily, Digital Applied), documentación de
structured outputs (`docs.mistral.ai/capabilities/structured_output`).

# Qué se implementó al final (`lib/ia.ts`, opción C1)

La ruta de Cloudflare **no cambia** — mismos modelos, mismos timeouts (26 s /
48 s), mismo prompt byte a byte, misma secuencia de parada. Por eso la puerta
VERDE del 31/08 sigue valiendo y no hace falta re-evaluar para publicar C1.

Añadido, todo nuevo:

- Constantes `MISTRAL_URL`, `MODELO_MISTRAL = 'mistral-small-2603'` (fijado, no
  `-latest`), `PROVEEDOR_MISTRAL` (con `extra: { temperature: 0.2 }` —la API de
  Mistral usa un valor por defecto alto que disparaba la varianza de longitud),
  `TIMEOUT_MISTRAL_MS = 10_000`, `TIMEOUTS_MISTRAL_GENERACION_MS = [8_000]`,
  `MAX_TOKENS_MISTRAL_PERFIL = 1_100`, `MAX_TOKENS_MISTRAL_GENERACION = 2_000`.
  **Sin secuencia de parada**: el bucle de relleno es cosa del endpoint de
  Cloudflare.
- En `llamarAlModelo`, un bucle de Mistral **entre** el de Cloudflare y el de
  OpenRouter. `generarCvYCarta` pasa sus propios `timeoutsMistralMs` /
  `maxTokensMistral`; `extraerPerfil` usa los de por defecto.
- Presupuesto de tiempo, como respaldo que corre después de Cloudflare, dentro
  del `maxDuration = 60` de la ruta:
  ```
  perfil:     26 (Cloudflare) + 10 (Mistral) + 12 + 12 (OpenRouter) = 60 s
  generación: 48 (Cloudflare) +  8 (Mistral) +  2 +  2 (OpenRouter) = 60 s
  ```
  En la práctica el tramo de OpenRouter es ~0,8 s, así que la cola real es
  ~37 s / ~57 s.

Verificado en vivo (02/09): con Cloudflare OK, `uso.proveedor` da "Cloudflare"
(B01, 14 s). Con `CLOUDFLARE_API_TOKEN` roto a propósito, `uso.proveedor` da
"Mistral" (`mistral-small-2603`, 4,3 s, CV de 628 car.) — el respaldo recoge el
testigo en vez de fallar.

Clave nueva: `MISTRAL_API_KEY`, puesta por Mar en los tres sitios el 02/09:
`.env.local` (local), **secreto de GitHub** (para el robot de evals) y
**variable de entorno en Vercel** (Production/Preview/Development, para
producción), igual que las de Cloudflare en T98/T99.

# Publicado (02/09/2026)

Commit `af45f3b` en `master`. Robot `publicar.yml` run **33641223572**, los
cuatro pasos en verde:

| Paso | Resultado |
| :-- | :-- |
| Decidir si hacen falta los evals | sí (el push toca `lib/ia.ts`) |
| Lint y pruebas | ✅ 329/329 |
| Puerta de calidad de la IA | ✅ **VEREDICTO: VERDE**, todas las métricas por encima de umbral (24 min) |
| Publicar en Vercel | ✅ `https://jobs-app-dun.vercel.app` sirve `af45f3b` |

Dentro de la tanda suspendieron **A06** ("Poeta" a partir de una letra de
canción) y **A10** (dos personas en un CV pegado): son los fallos residuales
ya conocidos de `extraerPerfil` (ver [[project_estado_25_08_donde_retomar]]),
no regresiones de C1 — las métricas globales los absorben sin bajar de umbral.
Coherente con que la ruta de Cloudflare no cambió ni un byte.

Comprobaciones locales antes del push: `comprobar:esquema` OK (sin migraciones
en C1), `tsc` OK, `lint` OK, 329 pruebas en verde.

# Por qué acabó de respaldo y no de principal

Con Mistral como principal se hicieron **dos tandas de evals el 02/09**, las dos
ROJO. El 31/08 con Cloudflare esos casos pasaban, así que era una regresión pura
del cambio de proveedor.

**Fallo 1 — CVs cortos / vacíos.** `mistral-small-latest` en la cuenta de Mar
tiene alias raros (`mistral-vibe-cli-fast`) y enrutaba de forma inconsistente;
además la API de Mistral usa un `temperature` por defecto alto. Fijar
`mistral-small-2603` + `temperature: 0.2` lo arregló para el pequeño. Con
`mistral-medium-2604` volvió por otro lado: CVs demasiado escuetos, y algún
caso con `cv_lineas` prácticamente vacío (B05: 0 car., B07: 98).

**Fallo 2 — "años de experiencia" inventados.** `mistral-small-2603` abre el CV
o la carta con *"profesional con más de X años de experiencia"*, con un número
que el CV **no escribe** (aunque las fechas lo respalden por aritmética). En un
caso (B06) llegó a inventar un año concreto —"(2019)"— pegado a un logro real.
Una **regla añadida al prompt** ("no afirmes X años de experiencia salvo que el
CV lo diga con esas palabras") solo lo frenó a medias con el pequeño.
`mistral-medium-2604` **sí** lo respeta (limpio en 7/7 del diagnóstico), pero
trae el fallo 1.

Resultado por métrica de la última tanda con `mistral-small-2603` de principal:
`fidelidad` 76 % (umbral 90 %), `formato` 92 % (umbral 95 %). Ningún modelo de
la API de Mistral pasa la puerta como principal sin más iteraciones de
reajuste del pipeline (umbrales de longitud, prompt), que se calibró durante
semanas contra un modelo —`mistral-small-3.1`— que Mistral ya no sirve.

**Lo que SÍ salió bien**: `extraerPerfil` con `mistral-small-2603` dio **12/12
(100 %)** en evals, mejor que el 31/08 (que arrastraba A06, A10, B07). Y la
regla del prompt y el resto del trabajo quedan como base si algún día se
retoma Mistral de principal (opción A: reajustar para `medium`; opción B:
Claude Haiku).

Ante esto, Mar eligió **C1**: Cloudflare de principal (statu quo, verde),
Mistral de respaldo. La ruta de Cloudflare queda intacta, así que la puerta del
31/08 sigue valiendo. El prompt y los tests se revirtieron a `master` byte a
byte; lo único que se conserva es el bloque de Mistral como segundo de la
cascada.

# Pendiente

Nada bloqueante. T112 queda cerrado con C1 publicado y la clave en los tres
sitios; el opt-out de entrenamiento lo marcó Mar el 02/09.

Abierto solo como mejora futura, sin prisa:

1. Retomar en algún momento la vía "Mistral de principal" si interesa
   (`mistral-medium` reajustando longitudes, o Claude Haiku 4.5) — o revisar si
   Mistral vuelve a ofrecer una versión de `small` más fiel.
2. Opcional: activar **Zero Data Retention** en la cuenta de Mistral, que
   elimina incluso la ventana de retención de 30 días.
3. Cuando la app lleve unos días de prueba con la clase, mirar en
   `console.mistral.ai` el gasto real acumulado contra el tope de 10 € (debería
   ser de céntimos: el respaldo casi no se llama).
4. Sonda pendiente de siempre: una tanda de evals con `CLOUDFLARE_API_TOKEN`
   roto a propósito, para medir la ruta de Mistral de punta a punta bajo el
   arnés (hasta ahora solo verificada con llamadas sueltas).

# Relacionado

- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md) — el
  proveedor que sigue siendo principal; Mistral entra por detrás.
- [decision-proveedor-ia-alternativas-28-08.md](decision-proveedor-ia-alternativas-28-08.md)
  — la investigación del 28/08 que ya anotó "Mistral de pago" como el upgrade
  limpio si se abría presupuesto (el matiz que faltaba: el modelo exacto ya no
  está en la API).
- [medicion-t112-respaldo-openrouter.md](medicion-t112-respaldo-openrouter.md)
  — por qué no hay respaldo gratuito viable, que es lo que forzó esta decisión.
- [paso-13-evals.md](paso-13-evals.md) — la puerta de calidad que tiene que
  volver a pasar con el proveedor nuevo.
