---
type: Decision
title: Re-investigadas las alternativas de proveedor de IA (28/08/2026) — Cloudflare sigue siendo proveedor único del MVP
description: Mar preguntó el 28/08/2026 si cambiar de proveedor (T112) reduciría los problemas, y pidió investigar DeepSeek y otras opciones porque las IAs que más protegen los datos daban demasiada guerra. Investigadas en vivo (política real, no marketing) DeepSeek, Cerebras, Gemini, Groq como respaldo y Mistral La Plateforme. Ninguna mejora el conjunto privacidad + coste 0 € + fiabilidad. Decisión: seguir con Cloudflare como proveedor único del MVP. Grok / xAI queda excluido por ética (no confundir con Groq). Mistral de pago se anota como upgrade limpio fuera del MVP.
tags: [jobs-app, ia, proveedor, privacidad, decision, okf]
timestamp: 2026-08-28T20:00:00Z
---

# Contexto

Con T118 y T119 cerradas la generación vuelve a funcionar (5/5 en vivo), pero
T112 dejó claro que **Cloudflare es, en la práctica, proveedor único**: el
respaldo de OpenRouter no respalda nada y su cupo diario (~10.000 neuronas) se
agota en los días de evals. Mar planteó que quizá cambiando de proveedor habría
menos problemas, y pidió mirar **DeepSeek** en concreto, aceptando reconsiderar
la postura de privacidad porque "las IAs que protegen más los datos dan tantos
problemas".

Este documento recoge la investigación y la decisión. Complementa
[decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md), que ya
había descartado el mismo grupo de proveedores el 23/08 por los mismos motivos
de fondo.

# Lo investigado (28/08/2026, política real)

| Proveedor | ¿Gratis permanente? | ¿Entrena con los datos? | Jurisdicción | Veredicto |
|---|---|---|---|---|
| **Cloudflare** (actual) | Sí, tope ~10.000 neuronas/día | No (default declarado, sin toggle) | EE. UU. | **Se queda** |
| **DeepSeek** | No — 5 M tokens únicos, 30 días | Sí, por defecto (opt-out existe) | **China** | Descartado |
| **Cerebras** | No — quitó el free tier en jul-2026, ahora 5 $ únicos | No (no retiene) | EE. UU. | Descartado (de pago; catálogo = gpt-oss + volátiles) |
| **Gemini** free tier | Sí (~1.500 pet./día) | **Sí, sin opt-out en el free tier** (incl. revisión humana) | EE. UU. | Descartado (peor que Cloudflare) |
| **Groq** (como respaldo) | Sí (30 RPM, 6.000 tok/min, 14.400/día) | No (histórico; la policy pública ni cubre la API) | EE. UU. | Descartado como generador por Mar |
| **Mistral La Plateforme** free ("Experiment") | Sí (~1.000 M tokens/mes, ~2 RPM) | **Sí por defecto** — toggle en Admin → Privacy → "Anonymous improvement data" | **UE** (GDPR nativo) | Descartado para el MVP |

## Detalle

- **DeepSeek** falla por dos frentes independientes: (1) no hay tier gratis
  permanente → rompe el presupuesto 0 €/mes; (2) datos almacenados en la
  República Popular China, entrena por defecto, y **bloqueado en Italia por el
  Garante desde enero de 2025** por respuestas insuficientes sobre GDPR
  (Irlanda, Bélgica y Francia investigando). Va en dirección contraria a lo
  que necesita el proyecto, que maneja CVs de personas reales que no son Mar.

- **El planteamiento de partida tenía un matiz**: los problemas de Cloudflare
  no vienen de que proteja los datos. Vienen de (a) ser gratis con tope
  diario, (b) un bug del modelo `mistral-small` al cerrar el JSON — ya
  parcheado con `repararJsonCortado` y la parada de T119 —, y (c) rachas de
  latencia mala del proveedor. Solo (a) lo resolvería pagar; (b) y (c) los
  tendría cualquier proveedor.

- **Groq (con Q) ≠ Grok (con K)**. Grok es xAI, de Elon Musk. Groq es Groq
  Inc., hardware de inferencia (chips LPU), fundada por Jonathan Ross
  (ex-Google). Groq **ya está en el proyecto** como juez de las aserciones
  `llm-rubric` de los evals, y ahí se queda. Mar excluyó **Grok / xAI** para
  siempre, por ética, el 28/08 — ver `CLAUDE.md` punto 5.

- **Mistral La Plateforme** era el candidato más natural (misma casa que
  `mistral-small`, datos en la UE), pero en el tier gratuito **entrena por
  defecto** salvo que se apague un toggle — la misma confianza en una
  configuración que ya se le da a Cloudflare, solo que Cloudflare no entrena
  ni con toggle. Y ~2 peticiones/minuto es muy poco. En privacidad no mejora;
  solo gana en jurisdicción.

# Decisión de Mar (28/08/2026)

1. **Cloudflare sigue como proveedor único del MVP.** No se toca `RONDAS_MODELOS`
   ni el principal. El tope de cuota solo molesta en días de evals; el uso real
   de 5 usuarias cabe con margen (T104).
2. **Grok / xAI: excluido para siempre**, por ética, como OpenAI. Añadido a
   `CLAUDE.md` punto 5. No confundir con Groq (juez de los evals), que se queda.
3. **Mistral de pago (~5-15 €/mes)** — garantía **contractual** de no entrenar,
   UE, sin topes — queda **anotado como el upgrade limpio si algún día se abre
   presupuesto, pero NO es opción para el MVP**. El 0 €/mes sigue siendo
   restricción dura.
4. El siguiente paso real sigue siendo **T113** (los CVs salen cortos con
   entradas pobres), que es lo único entre la app y publicar.

# Fuentes

Política de privacidad de DeepSeek (`cdn.deepseek.com/policies`), tarifas de
DeepSeek, limitación del Garante italiano (Bird & Bird, Euronews), centro de
ayuda de Mistral sobre entrenamiento y opt-out, comparativas de tiers gratuitos
2026 (OpenRouter, ianlpaterson). Todo consultado el 28/08/2026.

# Relacionado

- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md)
- [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)
- [medicion-t112-respaldo-openrouter.md](medicion-t112-respaldo-openrouter.md)
- [decision-modelo-ia.md](decision-modelo-ia.md)
