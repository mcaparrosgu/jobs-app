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

**Lo que queda para una pasada de rediseño aparte** (necesita una plantilla de
referencia de Mar, como en T83 — hacerlo a ciegas repite el ciclo "lamentable"
de T62):

- **Letter-spacing de los títulos**: con `letterSpacing: 2`–`2.2` y
  `.toUpperCase()`, el hueco entre palabras no se distingue del hueco entre
  letras y "MARKETING OPERATIONS MANAGER" se lee como un borrón.
- **Sin fechas** en experiencia ni formación (esto además toca
  `prompts/system.md` y el esquema de `generarCvYCarta` → **dispara los
  evals**).
- **Página 2 casi vacía** antes de la carta (paginación).
- **Separación irregular** entre entradas (empresa / rol / viñetas no forman
  un grupo visual).

# Relacionado

- [`knowledge/decision-diseno-pdf.md`](decision-diseno-pdf.md) — el rediseño
  de T83 que estos bugs afectan.
- [`docs/06-tareas.md`](../docs/06-tareas.md) — T76 (prueba en producción),
  T83 (rediseño del PDF).
- `lib/pdf.tsx`, `tests/lib/pdf.test.ts` — la implementación y sus pruebas.
