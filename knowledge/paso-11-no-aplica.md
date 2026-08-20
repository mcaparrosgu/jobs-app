---
type: Decision
title: Paso 11 — no aplica, no hay herramientas de IA que diseñar
description: Docs/05-ia.md §4 ya declaraba "Ninguna. Ni una sola." herramienta para el agente. El Paso 11 (diseño poka-yoke de herramientas de un agente) se marca formalmente como no aplicable en vez de forzarlo, preguntado explícitamente a Mar entre tres opciones.
tags: [jobs-app, okf, ia, paso-11, decision]
timestamp: 2026-08-19T00:00:00Z
---

# El desajuste

El Paso 11 del método pide diseñar, a prueba de errores (poka-yoke), las
herramientas ("tools"/function calling) que un agente de IA puede invocar:
nombre, descripción, parámetros sin ambigüedad, ejemplos de uso correcto e
incorrecto, qué devuelve, diseño a prueba de errores, nivel de riesgo.

`docs/05-ia.md` ya había dejado por escrito, desde el Paso 6 y confirmado
en el §4 con esa frase exacta, que Jobs App no tiene nada de eso: la IA
vive en el **peldaño 1** (una única llamada con buenas instrucciones), es
una caja cerrada que **recibe texto y devuelve texto** — no lee la base de
datos, no escribe en ella, no envía correos, no llama a ningún servicio,
no navega por internet. No hay agente que decida sus propios pasos (eso
sería peldaño 4, descartado explícitamente en §3, tentación 3: "no hay
nada que decidir. Los pasos de este producto son siempre exactamente los
mismos").

Es el mismo desajuste que ya obligó a adaptar el Paso 10
([[paso-10-prompts-produccion]]): una plantilla del método pensada para un
asistente conversacional con herramientas, aplicada a un producto que no
tiene ninguna de las dos cosas.

# La decisión

Preguntado explícitamente a Mar (regla de `CLAUDE.md`: no dar por cerrada
una elección entre opciones sin preguntar — [[feedback_ask_explicit_choice]]),
entre tres opciones — marcarlo como no aplica, documentar retroactivamente
las funciones de IA existentes con el formato poka-yoke del paso, o
auditar el código en busca de algo real que sí necesite ese diseño —
eligió la primera: **marcarlo como no aplica**, sin escribir código ni
documentación nueva de diseño de herramientas.

No se auditó el código en busca de una interfaz de IA sin proteger porque
la razón de fondo no es "no se encontró nada que revisar", sino que la
categoría entera —herramientas que un modelo invoca— no existe en el
diseño del producto (§4 lo dice de forma tajante, no como omisión).

# Dónde vive de verdad el trabajo "a prueba de errores" de este proyecto

Revisando `lib/ia.ts` y `lib/verificarCv.ts` antes de preguntar, se
confirmó que el trabajo que el Paso 11 normalmente produciría ya existe,
pero encajado donde correspondía según `docs/05-ia.md` §6 (las cuatro
defensas: quitarle la decisión, encajonar la salida, verificar con
código, instrucciones en el prompt) — no como herramientas de un agente,
sino como el diseño a prueba de errores de las dos únicas interfaces con
la IA:

- **Esquemas JSON estrictos** (`ESQUEMA_PERFIL`, `ESQUEMA_GENERACION`) que
  encajonan la salida en vez de pedir marcadores de texto.
- **Validación en código** de esa salida (`validarPerfil`,
  `validarGeneracion`) — mínimos y máximos de longitud, líneas con
  contenido reales, nunca se confía ciegamente en el modelo.
- **Verificación contra el CV original** (`lib/verificarCv.ts`, T54/T55):
  toda cifra y todo nombre propio del CV generado tiene que rastrearse
  hasta el CV pegado o la oferta, si no, aviso a la usuaria.
- **Defensa contra inyección de instrucciones** en el propio prompt,
  alineada entre `prompts/system.md` y `lib/ia.ts` el mismo día que se
  cerró el Paso 10.
- **Decisión del idioma quitada al modelo** (`detectarIdioma`, código
  determinista, nunca elegido por la IA).

Este trabajo queda etiquetado como Paso 14 (guardrails) en el propio
`docs/05-ia.md` §6.1 y en `paso-10-prompts-produccion.md`, no como
Paso 11 — la diferencia importa porque el Paso 14 sí es aplicable a este
proyecto (hay fallos reales que contener), mientras que el Paso 11 asume
una categoría de riesgo (herramientas mal diseñadas que el propio modelo
invoca mal) que aquí no puede materializarse.

# Qué sigue pendiente, sin relación con este paso

- Verificar en vivo, con los casos 1/2/3/5 de `evals/casos-dificiles.md`,
  que la defensa contra inyección funciona de verdad contra el modelo
  real — anotado ya en `paso-10-prompts-produccion.md`, trabajo del
  Paso 14.
- El harness de evals automatizado (Paso 13, no iniciado).

# Relacionado

- [`docs/05-ia.md`](../docs/05-ia.md) §4 — la frase que resuelve este
  paso: "Ninguna. Ni una sola."
- [[paso-10-prompts-produccion]] — el mismo tipo de adaptación, un paso
  antes.
- [[decision-rol-ia]] — la decisión original del Paso 6 de no subir de
  peldaño.
- [[project_ia_no_conversacional]] (memoria) — la nota que anticipó este
  desajuste para los Pasos 11, 13 y 14.
