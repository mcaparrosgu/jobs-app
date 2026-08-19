---
type: Hito
title: Hito 3 completado — el CV y las palabras clave que propone la IA
description: Cierre del Hito 3 de docs/06-tareas.md (T25-T31) — la IA (OpenRouter, vía lib/ia.ts) extrae puesto y palabras clave de un CV pegado, la usuaria los edita, y el perfil se guarda en Supabase. Segunda pasada tras probarlo Mar con su CV real.
tags: [jobs-app, paso-9, ia, openrouter, hito-3]
timestamp: 2026-08-19T01:00:00Z
---

# Que se construyo

La primera llamada real a IA del producto (§2.1 de `docs/05-ia.md`), de
extremo a extremo:

| Tarea | Archivo | Que hace |
| :---- | :---- | :---- |
| T25-T26 | `lib/ia.ts` | llama a OpenRouter con salida estructurada (`response_format: json_schema`) para extraer `puesto`, `palabras_clave`, `empresas_cv`, `titulos_cv`; prueba una lista de 3 modelos gratis intercambiables con reintento de espera creciente si uno falla o satura (§6.7 de `docs/05-ia.md`); valida el resultado por código, sin confiar solo en el esquema |
| T27 | `app/api/extraer-perfil/route.ts` | endpoint que recibe el CV pegado y llama a `extraerPerfil()` |
| T28-T29 | `components/FormularioPerfil.tsx`, `app/perfil/page.tsx` | caja de texto → "Continuar" → puesto y palabras clave editables (borrar con `×`, añadir con Enter o botón) |
| T30 | `components/FormularioPerfil.tsx` | campo de años de experiencia y casilla "tener en cuenta mi CV" |
| T31 | `app/api/perfil/route.ts` (GET+POST) | guarda el perfil (upsert por `user_id`) y lo recarga al volver a `/perfil`, precargando el formulario ya en modo edición |

# Verificado en la práctica

Supervisado en Chrome con un CV de prueba ficticio (no de ninguna
compañera real): pegar el CV propuso un puesto y 9 palabras clave
razonables, editarlas y guardarlas persistió correctamente — comprobado
también por API (`GET /api/perfil`) y con una recarga real de página.

**Incidente de la propia sesión de prueba, no de la app**: la primera
comprobación de "recargar y ver los mismos datos" (criterio de T31) pareció
fallar — el formulario volvía a aparecer vacío tras "navegar" a la misma
URL. La consola mostró un error de *hydration mismatch* de React. Se
investigó a fondo antes de tocar el código: el servidor sí tenía y sí
mandaba el perfil guardado en cada request (confirmado leyendo
`node_modules/next/dist/docs/` de esta versión de Next.js 16 y probando
`fetch('/api/perfil')` directamente desde la consola del navegador). La
causa real era que la herramienta de automatización de navegador estaba
haciendo una navegación "blanda" (interceptada por el router de Next,
que en esta versión preserva el estado de los Client Components entre
navegaciones — ver "UI state preservation" en la documentación de Cache
Components), no una recarga real. Con `Ctrl+Shift+R` (recarga dura) el
perfil se cargó correctamente a la primera. **No hay ningún cambio de
código derivado de esto** — queda anotado porque el mismo patrón puede
confundir en pruebas futuras con esta herramienta.

# Por que importa

Cierra la historia B2 (regla de negocio 4): la usuaria ya no tiene que
inventar sus propias palabras clave desde cero, la IA le da un punto de
partida a partir de su CV real, y ella conserva la última palabra
(edición libre antes de guardar). Es también la primera vez que el cambio
de proveedor de IA (Groq → OpenRouter, ver
[decision-modelo-ia.md](decision-modelo-ia.md)) se pone a prueba con una
llamada real, con éxito.

# Segunda pasada — Mar prueba con su CV real (mismo día)

Mar probó el flujo con su propio CV (en inglés) y dio cuatro correcciones,
las cuatro aplicadas:

1. **Una sola pantalla.** El diseño original tenía dos fases (pegar CV →
   desaparece → ver resultados). Mar pidió ver el CV y los resultados a la
   vez, para poder compararlos. `FormularioPerfil.tsx` se reescribió sin
   bifurcación de fases: el CV queda siempre visible, con un botón
   "Analizar con la IA" que rellena los campos de abajo sin ocultar nada.
2. **Quitar años de experiencia.** Contradecía una decisión ya documentada
   (historia B3: "el sistema no puede proponerlo con fiabilidad"). Como el
   dato no participaba en el emparejamiento con ofertas (regla de negocio
   3), Mar decidió, preguntada explícitamente, quitarlo del todo en vez de
   pedírselo a la IA. Retirado de `docs/01-historias.md`,
   `docs/02-mvp.md`, `docs/03-spec.md`, `docs/04-plan-tecnico.md` y de la
   tabla `perfiles` (`supabase/migrations/0007_quitar_anios_experiencia.sql`).
3. **Forzar español.** El CV de Mar está en inglés; ella esperaba
   resultados en castellano sin tener que traducir nada a mano. Se le
   quita la decisión del idioma al modelo (mismo principio que
   `docs/05-ia.md` §6.5 aplica al idioma de la oferta): el prompt de
   `lib/ia.ts` ahora exige responder siempre en español, sea cual sea el
   idioma del CV. Verificado con el CV real de Mar: puesto y las 16
   palabras clave devueltas, todas en español.
4. **Más palabras clave, sin inventar.** El esquema pasó de 5-10 a 8-20
   palabras clave, y el prompt pide explícitamente ser exhaustiva
   explorando variantes/sinónimos de lo ya presente en el CV, sin
   añadir nada que no esté respaldado por el texto.

**Dos hallazgos durante esta pasada, uno real y uno falsa pista:**

- **Bug real (resuelto): un Service Worker de otro proyecto.** El error de
  hidratación que parecía intermitente en la primera pasada resultó
  reproducirse también en el uso normal de Mar. Investigado a fondo: el
  HTML servido por Next.js era correcto en todo momento (verificado con
  `fetch(..., {cache: 'no-store'})`); el causante era un **Service Worker**
  registrado en el origen `http://localhost:3000` por un proyecto anterior
  no relacionado ("spotideezer-v2"), que servía JavaScript viejo desde su
  propia caché sin importar reinicios del servidor ni recargas duras — los
  Service Workers se registran por origen (protocolo+host+puerto), no por
  proyecto, así que sobreviven a cambiar de carpeta de trabajo si se sigue
  usando el mismo puerto. Se desregistró y se borró su caché desde la
  consola del navegador; el error no ha vuelto a aparecer. **Cambio de
  código relacionado, por si vuelve a pasar con otro Service Worker
  fantasma o con el traductor automático de Chrome**: `app/layout.tsx`
  añade `translate="no"` y la meta `google: notranslate`, para que Chrome
  no ofrezca traducir la página (ya está en castellano por diseño) y no
  pueda modificar el DOM a mitad de hidratación.
- **Rendimiento: las llamadas a los 3 modelos pasan de secuencial a
  paralelo.** El diseño original de T25 probaba los modelos uno detrás de
  otro; con Mar dando "está tardando muchísimo" como señal, se investigó
  con el log del servidor y se confirmó con datos reales: los dos modelos
  rápidos de la lista estaban saturados (**429**, `upstream_provider_shared_pool`
  — cupo compartido de la capa gratuita de OpenRouter, no un fallo de la
  app) y el único que respondía era el modelo "razonador" de último
  recurso, más lento por diseño. En secuencial, sumar el tiempo de los dos
  saturados más el lento superaba el minuto o fallaba por timeout.
  `lib/ia.ts` ahora lanza los 3 modelos **a la vez** (`Promise.any`,
  cancelando los perdedores con `AbortController`) y se queda con el
  primero que responda bien — el tiempo pasa a ser el del más rápido que
  funcione, no la suma de todos. Con la capa gratuita saturada como en
  esta prueba, tarda entre 20 y 50 segundos (antes fallaba del todo);
  cuando algún modelo rápido está libre, debería bajar a pocos segundos.
  Coste: usa algo más de cuota gratuita por análisis (hasta 3 llamadas en
  vez de 1-2), aceptable dado el volumen bajo del proyecto
  (`docs/05-ia.md` §5).

# Relacionados

- [decision-modelo-ia.md](decision-modelo-ia.md) — por qué `lib/ia.ts`
  llama a OpenRouter y no a Groq, y por qué hay una lista de modelos en
  vez de uno fijo.
- [hito-2-entrar.md](hito-2-entrar.md) — la sesión de la que depende
  `/perfil` para saber quién es la usuaria.
- [../docs/05-ia.md](../docs/05-ia.md) §2.1 y §6 — el diseño y las
  defensas contra fallos que este hito implementa.
- [../docs/06-tareas.md](../docs/06-tareas.md) — Hito 3, T25-T31.
