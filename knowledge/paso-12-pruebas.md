---
type: Tarea
title: Paso 12 — Pruebas automáticas de la parte determinista
description: 172 pruebas con Vitest (funciones puras, endpoints de la API y componentes clave) que cubren los criterios de aceptación no dependientes de IA, los casos límite, el aislamiento entre usuarias y el manejo de errores.
tags: [jobs-app, pruebas, vitest, testing-library, paso-12, okf]
timestamp: 2026-08-19T23:40:00Z
---

# Qué se construyó

La primera suite de pruebas automáticas del proyecto, con
[Vitest](https://vitest.dev) (gratuito, sin servicio externo — encaja con el
presupuesto de 0 €/mes). Cubre **todo lo que no depende de un modelo de
IA**: funciones puras, endpoints de la API (sesión, validación, permisos,
errores) y los componentes de interfaz con más lógica.

172 pruebas en 18 archivos, todas en verde. Nada de lo probado llama a
OpenRouter ni a Groq de verdad: donde un endpoint usa `lib/ia.ts`
(`extraerPerfil`, `generarCvYCarta`), la llamada al modelo se sustituye por
un doble de prueba y se comprueba el código que la envuelve — validación,
guardado, límite diario, mensajes de error —, nunca la calidad del texto
que devolvería un modelo real (eso es el Paso 13, evals).

## Archivos nuevos

- **`vitest.config.mts`**: entorno `node` por defecto (los endpoints de la
  API no necesitan DOM); los archivos de componentes activan `jsdom` con
  el comentario `// @vitest-environment jsdom` en su cabecera.
- **`tests/setup.ts`**: registra los matchers de `@testing-library/jest-dom`
  y limpia el DOM entre pruebas (`cleanup()`) — sin esto, cada `render()`
  de un archivo se acumulaba sobre el anterior y aparecían elementos
  duplicados.
- **`tests/helpers/supabase-fake.ts`**: un doble mínimo del cliente de
  Supabase. Cada tabla tiene una **cola de resultados** (algunos endpoints
  consultan la misma tabla varias veces en una sola petición, ver más
  abajo) y cada llamada encadenada (`.eq()`, `.in()`, `.upsert()`…) queda
  registrada para poder comprobar en las pruebas de permisos que la
  consulta siempre va filtrada por el `user_id` de quien pregunta.
- **`tests/lib/*.test.ts`**: `palabras-clave`, `fechas`, `idioma`,
  `verificarCv`, `generaciones`, `cola` — las funciones puras.
- **`tests/api/*.test.ts`**: `perfil`, `interes`, `ofertas`, `generar`,
  `extraer-perfil`, `descargar/[id]`, `auth/callback`, `auth/salir`.
- **`tests/components/*.test.tsx`**: `TarjetaOferta`, `FormularioPerfil`,
  `MenuNavegacion`, `GuiaPasos`.
- **Scripts en `package.json`**: `npm test` (una pasada) y
  `npm run test:watch` (modo continuo mientras se programa).

## Archivo tocado por la propia prueba

- **`normalizarPalabrasClave`, tal cual estaba**: al escribir la prueba
  `'Python, SQL, R'` se descubrió que descarta `"R"` (una sigla de una sola
  letra no supera `resultado.length < 2`). No es un fallo — es el
  comportamiento correcto para evitar ruido en la búsqueda —, pero la
  prueba original asumía lo contrario. Se ajustó la prueba, no el código;
  queda documentado como caso de esquina intencional.

# Cómo se organizó la cobertura

## Un doble de Supabase encadenable, no una base de datos real

Probar contra Supabase de verdad habría exigido una base de datos de
pruebas, credenciales y limpieza entre pruebas — más infraestructura de la
que un proyecto a 0 €/mes con 5 usuarias necesita. En su lugar,
`tests/helpers/supabase-fake.ts` imita el patrón encadenable de
`supabase-js` con un `Proxy`: cualquier método (`.select()`, `.eq()`,
`.in()`, `.gte()`…) devuelve el mismo objeto y queda registrado, y el
objeto es "thenable" para poder hacer `await` sobre él, exactamente como
el cliente real.

La parte que exige más cuidado: varios endpoints consultan la **misma
tabla más de una vez** dentro de una sola petición. Por ejemplo,
`app/api/generar/route.ts` puede tocar `generaciones` hasta cuatro veces
(existente → cupo del día → toma de turno → guardado final). El doble
resuelve esto con una **cola de resultados por tabla**: la primera vez que
el endpoint hace `.from('generaciones')` se resuelve con el primer
resultado configurado, la segunda vez con el segundo, y así sucesivamente.
Configurar mal el orden de esa cola fue la causa de casi todos los fallos
iniciales de las pruebas de `generar` y `ofertas` — no un fallo del código
de producción.

## Los endpoints se llaman directamente, sin arrancar el servidor

Cada ruta de `app/api/*/route.ts` exporta una función `GET`/`POST` normal.
Las pruebas la importan y la llaman con un `Request` de verdad
(`new Request('http://localhost/...', {...})`), sin levantar
`next dev` ni hacer peticiones de red. `@/lib/supabase/server` se sustituye
con `vi.mock` para no depender de cookies ni de una sesión real de
Supabase — así cada prueba controla exactamente qué usuaria (o ninguna)
está autenticada.

## Componentes: solo los que tienen lógica que se pueda romper

`TarjetaOferta.tsx` y `FormularioPerfil.tsx` llevan la mayor parte de la
lógica de interfaz del proyecto (estados de generación, reintentos, cola,
validación antes de guardar) y se probaron con `@testing-library/react` +
`jsdom`, con `fetch` sustituido por un doble. `MenuNavegacion.tsx` y
`GuiaPasos.tsx` son casi puramente presentacionales, pero como encarnan la
historia A4 (menú permanente, guía de dos pasos) directamente, se
probaron igual — son baratas de escribir y detectan una regresión visual
tonta (el enlace equivocado subrayado) al instante.

> **Trampa encontrada**: `lib/cola.ts` guarda su estado (`ultimoTurno`) a
> nivel de módulo, no de componente. Una prueba que dejaba una petición
> `fetch` colgada a propósito (para comprobar que el botón "Descargar"
> sale deshabilitado mientras se genera) bloqueaba la cola para **todas
> las pruebas siguientes del mismo archivo**, no solo para sí misma —
> porque todas comparten la misma instancia de `lib/cola.ts` dentro de un
> archivo de pruebas. Se corrigió liberando esa promesa antes de terminar
> la prueba. Vale la pena recordarlo si se añaden más pruebas de
> `TarjetaOferta` en el futuro.

# Qué queda deliberadamente fuera

- **La calidad de lo que genera la IA** (que el CV suene bien, que la
  carta convenza): eso es el Paso 13 (evals), no este.
- **RLS de Supabase de verdad**: las pruebas comprueban que el *código* de
  cada endpoint siempre filtra por `user_id` de la sesión (aislamiento a
  nivel de aplicación), pero no ejercitan la política RLS real de la base
  de datos — eso ya se verificó a mano en T13-T14 (Hito 1) y sigue siendo
  la garantía de fondo, según CLAUDE.md ("el aislamiento entre usuarias se
  garantiza con RLS en Supabase, no con lógica en el código").
- **El PDF en sí** (`lib/pdf.tsx`, `@react-pdf/renderer`): la prueba de
  `app/api/descargar/[id]/route.ts` sustituye `renderToBuffer` por un
  doble — comprueba las cabeceras, los estados 404/500 y el nombre de
  archivo, no el aspecto visual del documento (eso ya se hizo a mano en
  T62 y T83, con el CV real de Mar).
- **`Jobs App · ingesta`** (el workflow de n8n del Hito 4 y el Hito 8): vive
  fuera de este repositorio de Next.js: sus propias pruebas manuales están
  en `hito-4-n8n-supabase.md` y `hito-8-aviso-email.md`.
- **Componentes de página** (`app/perfil/page.tsx`, `app/ofertas/page.tsx`):
  son Server Components finos que solo leen datos y pasan props a
  `FormularioPerfil`/`TarjetaOferta`; probarlos exigiría renderizar
  Server Components de Next.js, con mucho más montaje que beneficio dado
  que ya están cubiertos por T69-T70 (prueba manual de toda la app) y por
  las pruebas de los componentes que sí contienen la lógica.

# Relacionado

- [`docs/01-historias.md`](../docs/01-historias.md) y
  [`docs/03-spec.md`](../docs/03-spec.md) — el origen de cada criterio de
  aceptación cubierto.
- [`docs/06-tareas.md`](../docs/06-tareas.md) §T70 — la prueba manual de
  casos límite que esta suite automatiza y amplía.
- [hito-6-generar-cv.md](hito-6-generar-cv.md) — el límite diario, la cola
  y la verificación de cifras/nombres que aquí se prueban en detalle.
- [decision-diseno-pdf.md](decision-diseno-pdf.md) — el diseño del PDF que
  la prueba de descarga deja fuera a propósito.
