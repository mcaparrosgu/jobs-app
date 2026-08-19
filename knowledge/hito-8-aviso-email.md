---
type: Tarea
title: Hito 8 — aviso por email cuando hay ofertas nuevas
description: Cierre de T63-T67 (Paso 9) en el workflow Jobs App · ingesta — cuenta ofertas nuevas del día, consulta usuarias con perfil y envía un aviso por Gmail solo si hay ambas cosas (regla de negocio 8).
tags: [jobs-app, n8n, supabase, gmail, hito-8, okf]
timestamp: 2026-08-19T18:40:00Z
---

# Qué se construyó

Cinco nodos nuevos al final de `Jobs App · ingesta` (`Rw4dTNjQa5tR3Eo4`),
colgados en paralelo de `Supabase Insertar oferta`:

- **`Contar ofertas nuevas hoy`** (T63): Supabase `getAll` sobre `ofertas`
  filtrando `ingerida_en >= inicio del día`. `executeOnce: true` — sin esto,
  al recibir varios ítems de `Supabase Insertar oferta` se ejecutaría una vez
  por oferta insertada en vez de una sola vez por corrida.
- **`Consultar usuarias con perfil`** (T64): Supabase `getAll` sobre una
  vista nueva, `perfiles_con_email` (ver más abajo), también con
  `executeOnce: true`.
- **`If hay ofertas nuevas`** (T65): compara
  `{{ $('Contar ofertas nuevas hoy').all().length > 0 }}`. Rama verdadera →
  envío del email; rama falsa → `Sin ofertas nuevas, no se avisa` (NoOp, solo
  para que el lienzo se lea sin ambigüedad).
- **`Enviar aviso de ofertas nuevas`** (T66-T67): Gmail, un envío por
  usuaria con perfil (una por ítem). Asunto y cuerpo fijos en castellano,
  saludo con el nombre si existe, enlace de vuelta a la web. Sin detalle de
  ofertas en el cuerpo (fuera de alcance, `docs/03-spec.md` §8) y sin enlace
  de acceso: el enlace es simple porque la sesión ya dura 15 días (regla de
  negocio 9) — no hace falta un magic link nuevo, la usuaria ya está
  identificada en su dispositivo.

**Por qué dos nodos en paralelo y no uno encadenado del otro**: si
`Contar ofertas nuevas hoy` se conectara antes de `Consultar usuarias con
perfil`, un día sin ofertas nuevas (0 ítems de salida) dejaría sin ejecutar
todo lo que viene después, incluido el `If` — perdiendo el control explícito
de la regla 8. Colgando ambos directamente de `Supabase Insertar oferta`,
cada uno se ejecuta siempre exactamente una vez, y el `If` lee el conteo por
nombre (`$('Contar ofertas nuevas hoy').all().length`) en vez de depender de
que los ítems fluyan por el mismo cable.

# El hueco que apareció: no hay dónde leer el email

`perfiles` no guarda el email — vive solo en `auth.users` (Supabase Auth),
tabla que PostgREST no expone por defecto. Dos opciones sobre la mesa:
duplicar el email en `perfiles`, o crear una vista que lo una desde
`auth.users`. Se preguntó a Mar explícitamente (regla del propio
`CLAUDE.md`) y eligió la vista, para que el dato nunca se desincronice si
alguien cambia su email de acceso.

**`supabase/migrations/0012_vista_perfiles_email.sql`**: vista
`public.perfiles_con_email` (id, user_id, nombre, email), con
`revoke all ... from anon, authenticated` y `grant select ... to
service_role` explícitos — doble candado, aunque ninguno de esos dos roles
tendría RLS que se lo permitiera de todas formas. Solo la credencial de
servicio que usa n8n puede leerla; la web nunca la toca.

# El enlace del email: variable de entorno nueva en el n8n autoalojado

El email necesita una URL a la que enlazar, y la web todavía no tiene
dirección pública (Hito 9 sin empezar). Se añade `APP_URL_JOBS_APP` en
`Docker n8n/.env` (+ `.env.example` + passthrough en `docker-compose.yml`),
provisional a `http://localhost:3000/ofertas` — mismo patrón que
`HEALTHCHECKS_PING_URL_JOBS_APP` (T38). **Pendiente para T74-T76**: cambiar
su valor a la URL real de Vercel cuando se publique, y reiniciar el
contenedor de n8n otra vez para que recoja el cambio.

De paso se corrigió una inconsistencia menor que ya existía: la variable
`HEALTHCHECKS_PING_URL_JOBS_APP` de T38 nunca se había añadido a
`.env.example`, contra la propia regla del `CLAUDE.md` de ese repo
("mantenerlo en paso con `.env`").

Aplicar la variable nueva exigió reiniciar el contenedor `dockern8n-n8n-1`
(`docker compose up -d n8n`, sin tocar `postgres`). Igual que en T38, los
workflows `Jobs` originales se comprobaron activos e intactos después del
reinicio (`search_workflows`).

# Verificación (T67)

Ejecución manual real del workflow completo (ejecución 611, éxito, 48 s):

- `Contar ofertas nuevas hoy` → 5 ofertas nuevas ese día.
- `Consultar usuarias con perfil` → 1 fila (Mar, única con perfil guardado
  en esta prueba), con `nombre` y `email` resueltos correctamente desde la
  vista.
- `If hay ofertas nuevas` → rama verdadera (1 ítem), rama falsa sin
  ejecutar.
- `Enviar aviso de ofertas nuevas` → envío real, email de Gmail devuelto con
  `id` y etiquetas `SENT`/`INBOX`. Aviso recibido de verdad en la bandeja de
  Mar.

Workflow publicado (`publish_workflow`) tras la prueba. **Queda pendiente
que Mar confirme la ejecución real de las 13:00 de mañana** (T68) — la
prueba manual da alta confianza, pero el criterio de la tarea es
explícitamente la corrida programada, no la manual.

# Relacionado

- [`docs/06-tareas.md`](../docs/06-tareas.md) — T63-T68 (Hito 8).
- [`hito-4-n8n-supabase.md`](hito-4-n8n-supabase.md) — el workflow base
  sobre el que se cuelgan estos nodos, y el precedente de
  `HEALTHCHECKS_PING_URL_JOBS_APP` que sigue este mismo patrón de variable
  de entorno.
- `supabase/migrations/0012_vista_perfiles_email.sql` — la vista de la que
  depende T64.
