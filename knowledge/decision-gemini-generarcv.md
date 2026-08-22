---
type: Decision
title: Gemini pasa a ser el proveedor principal de generarCvYCarta
description: Tres pasadas de evals seguidas el 21/08/2026 mostraron a qwen3.6-27b (Groq) inestable en generarCvYCarta, con un motivo de fallo de formato distinto cada vez. Se añade Gemini (gemini-3.7-flash, tras descubrir que el nivel "Pro" no tiene cuota gratis para cuentas nuevas) como primer intento solo para esa llamada — extraerPerfil sigue en Groq, sin cambios — verificando antes su política de datos.
tags: [jobs-app, ia, gemini, decision, paso-17, okf]
timestamp: 2026-08-21T21:00:00Z
---

# El hallazgo que lo motiva

[paso-13-evals.md](paso-13-evals.md) documenta tres relanzamientos seguidos de
`generarCvYCarta` la tarde del 21/08/2026, los tres NO CONCLUYENTE, con el
porcentaje oscilando sin patrón (53,8 % → 38,5 % → 61,5 %) y **un motivo de
fallo de formato distinto cada vez** (JSON que no cumple el esquema, CV por
debajo del mínimo de caracteres, CV sin saltos de línea reales). Sin ningún
cambio de código entre pasadas. Es inestabilidad del modelo en salidas largas
(~7.000 tokens), no un umbral que recalibrar — y afecta sobre todo a
`generarCvYCarta`, mucho menos a `extraerPerfil` (salida corta, 91,7 % estable
en las mismas pasadas).

Preguntado explícitamente a Mar entre cuatro opciones (probar Gemini como
principal de `generarCvYCarta`, como respaldo adicional, seguir buscando
dentro del catálogo de Groq, o esperar sin tocar nada antes del 24/08):
eligió la primera.

# Verificación de la política de datos, antes de añadir el proveedor

`CLAUDE.md` exige comprobar la política de datos de cualquier proveedor nuevo
antes de usarlo, no basta con que sea gratis — es el mismo tipo de comprobación
que llevó a apagar el entrenamiento en OpenRouter
([decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)).
Verificado el 21/08/2026 contra los términos oficiales de Google
(`ai.google.dev/gemini-api/docs/zdr` y `ai.google.dev/gemini-api/terms`):

- **En general, el nivel gratuito de Gemini SÍ entrena con los prompts.**
  Cita literal: *"When you use Unpaid Services... Google uses the content you
  submit to the Services and any generated responses to provide, improve, and
  develop Google products and services... human reviewers may read, annotate,
  and process your API input and output."* Es el mismo problema que ya se
  descartó en OpenRouter.
- **Pero hay una excepción explícita para el Espacio Económico Europeo, Suiza
  y el Reino Unido**, cita literal: *"If you're in the European Economic
  Area, Switzerland, or the United Kingdom, the terms under 'How Google uses
  Your Data' in 'Paid Services' apply to all Services, including... unpaid
  quota in the Gemini API, even though they are offered free of charge."*
  España está en el EEE — a Mar y a sus cuatro compañeras se les aplica el
  trato de "Paid Services" (sin entrenamiento) en el nivel gratuito, por
  geografía, sin tener que activar nada.
- **No es lo mismo que el Zero Data Retention real que tiene Groq.** El ZDR de
  verdad (`ai.google.dev/gemini-api/docs/zdr`) solo existe en el nivel de
  pago, y requiere aprobación explícita de un proyecto concreto. Los datos del
  nivel gratuito, aunque no entrenen para las usuarias del EEE, sí se retienen
  un tiempo limitado por detección de abuso y cumplimiento legal.

Conclusión: es una mejora real sobre el problema de OpenRouter (que era
entrenamiento activo con los CVs), pero un peldaño por debajo de la garantía
que ya tiene Groq. Aceptable para esta llamada porque no hay alternativa
gratuita mejor identificada y el volumen es mínimo (5 usuarias).

# Corrección en caliente: `gemini-2.5-pro` no vale para una cuenta nueva

El modelo elegido en un primer momento, `gemini-2.5-pro`, se implementó y
compiló sin avisar de nada — pero al relanzar los evals, las 13 llamadas
cayeron en silencio a Groq sin que nadie lo notara hasta revisar el campo
`uso.proveedor` de cada resultado. Comprobado en vivo con una petición
mínima real (no adivinado): Google responde **404** — *"This model
models/gemini-2.5-pro is no longer available to new users"* — porque la
cuenta de Mar, creada esa misma tarde, es "nueva" a todos los efectos aunque
el modelo siga listado. Probado también el sustituto que sugiere el propio
mensaje de error, `gemini-3.1-pro-preview`: responde **429 con `limit: 0`**
en las cuatro métricas de cuota — el nivel **"Pro" no tiene NINGUNA cuota
gratuita** para esta cuenta, ni de prueba. Es un hallazgo que no estaba en la
documentación consultada al elegir el proveedor: **hoy, para una cuenta
nueva, solo el nivel "Flash" tiene cuota gratuita real.**

Se cambia a `gemini-3.7-flash`, verificado con una petición real del mismo
tamaño que usa `generarCvYCarta` (JSON estructurado, `thinkingConfig`): responde
200 con contenido completo. Ventaja añadida: a diferencia de `gemini-2.5-pro`
(mínimo de pensamiento 128, no apagable), `gemini-3.7-flash` **sí acepta
`thinkingBudget: 0`** y lo apaga del todo, igual que `reasoning_effort:
'none'` en Groq — un paralelismo más limpio con el resto del fichero.

**Lección para el proceso, no solo para el código**: la documentación oficial
de un proveedor de IA puede quedarse desactualizada en horas, no en meses —
el simple hecho de "compila y no da error" no prueba que la llamada real
funcione. Comprobar el campo `uso.proveedor` de un resultado de verdad (o,
como aquí, una petición mínima directa) es la única confirmación que vale;
"el código está bien escrito" no lo es.

# Qué se decidió y cómo se implementó (`lib/ia.ts`)

**Solo `generarCvYCarta` cambia.** `extraerPerfil` sigue con Groq primero, sin
Gemini — no tiene el problema que se está resolviendo aquí (91,7 % estable) y
tocarlo sin motivo habría sido innecesario.

Orden nuevo de `generarCvYCarta`: **Gemini (`gemini-3.7-flash`, corregido —
ver la sección anterior) → Groq (`qwen/qwen3.6-27b`) → las dos rondas de
OpenRouter**, en cascada como ya existía, con Gemini insertado delante.

Dos cosas técnicas que costó averiguar y que importaban para no reproducir el
mismo fallo que se está arreglando:

1. **Los modelos "pensantes" de Gemini pueden gastar tokens de salida en
   "pensar" antes de escribir la respuesta**, y esos tokens cuentan contra el
   mismo `maxOutputTokens` que el texto final — sin ponerle freno, de sobra
   para agotar el presupuesto y devolver un JSON vacío o cortado, el mismo
   tipo de fallo — documentado y muy reportado por otros desarrolladores —
   que ya se ve con qwen3.6-27b. `gemini-3.7-flash` sí acepta apagarlo del
   todo (`thinkingBudget: 0`, verificado en vivo: sin `thoughtsTokenCount` en
   la respuesta), a diferencia de `gemini-2.5-pro` —el modelo con el que se
   diseñó esto al principio, antes de descubrir que no tenía cuota gratis—,
   que exigía un mínimo de 128 tokens de pensamiento y no lo dejaba en 0. Con
   el pensamiento apagado del todo, `maxOutputTokens` generoso (12.000; el
   nivel gratuito de Gemini no tiene el cuello de botella de 8.000
   tokens/minuto de Groq) es solo margen para el CV y la carta, no un colchón
   contra el pensamiento.
2. **Un JSON cortado a medias por ese mismo motivo se valida DENTRO de
   `llamarGemini`** (con un `JSON.parse` de prueba), no al volver a
   `generarCvYCarta`. Si no, ese fallo caería fuera de la cadena de
   `try/catch` que hace de red de seguridad y `generarCvYCarta` reventaría en
   vez de seguir con Groq.

`generationConfig.responseSchema` de Gemini es un subconjunto de JSON Schema
que no documenta `maxLength` entre sus palabras clave soportadas — se usa un
esquema propio (`ESQUEMA_GENERACION_GEMINI`) sin ese campo para no arriesgar
un 400 por una palabra clave no reconocida. No se pierde protección: el largo
del titular ya lo comprueba `titularSeguro` en código.

**Presupuesto de tiempo recalculado** (función de Vercel, tope de 60 s):
18 s (Gemini) + 15 s (Groq, antes 20) + 10 s + 10 s (las dos rondas de
OpenRouter, antes 15 cada una) = 53 s en el peor caso. Se recorta Groq y
OpenRouter solo dentro de `generarCvYCarta` — `extraerPerfil` conserva sus
tiempos de siempre.

# Verificación

- `npx tsc --noEmit` y `npx eslint lib/ia.ts` en verde, en cada corrección.
- 253/253 pruebas de Vitest en verde, sin ningún cambio en los resultados
  (ninguna prueba llama a un modelo real).
- **Las dos primeras pasadas de evals (30,77 % la segunda, tras arreglar
  [arreglo-verificarcv-falsos-positivos.md](arreglo-verificarcv-falsos-positivos.md))
  midieron a Groq, no a Gemini** — el 404 de `gemini-2.5-pro` hacía que la
  cadena cayera al respaldo en cada uno de los 13 casos sin que ningún error
  visible lo señalara. Detectado revisando el campo `uso.proveedor` de cada
  resultado, no dando el número por bueno a la primera.
- **Tercera pasada, ya con `gemini-3.7-flash`: 0/13, y tampoco es un veredicto
  real.** Los 13 casos fallaron con el mismo 400 de Gemini —
  *"Unknown name \"additionalProperties\" at
  'generation_config.response_schema': Cannot find field."* — porque
  `ESQUEMA_GENERACION_GEMINI` llevaba `additionalProperties: false`, un campo
  que la referencia de Vertex AI documenta como soportado pero que la API de
  Gemini para desarrolladores (un producto distinto) rechaza. Quitado del
  esquema. **Y el respaldo tampoco pudo disimularlo esta vez**: Groq devolvió
  429 por cuota diaria agotada (198.825 de 200.000 tokens, consumidos por los
  relanzamientos repetidos de la propia tarde) — con Gemini fallando por el
  esquema y Groq sin cupo, cayó toda la cadena.
- **El esquema corregido se verificó con una petición directa a Gemini (no
  gasta cuota de Groq), no con una cuarta pasada completa de evals**: JSON
  válido, contenido fiel al CV de prueba, sin `thoughtsTokenCount`. La verdad
  del código ya no está en duda; lo que falta es una pasada automática de los
  13 casos con el juez (que corre en Groq) para tener un número real —
  bloqueada hasta que la cuota diaria de Groq se renueve (medianoche UTC,
  ~2:00 de la madrugada hora española). Pendiente para la próxima sesión: ver
  la actualización de [paso-13-evals.md](paso-13-evals.md).

# Relacionado

- [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)
  — la misma clase de comprobación de política de datos, la vez anterior.
- [paso-13-evals.md](paso-13-evals.md) — el hallazgo de inestabilidad que
  motiva este cambio, y los resultados de la pasada de verificación.
- [paso-17-vigilancia.md](paso-17-vigilancia.md) — `metricas_ia` ya registra
  `proveedor` y `modelo` por llamada; a partir de ahora también dirá cuándo
  responde Gemini y cuándo cae a Groq/OpenRouter.
