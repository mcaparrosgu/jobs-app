---
type: Prueba
title: Prueba E2E en producción (01/09/2026) — el recorrido funciona, el PDF no es presentable
description: Primera prueba de extremo a extremo en producción tras publicar el MVP el 31/08. Login por enlace mágico, ofertas, "me interesa", generación y descarga funcionan; la generación sale limpia (sin avisos). Dos hallazgos: un 503 transitorio en la primera descarga (se recupera al reintentar) y un PDF con defectos de presentación, tres de ellos bugs de código en lib/pdf.tsx que se arreglan aquí.
tags: [jobs-app, okf, e2e, produccion, pdf, T83, prueba]
timestamp: 2026-09-01T00:00:00Z
---

# Qué se probó

Con el MVP ya publicado a producción (`a3845e5`, ver `log.md` 31/08), quedaba
pendiente una prueba real de generación de CV de extremo a extremo antes de
avisar a la clase. Se hizo el 01/09/2026 con navegador automatizado, con Mar
supervisando y aportando el enlace mágico de su Gmail. Cuota de Cloudflare
fresca (nada gastado ese día).

El perfil de Mar ya estaba guardado en producción, así que no hizo falta pegar
CV: se entró por el enlace, se fue a `/ofertas` y se marcó "Me interesa" en una
oferta todavía sin generar (**"Especialista en Operaciones de HubSpot y CRM"**).

# Qué funciona

| Paso | Resultado |
| :-- | :-- |
| Login por enlace mágico | Entra y autentica |
| `/ofertas` | Carga con las 2 ofertas reales del 28/08 |
| "Me interesa" | Marca "Te interesa ✓" y muestra "Preparando tu CV y tu carta…" al instante |
| Generación | Termina en **~45 s** → "CV y carta preparados ✓", estado `listo`, **`avisos: []`** |
| Descarga | PDF válido (`%PDF-1.3`, ~20 KB), cabeceras correctas |

La generación salió **limpia**: `avisos: []`, ningún aviso de fidelidad de
`verificarCv`. Coherente con la puerta VERDE del 31/08.

# Hallazgo 1 — 503 transitorio en la primera descarga

La **primera** pulsación de "Descargar" devolvió `HTTP 503` en
`GET /api/descargar/<id>`. Reintentos inmediatos (segundo clic, y tres `fetch`
seguidos): **200** las tres veces, PDF idéntico de 20.424 bytes. La UI no
muestra ningún error cuando pasa — la descarga simplemente no ocurre y hay que
volver a pulsar.

Apunta a un **cold start** de la función de Vercel (`@react-pdf/renderer` +
fuentes incrustadas es un arranque pesado), no a un fallo de datos ni de
código. No bloquea: se recupera solo al reintentar. Queda anotado por si
reaparece con más frecuencia; entonces habría que mirar los logs de Vercel
(`get_deployment_build_logs` / runtime) y, si es el arranque, plantear
`maxDuration` mayor o mantener la función caliente.

# Hallazgo 2 — el PDF no es presentable

Mar, sobre el PDF descargado: *"la estructura y la información no están mal
pero no son presentables"*. Revisado el PDF del 28/08 (mismo template
`lib/pdf.tsx`, rediseño de T83), los defectos son:

**Tres bugs de código — arreglados el 01/09 en `lib/pdf.tsx`** (no dispara
evals; `pdf.tsx` no está en el conjunto que los activa):

1. **Una viñeta en mayúsculas se renderizaba como cabecera de sección.**
   `agruparLineas` comprobaba `esTitulo` antes que `esPunto`, y `esTitulo`
   solo miraba "línea entera en mayúsculas". Una viñeta como `- NEOLAND`
   (nombre de la escuela) cumplía eso y salía con el mismo tamaño y línea
   fina que EXPERIENCE / EDUCATION. Arreglo: `esPunto` se comprueba primero
   y `esTitulo` excluye explícitamente el prefijo `- `.

2. **El puesto salía dos veces.** El masthead lo pinta bajo el nombre, y la
   IA abre el `cv_texto` con el puesto en mayúsculas, que `agruparLineas`
   tomaba como primer título de sección. Arreglo: `bloqueTexto(cvTexto, {
   omitirTituloInicial: puesto })` descarta el primer grupo **solo si** es un
   título y coincide exactamente con el puesto; las secciones legítimas
   ("PERFIL", "EXPERIENCIA"…) no se tocan.

3. **La carta terminaba en la despedida sin el nombre debajo** ("Sincerely" y
   nada más), y quedaba como cortada. Arreglo: `cartaConFirma(cartaTexto,
   nombre)` añade el nombre en su propia línea si el tramo final de la carta
   no lo menciona ya.

`tests/lib/pdf.test.ts`: 8 pruebas nuevas, vistas fallar sin el arreglo
(6/8 rojas). Suite completa 324 en verde, `tsc` y `lint` limpios,
`comprobar:esquema` 0 desajustes.

# Segunda pasada — el rediseño de maquetación (01/09, misma sesión)

Mar, tras ver los 3 bugs arreglados en la vista previa: *"faltan negritas,
falta información en educación, sigue sin ser presentable"*. Decidido con ella:
**reutilizar la referencia de T83** ("Minimal Resume Layout") y aplicarla
mejor, **con fechas** aunque eso obligue a relanzar los evals.

**`lib/pdf.tsx` — `interpretarCv()`**: dentro de las secciones de experiencia,
formación y proyectos, un grupo de párrafo deja de ser prosa y pasa a ser la
**cabecera de una entrada** — empresa o centro en **negrita** (`entradaPrincipal`),
y debajo el cargo/titulación y el periodo en gris pequeño (`entradaMeta`).
Fuera de esas secciones (PERFIL, un resumen en prosa) el párrafo sigue siendo
texto corrido. Un nombre en mayúsculas que no está en el vocabulario
`SECCION_CONOCIDA` (p. ej. `NEOLAND`, `IBM`) se reconoce como cabecera de
entrada en vez de como título de sección. `letterSpacing` de los títulos
2.2 → 1.5 y del puesto 2 → 1.4: con el tracking alto las palabras se fundían.

Render local verificado con el CV real del 28/08 y una versión con fechas:
empresas y centros en negrita, jerarquía visible, el puesto una sola vez, la
carta cerrada con el nombre. 329 pruebas en verde (13 en `pdf.test.ts`),
`tsc`/`lint` limpios, `comprobar:esquema` sin desajustes.

## Las fechas en el prompt: probadas y REVERTIDAS (01/09)

Se probó añadir a `prompts/system.md` §4 y a `mensajesDeGeneracion` una regla
para que la generación incluyera el periodo en años de cada experiencia y
formación, con un "si el CV no da el año, no lo inventes". `npm run evals`
completo con esa regla → **puerta ROJO**:

| Métrica | 31/08 (verde) | Con la regla de fechas | Umbral |
| :-- | :-- | :-- | :-- |
| formato | 100 % | **75 %** | 95 % |
| fidelidad | 92 % | **80 %** | 90 % |

- **B04** (`fidelidad`): "Cifras no respaldadas: **2020**" — con un CV corto y
  genérico, el modelo se inventó un año. El "no lo inventes" no bastó.
- **B13** (`formato` + `fidelidad`, caso fácil): CV de 367 caracteres (< 400).
  La regla de fechas dejó la salida más corta.
- **B05**: 262 caracteres (el export de LinkedIn, que el 31/08 pasaba).

Los otros fallos (A06 "poeta", A10 dos empresas) son residuales conocidos de
`extraerPerfil`, iguales que el 31/08. **Quitando la regla de fechas, la tanda
volvería a verde.** Decisión: **revertir `lib/ia.ts` y `prompts/system.md` a
`master` byte a byte** y quedarse solo con el rediseño de `lib/pdf.tsx`, que
mejora la presentación con o sin fechas y **no dispara los evals**.
`interpretarCv` ya sabe maquetar las fechas si algún día llegan.

**Las fechas quedan como tarea aparte**: el prompt necesita una instrucción
más fina ("incluye el periodo SOLO si los años aparecen literalmente en el CV
original; nunca los estimes ni los infieras") y medirse sin gastar la misma
tanda en dos cosas. Con cuota fresca.

**Sigue pendiente, no bloquea**: la **página 2 medio vacía** cuando el CV
desborda por poco — inherente a repartir un CV en páginas fijas de A4 con
`<Page wrap>`, solo molesta justo en el límite.

# Relacionado

- [`knowledge/decision-diseno-pdf.md`](decision-diseno-pdf.md) — el rediseño
  de T83 que estos bugs afectan.
- [`docs/06-tareas.md`](../docs/06-tareas.md) — T76 (prueba en producción),
  T83 (rediseño del PDF).
- `lib/pdf.tsx`, `tests/lib/pdf.test.ts` — la implementación y sus pruebas.
