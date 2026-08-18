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
- **Generacion de CV+carta (C3)**: Mar propone usar **un modelo de IA
  gratuito** en vez de un modelo de pago, para mantener el coste variable
  cerca de cero durante la prueba con la clase. Esto hay que contrastarlo
  en el Paso 5 con la calidad necesaria (ver riesgo 3 de
  `docs/00-problema.md`: "Calidad del CV generado insuficiente") — un
  modelo gratuito mas debil podria chocar con ese riesgo. Evaluar opciones
  con capa gratuita (p. ej. limites de uso diario dentro de un plan
  gratuito) frente a modelos de pago baratos, no asumir automaticamente
  que "gratis" es compatible con la calidad exigida.

# Relacionados

- [../docs/01-historias.md](../docs/01-historias.md) — huecos tecnicos
  resueltos en el Paso 4.
- [../docs/00-problema.md](../docs/00-problema.md) — riesgo de calidad
  del CV, a tener en cuenta al elegir modelo.
