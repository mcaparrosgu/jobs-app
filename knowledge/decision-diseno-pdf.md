---
type: Decision
title: Rediseño del PDF (T58-T59) tras revisión visual — elegante y a prueba de ATS
description: Mar calificó el primer diseño del PDF de "lamentable, impresentable" al probarlo en T62. Se rediseña inspirado en una plantilla de referencia de Adobe Stock, adaptada para no arriesgar la lectura de un ATS, lo que revela que faltaba el nombre completo en el perfil (T82).
tags: [jobs-app, okf, pdf, ia, decision, T58, T59, T60, T61, T62, T82, T83]
timestamp: 2026-08-19T00:00:00Z
---

# El problema

T58-T59 (Hito 7) dejaron una plantilla de PDF "sobria" pero pobre:
Helvetica a palo seco, sin ninguna jerarquía tipográfica cuidada. Al
llegar a T62 (revisión visual con datos reales) Mar la calificó de
"lamentable, impresentable" y pidió partir de una plantilla de referencia
concreta (una landing de Adobe Stock, "Minimal Resume Layout"): nombre
grande en serif, secciones en mayúsculas espaciadas con una línea fina,
una franja de contacto muy fina a la izquierda con el teléfono/email/web
girados 90°, viñetas en forma de flecha, todo en blanco y negro con mucho
espacio en blanco.

El encargo tenía una tensión real: "bonito, elegante, sofisticado y
creativo" **y** "a prueba de ATS" (que un lector automático de currículums
lo procese bien). Un ATS lee el PDF de arriba abajo por el texto real que
contiene; lo que rompe esa lectura no es la elegancia, son las columnas
paralelas y el texto girado, porque el orden en que el lector extrae las
palabras puede acabar mezclado.

# Decisión: qué se copia de la referencia y qué no

| Elemento de la referencia | Se adopta | Por qué |
| :-- | :-- | :-- |
| Nombre grande, serif, en la cabecera | Sí | Es además lo que un ATS espera encontrar primero — no es solo estética |
| Secciones en mayúsculas, espaciadas, con línea fina debajo | Sí | Texto real, una sola columna, cero riesgo |
| Viñetas en forma de flecha | Sí (adaptado: `›` en vez de `→`, ver más abajo) | Aporta el mismo carácter editorial sin depender de un glifo que la fuente no tiene |
| Mucho blanco, paleta solo blanco/negro/gris | Sí | Sobrio, imprimible, no compite con el contenido |
| Franja de contacto girada 90° a la izquierda | **No** | Es la pieza que de verdad arriesga el orden de lectura de un ATS; además solo había un dato de contacto disponible (el email), no tres, así que una franja entera para eso era artificio sin sustancia |
| Foto de la candidata | No (Mar lo descartó desde el principio) | No aporta a un CV pensado para ATS + trabajo remoto |

Como sustituto de la franja: una raya vertical fina y decorativa en el
margen izquierdo (`estilos.rayaVertical` en `lib/pdf.tsx`), sin texto
dentro — un guiño al carril lateral de la referencia que no puede
desordenar nada porque no es más que un rectángulo relleno.

# El hueco de datos que apareció: el nombre

Un CV a prueba de ATS necesita el nombre real arriba, en texto real. La
app no lo guardaba en ningún sitio — solo el email de la cuenta (que ni
siquiera tiene por qué llevar el nombre). Se añade un campo nuevo,
**T82**: columna `nombre` en `perfiles` (migración `0009`), casilla nueva
en `FormularioPerfil.tsx`, y se pasa a `DocumentoGeneracion()` junto con
el `puesto` (ya existente) y el email de la cuenta.

Deliberadamente **no** se intentó adivinar el nombre por código a partir
del CV pegado (primera línea, heurística, etc.): es frágil — cualquier CV
que no empiece literalmente por el nombre produce basura en letra grande
— y contradice la norma de no inventar datos que ya rige todo lo demás en
la generación (`lib/verificarCv.ts`). Pedirlo como un campo explícito es
la opción robusta.

# Segunda vuelta: el problema no era (solo) el diseño

Mar probó el rediseño con su CV real y lo describió como "caótico, no
respira, sin párrafos". Comprobado contra la base de datos real (no
adivinado): el `cv_texto` que había generado la IA para su última oferta
no tenía **ningún salto de línea real** — todo pegado con guiones
("PERFIL- Nombre: Mar...- Titular: ...-EXPERIENCIA- Operations..."), y
además repetía su nombre, email, teléfono y LinkedIn como si fueran
puntos del CV, algo que ya no tiene sentido desde que T82/T83 los muestra
aparte, en la cabecera. Ninguna plantilla puede "respirar" con un texto
así — el fallo estaba antes del PDF, en la generación.

Dos arreglos en `lib/ia.ts`:

1. **Prompt más estricto** (T50): "cada título de sección y cada punto en
   su PROPIA línea, con un salto de línea real, nunca pegados con un
   guion"; y "el CV no empieza por el nombre ni los datos de contacto —
   ya se muestran aparte". También se pide que la carta separe sus
   párrafos con líneas en blanco.
2. **Validación estructural nueva** en `validarGeneracion()`:
   `lineasConContenido()` cuenta las líneas no vacías del texto y
   rechaza (lanza error) un CV con menos de 6 o una carta con menos de
   3 — igual que ya se rechazaba un texto demasiado corto o largo. El
   rechazo hace que el sistema de reintentos de T57 (cola en el
   navegador, otro modelo de la rotación) se dispare solo, sin tocar
   nada más.

**Por qué validar en vez de intentar reparar el texto a posteriori**: se
consideró insertar saltos de línea por código antes de cada "- " o cada
título en mayúsculas, pero el texto real llegaba tan desordenado (guiones
pegados directamente a la palabra anterior, títulos de sección sin
siquiera un espacio: "-FORMACIÓN-") que cualquier heurística de
recomposición sería frágil y podría inventar una estructura que no es la
real. Rechazar y reintentar con otro modelo es la misma filosofía que ya
sigue `lib/verificarCv.ts`: no confiar en arreglar lo que devuelve el
modelo, confiar en detectarlo y pedirlo de nuevo.

De paso se abre algo el espaciado en `lib/pdf.tsx` (más margen entre
secciones y párrafos) para que el documento respire incluso con texto ya
bien formado.

**Importante para Mar**: los documentos ya generados son definitivos
(regla de negocio 7) — este arreglo no los corrige solos. Para verlo
hace falta marcar "me interesa" en una oferta **nueva**, todavía sin CV
generado.

**Actualización — arreglado en el workflow**: una de las cartas
generadas saludaba a "Estimado equipo de Ver oferta". Causa: el
normalizador de Get on Board en `Jobs App · ingesta` (nodo "Normalizador
Get on Board") dejaba `empresa` fijo al texto `'Ver oferta'`, con un
comentario que decía que la API pública de Get on Board no exponía el
nombre de la empresa. Comprobado en vivo contra la API real: **sí lo
expone**, solo que en un segundo endpoint —
`GET /api/v0/search/jobs` da un id de relación (`company.data.id`), y
`GET /api/v0/companies/{id}` resuelve ese id al nombre real (`Cococel`,
`BC Tecnología`, etc.). El nodo ahora resuelve, en paralelo, el nombre de
cada empresa única de la tanda con `this.helpers.httpRequest()` dentro
del propio Code node, con `try/catch` por empresa para que una que falle
(borrada, 404, timeout) no tire abajo la ingesta entera — cae a
`'No especificado'`, la misma convención que ya usan el resto de
normalizadores de fuentes que a veces no traen ese dato.

De las tres ofertas ya afectadas en `ofertas`, se corrigió a mano solo la
que tenía un nombre verificable con seguridad (`BC Tecnología`, id
`475e4bda-…`); las otras dos (`91a72924-…`, `41783cfb-…`) no aparecían en
el listado público de empresas sin adivinar, así que se dejan como están
— la regla de negocio 10 (borrado a los 30 días) las retira solas, y las
próximas ejecuciones de `Jobs App · ingesta` ya traerán el nombre
correcto para ofertas nuevas de esa fuente.

**Nota**: la carta ya generada para la oferta `475e4bda-…` sigue
teniendo el saludo viejo ("Estimado equipo de Ver oferta") congelado —
arreglar el dato de la oferta no regenera un documento ya generado
(regla de negocio 7).

# Tipografía: por qué se incrustan fuentes

Los PDF solo traen integradas 14 fuentes "estándar" (Helvetica, Times,
Courier y sus variantes) — de ahí el resultado "de palo" de T58. Para el
contraste elegante de la referencia hacen falta dos familias con
personalidad, así que se incrustan en el propio PDF:

- **Playfair Display** (peso 700) para el nombre — serif con carácter,
  editorial.
- **Jost** (pesos 400 y 600) para todo lo demás — geométrica, limpia,
  legible en cuerpos pequeños.

Las dos son de Google Fonts, licencia **SIL Open Font License** (libre,
permite incrustar y redistribuir sin coste — cumple la regla de
presupuesto 0 €/mes). Se instalan una vez como paquetes npm
(`@fontsource/playfair-display`, `@fontsource/jost`) y sus archivos
`.woff` se copian a `public/fonts/` en vez de leerse desde
`node_modules/` en tiempo de ejecución: `public/` siempre viaja completo
al desplegar en Vercel, mientras que el "file tracing" de Next.js podría
no detectar (y por tanto no incluir) una ruta a `node_modules`
compuesta como cadena de texto en tiempo de ejecución. Ver
`public/fonts/LICENCIA.txt`.

**Aprendizaje que conviene repetir**: no todas las fuentes tienen todos
los glifos. La primera versión usaba `→` (flecha) como viñeta y Jost no
la incluye — el PDF la sustituía en silencio por un apóstrofe suelto.
Comprobado con `fontkit.hasGlyphForCodePoint()` antes de fijar cualquier
carácter decorativo nuevo; se usa `›` (sí presente) como viñeta final.

# Aprendizaje aparte: el "Jest worker" del servidor de desarrollo

Durante la primera prueba de descarga (T60) apareció un error genérico
"Jest worker encountered 2 child process exceptions" que parecía un fallo
de `@react-pdf/renderer`. No lo era: el servidor `next dev` llevaba más de
una hora abierto (con varios reintentos fallidos de generación por
saturación de OpenRouter de por medio) y su grupo de workers internos se
quedó colgado — inestabilidad conocida de Turbopack con sesiones largas,
no un bug del PDF. Un reinicio limpio (`npm run dev`) lo resolvió al
instante. Si vuelve a pasar tras dejar el servidor abierto mucho rato, la
solución es la misma.

# Añadido después: teléfono y LinkedIn/enlace en la cabecera (19/08/2026)

Mar pidió, tras revisar el PDF con el idioma ya arreglado, añadir un
teléfono y un enlace (LinkedIn u otro) junto al email de la cabecera —
solo estaba el email. Dos campos nuevos y opcionales en `perfiles`
(`telefono`, `enlace`; migración `0011`), siguiendo la misma norma que ya
fijó esta skill para el nombre (T82): un campo explícito del perfil, nunca
adivinado del CV pegado.

**Ajuste de maquetación que hizo falta**: con hasta cuatro datos en la
cabecera (puesto + email + teléfono + enlace), meterlos todos en la misma
fila (el diseño original de "puesto + email en una línea") dejaba, al
ajustar línea (`flexWrap`) cuando no cabían todos, un "·" suelto al
principio de la segunda línea — se veía como un separador huérfano.
Solución: el puesto pasa a su propia línea, y el contacto (email,
teléfono, enlace — los que tenga rellenos) a la línea de debajo, cada una
con su propio ajuste de línea independiente. Verificado en vivo
descargando un PDF de prueba con los tres datos de contacto rellenos.

# Relacionado

- [`docs/06-tareas.md`](../docs/06-tareas.md) — T58-T62 (Hito 7) y T82-T83
  (añadidas durante el Hito 7).
- [`docs/01-historias.md`](../docs/01-historias.md) — historia C4, el
  criterio de aceptación que este rediseño sigue cumpliendo.
- `lib/pdf.tsx`, `app/api/descargar/[id]/route.ts` — la implementación.
