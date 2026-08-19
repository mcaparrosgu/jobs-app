---
type: Knowledge Bundle
title: Jobs App — base de conocimiento
description: Documentacion en formato OKF (Open Knowledge Format) de las decisiones, contexto y trabajo de este proyecto.
tags: [jobs-app, okf]
okf_version: "0.2"
timestamp: 2026-08-18T00:00:00Z
---

# Que hay aqui

Bundle [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
que documenta el trabajo de este proyecto (Jobs App): decisiones tomadas,
contexto heredado, y lo que se va construyendo paso a paso con el metodo de
17 pasos. Cada concepto es un fichero markdown con frontmatter YAML; la ruta
del fichero es su identidad.

Este bundle es independiente del bundle OKF del backend n8n
(`Docker n8n/knowledge/workflows/jobs/`), que documenta el pipeline que ya
existe en produccion y no se toca desde aqui.

# Contenido

- [contexto-pipeline-n8n.md](contexto-pipeline-n8n.md) — de donde viene este
  proyecto y que hereda del backend n8n existente.
- [decision-alcance-mvp-remoto.md](decision-alcance-mvp-remoto.md) —
  decision tomada en el Paso 1: el MVP se acota a trabajo remoto asalariado.
- [concepto-mvp.md](concepto-mvp.md) — explicacion didactica de que es un
  MVP y por que el alcance actual no es permanente.
- [preferencias-tecnicas-paso5.md](preferencias-tecnicas-paso5.md) —
  preferencias de tecnologia (email, modelo de IA) para el Paso 5.
- [decision-stack-mvp.md](decision-stack-mvp.md) — decision tomada en el
  Paso 5: con que tecnologias se construye la web y por que.
- [decision-rol-ia.md](decision-rol-ia.md) — decision tomada en el Paso 6:
  que usa IA, que no, y como se contienen los fallos del modelo.
- [decision-tareas-mvp.md](decision-tareas-mvp.md) — decision tomada en el
  Paso 7: como se trocea el MVP en 76 tareas verificables.
- [hito-1-base-de-datos.md](hito-1-base-de-datos.md) — cierre del Hito 1
  (Paso 9, T09-T14): las cuatro tablas creadas en Supabase y el candado
  RLS que garantiza la privacidad entre usuarias.
- [decision-caducidad-sesion.md](decision-caducidad-sesion.md) — decision
  tomada en T16: la caducidad de sesion a 15 dias de inactividad no se
  puede forzar en el plan gratuito de Supabase; se documenta como
  limitacion conocida en vez de pagar el plan Pro.
- [hito-2-entrar.md](hito-2-entrar.md) — cierre del Hito 2 (Paso 9,
  T18-T22): magic link de extremo a extremo, sesion persistente, mensaje
  claro ante enlace caducado.
- [idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md)
  — Cerebras exige tarjeta, descartado para el MVP; candidato a revisar
  cuando Jobs App pase a una version consolidada mas alla de la clase.
- [decision-modelo-ia.md](decision-modelo-ia.md) — T25: Groq perdio su
  variedad de modelos abiertos, se cambia a OpenRouter con una lista de
  modelos gratis intercambiables. `lib/groq.ts` pasa a llamarse
  `lib/ia.ts`.
- [hito-3-perfil.md](hito-3-perfil.md) — cierre del Hito 3 (Paso 9,
  T25-T31): la IA extrae puesto y palabras clave del CV pegado, editables,
  guardadas en Supabase.
- [hito-4-n8n-supabase.md](hito-4-n8n-supabase.md) — cierre del Hito 4
  (Paso 9, T32-T40): workflow nuevo `Jobs App · ingesta` en n8n, escribe en
  Supabase, fuentes de pago de Apify desactivadas, vigilante propio de
  Healthchecks.

Segun avance el proyecto, cada decision o hito relevante (spec, stack, tarea
completada, incidente, aprendizaje) se documenta aqui como un concepto nuevo.

# Convenciones

- `type` es el unico campo obligatorio del frontmatter (p. ej. `Nota`,
  `Decision`, `Tarea`, `Incidente`).
- `title` y `description` son recomendados: nombre legible y resumen en una
  frase.
- `timestamp` es la fecha de la ultima edicion del *documento*.
- `tags` como lista YAML para categorizar.
- Enlaza entre conceptos con links markdown normales (relativos o
  absolutos desde la raiz del bundle) — el grafo de enlaces es parte del
  formato, no decoracion.
- Los textos se escriben en castellano.
- Ver [log.md](log.md) para el historial cronologico de cambios del bundle.
