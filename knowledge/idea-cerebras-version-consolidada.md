---
type: Nota
title: Cerebras, candidato a revisar para la versión consolidada de Jobs App
description: Cerebras exige tarjeta y por eso queda descartado para el MVP de 0 euros, pero sus cuotas (3M tokens/día gratis) lo hacen interesante si el proyecto crece más allá de la prueba con la clase.
tags: [jobs-app, okf, ia, futuro]
timestamp: 2026-08-19T00:00:00Z
---

# La idea

Durante T25 se investigó Cerebras como alternativa a Groq para el modelo
de IA (ver [log.md](log.md), entrada del 2026-08-19, para el detalle
completo de por qué se descartó para el MVP). Cerebras exige una tarjeta
asociada
a la cuenta para activar la API, aunque el uso dentro de la cuota gratis
no genere cargo — eso rompe la regla de presupuesto 0 €/mes de
`CLAUDE.md` **para esta fase**, así que queda fuera del MVP.

Pero sus números son buenos de verdad: con tarjeta puesta, `gemma-4-31b`
da 2.400 peticiones/día y **3 millones de tokens/día** gratis — el techo
teórico de todo el MVP (~3,4 millones de tokens **al mes**) cabría en un
solo día de cuota de Cerebras. Muy por encima de lo que da Groq o
OpenRouter sin pagar nada.

# Por qué se anota y no se descarta sin más

Mar decidió explícitamente (2026-08-19) que **no** quiere poner tarjeta
para el MVP de prueba con la clase — ni riesgo de cobro accidental, ni
letra pequeña — pero le parece una opción interesante **para cuando Jobs
App deje de ser un proyecto de 5 personas de bootcamp y pase a una
versión consolidada** (más usuarias, más volumen, presupuesto ya no
necesariamente 0 €).

# Qué revisar si se retoma

- Si `gemma-4-31b` sigue existiendo o Cerebras ya lo pasó a "Production"
  (estaba en "Preview" en agosto 2026 — el mismo tipo de riesgo de
  retirada que tenía Qwen en Groq).
- Si para entonces hay más modelos no-OpenAI disponibles en Cerebras.
- Confirmar de nuevo en vivo contra la cuenta real (la documentación de
  marketing de Cerebras no coincidió con lo que dio la API al probarlo).

# Relacionado

- [`docs/06-tareas.md`](../docs/06-tareas.md) — T25, elección del modelo
  de IA.
- [`CLAUDE.md`](../CLAUDE.md) — restricción de presupuesto 0 €/mes,
  válida mientras dure esta fase del proyecto.
