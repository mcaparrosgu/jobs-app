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
