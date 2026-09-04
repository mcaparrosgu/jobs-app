---
type: Decision
title: Filtro de salario y filtro de cualificación pasan de n8n (global) a perfil (por usuaria)
description: 04/09/2026 — Mar detectó que sus compañeras del bootcamp solo verían ofertas filtradas por su propio salario y perfil. Se encontraron dos filtros globales en n8n calibrados a Mar; se eliminan y se mueve el control al perfil de cada usuaria. VERIFICADO en producción real (dos ejecuciones, 0 errores).
tags: [jobs-app, n8n, ingesta, perfil, ofertas, supabase]
okf_version: "0.2"
timestamp: 2026-09-04T19:00:00Z
---

# Qué cambió y por qué

Mar preguntó, pensando en la prueba de sus 4 compañeras de clase: "si no
desactivamos el filtro de salario, mis compis verán solo las ofertas
filtradas por mi salario deseado, mis capacidades, etc.". Al investigar el
workflow `Jobs App · ingesta` (n8n, id `Rw4dTNjQa5tR3Eo4`) se confirmó que el
problema era más grande de lo que parecía: no había uno sino **dos** filtros
globales, ambos calibrados al perfil personal de Mar, corriendo en la
ingesta —antes de que la oferta llegue a Supabase— para **todas** las
usuarias:

1. **`Filtro salario`**: descartaba toda oferta con salario detectado por
   debajo de `SALARIO_MINIMO_EUR = 33000` fijo.
2. **`Filtro cualificación`**: lista negra/blanca de profesiones calibrada al
   perfil de Mar (operaciones/automatización/IA). Excluía por título
   `developer`, `data scientist`, `ml engineer`, `frontend`, `backend`... —
   justo los puestos típicos de un bootcamp de AI Engineering. De 248 ofertas
   de prueba (14/08/2026) pasaban 174 con la versión antigua de la lista,
   15 con la calibrada.

Una oferta descartada en la ingesta no existe para nadie, sin importar el
perfil de quien la busque. Esto contrastaba con el filtro que sí funciona
bien por diseño: en `app/api/ofertas/route.ts`, cada usuaria ya veía solo lo
que coincide con **su propio** `puestos` + `palabras_clave` — un colador
personal, por perfil, sobre el mismo cajón de ofertas.

# Decisión (preguntada explícitamente, regla `CLAUDE.md` punto 7)

1. **`Filtro cualificación` → eliminado del todo.** El buscador personal de
   Mar vive en `Jobs · ingesta` (producción, no se toca); en Jobs App el
   encaje profesional ya lo resuelve el perfil de cada usuaria, no hace
   falta un segundo filtro global.
2. **`Filtro salario` → movido al perfil.** n8n deja de descartar nada por
   salario; calcula el dato (`salario_eur`) y lo guarda con la oferta. Cada
   usuaria puede indicar, opcionalmente, su salario mínimo deseado
   (`salario_minimo` en su perfil); sin dato, no se filtra — ni en la oferta
   (salario desconocido) ni en el perfil (campo vacío).

# Qué se tocó

**n8n** (`Jobs App · ingesta`): `Filtro salario` renombrado a `Enriquecer
con salario_eur` — mismo `parseSalario`/`detectarMoneda` de siempre (moneda
EUR/USD/GBP, miles en formato español, rangos), pero ahora `.map()` en vez de
`.filter()`: añade `salario_eur` a las ofertas y deja pasar el 100%.
`Filtro cualificación` eliminado y reconectado `Enriquecer con salario_eur →
Generar id_externo` directo. `Supabase Insertar oferta` mapea el campo nuevo.
Verificado con `get_workflow_details` tras el cambio: sin conexiones
colgantes, sin referencias sueltas al nodo eliminado.

**Supabase**: migración `supabase/migrations/0020_salario_eur_y_minimo.sql`
— `ofertas.salario_eur integer null`, `perfiles.salario_minimo integer
null`. Sin tocar RLS (columnas nuevas en tablas que ya la tienen). Aplicada
a mano por Mar en el SQL Editor el mismo día; `npm run comprobar:esquema`
pasó de marcar 5 desajustes a "Todo lo que el código pide existe en
Supabase."

**Código**: `app/api/ofertas/route.ts` (filtro `.or('salario_eur.is.null,
salario_eur.gte.N')` cuando el perfil trae `salario_minimo`, mismo criterio
"sin dato → pasa" que tenía n8n), `app/api/perfil/route.ts` (valida
`salario_minimo` como entero ≥ 0 u opcional, nunca obligatorio a diferencia
de `puestos`/`palabras_clave`), `app/perfil/page.tsx`, `components/
FormularioPerfil.tsx` (campo nuevo "Salario mínimo deseado (€/año,
opcional)"). Tests nuevos en `tests/api/perfil.test.ts` y `tests/api/
ofertas.test.ts` cubriendo la validación y el filtro condicional. Suite
completa: 345/345 verdes, lint limpio, `tsc --noEmit` limpio.

# Verificación en producción real (04/09/2026, mismo día)

Dos ejecuciones reales de `Jobs App · ingesta`, con permiso explícito de Mar
(escriben en Supabase de verdad):

- **Ejecución 759** (17:44–17:47, 3 min): 290 ofertas procesadas por
  `Enriquecer con salario_eur → Generar id_externo → Supabase Insertar
  oferta`, **0 errores**. Entre los títulos insertados: *"AWS Engineer"*,
  *"Test Engineer"*, *"BIM Coordinator"*, *"Technical Recruiter"* — exactamente
  el tipo de puesto que `Filtro cualificación` habría descartado antes de
  llegar a Supabase. Una oferta de *"Product Manager | Remote"* quedó con
  `salario_eur: 48000`; el resto, sin salario explícito en el texto original,
  quedó en `null` (no descartada, solo sin ese dato).
- **Ejecución 763** (18:13–18:43, 30 min): 289 ofertas procesadas, **0
  errores**. De esas, 27 nuevas se insertaron y 262 ya existían de la 759
  (rechazadas por el `unique(fuente, id_externo)`, comportamiento esperado,
  no un fallo). Los 30 minutos se explican por el volumen — antes pasaban 15
  ofertas de cientos, ahora pasan cientos, y `Supabase Insertar oferta` las
  escribe una a una.

**Fricción de la herramienta encontrada de camino**: `get_execution` (n8n-mcp)
sin `includeData` devolvía `status: "running"` para la ejecución 759 mucho
después de que ya hubiera terminado (`search_executions` sí tenía el estado
correcto, `success`, con `stoppedAt`). Y con `includeData: true` sobre una
ejecución **todavía en curso**, devuelve `data: null` — no hay forma de ver
progreso parcial de una ejecución en vivo con este servidor, solo una vez
termina. Para diagnosticar iban dos ejecuciones de más lanzadas por API
(`execute_workflow` sobre un workflow con `Schedule Trigger`, que tampoco
avanzaba visiblemente) antes de descubrir que el problema era el propio
tooling, no el workflow. Lección: ante un "sigue corriendo" sospechoso de
este MCP, contrastar siempre con `search_executions` (más fiable) antes de
asumir que algo está colgado.
