---
type: Decision
title: Lista de tareas del MVP — 74 tareas en 10 hitos
description: Decision del Paso 7 sobre como se trocea la construccion del MVP en tareas de menos de una hora, verificables sin saber programar.
tags: [jobs-app, paso-7, tareas, implementacion]
timestamp: 2026-08-18T00:00:00Z
---

# Decision

`docs/06-tareas.md` trocea la construccion del MVP en **74 tareas**
(T01-T74), agrupadas en **10 hitos**, cada una con: que archivos toca, como
Mar comprueba que esta bien sin saber programar, de que depende, y una
casilla para marcarla.

# Los 10 hitos, y que se ve al terminar cada uno

0. Entorno — pagina propia en `localhost`.
1. Base de datos — 4 tablas en Supabase con RLS activado.
2. Entrar — acceso por enlace de email funcionando de punta a punta.
3. Perfil — CV pegado, puesto y palabras clave propuestos por la IA.
4. n8n → Supabase — la tabla `ofertas` se rellena sola.
5. Ver ofertas — lista filtrada + "me interesa".
6. Generar con IA — CV y carta generados, con las verificaciones del
   Paso 6 (cifras y empresas contra el CV original).
7. PDF — documento descargable con salto de pagina forzado.
8. Aviso por email — n8n envia el correo cuando hay ofertas nuevas.
9. Publicar — despliegue real en Vercel, con parada explicita antes de
   subir a GitHub.

# Hallazgo importante: n8n necesita cambios, no solo la web

El plan tecnico (`docs/04-plan-tecnico.md` §3.2) da por hecho que n8n
escribe las ofertas en Supabase, pero el workflow real
(`Jobs · ingesta`, ver `Docker n8n/knowledge/workflows/jobs/`) hoy escribe
en una hoja de Google Sheets, no en Supabase. Se anadieron tareas
explicitas (T32-T38, T61-T66) para modificar ese workflow: escribir en
Supabase, anadir el borrado a 30 dias (regla 10, que tampoco existia
todavia) y anadir el aviso condicional por email (regla 8). Sin estas
tareas el plan tecnico no se sostendria en produccion.

# Convenciones de trazabilidad

Cada regla de negocio de `docs/03-spec.md` queda cubierta por al menos una
tarea: privacidad → T13/T14; opt-in de generacion → T43-T50; emparejamiento
→ T30/T40; propuesta editable → T29; limite de 5/dia → T54; renovacion
compartida 13:00 → T33-T37; snapshot → T51 (ausencia de regeneracion
automatica); aviso condicional → T63; caducidad 15 dias → T16; retencion
1 mes → T35.

# Relacionados

- [../docs/06-tareas.md](../docs/06-tareas.md) — la lista completa.
- [decision-rol-ia.md](decision-rol-ia.md) — las verificaciones que T52/T53
  implementan.
- [decision-stack-mvp.md](decision-stack-mvp.md) — las piezas que estas
  tareas construyen.
