---
type: Decision
title: Alcance del MVP acotado a trabajo remoto asalariado
description: El Paso 1 (docs/00-problema.md) acota el MVP a busqueda de empleo remoto asalariado, descartando freelance y presencial.
tags: [jobs-app, mvp, alcance]
timestamp: 2026-08-18T00:00:00Z
---

# Decision

El MVP de Jobs App se acota a **trabajo remoto asalariado** (se descarta
freelance/autonomo y presencial). Decidido junto con Mar al completar el
Paso 1 del metodo de 17 pasos.

# Por que

- Reduce el espacio de busqueda: las fuentes ya existentes en el backend
  (Adzuna, Jooble, Apify) soportan filtro por remoto.
- Hace el criterio de exito mas nitido: no hay que normalizar entre tipos
  de CV muy distintos (freelance vs. asalariado piden enfoques de CV
  distintos).
- Evita diluir el MVP con casos que el pipeline actual no esta pensado
  para cubrir bien.

# Contexto del usuario objetivo

La persona de referencia para este MVP (Marta, ver
[../docs/00-problema.md](../docs/00-problema.md)) es principiante tecnico,
parte de un grupo de 5 companeros de bootcamp que sirven de testers. Este
es el primer proyecto estructurado de Mar (quien lidera el proyecto) — se
usa apoyo didactico de la skill `/profesora` cuando algo no se entiende a
la primera.

# Criterio de exito derivado

Definido en `docs/00-problema.md` seccion 4: 5 de 5 personas de la clase
usan el MVP con su busqueda real, y se generan al menos 5 CVs adaptados en
total.

# Relacionados

- [../docs/00-problema.md](../docs/00-problema.md) — Paso 1 completo
- [contexto-pipeline-n8n.md](contexto-pipeline-n8n.md) — contexto de
  partida y decision de MVP original
