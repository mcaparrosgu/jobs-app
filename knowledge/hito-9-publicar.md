---
type: Tarea
title: Hito 9 — Publicar en internet
description: Cierre de T69-T76 (Paso 9) — repositorio en GitHub, proyecto enlazado en Vercel, claves de entorno, y primer recorrido completo probado desde el móvil en la dirección pública.
tags: [jobs-app, github, vercel, supabase, hito-9, okf]
timestamp: 2026-08-19T21:00:00Z
---

# Qué se construyó

La web deja de vivir solo en `localhost` y pasa a tener una dirección
pública real, con el código a salvo en un repositorio propio.

- **T69-T70**: repaso de idioma (sin hallazgos) y prueba de los cuatro
  casos límite de la spec, uno por uno.
- **T71-T73**: permiso explícito de Mar (regla 3 de `CLAUDE.md`) para subir
  el código a GitHub, repositorio **privado** —
  [`mcaparrosgu/jobs-app`](https://github.com/mcaparrosgu/jobs-app) — creado
  y con el primer push hecho.
- **T74-T75**: proyecto `jobs-app` enlazado en Vercel (equipo
  `mcaparrosgu-4812's projects`, rama de producción `master`) y las 5 claves
  de entorno introducidas a mano por Mar en su panel.
- **T76**: primer recorrido completo probado de verdad desde el móvil en
  `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app` — pedir acceso,
  abrir el enlace del email, marcar una oferta "me interesa" y descargar el
  PDF.

Detalle técnico de cada paso (el rodeo del `GITHUB_TOKEN` caducado, los dos
consentimientos manuales de cuenta que exigió Vercel, por qué la
verificación de las claves de T75 fue indirecta) en las entradas del
19/08/2026 de [`log.md`](log.md).

# El bloqueador de T76: el enlace del email apuntaba a `localhost`

Al probar T76 desde el móvil, el enlace de acceso daba "no se puede acceder
a este sitio web" — intentaba cargar `localhost:3000`. La causa **no** era
el código: `app/page.tsx` ya construye `emailRedirectTo` correctamente con
`window.location.origin`. Era la configuración de **Supabase Auth**
(Authentication → URL Configuration), que Mar no llegó a localizar en el
panel: ni la **Site URL** (destino por defecto cuando el enlace no coincide
con ninguno permitido) ni la lista de **Redirect URLs** (vacía) se habían
actualizado tras el despliegue de T74 — seguían con el valor de cuando solo
existía desarrollo local.

Se corrigió directamente desde el navegador, por ser un cambio de
configuración (una URL), no un secreto: Site URL a
`https://jobs-app-mcaparrosgu-4812s-projects.vercel.app`, y dos Redirect
URLs con comodín (`/**`) — la misma de producción y
`http://localhost:3000/**`, conservada para seguir programando en local.
El enlace que Mar ya tenía en el correo no servía (llevaba la URL vieja
grabada dentro); con uno nuevo, T76 pasó a la primera.

**De paso, un segundo cabo suelto de la misma familia**: `APP_URL_JOBS_APP`
en `Docker n8n/.env` (el enlace que lleva el email de aviso de
[Hito 8](hito-8-aviso-email.md)) seguía apuntando también a
`http://localhost:3000/ofertas`, marcado como pendiente desde entonces.
Actualizado a la URL real de Vercel y reiniciado el contenedor
`dockern8n-n8n-1` (`docker compose up -d n8n`, sin tocar `postgres` ni los
workflows `Jobs` originales) para que recoja el cambio.

# Relacionado

- [`docs/06-tareas.md`](../docs/06-tareas.md) — T69-T76 (Hito 9).
- [`hito-8-aviso-email.md`](hito-8-aviso-email.md) — el aviso por email cuyo
  enlace comparte la misma causa raíz (config apuntando a `localhost`).
- [`project_github_permiso_t71.md`] (memoria de sesión) — el permiso
  explícito de Mar para T71/T73 y la política de push automático dentro de
  este hito.

# Pendiente

Solo **T68** queda sin marcar en todo lo que rodea este hito: confirmar la
ejecución real programada de las 13:00 del día siguiente del aviso por
email (Hito 8), a la espera de que ocurra.
