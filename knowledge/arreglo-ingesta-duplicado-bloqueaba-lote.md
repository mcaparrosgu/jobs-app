---
type: Incidente
title: Una oferta duplicada bloqueaba el lote entero de la ingesta diaria
description: 23/08/2026 — el nodo Supabase Insertar oferta de "Jobs App · ingesta" mandaba varias ofertas de golpe; una sola ya existente hacía que Supabase rechazara todo el lote, incluidas las nuevas de verdad. Arreglado con un bucle de una en una.
tags: [jobs-app, n8n, ingesta, supabase, incidente]
okf_version: "0.2"
timestamp: 2026-08-23T10:25:00Z
---

# Qué pasó

Mar probó `/ofertas` tras el rediseño del perfil de hoy y vio "Todavía no
se ha actualizado la lista de ofertas de hoy". Preguntó si había que
esperar a las 13:00 (regla de negocio 6, [`docs/03-spec.md`](../docs/03-spec.md)).

Investigado con las herramientas de n8n-mcp:

1. El workflow `Jobs App · ingesta` (`Rw4dTNjQa5tR3Eo4`) estaba **activo**
   y su disparador (`Schedule Trigger`, 13:00 diario, sin excluir fin de
   semana) estaba **bien configurado**. Pero `search_executions` mostró que
   su **última ejecución real fue el 21/08** — ni el 22 ni el 23 corrió, ni
   automática ni manual. Un disparador programado de n8n solo dispara si
   n8n está corriendo en ese instante exacto; no "recupera" lo que se
   perdió. Causa probable: la instancia (Docker) no estaba encendida a esa
   hora esos días.
2. Confirmado con Mar, se lanzó una ejecución manual (`execute_workflow`,
   id 630). Terminó `status: success`, pero **no se guardó ninguna oferta
   nueva**. Inspeccionando la ejecución nodo a nodo (`get_execution` con
   `includeData`): de 5 ofertas candidatas que pasaron los tres filtros
   (teletrabajo, salario, cualificación), **una ya existía** de un día
   anterior — mismo `fuente` + `id_externo`, que en `ofertas` es
   `unique(fuente, id_externo)` (migración `0002_ofertas.sql`). El nodo
   `Supabase Insertar oferta` mandaba las 5 juntas, Supabase rechazó **el
   lote entero**, y las 4 que sí eran nuevas se perdieron con ellas.

El propio comentario del código de `Generar id_externo`, en el workflow,
decía: *"la tabla ofertas de Supabase ya tiene unique(fuente, id_externo),
asi que una oferta que se repite dos dias seguidos no se duplica (el nodo
Supabase la descarta con onError continueRegularOutput)"* — la intención de
diseño era correcta, pero la comprobación en vivo demostró que **no se
cumplía en la práctica**: el nodo no aislaba los fallos por elemento.

# El arreglo

Confirmado con Mar antes de tocar nada (modificar un workflow en producción
es una acción con efecto real). Insertado un nodo nuevo entre
`Generar id_externo` y `Supabase Insertar oferta`:

- **"Insertar ofertas de una en una"** (`n8n-nodes-base.splitInBatches`,
  `batchSize: 1`), con el bucle cerrado de vuelta sobre sí mismo (patrón
  estándar "Loop Over Items": `main[0]` = hecho, `main[1]` = cada lote).

Así cada oferta candidata es su propia petición a Supabase: una duplicada
falla y se descarta ella sola (`onError: continueRegularOutput`, ya
configurado desde antes), sin arrastrar a las demás.

Conexiones verificadas con `get_workflow_details` antes de publicar
(`publish_workflow` — esta instancia separa borrador de versión activa).

**Verificado con una segunda ejecución manual (id 631)**: de 14 candidatas,
11 se insertaron bien y 3 duplicadas se descartaron individualmente sin
afectar a las demás. `Contar ofertas nuevas hoy` pasó de 0 a 154 para el
día — resuelto también el atasco acumulado de los días 22 y 23, no solo
el de esta ejecución.

# Por qué importa a futuro

El disparo automático de las 13:00 seguirá sin correr los días en que la
instancia de n8n esté apagada a esa hora — eso no lo arregla este cambio,
es una limitación de cómo funciona un disparador programado. Lo que sí
queda arreglado de forma permanente es que, **el día que sí corra**, una
oferta repetida ya no le va a costar también las nuevas.

# Adenda (24/08/2026): mitigado el motivo de que la instancia estuviera apagada

`docker-compose.yml` (repositorio `Docker n8n`, fuera de este bundle) ya
tenía `restart: unless-stopped` en los dos servicios — eso no bastaba,
porque no arranca nada si **Docker Desktop** en sí no está corriendo (el
contenedor no puede reiniciarse si el motor que lo aloja tampoco lo está).
Revisado `%APPDATA%\Docker\settings-store.json`: `"AutoStart": false`. Mar
activó "Start Docker Desktop when you sign in" en Docker Desktop →
Settings → General (T96, `docs/06-tareas.md`).

**Esto reduce el riesgo, no lo elimina del todo**: sigue haciendo falta
haber iniciado sesión en Windows antes de las 13:00 ese día. Si el patrón
de fallos se repite, la alternativa más robusta (no depende de que se haya
iniciado sesión) es una tarea programada de Windows que ejecute
`docker compose up -d` unos minutos antes de las 13:00 — se le planteó a
Mar el 24/08/2026 y de momento prefirió la opción más simple.

# Adenda (23/08/2026, más tarde el mismo día): el bucle rompió el aviso por email

Este mismo arreglo tuvo un efecto secundario no previsto: `Contar ofertas
nuevas hoy` y `Consultar usuarias con perfil` (hasta ahora colgados
directamente de `Supabase Insertar oferta`, con `executeOnce: true` —
[hito-8-aviso-email.md](hito-8-aviso-email.md)) se reengancharon a la salida
"hecho" del nuevo bucle "una en una", y en la reconexión se perdió ese
`executeOnce: true`.

La salida "hecho" de un bucle "una en una" no entrega necesariamente un solo
ítem — en la ejecución real de hoy (632) entregó 5, todos la misma fila de
Mar. Sin `executeOnce`, un nodo se ejecuta una vez POR ÍTEM que recibe: el
Supabase-getAll se disparó 5 veces (mismo resultado cada vez) y el Gmail de
"ofertas nuevas" mandó 5 copias del mismo aviso — Mar reportó 24 emails
acumulados entre varias ejecuciones de hoy.

Arreglado devolviendo `executeOnce: true` a los dos nodos
(`mcp__n8n-mcp__update_workflow`, publicado), verificado con una ejecución
manual nueva (635). Detalle completo en
[`knowledge/log.md`](log.md), entrada del 23/08/2026 (quater).

**Lección**: al reenganchar un nodo a una salida distinta de un bucle
"Loop Over Items", comprobar también sus ajustes de ejecución
(`executeOnce`, `alwaysOutputData`) — la conexión puede cambiar de sitio sin
que el editor visual avise de que un ajuste así se ha perdido.

# Relacionado

- [`knowledge/log.md`](log.md) — entradas del 23/08/2026 (bis) y (quater).
- [`docs/03-spec.md`](../docs/03-spec.md) regla de negocio 6 (renovación
  diaria a las 13:00) y 11 (caducidad de ofertas a 15 días, añadida hoy
  mismo en la sesión anterior).
