---
type: Decision
title: Cloudflare Workers AI sustituye a Groq y Gemini como principal de las dos llamadas
description: Mar reportó el 23/08/2026 un CV real con datos inventados generado por Gemini (principal solo de generarCvYCarta). Se investigaron en vivo (no por marketing) DeepSeek, Mistral, NVIDIA, Cohere, OVHcloud y Cerebras con tarjeta como alternativas — todos descartados. Cloudflare Workers AI (@cf/mistralai/mistral-small-3.1-24b-instruct) es el único que cumple sin tarjeta, sin entrenar por defecto y sin restricción de producción. El mismo día, verificado que también funciona bien para extraerPerfil, Mar decidió retirar Groq del todo del proyecto: Cloudflare pasa a ser principal de las dos llamadas, con OpenRouter como único respaldo.
tags: [jobs-app, ia, cloudflare, decision, okf]
timestamp: 2026-08-23T23:30:00Z
---

# El hallazgo que lo motiva

Mar probó `generarCvYCarta` ya en uso real y reportó que el CV que le generó
Gemini (principal de esa llamada desde el 21/08/2026, ver
[decision-gemini-generarcv.md](decision-gemini-generarcv.md), ahora superada)
"estaba muy inventado". A diferencia del hallazgo anterior (inestabilidad de
*formato* de qwen3.6-27b: JSON inválido, CV corto, sin saltos de línea), este
es un problema de *fidelidad al contenido* — el prompt (`prompts/system.md`,
Prompt B) ya prohíbe explícitamente inventar empresas, fechas, cifras o
tecnologías que el CV original no menciona, y `lib/verificarCv.ts` existe
justo para cazar esto, pero un modelo que se salta la instrucción con
suficiente frecuencia no es algo que un guardrail de después deba estar
compensando en cada generación.

# Proveedores investigados y descartados (verificado en vivo, no por marketing)

Regla de `CLAUDE.md`: comprobar la política de datos real de cualquier
proveedor nuevo antes de usarlo, y no dar nada por bueno solo porque "está
documentado" — la misma lección que ya costó una vuelta extra con
`gemini-2.5-pro` (ver la ficha anterior). Contrastado contra las fuentes
primarias (términos de servicio y políticas de privacidad oficiales, no
blogs de terceros):

| Proveedor | Por qué se descarta |
| :-- | :-- |
| **DeepSeek** | Entrena con los datos por defecto (*"train and improve our technology, such as our machine learning models"*); el opt-out existe pero solo por email a `privacy@deepseek.com`, sin interruptor en panel. Datos procesados y almacenados en la República Popular China. |
| **NVIDIA** (build.nvidia.com) | Sección 3.3(iv) de sus términos: recoge "User Content and Generated Content to improve NVIDIA products and services, including AI models" sin opt-out documentado. Además, la sección 1.2/1.4 prohíbe explícitamente el uso en producción del nivel de prueba gratuito — solo sirve para "internal testing and evaluation purposes". |
| **Cohere** | Su tier de prueba (1.000 llamadas/mes, sin tarjeta) también prohíbe expresamente el uso en producción o comercial — mismo motivo de descarte que NVIDIA. |
| **Mistral** (La Plateforme) | Entrena por defecto en el nivel gratuito "Experiment", pero SÍ tiene un interruptor de opt-out real en su panel (Privacy → "Anonymous improvement data"), sin pagar. Queda como alternativa razonable si Cloudflare fallara, no descartado del todo — pero exige un paso manual antes de mandar el primer CV, y no se llegó a probar en vivo. |
| **OVHcloud AI Endpoints** | La mejor privacidad de todas sobre el papel — Zero Data Retention explícito, servidores en la UE, GDPR — pero el nivel realmente sin registro va a 2 peticiones/minuto (inservible), y el nivel con API key y límites normales **exige un método de pago vinculado al proyecto**. Mismo motivo que descartó Cerebras en `decision-modelo-ia.md` (T25): rompe el presupuesto 0 €/mes. |
| **Cerebras, añadiendo tarjeta** | Confirmado con la documentación oficial (`cerebras.ai/pricing`, `inference-docs.cerebras.ai`): desde el 21/07/2026 ya no hay nivel gratuito continuo. Añadir tarjeta no cobra nada por sí solo, pero solo desbloquea **5 $ en créditos de un solo uso que caducan a los 30 días**; pasado ese plazo, seguir usándolo exige una "Pay as You Go purchase" — dinero real. Además, el modelo de ejemplo de su propia tabla de límites es `gpt-oss-120b`, un modelo de peso abierto de OpenAI (descartado por decisión ética de Mar, `CLAUDE.md` punto 5). |

# El elegido: Cloudflare Workers AI

Único candidato nuevo que cumple los tres frentes a la vez:

1. **Sin tarjeta**: 10.000 "neuronas" al día, se renuevan cada día — no es un
   crédito de un solo uso como Cerebras.
2. **No entrena por defecto, sin interruptor que activar**: declaración
   oficial en su documentación, no una entrada de blog: *"Cloudflare does not
   use your Customer Content to (1) train any AI models made available on
   Workers AI or (2) improve any Cloudflare or third-party services."*
3. **Sin restricción de uso en producción** (a diferencia de NVIDIA y
   Cohere).

Técnicamente, además, es la integración más simple de las probadas hasta
ahora: habla el mismo formato compatible con OpenAI que Groq y OpenRouter
(`response_format: json_schema`, cabecera `Authorization: Bearer`), así que
no hizo falta una función aparte como `llamarGemini` — es un `proveedor` más
dentro de `llamarModelo` (`lib/ia.ts`).

**Modelo elegido, preguntado explícitamente a Mar entre dos opciones**:
`@cf/mistralai/mistral-small-3.1-24b-instruct` (24B parámetros, contexto de
128K) en vez de Llama 3.3 70B Instruct — este último, en teoría más capaz y
con fama de alucinar menos por ser más grande, gasta más "neuronas" por
petición y con solo 10.000/día al cupo le cabrían menos generaciones antes de
agotarse. Mistral Small es el equilibrio entre capacidad y cupo.

# Qué se implementó (`lib/ia.ts`)

**Primera vuelta (23/08/2026, tarde)**: solo `generarCvYCarta` cambia —
Cloudflare → Groq → las dos rondas de OpenRouter, mismo presupuesto de tiempo
que tenía Gemini en su hueco. `extraerPerfil` sigue con Groq primero, sin
tocar.

**Segunda vuelta (23/08/2026, noche)**: Mar pide quitar Groq del todo del
proyecto, no solo de `generarCvYCarta`. Cloudflare pasa a ser el principal de
**las dos llamadas**, con OpenRouter como único respaldo detrás — ya no hay
un tercer proveedor en la cascada. Nuevo presupuesto de tiempo de
`generarCvYCarta`: 26 (Cloudflare) + 10 + 10 (OpenRouter, devuelto a su valor
de antes de que Groq ocupara el hueco) = 46 s, con más margen que antes sobre
los 60 s de Vercel.

Se quitó del todo de `lib/ia.ts`: `GROQ_URL`, `MODELO_GROQ`, `EXTRA_GROQ`,
`PROVEEDOR_GROQ`, `TIMEOUT_GROQ_MS`, `TIMEOUT_GROQ_GENERACION_MS`,
`MAX_TOKENS_GROQ_POR_DEFECTO`, `MAX_TOKENS_GROQ_GENERACION` — ya no queda
ninguna llamada a `api.groq.com` ni ninguna lectura de `GROQ_API_KEY` en el
código de la app. (Antes, en la primera vuelta, ya se había quitado
`llamarGemini`, `ESQUEMA_GENERACION_GEMINI`, `GEMINI_URL`, `MODELO_GEMINI`,
`GEMINI_THINKING_BUDGET`.)

`GEMINI_API_KEY` y `GROQ_API_KEY` se dejan en `.env.local` sin borrar (por si
hace falta volver atrás rápido), pero ya no se leen en ningún sitio del
código de la app. `GROQ_API_KEY` sigue haciendo falta aparte, como secreto de
GitHub, para el juez de las aserciones "llm-rubric" de los evals
(`evals/promptfoo/extraer-perfil.yaml`, `generar-cv-carta.yaml`) — un uso
interno con datos sintéticos, no ligado a CVs de usuarias reales.

⚠️ Con este cambio, `extraerPerfil` usa por primera vez
`mistral-small-3.1-24b-instruct`: nunca se ha pasado por los evals. Antes de
publicar, relanzar los evals de las dos llamadas (regla de CLAUDE.md).

# Verificación en vivo (23/08/2026)

Cuenta de Cloudflare creada por Mar en esta misma sesión (Account ID
localizado con el navegador, token creado por ella). Con credenciales reales:

1. ✅ **Esquema estricto sin problemas**: `response_format: json_schema` con
   `additionalProperties: false` respondió 200 a la primera — a diferencia de
   Gemini, aquí "documentado como compatible con OpenAI" sí se cumplió.
2. ❌→✅ **Hallazgo real: el timeout inicial (18 s, heredado sin comprobar del
   hueco de Gemini) se quedaba corto.** 5 peticiones directas con el tamaño
   máximo real (CV 7.585 + oferta 4.000 caracteres): 21.332 / 12.778 / 13.481
   / 13.200 / 20.847 ms — con 18 s, 2 de 5 habrían caído a Groq **en
   silencio**, sin ningún error visible (la primera prueba de extremo a
   extremo, de hecho, cayó así: `uso.proveedor` dio "Groq" sin ningún aviso).
   La varianza no depende claramente del tamaño del prompt (la más lenta de
   las 5 no fue la más larga) — es infraestructura compartida sin hardware
   dedicado, a diferencia de las LPU de Groq. Subido a 26 s (con las dos
   rondas de OpenRouter recortadas de 10 a 8 s para no pasarse de los 60 s de
   Vercel — ver el comentario junto a `TIMEOUT_CLOUDFLARE_GENERACION_MS` en
   `lib/ia.ts`).
3. ✅ **Con el timeout corregido, `uso.proveedor` da "Cloudflare" de verdad**
   en una generación de extremo a extremo (`generarCvYCarta` real, CV y
   oferta de prueba): CV y carta coherentes con los datos del CV original a
   simple vista (Acme Software, 12 % de conversión, Figma/Miro — nada
   inventado en esta prueba puntual, que no sustituye a los evals).

**Lección repetida, ya van dos veces en este mismo fichero (ver la nota de
`gemini-2.5-pro` en la ficha anterior)**: un proveedor nuevo puede fallar de
formas que no lanzan ningún error — cae al respaldo en silencio y el código
"funciona" igual. La única confirmación que vale es leer `uso.proveedor` de
una respuesta real, no que compile o que la documentación lo prometa.

# Pendiente antes de publicar

1. **Relanzar los evals de `generarCvYCarta`** (regla de `CLAUDE.md`: cambio
   de modelo, evals obligatorios) y comparar `resistencia_inyeccion` y
   `fidelidad` contra el hallazgo ya documentado en
   [paso-13-evals.md](paso-13-evals.md) (54,5 % / ROJO con Gemini).
2. **Añadir `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` como secretos del
   repositorio en GitHub** (Settings → Secrets and variables → Actions) —
   `.github/workflows/publicar.yml` ya los pasa al paso de evals, pero sin el
   secreto real la puerta de calidad fallará en cuanto un push toque
   `lib/ia.ts` de nuevo.
3. **Añadir las mismas dos variables en Vercel** (Settings → Environment
   Variables) antes de publicar — si no, en producción la cadena cae en
   silencio a Groq en cada generación, sin ningún error visible tampoco.

# Relacionado

- [decision-gemini-generarcv.md](decision-gemini-generarcv.md) — la decisión
  que esta sustituye, y el mismo tipo de sorpresa (esquema rechazado) que hay
  que volver a comprobar aquí.
- [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)
  — la misma clase de comprobación de política de datos, la primera vez.
- [decision-modelo-ia.md](decision-modelo-ia.md) — por qué Cerebras ya se
  había descartado una vez, en T25.
- [paso-13-evals.md](paso-13-evals.md) — el hallazgo de `resistencia_inyeccion`
  en rojo que sigue pendiente de remedir con el modelo nuevo.
