---
type: Decision
title: Menú de navegación y coherencia entre pantallas
description: Tras el Hito 5 las tres pantallas estaban construidas pero incomunicadas; se añade un menú permanente, cerrar sesión, aterrizaje condicional y guía de dos pasos (T77-T80), más el cierre de un endpoint de IA sin sesión (T81).
tags: [jobs-app, next-js, navegacion, ux, seguridad, okf]
timestamp: 2026-08-19T14:00:00Z
---

# El problema

Con el Hito 5 cerrado, las tres pantallas (`/`, `/perfil`, `/ofertas`)
funcionaban cada una por su cuenta pero **no había forma de moverse entre
ellas**. Mar lo describió al probarla: "es muy poco práctica a ojos de los
usuarios, es incómoda". Comprobado en el código antes de tocar nada:

- El enlace del email llevaba **siempre** a `/perfil`, y desde allí no había
  ni un solo enlace a `/ofertas`: la única manera de llegar era escribir la
  dirección a mano. Una barrera absurda para las cuatro compañeras que van
  a probarla.
- El único enlace interno de toda la app era un `<a href="/perfil">` en el
  estado vacío de `/ofertas`, y además recargaba la página entera porque
  `next/link` no se usaba en ninguna parte del proyecto.
- No existía forma de cerrar sesión (cero `signOut` en el repo), pese a que
  `/perfil` ya mostraba el email de quien había entrado.
- Al guardar el perfil, la app decía "Perfil guardado." y dejaba a la
  usuaria en un punto muerto, sin sugerir qué venía después.

Nada de esto aparecía en `docs/` ni en `knowledge/`: no era una decisión
tomada, era un hueco. Por eso se añade la historia **A4** a
`docs/01-historias.md` en lugar de tratarlo como un simple retoque.

# Las tres decisiones de Mar

Preguntadas explícitamente antes de escribir código (regla 7 de
`CLAUDE.md`):

1. **Menú completo con guía de pasos.** Barra permanente con
   `Ofertas · Mi perfil · email · Salir`, **y además** un indicador de "1.
   Pega tu CV → 2. Mira tus ofertas" mientras no haya perfil guardado. Se
   descartaron las variantes sin "Salir" y sin guía: el ordenador puede ser
   compartido, y quien entra por primera vez no sabe qué se espera de ella.
2. **Aterrizaje condicional.** El enlace del email lleva a `/ofertas` si ya
   hay perfil guardado y a `/perfil` si es la primera vez. Es lo que
   `docs/03-spec.md` §3.2 ya prometía ("entra directamente a sus
   resultados") y que hasta ahora no se cumplía — importa sobre todo para
   el email de aviso diario del Hito 8, que es la puerta de entrada
   habitual.
3. **Retoques mínimos de coherencia**, no rediseño: mismo ancho y márgenes
   en las dos pantallas internas, y un enlace "Ver mis ofertas →" junto al
   "Perfil guardado.".

# Cómo se construyó

- **`components/MenuNavegacion.tsx`** — Client Component; usa
  `usePathname()` para marcar dónde estás (subrayado grueso + color, no
  solo color) y `aria-current="page"`. Primera vez que el proyecto usa
  `<Link>` de `next/link`: da transición de cliente y *prefetch* en vez de
  recarga completa.
- **`app/layout.tsx`** — pasa a `async`, hace `getUser()` con el helper de
  `lib/supabase/server.ts` que ya usaban `/perfil` y las APIs, y pinta la
  barra solo si hay sesión. Así la pantalla de acceso se queda intacta.
- **`app/auth/salir/route.ts`** — `POST` → `signOut()` → redirección a `/`.
  Se hace en Route Handler y no en el cliente porque ahí sí se pueden
  escribir cookies, que es lo que borra la sesión de verdad. La barra lo
  invoca con un `<form method="post">`, sin JavaScript.
- **`components/GuiaPasos.tsx`** — presentacional puro, recibe
  `pasoActual`. **No hace ninguna consulta nueva**: `/perfil` ya carga
  `perfilGuardado` y `/ofertas` ya recibe `sinPerfil` de `/api/ofertas`.

# Detalles que costaron un intento

- **La redirección de "Salir" necesita `status: 303`.** Con el 307 por
  defecto de `NextResponse.redirect`, el navegador repite el POST contra
  `/`, que solo responde a GET.
- **La barra y el contenido no alineaban por 24 px.** Las páginas son
  `px-6` por fuera con un `max-w-3xl` centrado dentro; la barra tenía el
  `px-6` *dentro* del `max-w-3xl`, así que su borde izquierdo caía 24 px a
  la derecha. Detectado en la revisión visual en Chrome, corregido moviendo
  el padding al `<header>`.

# Verificado

En Chrome con la sesión real de Mar: la barra aparece en `/perfil` y
`/ofertas` con la pantalla activa marcada, la navegación entre ambas es una
transición de cliente, la guía de pasos se ve correctamente (comprobada
forzándola un momento, ya que Mar sí tiene perfil) y el mensaje al guardar
ofrece "Ver mis ofertas →". Sin sesión, la pantalla de acceso no muestra la
barra (comprobado con `curl`, 0 coincidencias) y `POST /auth/salir`
responde `303` hacia `/`.

**Sin comprobar en vivo a propósito**: pulsar "Salir" con la sesión de Mar
(la dejaría fuera y obligaría a pedir un enlace nuevo) y el aterrizaje
condicional del enlace del email (gastaría un enlace). Las dos quedan para
que las pruebe ella cuando le venga bien.

# Detectado de paso y arreglado en el momento (T81)

Revisando los endpoints salió que `app/api/extraer-perfil/route.ts` era el
**único** que no comprobaba sesión: no llamaba a `getUser()`. Cualquiera
que conociera la URL podía hacerle analizar textos y gastar la cuota de
OpenRouter (capa gratuita, tope diario) sin haber entrado nunca en la web,
dejando además a las usuarias reales sin servicio. Se avisó a Mar y pidió
arreglarlo en el acto, sin esperar al Paso 14.

**El arreglo** es el mismo patrón de los otros tres endpoints
(`ofertas`, `perfil`, `interes`): `getUser()` y 401 si no hay usuaria. Se
coloca **antes de leer el cuerpo de la petición y antes de llamar al
modelo**, para no gastar nada en quien no debería estar ahí.

Verificado por los dos lados: sin cookies responde `401 No has iniciado
sesión`, y con la sesión real de Mar devuelve `200` con puesto y 20
palabras clave, con el botón "Analizar con la IA" comportándose igual que
antes.

> **Nota de método para pruebas con el navegador**: durante esta
> verificación el clic simulado sobre el botón no llegaba a disparar nada,
> lo que parecía un botón roto. No lo era — un `click()` real desde la
> consola sí funcionaba, y el servidor registró la petición. El fallo era
> de la herramienta de automatización, no de la app. Antes de dar por roto
> algo que el usuario no ha reportado, conviene confirmarlo por una segunda
> vía (log del servidor, consola).
>
> Segundo tropiezo del mismo tipo: quedaban **servidores `next dev`
> huérfanos** de sesiones anteriores ocupando el puerto 3000, y
> `.next/dev/logs/next-development.log` conservaba errores de la madrugada
> que parecían actuales. Se resolvió matando el proceso por PID y
> arrancando uno limpio. Al leer un log, mirar primero la marca de tiempo.

Otro dato observado de paso: esa llamada a la IA tardó **42 segundos** en
responder. Encaja con lo ya sabido de la capa gratuita de OpenRouter
(modelos saturados, ver `hito-3-perfil.md`), pero está lejos del "en
segundos" que la spec promete para otras partes. No se toca aquí; conviene
tenerlo presente antes de enseñar la app a la clase.

# Relacionado

- `docs/01-historias.md` — historia **A4**, nueva.
- `docs/03-spec.md` — §2 (cerrar sesión), §3.1 (aterrizaje y menú
  permanente), §7 (accesibilidad).
- `docs/06-tareas.md` — **T77-T80**, bloque añadido tras el Hito 5.
- [`hito-5-ver-ofertas.md`](hito-5-ver-ofertas.md) — el hito que dejó las
  pantallas construidas pero incomunicadas.
