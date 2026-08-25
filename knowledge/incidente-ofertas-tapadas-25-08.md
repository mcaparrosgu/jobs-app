---
type: Incidente
title: "/ofertas" ocultaba las ofertas de días anteriores hasta la ingesta de hoy
description: Regresión introducida por T85 (caducidad a 15 días) — el frontend comprobaba huboIngestaHoy antes que si había ofertas, así que cada mañana antes de las 13:00 tapaba con "sin-ingesta" ofertas todavía válidas de días anteriores.
tags: [jobs-app, incidente, frontend, ofertas]
okf_version: "0.2"
timestamp: 2026-08-25T09:45:00Z
---

# Qué pasó

Mar entró en `/ofertas` la mañana del 25/08 (antes de la ingesta de las
13:00) y no vio ninguna oferta, ni siquiera las de días anteriores que
debían seguir visibles por la regla de caducidad a 15 días (T85, 23/08).
La pantalla mostraba "Todavía no se ha actualizado la lista de ofertas de
hoy. Vuelve a mirar un poco más tarde." — un mensaje que parecía normal
(la ingesta diaria corre a las 13:00, hora de Madrid) pero escondía un
bug real: no debía tapar ofertas que sí seguían siendo válidas.

# Causa real

`app/api/ofertas/route.ts` siempre devuelve en `ofertas` las coincidencias
de los últimos 15 días (la caducidad de T85 no depende de si hubo ingesta
hoy) — eso funcionaba bien. El bug estaba en `app/ofertas/page.tsx`: el
orden de comprobación miraba `huboIngestaHoy` **antes** que la longitud de
`ofertas`, así que si la ingesta de hoy aún no había corrido (`false`),
mostraba el estado `sin-ingesta` sin llegar a comprobar si había ofertas
de días anteriores esperando.

Esta comprobación se escribió en el Hito 5 (19/08, T41-T47), **antes** de
que existiera la persistencia de varios días. En ese momento tenía
sentido: sin caducidad a 15 días, "no hubo ingesta hoy" y "no hay ofertas
que mostrar" eran casi lo mismo. T85 (23/08) cambió esa premisa —ofertas
de días anteriores debían seguir viéndose— pero nadie reordenó esta
comprobación del frontend en ese momento. Quedó dormida hasta que alguien
entró en `/ofertas` una mañana temprano con ofertas previas pendientes.

# Arreglo

`app/ofertas/page.tsx`: si `datos.ofertas.length > 0`, se muestra la
lista, sin mirar `huboIngestaHoy` primero. El estado `sin-ingesta` ahora
solo aparece cuando de verdad no hay ninguna oferta que mostrar (ni de
hoy ni de los 14 días anteriores) y la ingesta de hoy tampoco ha corrido
todavía. 275/275 pruebas unitarias en verde (no hacía falta tocar la API
ni sus pruebas, el bug era solo de orden en el frontend).

# Relacionado

- `docs/06-tareas.md` — Hito 5 (T41-T47) y T85.
- [hito-5-ver-ofertas.md](hito-5-ver-ofertas.md) — diseño original de los
  cinco estados de `/ofertas`, de donde viene el orden que quedó
  desactualizado.
