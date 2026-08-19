---
type: Decision
title: Modelo de IA para Jobs App — OpenRouter en vez de Groq
description: Groq dejó de ofrecer modelos abiertos estables sin OpenAI; tras verificar en vivo Groq, Cerebras y OpenRouter, se elige OpenRouter con una lista de modelos gratis intercambiables como defensa ante retiradas.
tags: [jobs-app, okf, ia, decision, T25]
timestamp: 2026-08-19T00:00:00Z
---

# El problema

`docs/04-plan-tecnico.md` (Paso 5) eligió Groq dando por hecho que ofrecía
varios modelos de peso abierto para elegir: "Llama, Qwen, Kimi, Mistral".
Al llegar a T25 y comprobarlo **en vivo contra la API real** (no contra su
documentación de marketing, que resultó poco fiable en varias búsquedas),
resultó que Groq retiró esa variedad en algún momento de 2026: hoy solo
tiene `openai/gpt-oss-*` (descartados, decisión ética de Mar) y
`qwen/qwen3.6-27b`, marcado **"Preview"** — Groq documenta que un modelo
"Preview" puede retirarse con poco aviso, a diferencia de "Production".

Mar no quiso arriesgarse a construir todo sobre un único modelo que puede
desaparecer en cualquier momento.

# Lo que se investigó (verificado en vivo, no solo leído)

| Proveedor | Resultado | Por qué se descarta o se acepta |
| :-- | :-- | :-- |
| **Groq** | Solo Qwen 3.6 27B como opción no-OpenAI, y está en "Preview" | Riesgo de retirada sin aviso — el problema que se quiere evitar |
| **Cerebras** | `gemma-4-31b` con cuotas muy generosas (3M tokens/día) en su tabla de límites, **pero la API real exige tarjeta** ("Add a payment method to start running requests") pese al marketing "gratis, sin tarjeta" | Descartado para el MVP — rompe la regla de presupuesto 0 €/mes al introducir riesgo de cobro, aunque sea remoto. Anotado en [idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md) para revisarlo si el proyecto crece |
| **OpenRouter** | 17 modelos gratis (`:free`) verificados en vivo, solo 1 de OpenAI. Probado con éxito `response_format: json_schema` en modo `strict` — devuelve el JSON exacto pedido | **Elegido** |

# Decisión

**Proveedor: OpenRouter**, sin tarjeta, con una **lista de modelos
intercambiables** en vez de uno solo fijo — así, si alguno se retira o se
satura, el código prueba el siguiente sin cambiar de proveedor ni de
cuenta:

1. `google/gemma-4-31b-it:free` — modelo instructivo normal (sin cadena de
   razonamiento innecesaria), buen soporte de español. **Primario.**
2. `z-ai/glm-5.2:free` — alternativa igual de directa.
3. `nvidia/nemotron-nano-9b-v2:free` — probado y funcionando en las
   pruebas de esta decisión; es un modelo "razonador" (añade una cadena de
   pensamiento antes de responder, en un campo `reasoning` aparte del
   `content`), así que queda como **último recurso**: gasta más tokens de
   los necesarios para una tarea tan simple como esta.

# Revisión del 19/08/2026 (Hito 6): la lista se renueva y pasa a dos rondas

Al llegar al Hito 6 se volvió a comprobar la lista **en vivo**, con una
petición de generación real, y el resultado obligó a cambiarla:

| Modelo | Resultado el 19/08 |
| :-- | :-- |
| `google/gemma-4-31b-it:free` (primario de T25) | **429**, saturado |
| `z-ai/glm-5.2:free` | **429**, saturado |
| `nvidia/nemotron-nano-9b-v2:free` | Responde, pero en la primera prueba tardó más de 55 s y agotó el tiempo |
| `google/gemma-4-26b-a4b-it:free` | ✅ 2,0 s, JSON válido |
| `nvidia/nemotron-3-super-120b-a12b:free` | ✅ 0,4 s, el texto más completo |
| `dots-studio/dots-3-note-preview:free` | ✅ 1,0 s |

**Lista nueva, en dos rondas** (`lib/ia.ts`):

1. **Primera ronda**: `google/gemma-4-26b-a4b-it:free` y
   `nvidia/nemotron-3-super-120b-a12b:free`, en paralelo.
2. **Segunda ronda**, solo si ninguno de los dos responde:
   `z-ai/glm-5.2:free`, `google/gemma-4-31b-it:free` y
   `nvidia/nemotron-nano-9b-v2:free`.

**Por qué en rondas y no todos a la vez**: llamar a los cinco siempre
funcionaría, pero gastaría cinco peticiones de la cuota gratuita por cada
documento. Con dos rondas, en el caso normal son dos. Dentro de una ronda
sí se llama en paralelo, porque un modelo saturado contesta 429 en menos de
un segundo mientras que uno atascado puede tardar un minuto: en paralelo,
el atascado no retrasa a nadie.

**Reintentos**: dejan de hacerse dentro del servidor. Ver
[hito-6-generar-cv.md](hito-6-generar-cv.md), punto 3 — dos intentos
seguidos tardaban 112 s y una función de Vercel se corta a los 60.

> **Aprendizaje que conviene repetir**: esta lista caduca. Lo que hoy
> responde en dos segundos mañana da 429, porque la capa gratuita de
> OpenRouter es un pozo compartido con todo el mundo. Antes de dar por
> bueno cualquier problema de generación, **volver a probar los modelos en
> vivo** en lugar de fiarse de lo escrito aquí.

**Consecuencia técnica**: durante las pruebas de T25, los dos primeros modelos
dieron `429` por saturación temporal de su proveedor "de detrás"
(`upstream_provider_shared_pool` — OpenRouter reparte la capacidad de sus
modelos gratis entre todas las cuentas que los usan). El modelo NVIDIA sí
respondió sin problema en el mismo momento. Por eso el código de `lib/ia.ts`
no debe fijar un único modelo: reintenta con espera creciente igual que ya
preveía `docs/05-ia.md` §6.7, y si el modelo actual falla, pasa al
siguiente de la lista antes de darse por vencido.

**Cambio de nombre de archivo**: `docs/04-plan-tecnico.md` y
`docs/06-tareas.md` (T25) nombran `lib/groq.ts`. Como el proveedor ya no
es Groq, el archivo se llama **`lib/ia.ts`** — nombre neutral de
proveedor, acorde con el principio que el propio `docs/05-ia.md` ya
defendía ("cambiar de modelo o de proveedor se toca en un solo archivo").

# Relacionado

- [decision-stack-mvp.md](decision-stack-mvp.md) — la elección original de
  Groq en el Paso 5, ahora desactualizada en cuanto a catálogo de modelos.
- [idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md)
  — por qué Cerebras queda para más adelante.
- [`docs/05-ia.md`](../docs/05-ia.md) §6.4 y §6.7 — salidas estructuradas
  y reintentos, el diseño que este cambio de proveedor no altera.
- [`docs/06-tareas.md`](../docs/06-tareas.md) — T25.
