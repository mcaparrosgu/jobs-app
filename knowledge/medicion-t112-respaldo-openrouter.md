---
type: Medicion
title: "T112 · No hay respaldo gratuito viable en OpenRouter: 8 de 17 modelos los bloquea la propia política de privacidad"
description: "Medido el 27/08/2026 contra los 17 modelos :free de OpenRouter con el prompt real de generación. Ninguno sirve. 8 están bloqueados por la política de datos que Mar activó a propósito, 3 dan 429 (entre ellos los dos configurados hoy), y de los 4 que responden ninguno produce el documento. Además el respaldo tiene un corte de 2 s, así que no salvaría una generación aunque el modelo existiera."
tags: [jobs-app, medicion, ia, openrouter, respaldo, privacidad, t112]
okf_version: "0.2"
timestamp: 2026-08-27T11:30:00Z
---

# Qué se quería averiguar

El respaldo de OpenRouter **no respalda nada**: sus dos modelos devuelven 429
en menos de medio segundo. T112 pedía buscar sustitutos **midiéndolos en vivo**,
no fiándose de lo que declara el catálogo.

# Cómo se midió

`scripts/medir-respaldo-openrouter.ts` (`npm run medir:respaldo`). El prompt no
se reconstruye a mano: se **captura** el cuerpo que `generarCvYCarta` manda a
Cloudflare envolviendo el `fetch` global, y se reenvía a OpenRouter cambiando
solo el modelo. Así se mide exactamente lo que la app pediría, y la sonda no se
queda vieja en cuanto alguien toque el prompt.

Un detalle que cambió el resultado: la primera versión juzgaba las respuestas
con `JSON.parse` a secas, **más estricto que producción**, que desde T118 pasa
por `repararJsonCortado`. Corregido para usar la misma función que la app;
medir con un criterio más duro que el real descarta modelos que sí servirían.

# El panorama completo de los 17 modelos `:free`

| Qué pasa | Cuántos |
|---|---|
| **Bloqueados por la política de datos de la cuenta** | **8** |
| 429, pool compartido agotado | 3 |
| 403 | 2 |
| Responden | 4 |

**El titular es la primera fila.** Esos 8 dan `404 — No endpoints available
matching your guardrail restrictions and data policy`, y no es una avería: es
la consecuencia directa de apagar *"Allow free endpoints that train on request
data"* el 20/08 (ver
[decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)).
Esa opción permitía que los modelos gratuitos **entrenaran con los CVs** de las
compañeras de Mar. Apagarla fue correcto, y el precio es que casi la mitad del
catálogo gratuito desaparece.

Entre los tres 429 están **`z-ai/glm-5.2:free` y `google/gemma-4-26b-a4b-it:free`,
que son justo los dos que `RONDAS_MODELOS` tiene configurados hoy.**

# Los 4 que responden: ninguno sirve

Probados con el prompt real de generación y un corte de 60 s:

| Modelo | Tiempo | Qué devuelve |
|---|---|---|
| `dots-studio/dots-3-note-preview:free` | 0,9 s | **Vacío.** Razona (campo `reasoning`) y agota los 1.500 tokens pensando antes de escribir nada: `finish_reason: length`. El mismo fallo que tumbó a `gemma-4` en T109. |
| `cohere/north-mini-code:free` | 0,3-0,6 s | **Inestable.** Tres vueltas: vacío, JSON roto, vacío. En la que produjo algo, la forma era la correcta, pero ni `repararJsonCortado` lo salva. |
| `minimax/minimax-m3:free` | 2,4 s | Formato propio con etiquetas (`[iylmiw:CV_GENERADO]`), no JSON. |
| `minimax/minimax-m2.7:free` | 1,7 s | Igual, con `[iylmiw:PUESTO]`. |

Solo uno de los cuatro (`dots-3`) declara `structured_outputs`, que es lo que
esta llamada pide siempre (`response_format: json_schema`). Los `minimax`
ignoran el esquema y se inventan un formato, que es exactamente lo que pasa
cuando un modelo no lo soporta.

# El otro problema, estructural y no medido hasta hoy

`TIMEOUT_OPENROUTER_GENERACION_MS = 2_000`. **Dos segundos** para generar un CV
entero.

No es un descuido: la ruta declara `maxDuration = 60` y Cloudflare se lleva
hasta 48 s (`TIMEOUTS_CLOUDFLARE_GENERACION_MS`), así que al respaldo le queda
lo que sobra. Con ese reparto, **el respaldo no puede salvar ninguna generación
por rápido que sea el modelo**: es decorativo por diseño, y el 429 solo lo
estaba tapando.

T119 mejora el reparto a medias: cuando la secuencia de parada dispara,
Cloudflare termina en 11-14 s y sobraría tiempo de verdad. Pero no siempre
dispara — B10 sigue tardando 35 s —, así que el presupuesto no es fiable.

# Qué significa

**Con la política de privacidad actual no hay respaldo gratuito viable en
OpenRouter.** Y eso deja a Cloudflare como proveedor único, con dos riesgos que
ya se han materializado esta misma semana:

* La **cuota diaria se agota** (10.000 neuronas, ~133 por generación). Pasó el
  26/08 y otra vez el 27/08.
* Cloudflare tiene **rachas malas** (documentado en `CLAUDE.md`).

Cuando pasa cualquiera de las dos, hoy la app no genera nada.

Lo que **no** se va a hacer: volver a encender los endpoints que entrenan con
los datos. Son CVs de personas reales que no son Mar.

Queda como decisión abierta para Mar, con los datos ya sobre la mesa. Cerebras
sigue descartado por exigir tarjeta
([idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md)).

Relacionado: [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md),
[decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md),
[medicion-t119-secuencia-parada.md](medicion-t119-secuencia-parada.md),
[incidente-gemma4-razonamiento-t109.md](incidente-gemma4-razonamiento-t109.md).
