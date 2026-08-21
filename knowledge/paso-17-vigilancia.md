---
type: Tarea
title: Paso 17 — Vigilancia en producción y ciclo de mejora
description: Tabla metricas_ia en Supabase para las cinco señales del Paso 17 (coste/cupo, tiempo de respuesta, tasa de éxito, guardrails, escaladas a humano), una rama nueva de alertas por email en Jobs App · ingesta, y docs/08-rutina.md con la rutina semanal y el ciclo de mejora hacia el golden dataset del Paso 13.
tags: [jobs-app, vigilancia, observabilidad, paso-17, okf]
timestamp: 2026-08-21T00:00:00Z
---

# Qué se construyó

La vigilancia de producción (Paso 17) y el procedimiento para convertir un
fallo real en un caso nuevo del golden dataset del Paso 13, documentado en
[`docs/08-rutina.md`](../docs/08-rutina.md). Tres piezas:

1. **`metricas_ia`** (`supabase/migrations/0015_metricas_ia.sql`) — una fila
   por cada llamada a `extraerPerfil` o `generarCvYCarta`, éxito o fallo,
   registrada desde `lib/metricas.ts` en `app/api/extraer-perfil/route.ts` y
   `app/api/generar/route.ts`. RLS solo permite insertar filas propias; a
   propósito **no** hay política de lectura — nadie, ni la propia usuaria,
   tiene motivo para leer esto desde la app (no hay panel de administración,
   `docs/03-spec.md` §2). Se consulta desde el SQL Editor de Supabase con el
   rol de servicio.
2. **Rama nueva en el workflow de n8n `Jobs App · ingesta`** — en paralelo a
   la ingesta de ofertas, sin tocar ningún nodo existente: consulta
   `metricas_ia` de las últimas 24h, calcula si algún umbral se ha superado
   y, si es así, manda un email a Mar por Gmail. Un fallo en esta rama no
   puede marcar como fallida la ejecución diaria completa (mismo patrón que
   `Ping Healthchecks Jobs App`, ya existente desde el Hito 4).
3. **`docs/08-rutina.md`** — qué se mide, los umbrales de alerta, por qué
   esta herramienta y no otra, la rutina semanal de 15 minutos, y el
   procedimiento paso a paso del ciclo de mejora.

# Cambios en `lib/ia.ts`

Para poder medir el "coste" de verdad de este proyecto (no dinero — Groq y
OpenRouter son gratis, `docs/05-ia.md` §5 — sino el cupo de tokens por
minuto de Groq, que es el cuello de botella real) y saber qué proveedor
respondió, `llamarModelo`/`llamarAlModelo` pasaron de devolver un `string`
a devolver `{ contenido, proveedor, modelo, tokensEntrada, tokensSalida }`
(tipo `UsoIA`, tomado de `usage.prompt_tokens`/`usage.completion_tokens` de
la respuesta del proveedor, `null` si no lo informa). `PerfilExtraido` y
`Generacion` ganan un campo `uso: UsoIA`, y `PerfilExtraido` gana además
`intentoDeInyeccion: boolean` (la misma detección que ya existía para el
`console.warn`, ahora también expuesta) — así `extraerPerfil` puede
registrar el guardrail de inyección en `metricas_ia`, igual que ya podía
`generarCvYCarta` con su propio campo homónimo. Cambio puramente aditivo:
253 pruebas siguen en verde, `tsc --noEmit` y `npm run lint` limpios.

`app/api/extraer-perfil/route.ts` **no** reenvía `intentoDeInyeccion` ni
`uso` al navegador — se usan para registrar la métrica y se descartan antes
de `NextResponse.json(...)`, para no filtrar telemetría interna a la
respuesta que ve la usuaria.

# Por qué esta herramienta y no un servicio de observabilidad de pago

Con 5 usuarias y del orden de 60-750 interacciones al mes
(`docs/05-ia.md` §5), Sentry/Datadog/Grafana Cloud serían maquinaria sin
función: coste que el proyecto no tiene (`CLAUDE.md`, presupuesto 0 €/mes,
restricción dura), y un tercero nuevo al que habría que comprobarle la
política de datos (regla de `CLAUDE.md` tras el incidente de OpenRouter,
ver [`decision-groq-principal-privacidad.md`](decision-groq-principal-privacidad.md))
sin que aporte nada que Supabase (ya usado) + los logs de Vercel (ya
existen) + Healthchecks.io (ya configurado, T38) no resuelvan igual para
este tamaño. No se le preguntó a Mar cuál prefería porque no había una
elección real entre varias opciones igualmente válidas dentro del
presupuesto: las alternativas de pago quedan descartadas por la restricción
dura, no por preferencia.

# Por qué las alertas van por el workflow de n8n y no por un cron de Vercel

Vercel Hobby permite cron jobs, pero enviar un correo desde una función
serverless habría exigido una credencial de email nueva (las de Gmail que
ya existen viven en n8n, no en la app). El workflow `Jobs App · ingesta` ya
corre a diario a las 13:00 y ya sabe mandar correo por Gmail (Hito 8): la
rama nueva reutiliza exactamente esa infraestructura, cero servicios
nuevos, cero credenciales nuevas.

# Umbrales elegidos

Ver la tabla completa en `docs/08-rutina.md` §2. La idea común: exigir
**varias** filas antes de disparar (nunca una sola, salvo `escalado_humano`,
que ya es raro por diseño — Paso 14), porque con este volumen tan bajo un
umbral de "un solo fallo" generaría ruido con cualquier 429 puntual que los
reintentos de `lib/cola.ts` ya absorben solos.

# Pendiente

- [x] **Aplicar `0015_metricas_ia.sql` en el SQL Editor de Supabase** — hecho
  el 21/08/2026. Verificado por consulta directa: 13 columnas, RLS activo
  (`relrowsecurity = true`), política `metricas_ia_insert_propio`
  (`INSERT`, `with_check (auth.uid() = user_id)`).
- Verificar la rama nueva del workflow con una ejecución manual ahora que la
  migración ya está aplicada (mismo patrón que T35/T36 del Hito 4).
- Los umbrales son un punto de partida, igual que los de `evals/umbrales.json`
  en su día (`knowledge/paso-13-evals.md`): recalibrarlos con datos reales de
  las 5 usuarias pasadas unas semanas.

# Relacionado

- [`docs/08-rutina.md`](../docs/08-rutina.md) — el documento completo.
- [`docs/05-ia.md`](../docs/05-ia.md) §6 — el catálogo de fallos que esta
  vigilancia detecta.
- [`paso-13-evals.md`](paso-13-evals.md) — el golden dataset al que
  alimenta el ciclo de mejora.
- [`paso-14-guardrails.md`](paso-14-guardrails.md) — el disparador
  `UMBRAL_FALLOS_HUMANO` que aquí se convierte en `escalado_humano`.
- [`paso-16-publicar.md`](paso-16-publicar.md) — la puerta de calidad que
  protege cada caso nuevo que sale de este ciclo.
