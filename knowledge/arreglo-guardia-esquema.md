---
type: Arreglo
title: "T110 · Una guardia que compara el código con el esquema vivo de Supabase, para que producción no se rompa por tercera vez"
description: "27/08/2026. Dos veces en dos días producción quedó rota porque el código pedía columnas que las migraciones ya habían borrado, y nada lo comprobaba. `npm run comprobar:esquema` lee el esquema real de Supabase por la API de PostgREST y lo compara con las columnas que pide cada consulta del código. Verificada contra el commit del incidente real: lo caza."
tags: [jobs-app, arreglo, supabase, esquema, publicacion, t110]
okf_version: "0.2"
timestamp: 2026-08-27T10:30:00Z
---

# El problema

Las migraciones de este proyecto se aplican **a mano** en el SQL Editor de
Supabase. El esquema cambia en cuanto Mar pega el SQL; el código va por otro
camino y a otra velocidad. Cuando los dos se separan, producción se rompe
entera y **en silencio**: nadie se entera hasta que una usuaria abre la
página.

Pasó dos veces en dos días:

* **24/08** — `perfiles.puesto`. La migración 0017 borró la columna y la
  sustituyó por `puestos` (una lista). El código que sabía de `puestos` estaba
  commiteado pero **bloqueado por la puerta de calidad**, así que en producción
  seguía el de antes. Cualquier usuaria con perfil guardado veía "No se pudo
  leer tu perfil.". Ver
  [incidente-esquema-desajuste-24-08.md](incidente-esquema-desajuste-24-08.md).
* **25/08** — `generaciones.rehechos`, el mismo patrón.

Lo importante del primero, y lo que da forma a este arreglo: **la migración sí
estaba aplicada**. Lo que faltaba era publicar el código que la acompañaba. El
desfase no es "una migración sin aplicar", es entre **el esquema vivo y el
código que está corriendo**.

# El arreglo

`scripts/comprobar-esquema.ts`, con `npm run comprobar:esquema`.

1. **Lee el esquema vivo**, no las migraciones del repo — lo que importa es lo
   que hay de verdad en Supabase. Se saca de la API OpenAPI de PostgREST
   (`GET /rest/v1/`), que devuelve todas las tablas y columnas expuestas en una
   sola llamada, sin SQL y sin permisos especiales.
2. **Extrae del código lo que pide**: recorre `app/` y `lib/` buscando
   `.from('tabla')` y, dentro de esa consulta, las columnas de `.select(...)`
   (incluidos los joins tipo `ofertas(titulo, descripcion)`), los filtros
   (`.eq`, `.gte`, `.order`…) y las claves de `.insert`/`.upsert`/`.update`.
3. **Compara y falla con código de salida 1**, diciendo fichero y línea.

Hoy encuentra **144 peticiones** repartidas en 6 tablas, todas correctas.

## Por qué no se enchufa a `npm test`

Necesita red y la clave de Supabase. Meterlo en las pruebas las volvería lentas
y frágiles (un Supabase caído daría rojo sin culpa del código) y, sobre todo,
**el robot de publicación no tiene secretos de Supabase**, así que allí se
saltaría siempre y daría una falsa sensación de estar cubierto. Es un comando
aparte, y su sitio está en el guion de publicación.

Mar eligió (27/08) esta vía —script local— frente a meter la
`SUPABASE_SERVICE_ROLE_KEY` en los secretos de GitHub: es la clave que salta
la RLS y da acceso a los CVs de sus compañeras, y no compensa exponerla en un
runner por esto.

# Cómo se comprobó que sirve

No basta con verla en verde. Se rompió a propósito tres veces:

1. **Contra el commit del incidente real**: `COMMIT=c1049ed npm run
   comprobar:esquema` — la versión que estuvo rota en producción el 24/08.
   Detecta `perfiles.puesto` en `app/api/ofertas/route.ts` y en
   `app/perfil/page.tsx`, exactamente donde reventaba, y de paso `telefono` y
   `enlace`, que había borrado la migración 0016. **La guardia habría cazado
   el incidente.**
2. **Columna inventada** en el código actual: la caza.
3. **Tabla inventada**: la caza.

Dos fallos encontrados al hacerlo, que sin las roturas no se habrían visto:

* Con `COMMIT=` se listaban los ficheros **del disco** en vez de los de ese
  commit, y `git show` reventaba con cualquier fichero que no existiera
  entonces. Ahora se listan con `git ls-tree`.
* `process.exit(1)` con salida todavía sin vaciar **aborta Node en Windows**:
  devolvía 127 en vez de 1 y truncaba el informe. Se usa `process.exitCode`.

# Qué NO cubre

Escrito también en la cabecera del script, para que nadie se confíe:

* **Los tipos no se comprueban**, solo que la columna exista. La migración 0017
  cambió un `text` por un `text[]`; si hubiera mantenido el nombre, esto no lo
  habría detectado.
* Solo ve consultas literales. Una tabla o columna calculada en tiempo de
  ejecución se le escapa.
* Por defecto mira **este árbol de trabajo**. Para el caso del 24/08 —esquema
  al día, código publicado viejo— hay que apuntarlo al commit que está en
  producción con `COMMIT=`. T115 enseñó al robot a preguntarle a Vercel cuál
  es; de momento eso se hace a mano.

Relacionado: [incidente-esquema-desajuste-24-08.md](incidente-esquema-desajuste-24-08.md),
[arreglo-agujero-robot-t115.md](arreglo-agujero-robot-t115.md),
[paso-16-publicar.md](paso-16-publicar.md).
