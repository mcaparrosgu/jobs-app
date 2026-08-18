---
type: Nota
title: Preferencias tecnicas de Mar para el Paso 5 (plan tecnico)
description: Decisiones de tecnologia que Mar ya adelanto durante el Paso 4, a aplicar cuando se elija el stack — no van en docs/03-spec.md porque la spec no menciona tecnologia.
tags: [jobs-app, paso-5, tecnologia]
timestamp: 2026-08-18T00:00:00Z
---

# Contexto

Durante el Paso 4 (spec funcional), Mar respondio dos de los huecos
tecnicos de `docs/01-historias.md` con preferencias de tecnologia
concreta. La spec (`docs/03-spec.md`) no puede mencionar tecnologia por
regla del metodo, asi que estas preferencias se guardan aqui para
recuperarlas al hacer `/paso-05-stack`.

# Preferencias

- **Email de aviso (G3)**: usar **Gmail** como proveedor del correo (via
  el nodo de Gmail en n8n, dado que el backend ya vive en n8n) en vez de
  un servicio externo tipo Resend.
- **Generacion de CV+carta (C3) y extraccion de puesto/palabras clave
  (B2)**: Mar quiere un modelo de IA **gratuito y de codigo abierto** en
  vez de un modelo de pago, para mantener el coste variable cerca de cero
  durante la prueba con la clase. Menciono "opencode go" como referencia
  (a verificar exactamente que es — no esta claro si se refiere a un
  modelo concreto o a una herramienta); explicito que prefiere evitar
  Claude/Anthropic. Aclarado en conversacion: la razon que dio (que Claude
  "anade marcas de agua a la documentacion") no es correcta — Anthropic no
  marca con agua los documentos que genera Claude; si penso en otra
  herramienta, no se identifico cual. Aun asi, la preferencia por un
  modelo gratuito y de codigo abierto se mantiene y hay que investigarla
  en el Paso 5 igualmente (motivo de coste, no solo el malentendido).
  Contrastar con la calidad necesaria (ver riesgo 3 de
  `docs/00-problema.md`: "Calidad del CV generado insuficiente") — un
  modelo gratuito mas debil podria chocar con ese riesgo, sobre todo ahora
  que el modelo tambien tiene que extraer puesto/palabras clave del CV
  (B2), no solo generar CV+carta. Explorar en el Paso 5: modelos con peso
  abierto (Llama, Mistral, Qwen, DeepSeek u otros) autoalojados o vía
  alguna capa gratuita, frente a modelos de pago baratos — no asumir
  automaticamente que "gratis" es compatible con la calidad exigida.

# Relacionados

- [../docs/01-historias.md](../docs/01-historias.md) — huecos tecnicos
  resueltos en el Paso 4.
- [../docs/00-problema.md](../docs/00-problema.md) — riesgo de calidad
  del CV, a tener en cuenta al elegir modelo.
