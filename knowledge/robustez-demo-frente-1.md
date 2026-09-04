---
type: Arreglo
title: "Frente 1 · Robustez del frontend para la demo con la clase (02/09/2026)"
description: "Antes de la prueba con la clase, pasada de robustez sobre el frontend web (no toca IA, no dispara evals). Barreras de error de Next 16 (app/error.tsx, app/global-error.tsx) y página 404 propia (app/not-found.tsx) para que un fallo no enseñe la pantalla cruda de Next. La descarga del PDF deja de ser un enlace a pelo: pide el archivo con fetch y reintenta ante el 503 de arranque en frío de Vercel (hallazgo de la prueba E2E del 01/09), con estado 'Descargando…' y aviso claro si no se despeja. app/api/descargar añade maxDuration=60. Limpieza de restos de la plantilla create-next-app: favicon por defecto y SVG sin usar fuera, icono propio (app/icon.svg), y el body usa la fuente Geist que ya cargaba el layout en vez de Arial. 339 pruebas (10 nuevas), build y comprobar:esquema en verde."
tags: [jobs-app, arreglo, frontend, nextjs, robustez, demo, prueba-usuarios, descarga, pdf, 503, error-boundary]
okf_version: "0.2"
timestamp: 2026-09-02T17:15:00Z
---

# Por qué

El MVP está publicado y cerrado (T112 incluido, `log.md` 02/09). Antes de
ponérselo delante a las cinco personas de la clase (skill `prueba-usuarios`,
entre el Paso 16 y el Paso 17), Mar pidió una pasada de "robustez y
supervisión" del frontend. Este documento cubre el **frente 1: robustez de
código**. No se toca `lib/ia.ts`, `prompts/system.md`, `lib/guardrails.ts`,
`lib/verificarCv.ts` ni `evals/`, así que **no dispara los evals al publicar**.

El método de 20 pasos no tiene un paso de diseño/pulido de frontend: la
maquetación se hace dentro del Paso 10, hito a hito. Lo que había era coherente
y accesible, pero con huecos de robustez y restos de la plantilla.

# Qué se cambió

## 1. Barreras de error (no existían)

- **`app/error.tsx`** (nuevo, cliente). Recoge cualquier excepción al renderizar
  `/`, `/perfil`, `/ofertas` y sus hijos. Enseña "Algo ha ido mal", botón
  **Volver a intentarlo** (`retry()` — la prop estable de Next 16.3, antes
  `reset`) y un enlace a `/ofertas`. Registra el error en la consola del
  navegador; muestra `error.digest` si viene del servidor.
- **`app/global-error.tsx`** (nuevo, cliente). Último recurso si falla el
  `layout.tsx` raíz (ahí `await getUser()` puede lanzar). Sustituye al layout
  entero, así que trae sus propias `<html>`/`<body>` y **no le llegan ni los
  estilos globales ni la fuente**: va todo con estilos en línea y un `<style>`
  propio para el modo oscuro.
- **`app/not-found.tsx`** (nuevo, servidor). Página 404 propia con la misma
  pinta de la app y salidas a `/ofertas` y `/`. Verificado en vivo: una URL
  inventada devuelve **HTTP 404** con este contenido.

## 2. Descarga del PDF robusta ante el arranque en frío

La prueba E2E del 01/09 (`prueba-e2e-produccion-01-09.md`, hallazgo 1) vio un
**HTTP 503 en la primera pulsación de "Descargar"** y 200 en el reintento: el
PDF se dibuja en la petición con `@react-pdf/renderer` + fuentes, y el arranque
en frío de la función de Vercel se pasa del límite por defecto.

- **`components/TarjetaOferta.tsx`**: "Descargar" sigue siendo un `<a href>`
  (mejora progresiva: clic con Cmd/Ctrl/Shift/Alt o botón central sigue el
  enlace tal cual), pero el clic primario lo gestiona `descargar()` con
  `fetch`. `pedirPdfConReintento()` reintenta ante un **5xx** con esperas
  `[1500, 4000] ms`; un **404** ("aún no listo") no se reintenta. Mientras
  tanto el botón muestra "Descargando…" con spinner y `pointer-events-none`.
  Si no se despeja: aviso `role="alert"` ("No se pudo descargar el PDF…" /
  "todavía no está listo…"). El PDF se baja como blob
  (`URL.createObjectURL` + `<a download>`), con nombre replicando el del
  servidor.
- **`app/api/descargar/[id]/route.ts`**: `export const maxDuration = 60`, el
  mismo margen que las rutas de IA, para que el primer intento del día no muera
  por tiempo.

## 3. Restos de create-next-app

- **Fuera**: `app/favicon.ico` (el icono por defecto de Next), y
  `public/{next,vercel,file,globe,window}.svg` (sin una sola referencia en el
  código). `public/fonts/` se queda (lo usa el PDF).
- **`app/icon.svg`** (nuevo): un maletín monocromo sobre cuadrado redondeado.
  Next 16 emite `<link rel="icon" href="/icon.svg?…" type="image/svg+xml">`.
  Nota: `/favicon.ico` a pelo ahora da 404 (los navegadores usan el `<link>`
  del `<head>`; solo lo notan bots que piden esa ruta directa).
- **`app/globals.css`**: `body` pasa de `font-family: Arial…` a
  `var(--font-sans), Arial…`. La fuente Geist ya la cargaba el `layout.tsx` y
  ya se usaba en todos los contenedores con la clase `font-sans`; ahora también
  en el texto suelto (el modal de "Rehacer"). Cambio de una línea, sin
  rediseño.

# Verificación

- `npm run lint` limpio. `npx tsc --noEmit` limpio.
- **`npx vitest run`: 339 pruebas en verde** (329 antes; +10, dos archivos
  nuevos, sin tocar `tests/components/TarjetaOferta.test.tsx`):
  `tests/components/pantallas-error.test.tsx` (5) cubre `error.tsx`,
  `global-error.tsx` y `not-found.tsx`;
  `tests/components/TarjetaOferta-descarga.test.tsx` (5) cubre descarga feliz,
  reintento tras 503, 5xx persistente, 404 sin reintento y clic con
  modificador. Va en un archivo aparte porque sus esperas de reintento son
  reales (1,5 s + 4 s) y, mezcladas con el resto de pruebas de `TarjetaOferta`,
  le robaban el tiempo a un `findByText` de 1 s y lo volvían intermitente. Las
  nuevas se vieron pasar; el mock de `URL.createObjectURL`/`revokeObjectURL` y
  de `HTMLAnchorElement.click` es necesario porque jsdom no los implementa.
- **`npx next build` en verde**: `/icon.svg` como estático, `/_not-found`
  presente, boundaries compilan.
- `npm run comprobar:esquema` sin desajustes (no se tocó nada de datos).
- Dev server en vivo: 404 real en una URL inventada, `/icon.svg` 200,
  `<link rel="icon">` en el `<head>`, `/api/descargar/x` sigue dando 401 sin
  sesión.

# Lo que queda (frente 2 y operativo, no en este documento)

- **Prueba con la clase**: skill `prueba-usuarios` + `docs/prueba-usuarios.md`
  (no existe aún).
- **Fechas en el CV**: reintento con instrucción más fina + cuota fresca
  (`prueba-e2e-produccion-01-09.md`).
- **Supervisión**: gasto real de Mistral contra el tope de 10 €; que la ruta de
  respaldo de Mistral se ejercite una vez de punta a punta por la UI; cuota de
  neuronas de Cloudflare durante la demo; las 5 invitadas dadas de alta en
  Supabase (con `shouldCreateUser: false`, un email no invitado no entra).
- **503 en la primera descarga**: este arreglo lo tapa de cara a la usuaria,
  pero la causa (cold start) sigue ahí; si molesta, precalentar el endpoint
  antes de la demo.
