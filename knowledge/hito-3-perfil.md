---
type: Hito
title: Hito 3 completado — el CV y las palabras clave que propone la IA
description: Cierre del Hito 3 de docs/06-tareas.md (T25-T31) — la IA (OpenRouter, vía lib/ia.ts) extrae puesto y palabras clave de un CV pegado, la usuaria los edita, y el perfil se guarda en Supabase.
tags: [jobs-app, paso-9, ia, openrouter, hito-3]
timestamp: 2026-08-19T00:00:00Z
---

# Que se construyo

La primera llamada real a IA del producto (§2.1 de `docs/05-ia.md`), de
extremo a extremo:

| Tarea | Archivo | Que hace |
| :---- | :---- | :---- |
| T25-T26 | `lib/ia.ts` | llama a OpenRouter con salida estructurada (`response_format: json_schema`) para extraer `puesto`, `palabras_clave`, `empresas_cv`, `titulos_cv`; prueba una lista de 3 modelos gratis intercambiables con reintento de espera creciente si uno falla o satura (§6.7 de `docs/05-ia.md`); valida el resultado por código, sin confiar solo en el esquema |
| T27 | `app/api/extraer-perfil/route.ts` | endpoint que recibe el CV pegado y llama a `extraerPerfil()` |
| T28-T29 | `components/FormularioPerfil.tsx`, `app/perfil/page.tsx` | caja de texto → "Continuar" → puesto y palabras clave editables (borrar con `×`, añadir con Enter o botón) |
| T30 | `components/FormularioPerfil.tsx` | campo de años de experiencia y casilla "tener en cuenta mi CV" |
| T31 | `app/api/perfil/route.ts` (GET+POST) | guarda el perfil (upsert por `user_id`) y lo recarga al volver a `/perfil`, precargando el formulario ya en modo edición |

# Verificado en la práctica

Supervisado en Chrome con un CV de prueba ficticio (no de ninguna
compañera real): pegar el CV propuso un puesto y 9 palabras clave
razonables, editarlas y guardarlas persistió correctamente — comprobado
también por API (`GET /api/perfil`) y con una recarga real de página.

**Incidente de la propia sesión de prueba, no de la app**: la primera
comprobación de "recargar y ver los mismos datos" (criterio de T31) pareció
fallar — el formulario volvía a aparecer vacío tras "navegar" a la misma
URL. La consola mostró un error de *hydration mismatch* de React. Se
investigó a fondo antes de tocar el código: el servidor sí tenía y sí
mandaba el perfil guardado en cada request (confirmado leyendo
`node_modules/next/dist/docs/` de esta versión de Next.js 16 y probando
`fetch('/api/perfil')` directamente desde la consola del navegador). La
causa real era que la herramienta de automatización de navegador estaba
haciendo una navegación "blanda" (interceptada por el router de Next,
que en esta versión preserva el estado de los Client Components entre
navegaciones — ver "UI state preservation" en la documentación de Cache
Components), no una recarga real. Con `Ctrl+Shift+R` (recarga dura) el
perfil se cargó correctamente a la primera. **No hay ningún cambio de
código derivado de esto** — queda anotado porque el mismo patrón puede
confundir en pruebas futuras con esta herramienta.

# Por que importa

Cierra la historia B2 (regla de negocio 4): la usuaria ya no tiene que
inventar sus propias palabras clave desde cero, la IA le da un punto de
partida a partir de su CV real, y ella conserva la última palabra
(edición libre antes de guardar). Es también la primera vez que el cambio
de proveedor de IA (Groq → OpenRouter, ver
[decision-modelo-ia.md](decision-modelo-ia.md)) se pone a prueba con una
llamada real, con éxito.

# Relacionados

- [decision-modelo-ia.md](decision-modelo-ia.md) — por qué `lib/ia.ts`
  llama a OpenRouter y no a Groq, y por qué hay una lista de modelos en
  vez de uno fijo.
- [hito-2-entrar.md](hito-2-entrar.md) — la sesión de la que depende
  `/perfil` para saber quién es la usuaria.
- [../docs/05-ia.md](../docs/05-ia.md) §2.1 y §6 — el diseño y las
  defensas contra fallos que este hito implementa.
- [../docs/06-tareas.md](../docs/06-tareas.md) — Hito 3, T25-T31.
