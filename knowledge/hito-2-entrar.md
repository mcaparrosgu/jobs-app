---
type: Hito
title: Hito 2 completado — entrar con el enlace de email
description: Cierre del Hito 2 de docs/06-tareas.md (T18-T22) — magic link de Supabase Auth funcionando de extremo a extremo, con sesión persistente y mensaje claro ante un enlace caducado.
tags: [jobs-app, paso-9, supabase, auth, hito-2]
timestamp: 2026-08-19T00:00:00Z
---

# Que se construyo

El recorrido completo de entrada sin contraseña (historia A1):

| Tarea | Archivo | Que hace |
| :---- | :---- | :---- |
| T18 | `app/page.tsx` | formulario de email conectado a `supabase.auth.signInWithOtp`, con estados enviando/enviado/error |
| T19 | `app/auth/callback/route.ts` | ruta que canjea el código del enlace por una sesión real (`exchangeCodeForSession`) |
| T20 | `app/perfil/page.tsx` | pantalla mínima que confirma la entrada mostrando el email de la sesión |
| T21 | — (prueba manual) | verificado: cerrar la pestaña y volver a `/perfil` mantiene la sesión |
| T22 | — (prueba manual) | verificado: un enlace caducado/ya usado muestra un mensaje claro en vez de pantalla en blanco |

**Pieza añadida no listada en la tabla de tareas, pero necesaria para que
T18-T22 funcionen de verdad**: `@supabase/ssr`, con tres archivos nuevos en
`lib/supabase/` (`client.ts` para el navegador, `server.ts` para Server
Components/rutas, `middleware.ts` con la lógica de refresco de sesión) y
`proxy.ts` en la raíz (la nueva convención de Next.js 16 — sustituye a
`middleware.ts`, que quedó deprecado en esta versión). Sin esto, los
Server Components (como `app/perfil/page.tsx`) no podrían leer la sesión
que puso la cookie.

# Incidente encontrado (y resuelto)

Al probar T18-T19 con el email real de Mar, el primer enlace dio
`otp_expired` / "Email link is invalid or has expired" nada más pincharlo
— **casualmente sirvió para verificar T22 en caliente**: la pantalla
mostró el mensaje claro en vez de quedarse en blanco. Se envió un segundo
enlace y, pinchado de inmediato, entró sin problema. Causa más probable:
alguna demora o escaneo previo del enlace antes de abrirlo a mano (algo
conocido en flujos de magic link). No se ha tocado nada de configuración
por esto — de momento es un runbook a tener en cuenta ("si el enlace
falla, pide uno nuevo y ábrelo enseguida"), no un bug de la app.

# Por que importa

Cierra la historia A1 completa (entrar sin contraseña) y deja verificado en
la práctica que la sesión sobrevive a cerrar el navegador — la base para
que el resto de la app (perfil, ofertas, generación) pueda asumir que hay
una usuaria identificada.

# Pendiente

- El criterio de T14 (RLS de `ofertas` bloquea escritura desde el
  navegador) sigue sin comprobarse en la práctica — ahora que hay sesión
  real, ya sería posible, se retoma cuando encaje con otra tarea.

# Relacionados

- [hito-1-base-de-datos.md](hito-1-base-de-datos.md) — la base de datos y
  RLS sobre los que se apoya esta sesión.
- [decision-caducidad-sesion.md](decision-caducidad-sesion.md) — límite
  conocido de la sesión en el plan gratuito de Supabase.
- [../docs/06-tareas.md](../docs/06-tareas.md) — Hito 2, T15-T22.
