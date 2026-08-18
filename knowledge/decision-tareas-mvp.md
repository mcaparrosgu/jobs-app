---
type: Decision
title: Lista de tareas del MVP — 74 tareas en 10 hitos
description: Decision del Paso 7 sobre como se trocea la construccion del MVP en tareas de menos de una hora, verificables sin saber programar.
tags: [jobs-app, paso-7, tareas, implementacion]
timestamp: 2026-08-18T00:00:00Z
---

# Decision

`docs/06-tareas.md` trocea la construccion del MVP en **76 tareas**
(T01-T76), agrupadas en **10 hitos**, cada una con: que archivos toca, como
Mar comprueba que esta bien sin saber programar, de que depende, y una
casilla para marcarla.

# Los 10 hitos, y que se ve al terminar cada uno

0. Entorno — pagina propia en `localhost`.
1. Base de datos — 4 tablas en Supabase con RLS activado.
2. Entrar — acceso por enlace de email funcionando de punta a punta.
3. Perfil — CV pegado, puesto y palabras clave propuestos por la IA.
4. n8n → Supabase — la tabla `ofertas` se rellena sola, desde un workflow
   **nuevo** (`Jobs App · ingesta`), sin tocar los existentes.
5. Ver ofertas — lista filtrada + "me interesa".
6. Generar con IA — CV y carta generados, con las verificaciones del
   Paso 6 (cifras y empresas contra el CV original).
7. PDF — documento descargable con salto de pagina forzado.
8. Aviso por email — n8n envia el correo cuando hay ofertas nuevas.
9. Publicar — despliegue real en Vercel, con parada explicita antes de
   subir a GitHub.

# Restriccion dura: los workflows Jobs existentes NO se tocan

`Jobs · ingesta`, `Jobs · generacion CV`, `Jobs · seguimiento` y
`Jobs · archivado` (ver `Docker n8n/knowledge/workflows/jobs/`) son la
**busqueda de empleo real de Mar, en produccion**. Jobs App es un producto
distinto, para 5 personas.

La primera version de este documento planteaba modificar `Jobs · ingesta`
para que escribiera en Supabase. **Mar lo corrigio expresamente**: se copia
el JSON y se adapta un **workflow nuevo e independiente**,
`Jobs App · ingesta`, con su propio Schedule Trigger y su propio vigilante
de Healthchecks. Estimacion de Mar: ~30 minutos, porque las 11 fuentes y
sus normalizadores vienen ya hechos en la copia y solo cambia la parte
final (destino Supabase en vez de Google Sheets, borrado a 30 dias por la
regla 10, y aviso condicional por email por la regla 8).

Ventaja evidente en retrospectiva: la busqueda de empleo real de Mar no
puede romperse por un fallo del proyecto de clase, y los dos flujos pueden
evolucionar por separado.

# Convenciones de trazabilidad

Cada regla de negocio de `docs/03-spec.md` queda cubierta por al menos una
tarea: privacidad → T13/T14; opt-in de generacion → T45-T52; emparejamiento
→ T30/T42; propuesta editable → T29; limite de 5/dia → T56; renovacion
compartida 13:00 → T33-T39; snapshot → T53 (ausencia de regeneracion
automatica); aviso condicional → T65; caducidad 15 dias → T16; retencion
1 mes → T37.

# Relacionados

- [../docs/06-tareas.md](../docs/06-tareas.md) — la lista completa.
- [decision-rol-ia.md](decision-rol-ia.md) — las verificaciones que T52/T53
  implementan.
- [decision-stack-mvp.md](decision-stack-mvp.md) — las piezas que estas
  tareas construyen.
