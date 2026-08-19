---
type: Hito
title: Hito 1 completado — la base de datos existe y protege la privacidad
description: Cierre del Hito 1 de docs/06-tareas.md (T09-T14) — las cuatro tablas de Jobs App creadas en Supabase, con RLS activo en las tres personales y lectura compartida en ofertas.
tags: [jobs-app, paso-9, supabase, rls, hito-1]
timestamp: 2026-08-19T00:00:00Z
---

# Que se construyo

Las cuatro tablas del modelo de datos de
[../docs/04-plan-tecnico.md](../docs/04-plan-tecnico.md) §3.4, en Supabase,
cada una en su propia migracion dentro de `supabase/migrations/`:

| Tarea | Tabla | Migracion | Que guarda |
| :---- | :---- | :---- | :---- |
| T09 | `perfiles` | `0001_perfiles.sql` | un perfil por usuaria: puesto, palabras clave, CV pegado |
| T10 | `ofertas` | `0002_ofertas.sql` | ofertas de empleo, compartidas por todas |
| T11 | `intereses` | `0003_intereses.sql` | que usuaria marco "me interesa" en que oferta |
| T12 | `generaciones` | `0004_generaciones.sql` | el CV y la carta ya redactados por la IA |

Y despues, el candado de privacidad (RLS, *Row Level Security*):

| Tarea | Migracion | Regla |
| :---- | :---- | :---- |
| T13 | `0005_rls_privacidad.sql` | en `perfiles`, `intereses`, `generaciones`: cada usuaria solo ve y modifica sus propias filas (`auth.uid() = user_id`) |
| T14 | `0006_rls_ofertas.sql` | en `ofertas`: lectura para cualquiera autenticada, escritura para nadie desde la web (solo n8n, con la service role key) |

# Por que importa

Es la pieza central del requisito de privacidad del proyecto (ver
`CLAUDE.md`, seccion "Datos sensibles"): con 5 personas compartiendo la
app y datos reales (CVs, emails, contactos), el aislamiento entre
usuarias no depende de que el codigo de la web este bien escrito — lo
garantiza la base de datos misma. Aunque hubiera un fallo en Jobs App, no
podria entregar el CV de una compañera a otra.

# Verificado en la practica (2026-08-19, ya no queda pendiente)

El criterio de T14 —"una escritura de prueba desde el navegador da error
de permiso"— quedo sin comprobar al cerrar el Hito 1 y se ha comprobado
ahora, con la **misma clave publica que viaja al navegador**:

| Intento con la clave publica | Resultado |
| :---- | :---- |
| Insertar una oferta | **Bloqueado con error**: `new row violates row-level security policy for table "ofertas"` |
| Borrar una oferta existente | **Sin efecto**: la fila sigue intacta |
| Modificar una oferta existente | **Sin efecto**: la fila sigue intacta |

El borrado y la modificacion no dan error, pero tampoco tocan nada: sin
politica de `delete`/`update`, RLS no deja ninguna fila visible para esas
operaciones. La prueba se hizo sobre una **fila desechable creada y
borrada con la clave de servicio**, nunca sobre las ofertas reales, y se
confirmo despues que las 20 filas seguian intactas.

# Relacionados

- [decision-stack-mvp.md](decision-stack-mvp.md) — por que Supabase.
- [../docs/04-plan-tecnico.md](../docs/04-plan-tecnico.md) §3.4-3.5 — el
  modelo de datos y el diseño de RLS que esto implementa.
- [../docs/06-tareas.md](../docs/06-tareas.md) — Hito 1, T09-T14.
