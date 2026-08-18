---
type: Nota
title: Contexto de partida — pipeline n8n existente
description: Punto de partida para el Paso 1 (docs/00-problema.md) — resume qué ya existe en el backend n8n, qué opcion de monetizacion se eligio como MVP y de que repo viene.
tags: [jobs, contexto, mvp]
timestamp: 2026-08-18T00:00:00Z
---

# Que es esto

Este proyecto (Jobs App) es un producto nuevo — un frontend/app — que se
apoya en un backend que **ya existe y funciona en produccion**: el pipeline
de busqueda de empleo construido en n8n, documentado como bundle OKF en el
repo `Docker n8n` (`C:\AI Engineering\n8n\Docker n8n\knowledge\workflows\jobs\`).

Este repo (Jobs App) es independiente: distinto ciclo de vida, distinto
stack, y sobre todo porque las notas de monetizacion de ese repo nunca deben
subirse a GitHub (quedan locales alli). Aqui solo se trae el contexto
necesario para arrancar, no las notas de monetizacion completas.

# Lo que ya existe (backend, no tocar sin necesidad)

- **Ingesta**: Adzuna, Jooble y Apify (Indeed) traen ofertas de empleo.
- **Generacion de CV**: Anthropic genera un CV adaptado a cada oferta.
- **Seguimiento y revision**: workflows que hacen seguimiento del proceso y
  revision de candidaturas.
- Documentacion completa: `jobs-ingesta.md`, `jobs-generacion-cv.md`,
  `jobs-seguimiento.md`, `jobs-revision.md` en el repo `Docker n8n`.
- El backend se expone via webhook de n8n — mismo mecanismo que ya usan los
  triggers existentes, pero disparable desde una web en vez de un cron.

# Decision ya tomada (no es punto de partida abierto)

De las cinco opciones de monetizacion evaluadas, la recomendacion fue
empezar por un **MVP web minimo** (formulario que llama al webhook de n8n,
ejecuta ingesta/generacion de CV con los parametros de ese usuario, guarda
el resultado separado por `user_id`, y lo muestra) — probado con 3-5
personas del bootcamp antes de construir nada mas grande. Si hay traccion,
el siguiente paso con mas diferenciacion es una extension de navegador. Una
app movil nativa se descarto como punto de partida.

Esto significa que el Paso 3 (recorte a MVP, `docs/02-mvp.md`) ya tiene una
hipotesis de partida: no hace falta descubrirla desde cero, aunque el Paso 1
y 2 del metodo (problema, historias) si deben hacerse con rigor — la
decision de *que construir primero* no sustituye a definir *para quien* y
*por que* con precision.

# Restriccion tecnica que hereda este proyecto

El coste variable (Apify/Anthropic por usuario) es real y por-usuario, no
fijo. Cualquier plan tecnico (Paso 5) tiene que dejar claro como se cubre
ese coste o como se limita el uso por usuario.

# Relacionados

- Repo backend: `Docker n8n` (`../../Docker n8n/knowledge/workflows/jobs/`)
- Metodo de construccion: 17 pasos, skills `/paso-01` a `/paso-17`
  (`C:\Users\ganja\.claude\skills\paso-*`)
