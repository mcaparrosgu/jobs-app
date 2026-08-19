---
name: diseno-cv-pdf
description: Reglas de diseño del PDF de Jobs App (CV + carta de presentación) — tipografía, colores, espaciado y las restricciones para que un lector automático de currículums (ATS) lo procese bien. Usar antes de tocar lib/pdf.tsx, antes de rediseñar el PDF, o antes de crear cualquier documento nuevo de CV/carta para este proyecto.
---

# Diseño del PDF de Jobs App

Reglas fijadas tras la revisión de Mar en el Hito 7 (T58-T62, T82-T83):
la primera versión del PDF era "sobria" pero pobre (Helvetica a palo
seco). El encargo fue "bonito, elegante, sofisticado y creativo, a
prueba de ATS" — dos objetivos que parecen tirar en direcciones
opuestas pero no lo son, si se separa bien qué es estética y qué es
estructura de lectura. El porqué completo, con la tabla de qué se
copió de la plantilla de referencia y qué no, vive en
`knowledge/decision-diseno-pdf.md`. Esta skill es la versión operativa:
qué hacer, no por qué.

## Los no-negociables ATS

Un ATS lee el PDF de arriba abajo siguiendo el **texto real** que
contiene el archivo, en el orden en que ese texto aparece. Todo lo que
rompe ese orden, rompe el ATS — no importa lo elegante que se vea.

1. **Una sola columna de lectura.** Nada de contenido en columnas
   paralelas que se lean en dos flujos a la vez (una franja lateral de
   contacto entera es el ejemplo típico — se descartó por esto, ver
   `knowledge/decision-diseno-pdf.md`).
2. **Nunca texto girado.** Si hace falta un elemento vertical, que sea
   decorativo (una raya, un color de fondo) — jamás con texto dentro.
3. **El nombre real de la candidata en la primera línea de texto del
   CV**, en texto real, no en una imagen ni en un logo.
4. **Texto siempre seleccionable.** Nunca convertir texto a curvas/paths
   ni meterlo dentro de una imagen rasterizada.
5. **Sin iconos-imagen como viñetas o adornos.** Si hace falta un
   marcador visual, que sea un carácter de texto real (ver más abajo
   por qué hay que comprobar que la fuente lo tiene).
6. **Sin tablas.** El motor de layout de `@react-pdf/renderer` no las
   necesita para nada de esto; las tablas son la otra causa clásica de
   que un ATS lea las celdas en un orden que no tiene sentido.
7. **Sin foto.** Descartada de entrada en este proyecto (Mar, T58): no
   aporta a un CV pensado para trabajo remoto y evita cualquier sesgo
   en la criba automática.

## El lenguaje visual

Paleta — solo blanco, negro y grises, sin color de acento:

| Token | Hex | Uso |
| :-- | :-- | :-- |
| Tinta | `#1e1e1c` | Nombre, títulos de sección |
| Gris texto | `#33322f` | Cuerpo de los párrafos |
| Gris muted | `#736f66` | Puesto, email, etiquetas secundarias |
| Gris raya | `#dcd8d0` | Líneas finas, separadores, raya vertical |

Tipografía — dos familias, incrustadas desde `public/fonts/` (nunca
desde `node_modules/`, ver más abajo):

| Fuente | Peso | Uso |
| :-- | :-- | :-- |
| Playfair Display | 700 | Solo el nombre, ~25pt. Serif con carácter — es la única nota "editorial" fuerte del documento |
| Jost | 600, letterSpacing ~2-2.2 | Títulos de sección y etiquetas, siempre en MAYÚSCULAS |
| Jost | 400 | Cuerpo de texto, ~10pt, lineHeight ~1.6 |

Estructura repetible:

- Masthead (solo en la primera página del CV): nombre → puesto +
  email en una línea (separados por `·`) → raya horizontal fina.
- Cada sección: título en mayúsculas espaciadas + raya fina debajo.
- Viñetas: un carácter de texto real como marca (actualmente `›`),
  nunca un icono-imagen.
- Una raya vertical decorativa fina en el margen izquierdo, `fixed`
  (se repite en todas las páginas), sin texto dentro — es el guiño
  "editorial" que sustituye a la franja de contacto girada que sí
  tenía la plantilla de referencia.
- La carta de presentación va siempre en su propia `<Page>` (nunca en
  el mismo flujo que el CV), para que empiece en página nueva pase lo
  que pase con la longitud del CV — ver `bloqueTexto`/`DocumentoGeneracion`
  en `lib/pdf.tsx`.

## El contenido importa tanto como el diseño

Un diseño elegante no arregla un texto mal formado. Si el CV descargado
"no respira" o se ve caótico, **antes de tocar `lib/pdf.tsx` comprobar el
`cv_texto`/`carta_texto` reales** en la tabla `generaciones` (Supabase):
puede que la IA haya dejado de poner saltos de línea entre secciones y
puntos, o esté repitiendo el nombre/contacto que ya muestra la cabecera.
Eso se corrige en `lib/ia.ts` (prompt + `validarGeneracion()`), no en la
plantilla del PDF. Ver `knowledge/decision-diseno-pdf.md`, sección
"Segunda vuelta", para el caso real que lo confirmó.

## Reglas prácticas al tocar `lib/pdf.tsx`

- **Comprobar cada carácter decorativo nuevo con `fontkit` antes de
  fijarlo.** No todas las fuentes tienen todos los glifos — la
  primera versión usaba `→` y Jost no lo tiene; el PDF lo sustituía en
  silencio por un apóstrofe suelto. Ejemplo de comprobación:
  ```js
  const fontkit = require('fontkit');
  const font = fontkit.openSync('public/fonts/jost-400.woff');
  font.hasGlyphForCodePoint('›'.codePointAt(0)); // true/false
  ```
- **Las fuentes se incrustan desde `public/fonts/`, nunca con una ruta
  a `node_modules/`.** `public/` siempre viaja completo al desplegar
  en Vercel; una ruta a `node_modules` compuesta en tiempo de
  ejecución puede quedarse fuera del "file tracing" de Next.js y
  romper la descarga solo en producción. Si hace falta un peso o
  familia nueva: instalar el paquete `@fontsource/...` correspondiente
  como **devDependency** (solo se usa como fuente de los archivos, no
  se importa en tiempo de ejecución), copiar el `.woff` que haga falta
  a `public/fonts/`, y anotarlo en `public/fonts/LICENCIA.txt`.
- **Nunca inventar datos que no existan.** Si hace falta un campo
  nuevo para el documento (como pasó con el nombre, T82), añadirlo como
  campo explícito del perfil — nunca adivinarlo con una heurística
  sobre el CV pegado. Encaja con la misma norma que ya sigue
  `lib/verificarCv.ts` para el contenido generado por IA.
- **Probar con un caso largo, no solo el caso feliz.** Antes de dar
  por bueno un cambio de layout, renderizar un CV que fuerce el
  desbordamiento a 3-4 páginas y confirmar que la carta sigue
  empezando en página propia y que ningún elemento `fixed` (como la
  raya vertical) se rompe entre páginas.
- **Los saltos de línea en blanco separan párrafos de verdad.**
  `agruparLineas()` en `lib/pdf.tsx` ya lo maneja — si se reescribe esa
  función, no perder esa regla (fue un bug real: dos párrafos
  separados a propósito se fundían en uno).

## Dónde está todo

- `lib/pdf.tsx` — la implementación (estilos, parser de texto plano,
  `DocumentoGeneracion`).
- `public/fonts/` — los `.woff` incrustados y su licencia (SIL OFL,
  libre, gratis).
- `app/api/descargar/[id]/route.ts` — quién le pasa los datos
  (nombre, puesto, email, cv_texto, carta_texto) al render.
- `knowledge/decision-diseno-pdf.md` — el porqué completo de cada
  decisión de esta skill, con la tabla de qué se adoptó de la
  plantilla de referencia y qué no.
