---
type: Decision
title: Groq pasa a ser el proveedor principal de IA, por privacidad
description: El red team descubrió que la cuenta de OpenRouter permitía a los modelos gratuitos entrenar con las peticiones — es decir, con los CVs completos de personas reales. Se apagó esa opción y se invirtió el orden: Groq (con Zero Data Retention global) primero, OpenRouter de respaldo.
tags: [jobs-app, ia, privacidad, decision, paso-15, okf]
timestamp: 2026-08-20T14:30:00Z
---

# El hallazgo

Revisando la configuración real de las cuentas durante el Paso 15
([paso-15-revision-opus.md](paso-15-revision-opus.md)):

- **OpenRouter** → Settings → Privacy: *Zero Data Retention* desactivado en
  todos los ámbitos, y **"Allow free endpoints that train on request data"
  ACTIVADO**. Su propia descripción: *"Enable providers serving free models
  that may retain and/or train on prompts and completions"*.
- **Groq** → Data Controls: **Global ZDR activado** ("Enabled — API specific
  settings are overriden").

Lo que viaja en cada petición no es un dato cualquiera: es el **CV completo de
una persona real que no es Mar**. `CLAUDE.md` exige ZDR en Groq desde el
principio, pero cuando OpenRouter pasó a ser el proveedor principal
([decision-modelo-ia.md](decision-modelo-ia.md)) nadie revisó la misma
pregunta para el proveedor nuevo. La promesa de privacidad se había quedado
apuntando al sitio equivocado.

# Qué se decidió (Mar, 20/08/2026)

1. **Apagar** "Allow free endpoints that train on request data" en OpenRouter.
   Hecho y guardado el mismo día.
2. **Invertir el orden en `lib/ia.ts`**: Groq primero, OpenRouter después.

El punto 2 no es opcional después del 1: al apagar esa opción, OpenRouter
**deja de enrutar** a los endpoints gratuitos que la requerían. Los modelos
`:free` dejan de estar disponibles, así que mantenerlos en primer lugar solo
serviría para gastar segundos fallando antes de llegar a Groq.

# Por qué es una buena decisión aunque contradiga la anterior

[decision-modelo-ia.md](decision-modelo-ia.md) descartó Groq como principal
porque su modelo estaba marcado "Preview" y podía retirarse sin aviso. **Ese
riesgo sigue siendo real** y por eso OpenRouter se conserva como respaldo. Lo
que cambió es el otro platillo de la balanza:

| | OpenRouter `:free` | Groq |
|---|---|---|
| Retención de datos | Podían retener y entrenar | ZDR global activado |
| Cupo diario | 50 peticiones para toda la cuenta | 1000 peticiones **y 200.000 tokens** |
| Velocidad medida (20/08) | — | 0,7 s extracción · 1,6 s generación |

**El cupo de Groq que importa no es el de peticiones: son los 200.000 tokens
al día** (`tokens per day`, verificado al agotarlo el 20/08). Una generación
gasta del orden de 6.000 tokens entre entrada y salida, así que el techo real
está en unos **30 documentos al día para las cinco usuarias juntas** — por
encima del límite de negocio (5 por usuaria = 25), pero sin margen para nada
más. Y hay un tercer límite, el de **8.000 tokens por minuto**, que en la
práctica deja pasar **una generación por minuto**.

Consecuencia práctica, y conviene tenerla presente el día de la demo: **una
tanda de evals se come una parte grande del día**. El 20/08 los evals dejaron
la cuenta a 136 tokens de su tope diario. No lanzarlos la misma mañana en que
se vaya a enseñar la app.

Además resuelve por la vía rápida el problema de cuota que el red team midió
(ficha 7.2): con 50 peticiones al día compartidas entre cinco usuarias, la app
se quedaba sin servicio con uso normal — de hecho pasó el 20/08.

# Consecuencias

- `RONDAS_MODELOS` sigue existiendo, pero ahora es la red de seguridad. Se
  redujo además a 1+2 modelos (antes 2+3): en paralelo se gastaba cuota por
  cada modelo lanzado aunque se abortara.
- Las constantes se renombraron para que digan la verdad: `MODELO_GROQ` (antes
  `MODELO_GROQ_RESPALDO`), `TIMEOUT_GROQ_MS`, `TIMEOUT_OPENROUTER_MS`.
- **Dependemos de un modelo en Preview.** Si Groq lo retira, la app cae al
  respaldo — y ese respaldo hoy no tiene modelos gratis disponibles. La señal
  de alarma sería que todas las generaciones empiecen a fallar a la vez: la
  respuesta es cambiar `MODELO_GROQ` por otro de la lista gratuita de Groq.
- Hay que **relanzar los evals** al cambiar de modelo principal (`CLAUDE.md`):
  el golden dataset se calibró con las respuestas de otros modelos.
- **El juez de los evals también era de OpenRouter**, y se cayó con el mismo
  interruptor. Los `llm-rubric` de `evals/promptfoo/*.yaml` usaban
  `openrouter:nvidia/nemotron-3-super-120b-a12b:free`, y al apagar el permiso
  de entrenamiento OpenRouter empezó a contestar *"No endpoints available
  matching your guardrail restrictions"*. **El síntoma engaña**: los casos
  salen como fallidos aunque la app haya respondido perfectamente, porque
  quien no contesta es quien puntúa. Se cambió el juez a
  `groq:qwen/qwen3.6-27b`. Si algún día vuelven a fallar muchos casos a la
  vez, mirar primero si el error es un 404 del juez antes de tocar el prompt.
- Groq limita por **tokens por minuto**, así que los evals hay que lanzarlos
  con `-j 1 --delay` (ver `CLAUDE.md`). Sin eso, los casos se pisan entre sí y
  fallan con un 429 que también parece un problema de calidad y tampoco lo es.

# Relacionado

- [decision-modelo-ia.md](decision-modelo-ia.md) — la decisión anterior, y por
  qué se tomó así en su momento.
- [decision-respaldo-groq.md](decision-respaldo-groq.md) — cuando Groq entró
  como respaldo.
- [paso-15-revision-opus.md](paso-15-revision-opus.md) — el red team que lo
  destapó.
