---
type: Decision
title: Marco Passe-Partout (skill /frontend) aplicado a Jobs App
description: 04/09/2026 — sello visual común a los productos del usuario aplicado a Jobs App. Coral (#F87C63) en la regla exterior, ámbar (#F5B027) en la interior. Se probó y se revirtió un cambio de arquitectura de scroll.
tags: [jobs-app, frontend, diseño, ux]
okf_version: "0.2"
timestamp: 2026-09-04T20:00:00Z
---

# Qué se hizo

Se invocó la skill transversal `/frontend` (marco de doble regla "Passe-Partout",
firma visual común a todos los productos del usuario) sobre Jobs App, que
hasta hoy no tenía ninguna identidad visual propia — solo zinc neutro de
Tailwind.

# Elección de color (preguntada explícitamente, sin logo ni marca previa)

No había identidad visual definida (sin logo, sin `docs/marketing/`), así
que se preguntó a Mar en vez de inventar. Se propuso primero una paleta
verde bosque + dorado (leyendo el verde ya usado en la app como color de
"esto ha ido bien" — el botón "Ver mis ofertas", los avisos de éxito), con
una vista previa en vivo sobre la pantalla real de acceso (artifact,
mockup con el copy real de `app/page.tsx`, en claro y oscuro). Mar dio en
su lugar dos colores concretos: **coral `#F87C63`** (regla exterior) y
**ámbar `#F5B027`** (regla interior), mismos valores en los dos temas
(son colores vivos que ya dan contraste suficiente en ambos).

# Implementación

- `app/globals.css`: bloque `passe-partout.css` del skill, con
  `--pp-linea-ext`/`--pp-linea-int` a los dos colores elegidos. Forma sin
  tocar (2.5px grosor, 7px margen, 4px hueco, 16px radio — la firma fija
  del sello). Añadida la reducción a pantallas muy pequeñas (`--pp-margen:
  5px`, `--pp-radio: 12px` bajo 380px), regla estándar del skill.
- `app/layout.tsx`: `<div class="pp" aria-hidden="true">` como primer hijo
  de `<body>`.
- `global-error.tsx` (la barrera de último recurso cuando falla el propio
  layout raíz, con su propio `<html>`/`<body>` y estilos en línea,
  deliberadamente aislada de `globals.css`) se dejó sin tocar a propósito:
  no le corresponde el marco, añadirlo introduciría una dependencia extra
  en un componente cuyo propósito es funcionar incluso si todo lo demás
  falla.

# El problema de UX encontrado, probado y revertido

Mar detectó, probando en su propio navegador: el marco (`position: fixed`)
tapaba el texto durante el scroll en páginas largas (`/perfil`). Causa
real: el `padding` del `body` solo protege el principio y el final de la
página, no cada punto intermedio del scroll — un elemento `position: fixed`
con z-index alto se queda siempre pintado en los bordes de la ventana, así
que el contenido que "sale" por arriba durante el scroll pasa literalmente
por debajo de esa franja.

**Arreglo correcto probado**: en vez de que la página entera hiciera scroll,
mover el scroll a un contenedor interno ya encajado dentro del marco
(`position: fixed; inset: <hueco del marco>; overflow-y: auto`) — al ser
`fixed` con tamaño fijo, sus propios bordes son el límite de recorte del
contenido en todo momento, así que el contenido no puede llegar nunca a la
franja del marco, en ningún punto del scroll. Verificado en vivo (scroll en
`/perfil`, el título y los campos quedan siempre por debajo de la regla
superior).

**Revertido a petición de Mar**: prefiere el scroll nativo de la página
(comportamiento de siempre) al cambio de arquitectura, aunque eso signifique
que el texto pase un instante por debajo del marco durante el scroll. Queda
como una imperfección conocida y aceptada, no un bug sin diagnosticar — si
en el futuro se quiere revisar, la solución ya está documentada arriba
(contenedor interno con `position: fixed` + `overflow-y: auto`, en vez de
`padding` en `body`).

# Estado final

`app/globals.css` y `app/layout.tsx` con el marco aplicado, comportamiento
de scroll sin cambios respecto al proyecto original. Lint y `tsc --noEmit`
limpios. Verificado en vivo (Chrome, navegación real de Mar) en `/`,
`/perfil` y con scroll.
