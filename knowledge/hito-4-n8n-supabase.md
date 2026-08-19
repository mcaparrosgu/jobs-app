---
type: Tarea
title: Hito 4 — n8n alimenta la tabla ofertas de Supabase
description: Cierre del Hito 4 (Paso 9, T32-T40) — workflow nuevo Jobs App · ingesta, independiente de Jobs · ingesta, escribiendo en Supabase.
tags: [jobs-app, n8n, supabase, hito-4, okf]
timestamp: 2026-08-19T12:35:00Z
---

# Qué se construyó

Un workflow nuevo e independiente en n8n, **`Jobs App · ingesta`**
(`Rw4dTNjQa5tR3Eo4`), creado duplicando `Jobs · ingesta` (producción) y
adaptando solo su parte final. `Jobs · ingesta` y el resto de workflows
`Jobs` (`archivado`, `generación CV`, `seguimiento`) no se tocaron en
ningún momento — se verificó tras cada cambio que seguían activos y sin
modificar.

## Qué cambia respecto al original

- **Quitados** (T34): los 4 nodos de Google Sheets (`Get row(s) in sheet`,
  `Leer archivo`, `Filtro duplicados`, `Append row in sheet`) y la cadena
  de aviso genérico que dependía de ellos (`If`, `Formato email`,
  `Notificación nuevas ofertas`, `Ping Healthchecks` original). Las 13
  fuentes, sus normalizadores y los 3 filtros (teletrabajo/salario/
  cualificación) quedan intactos, igual que la rama de aviso de fallos de
  fuente (`Unir aviso error` → `Envío error por email` → `If1` →
  `Send a message1`).
- **Nuevo** `Generar id_externo` (T35): mismo hash 32-bit de
  `empresa+titulo_puesto` que usaba `Filtro duplicados`, con la regex de
  diacríticos corregida (`/\p{Diacritic}/gu`, lección ya documentada en
  `Docker n8n/knowledge/workflows/jobs-ingesta.md` para evitar el bug de
  caracteres invisibles). Produce `id_externo` y `fuente` (plataforma en
  minúsculas).
- **Nuevo** `Supabase Insertar oferta` (T35): nodo Supabase (`row`/`create`)
  que mapea `titulo_puesto→titulo`, `empresa→empresa`,
  `enlace_o_email→enlace`, `resumen→descripcion`, `fuente→fuente`,
  `id_externo→id_externo`. `onError: continueRegularOutput` +
  `retryOnFail`: una oferta que ya existe (choca con el
  `unique(fuente, id_externo)` de T10) no tumba la ejecución — la
  deduplicación vive en la base de datos, no en n8n.
- **Nuevo** `Supabase Borrar ofertas antiguas` (T37): rama en paralelo
  desde el `Schedule Trigger`, borra filas de `ofertas` con
  `ingerida_en` a más de 30 días. `alwaysOutputData: true` — sin esto, un
  día sin filas que borrar no emite ningún ítem y la rama del ping de
  Healthchecks (enganchada después) nunca se dispara, ver más abajo.
- **Cron propio** (T38): una sola regla diaria a las 13:00, distinta del
  09:00/17:00 de `Jobs · ingesta`, para no competir por las mismas fuentes
  a la misma hora.
- **Vigilante propio de Healthchecks** (T38): check nuevo
  `Jobs App · ingesta` en la cuenta de Healthchecks de Mar (1 día / 2h de
  gracia, mismo patrón que los checks de `Jobs`), URL en
  `HEALTHCHECKS_PING_URL_JOBS_APP` (`Docker n8n/.env` +
  `docker-compose.yml`, con reinicio del contenedor n8n — confirmado que
  los otros 4 workflows `Jobs` se reactivaron solos y sin pérdida de datos).
  El nodo `Ping Healthchecks Jobs App` cuelga de
  `Supabase Borrar ofertas antiguas` (no del final de la cadena de
  ofertas), porque ese nodo se ejecuta siempre una vez por corrida gracias
  al `Schedule Trigger` + `executeOnce`, haya o no ofertas nuevas ese día.

# Decisión: fuentes de pago desactivadas

La cuenta de Apify de Mar se quedó sin fondos (ver
`Docker n8n/knowledge/workflows/jobs-ingesta.md`, sección de fallos
conocidos). Para el MVP de Jobs App se **desactivaron las 6 fuentes que
dependen de Apify** en `Jobs App · ingesta` (Indeed, LinkedIn, InfoJobs,
Wellfound, FlexJobs, All Jobs Scraper — que cubre Glassdoor/SAP/Talent),
dejando activas las **7 fuentes gratuitas**: Adzuna, Himalayas, Jooble, Get
on Board, We Work Remotely, RemotoJob y Jobicy. `Jobs · ingesta`
(producción) no se tocó — sigue con las 13 fuentes activas, sujeto igual
que siempre al corte de crédito de Apify.

# Bug encontrado y corregido en la propia construcción

La primera prueba del vigilante de Healthchecks (ejecución 607) confirmó
la ejecución en éxito pero el check se quedó en "Never": el nodo de
borrado no encontró ninguna oferta de más de 30 días, no emitió ningún
ítem, y el `Ping Healthchecks Jobs App` enganchado después nunca se
disparó — ni siquiera con `executeOnce: true`, porque ese ajuste sigue
necesitando al menos un ítem de entrada para disparar el nodo.
**Corregido** añadiendo `alwaysOutputData: true` al nodo de borrado;
verificado en la ejecución 608, el check pasó a verde a los 55 segundos.

# Verificación (T36)

Con permiso explícito de Mar (fuentes gratuitas, sin coste), se ejecutó el
workflow nuevo dos veces seguidas: 20 filas en `ofertas` tras la primera
ejecución, 20 tras la segunda — el `unique(fuente, id_externo)` de T10
evita el duplicado sin necesitar lógica de deduplicación en n8n. Esas 20
filas reales cubren también T40 (ya no hace falta insertar ofertas de
prueba a mano para el Hito 5).

# Relacionado

- [`Docker n8n/knowledge/workflows/jobs-ingesta.md`](../../Docker%20n8n/knowledge/workflows/jobs-ingesta.md)
  — el workflow original del que se copió, con el detalle de las 13
  fuentes y sus fallos conocidos.
- `docs/06-tareas.md` — T32-T40.
- `supabase/migrations/0002_ofertas.sql` — el `unique(fuente, id_externo)`
  del que depende toda la deduplicación de este hito.
