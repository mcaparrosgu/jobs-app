---
type: Nota
title: Idea — botón de volver atrás y coherencia de datos entre pantallas
description: Mar pidió apuntar esta mejora para más adelante. Retomado el 19/08/2026 — puntos 1 y 2 ya estaban resueltos por el menú de T77; queda abierto solo el punto 3 (home), con una idea nueva de estadísticas explícitamente fuera del MVP.
tags: [jobs-app, okf, idea, navegacion, ux]
timestamp: 2026-08-19T00:00:00Z
---

# Resuelto el 19/08/2026 (mismo día, retomado a petición de Mar)

Antes de construir nada se preguntó en concreto por los tres puntos de
abajo. Resultado:

1. **"Volver atrás" = solo navegar, sin deshacer nada** (elegido
   explícitamente por Mar entre dos opciones — la otra era permitir
   deshacer acciones puntuales, como quitar un "me interesa").
2. **Las tres pantallas que se plantearon ya estaban cubiertas**: revisando
   el código, `components/MenuNavegacion.tsx` (T77) ya deja ir de
   `/perfil` a `/ofertas` y viceversa con un clic, con la pantalla activa
   subrayada. El tercer caso planteado ("dentro de una tarjeta de oferta en
   generación") **no aplica**: no existe una pantalla propia por oferta,
   todo pasa dentro de la lista `/ofertas` (`components/TarjetaOferta.tsx`),
   así que nunca hay que "volver" desde ahí. Preguntado explícitamente si la
   barra de menú ya era suficiente o hacía falta algo más (un enlace
   "← Volver" contextual, adicional a la barra): **Mar confirma que la
   barra ya es suficiente, no hace falta nada más**. Cerrado sin tocar
   código — no hacía falta ninguna tarea nueva en `docs/06-tareas.md`.
3. **Home (punto 3) sigue abierto**, ver más abajo.

# Home: idea nueva, explícitamente fuera del MVP

Al preguntarle qué quería en el home, Mar propuso una idea concreta —
**estadísticas personalizadas**: cuántas ofertas se encontraron hoy,
cuántos CVs ha generado, una tabla que marque si ya envió el CV a cada
empresa. Ella misma la descarta para ahora: "son funciones secundarias, no
aptas para el MVP" — en particular, no quiere complicarse guardando el
histórico de CVs ni un estado de "enviado" por ahora, y señala que con los
botones de "Ofertas" y "Mi perfil" ya en la barra, el home no necesita ser
también un punto de entrada a eso.

**Nada de esto se construye ahora.** Queda anotado para si se retoma más
adelante (encajaría, por ejemplo, en la idea de "versión consolidada más
allá de las 5 compañeras de bootcamp" de
[idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md)):
haría falta al menos (a) contar ofertas nuevas del día — dato que ya
calcula `Jobs App · ingesta` para el email de aviso (T63) —, (b) contar
generaciones por usuaria — ya existe en `lib/generaciones.ts` para el
límite diario (T56) —, y (c) un estado "enviado a la empresa" que **no
existe en ningún sitio hoy** (ni en `generaciones` ni en ninguna otra
tabla) — sería la pieza nueva de verdad, y la que Mar señala como la que no
quiere abordar todavía.

# Lo que pidió Mar (contexto original, 19/08/2026)

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
