---
type: Tarea
title: Hito 5 — Ver ofertas y marcar "me interesa"
description: Cierre del Hito 5 (Paso 9, T41-T47) — pantalla /ofertas, emparejamiento por código sin IA, botón "me interesa" con dedupe a nivel de base de datos.
tags: [jobs-app, next-js, supabase, hito-5, okf]
timestamp: 2026-08-19T13:00:00Z
---

# Qué se construyó

Cuatro archivos nuevos, sin tocar nada de los hitos anteriores:

- **`app/ofertas/page.tsx`** (T41, T44): pantalla cliente que pide
  `/api/ofertas` al montar y muestra uno de cinco estados: cargando, sin
  perfil guardado (enlaza a `/perfil`), sin ingesta hoy todavía, sin
  coincidencias, o la lista de tarjetas. Un 401 del endpoint redirige a
  `/`.
- **`app/api/ofertas/route.ts`** (T42): la consulta a la base de datos que
  reemplaza al botón "Buscar" (`docs/05-ia.md` — deliberadamente sin IA).
  Construye el conjunto de términos a partir de `puesto` +
  `palabras_clave` del perfil y, si `usar_experiencia_cv` es cierto,
  añade también `empresas_cv` + `titulos_cv` (regla de negocio 3 —
  "amplía el conjunto de palabras usadas en la consulta", sin llamada
  extra a IA). Filtra `ofertas` con `.or()` de `ilike` sobre `titulo` y
  `descripcion` para cada término. También calcula si hubo ingesta hoy
  (`ingerida_en` desde medianoche en hora de España, calculado con
  `Intl.DateTimeFormat` sin librerías de fechas) y qué ofertas de la
  lista ya tienen interés marcado por esa usuaria.
- **`components/TarjetaOferta.tsx`** (T43, T45): tarjeta con título,
  empresa, enlace a la oferta original y botón "Me interesa" que llama
  directamente a `/api/interes` y pasa a "Te interesa ✓" deshabilitado.
- **`app/api/interes/route.ts`** (T46, T47): `upsert` con
  `onConflict: 'user_id,oferta_id'` + `ignoreDuplicates: true` sobre la
  restricción única de T11 — pulsar "me interesa" dos veces no da error
  ni duplica fila, sin necesitar lógica de comprobación previa.

# Verificación (Chrome, con permiso de Mar)

Con el perfil real de Mar (palabras clave largas tipo frase, de la prueba
del Hito 3) la pantalla mostró correctamente el mensaje de "no hay
ofertas que coincidan" — confirma que ese caso límite funciona, y de paso
confirma un hallazgo real: esas palabras clave son demasiado largas para
que un `ilike` las encuentre nunca en un título de oferta (fallo 2 de
`docs/05-ia.md` §6.3 — "propone palabras clave malas" — la usuaria
revisa antes de guardar, pero en esa sesión de prueba se guardaron tal
cual). No es un bug de este hito ni se ha tocado el prompt de extracción,
que pertenece al Hito 3; queda anotado para si hace falta revisar el
prompt de `lib/ia.ts` más adelante.

Para probar el camino con coincidencias, se añadió temporalmente la
palabra clave corta "Operations" (aparece en varias de las 20 ofertas de
prueba del Hito 4), se comprobó la lista filtrada, se marcó "me interesa"
en dos tarjetas (una con clic simple, otra con doble clic para forzar
T47), se recargó la página confirmando que el estado persiste, y se
verificó directamente en Supabase que la tabla `intereses` tenía
exactamente 2 filas (no 3) pese al doble clic. Tras verificar, se quitó
la palabra clave de prueba y se borraron las 2 filas de interés de
prueba, dejando el perfil y los datos de Mar como estaban antes de la
prueba.

# Relacionado

- `docs/06-tareas.md` — T41-T47.
- `docs/05-ia.md` §"El botón Buscar no lleva IA" — por qué el
  emparejamiento es una consulta de código, no una llamada a IA.
- [`hito-4-n8n-supabase.md`](hito-4-n8n-supabase.md) — de donde salen las
  20 ofertas de prueba usadas para verificar este hito.
- [`hito-3-perfil.md`](hito-3-perfil.md) — de donde sale el perfil de
  prueba con palabras clave largas que expuso el caso límite de "sin
  coincidencias".
