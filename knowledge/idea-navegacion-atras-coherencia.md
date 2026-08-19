---
type: Nota
title: Idea — botón de volver atrás y coherencia de datos entre pantallas
description: Mar pidió apuntar esta mejora para más adelante, no implementarla ahora — falta un botón para volver atrás en el proceso, con los datos guardados y coherentes entre pantallas, y algo en el home de la web.
tags: [jobs-app, okf, idea, navegacion, ux]
timestamp: 2026-08-19T00:00:00Z
---

# Lo que pidió Mar

Al cerrar el arreglo del idioma del CV (19/08/2026), Mar señaló tres cosas
para más adelante, explícitamente sin pedir que se construyan todavía:

1. Un botón para **volver atrás** en el proceso (perfil → ofertas →
   generación), en vez de depender solo del botón atrás del navegador.
2. Que al volver atrás, **los datos se mantengan guardados y coherentes**
   en todas las pantallas — no perder ni contradecir lo que ya se hizo en
   un paso anterior.
3. Algo en el **home de la web** — no especificó qué. Puede estar
   relacionado con lo anterior (un punto de entrada claro al estado actual
   del proceso) o ser una cosa aparte; no se le ha preguntado todavía.

# Por qué no se ha diseñado aquí

Es una petición explícita de "apúntalo, no lo hagas ahora". Además, antes
de diseñar la solución habría que preguntarle a Mar qué significa "volver
atrás" en concreto en esta app (¿deshacer "me interesa"? ¿editar el perfil
sin perder las ofertas ya emparejadas? ¿un breadcrumb?) y qué quiere en el
home — decisiones reales entre varias opciones que no se le han planteado
(regla del proyecto: no cerrar una elección sin habérsela preguntado
explícitamente).

# Contexto técnico relevante para cuando se retome

- El estado de cada oferta (`interesada`, `generacion`) ya vive en Supabase
  y se lee en el servidor al cargar `/ofertas` (RLS, aislado por usuaria) —
  la persistencia entre pantallas ya existe a nivel de datos; lo que falta
  es la navegación y quizás alguna pantalla que hoy no relee ese estado.
- `components/TarjetaOferta.tsx` ya maneja el estado optimista en el
  cliente (`interesada`, `generacion`, `limite`) — cualquier navegación
  nueva tiene que respetar esa misma fuente de verdad para no desincronizar
  la pantalla del dato guardado.
- Precedente de una mejora similar, ya construida: `mejora-navegacion.md`
  (T77-T80) — menú permanente, cerrar sesión, aterrizaje condicional del
  enlace del email. Este mismo enfoque (mejora post-hito, troceada en
  tareas pequeñas) encaja bien para esto.

# Siguiente paso, cuando Mar quiera retomarlo

Preguntarle en concreto: qué pantallas necesitan el botón de volver, qué
significa "volver" en cada una (deshacer vs. solo navegar), y qué contenido
quiere en el home. Después, probablemente como una tarea nueva en
`docs/06-tareas.md` (mismo patrón que T77-T80), no como un rediseño de la
estructura existente.

# Relacionado

- [mejora-navegacion.md](mejora-navegacion.md) — precedente directo.
- [hito-5-ver-ofertas.md](hito-5-ver-ofertas.md) — dónde vive hoy el estado
  de "me interesa" que cualquier navegación nueva tendría que respetar.
