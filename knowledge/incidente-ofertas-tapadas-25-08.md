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

# Segundo hueco, encontrado al arreglar el primero (T106)

Al revisar los estados de `/ofertas` apareció otro desajuste con la spec,
del mismo tipo: **quien todavía no ha contado su perfil aterrizaba en una
pantalla de ofertas vacía** que se lo pedía por escrito, con un enlace a
`/perfil`.

`docs/03-spec.md` §3.2 dice que la usuaria "aterriza donde le toca según su
situación": sin perfil, en la pantalla de perfil; con perfil guardado,
directamente en sus ofertas. El callback de login
(`app/auth/callback/route.ts`) ya lo cumplía — pero **el enlace del email de
aviso (T68) apunta directo a `/ofertas`**, sin pasar por ese callback, así
que para quien llega por ahí la regla no se aplicaba nunca.

Arreglado en `app/ofertas/page.tsx`: si la respuesta trae `sinPerfil`, se
redirige a `/perfil` antes de pintar nada. Desaparece el estado
`sin-perfil` (y con él su `GuiaPasos pasoActual={2}`, que ya no puede
darse: `/perfil` muestra el suyo con el paso 1).

# Tercer hueco: las vistas previas no podían iniciar sesión

Al intentar verificar la vista previa (T100), el enlace del email devolvía
siempre a **producción**, no a la vista previa. No era el código:
`app/page.tsx` construye `emailRedirectTo` con `window.location.origin`,
que era correcto.

La causa estaba en **Supabase Auth → URL Configuration**. La lista de
*Redirect URLs* tenía solo dos entradas (puestas en el Hito 9, ver
[hito-9-publicar.md](hito-9-publicar.md)):

- `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app/**`
- `http://localhost:3000/**`

Cada despliegue de vista previa de Vercel estrena URL
(`jobs-<hash>-mcaparrosgu-4812s-projects.vercel.app`), así que **ninguna
coincidía**. Cuando el `redirect_to` no está en la lista permitida, Supabase
no falla: **cae en silencio a la Site URL**, que es producción. De ahí que
Mar pidiera el enlace desde la vista previa y aterrizara en producción, con
el bug todavía presente — pareciendo que el arreglo no funcionaba.

Corregido el 25/08 desde el panel (cambio de configuración, no un secreto):
añadida una tercera Redirect URL con comodín,
`https://jobs-*-mcaparrosgu-4812s-projects.vercel.app/**`. Cubre cualquier
vista previa futura del proyecto sin tener que tocar el panel en cada
despliegue. Verificado en vivo: el `redirect_to` del enlace nuevo ya apunta
a la vista previa, la sesión se abre ahí y `/ofertas` muestra las 8 ofertas.

**Lección para el método**: la regla de `CLAUDE.md` de probar en una rama y
su vista previa antes de publicar era, hasta hoy, **imposible de cumplir para
cualquier pantalla que requiera sesión** — y eso explica en parte por qué se
saltó tres veces seguidas (24/08 dos veces, y el intento de hoy). No era solo
prisa: la vista previa no dejaba entrar.

# Relacionado

- `docs/06-tareas.md` — Hito 5 (T41-T47), T85, T105, T106.
- `docs/03-spec.md` §3.2 — "aterriza donde le toca según su situación".
- [hito-5-ver-ofertas.md](hito-5-ver-ofertas.md) — diseño original de los
  cinco estados de `/ofertas`, de donde viene el orden que quedó
  desactualizado.
- [hito-8-aviso-email.md](hito-8-aviso-email.md) — el enlace del email que
  entra directo a `/ofertas`, saltándose el callback de login.
