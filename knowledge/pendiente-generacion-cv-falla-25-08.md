---
type: Incidente
title: Generar CV y carta falla en producción con una usuaria real (25/08/2026)
description: "PRIMERA TAREA de la próxima sesión. Dos problemas encadenados: la migración 0018 nunca se aplicó (los CVs ya generados son invisibles), y la generación de CV falla de verdad en producción — la misma señal que T95 lleva dos días sin poder confirmar."
tags: [jobs-app, incidente, produccion, ia, supabase, migraciones]
okf_version: "0.2"
timestamp: 2026-08-25T11:40:00Z
---

# Lo primero que hay que hacer al retomar

Mar pidió expresamente **no arreglar nada el 25/08 por la tarde** y dejarlo
anotado para empezar por aquí. Son **dos problemas distintos y encadenados**.
El segundo es el importante.

---

# Problema 1 — La migración 0018 nunca se aplicó (los CVs ya hechos son invisibles)

`supabase/migrations/0018_generaciones_rehechos.sql` (T93, botón "Rehacer")
**está escrita en el repositorio pero nunca se ejecutó en Supabase**. La
columna `generaciones.rehechos` no existe en la base de datos.

Verificado el 25/08 consultando el esquema real. Columnas que sí tiene
`generaciones`:

```
id, user_id, oferta_id, estado, cv_texto, carta_texto, error_mensaje,
creado_en, iniciado_en, avisos, puesto_texto, intentos_fallidos
```

**El resto del esquema sí está al día** — se comprobaron `perfiles`,
`ofertas`, `intereses`, `generaciones`, `extracciones` y `metricas_ia`
contra lo que pide el código. Solo falta esta columna.

## Consecuencia real, en producción

`app/api/ofertas/route.ts` pide `generaciones.rehechos` en su `select`. La
consulta falla entera. El código está escrito para **degradar, no caerse**:

```ts
if (errorGeneraciones) {
  console.error('Error consultando generaciones:', errorGeneraciones);
} else { /* rellena el mapa */ }
```

Así que se traga el error y devuelve el mapa de generaciones **vacío**.
Resultado para cualquier usuaria: **todas las tarjetas muestran "Preparar mi
CV y mi carta"** como si no hubiera generado nada nunca, y **los CVs ya
preparados no se pueden ver ni descargar**.

Mar tenía **7 generaciones guardadas** (6 en estado `listo`, 1 en `error`) y
no veía ninguna.

## El arreglo (no ejecutado — pendiente de Mar)

En el SQL Editor de Supabase, en una sola línea (ver
[[project_supabase_sql_editor_gotcha]]):

```sql
alter table public.generaciones add column if not exists rehechos int not null default 0;
```

Aditiva e idempotente: no borra ni cambia nada, y ejecutarla dos veces no
hace daño. Conviene añadir también el `comment on column` que trae la
migración original.

> Intentado el 25/08 desde el navegador con permiso de Mar; **el clasificador
> de seguridad de Claude Code bloqueó escribir SQL contra la base de datos de
> producción**. No se buscó rodeo. Lo ejecuta Mar a mano, o se pide permiso
> explícito para esa acción.

## Por qué importa más allá del síntoma

Es **la segunda vez en dos días** que un desajuste entre las migraciones del
repositorio y el esquema real de Supabase rompe producción:

- 24/08: el código publicado pedía `perfiles.puesto`, ya borrada por la
  migración 0017 → "No se pudo leer tu perfil"
  ([incidente-esquema-desajuste-24-08.md](incidente-esquema-desajuste-24-08.md)).
- 25/08: el código publicado pide `generaciones.rehechos`, que la migración
  0018 nunca llegó a crear.

Las migraciones de este proyecto **se aplican a mano** en el SQL Editor, sin
nada que compruebe que se hizo. Propuesta para la próxima sesión: una
comprobación —prueba automática o paso del robot de publicación— que valide
que el esquema real tiene lo que el código pide, **antes** de publicar.

---

# Problema 2 — La generación de CV falla de verdad (lo importante)

Con producción ya actualizada (commit `0ddd243`, desplegado y verificado),
Mar entró, vio sus ofertas, marcó una y pidió generar el CV. Respuesta:

> "Ha fallado varias veces seguidas para esta oferta. Puede que haya un
> problema con esta oferta en concreto: prueba con otra, o inténtalo de nuevo
> más tarde. **Reintentar**"

## Qué significa ese mensaje exactamente

Viene de `app/api/generar/route.ts`. **No es un bloqueo preventivo**: se
llega a él desde el `catch`, es decir, **la generación se intentó de verdad y
falló de verdad**.

```ts
const intentosPrevios = generacion?.intentos_fallidos ?? 0;
const intentosFallidos = intentosPrevios + 1;
if (intentosFallidos >= UMBRAL_FALLOS_HUMANO) {   // UMBRAL = 3
  mensaje = 'Ha fallado varias veces seguidas para esta oferta...';
  console.error(`[GUARDRAIL:fallos-repetidos] user=... oferta=... intentos=...`);
}
```

**Matiz importante y engañoso**: `intentos_fallidos` es **acumulativo por
(usuaria, oferta) y solo se resetea a 0 cuando una generación termina bien**.
Una oferta que ya falló 3 veces ayer mostrará este mensaje de "varias veces
seguidas" **en el primer fallo de hoy**. El mensaje no dice *cuándo* fueron
esos fallos, así que no se puede deducir de él que el problema sea de hoy ni
que sea de esa oferta en concreto.

## Por qué esto es la señal que faltaba

**T95 lleva dos días sin poder confirmarse**: los 13 casos de
`generarCvYCarta` fallaron el 24/08 casi todos por timeout de Cloudflare, y
se atribuyó a cupo agotado
([arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md)). Se dejó
dicho: *"si vuelve a fallar el 100% con cuota fresca, ya no es explicable por
cupo agotado"*.

Pues bien: **ha fallado con una usuaria real, en producción, con cuota
fresca del día y con T99 ya hecha** (las claves de Cloudflare están en
Vercel desde esta mañana, así que ya no cae al respaldo de OpenRouter). Esto
apunta a que `generarCvYCarta` está **genuinamente roto**, no a un artefacto
de los evals ni a falta de cupo.

Recordatorio de contexto: `generarCvYCarta` usa en Cloudflare un modelo
**distinto** al de `extraerPerfil` desde el 23/08 —
`@cf/google/gemma-4-26b-a4b-it`, no `mistral-small-3.1-24b-instruct`— y
**nunca se ha visto una tanda de evals con señal de contenido real de ese
modelo**: todos los intentos murieron antes por timeout.

## Por dónde empezar a diagnosticar

1. **Los logs de Vercel son la vía más directa** y todavía no se han mirado.
   Dan el error real (timeout, 429, 401, fallo de validación), no el mensaje
   suavizado para la usuaria. Buscar la línea `[GUARDRAIL:fallos-repetidos]`
   y el `console.error('Error generando el CV y la carta:', error)` que la
   precede. Datos para las herramientas de Vercel:
   - `teamId`: `team_re1pN0Cr5HU7wbuaIKJ5NMPR`
   - `projectId`: `prj_2W8yk0mwvGZZ3uyBwwVxuI1DNL38`
     (de `.github/workflows/publicar.yml`)
   - **Ojo**: `list_projects` devolvió lista vacía para ese equipo el 25/08;
     usar el `projectId` directamente.
2. **Distinguir el tipo de fallo**: la respuesta lleva `422` si el documento
   llegó pero no pasó los guardrails (`esErrorDeContenido`), y `502` si falló
   el proveedor. Son dos investigaciones muy distintas: 422 apunta a
   `lib/verificarCv.ts` / `lib/guardrails.ts`; 502, a Cloudflare (timeout de
   34 s, `TIMEOUT_CLOUDFLARE_GENERACION_MS`) o a la cascada de `RONDAS_MODELOS`.
3. **Tabla `metricas_ia`** (Paso 17): cada intento deja fila con `exito`,
   `motivo_fallo` (`error_contenido` vs `error_proveedor`), `proveedor` y
   `duracion_ms`. Es la vía más barata de ver el patrón sin gastar cuota:
   si `duracion_ms` ronda los 34.000, es el timeout.
4. Solo después, si hace falta, relanzar T95.

## Datos ya recogidos el 25/08 (para no repetirlos)

Las 7 generaciones de Mar, consultadas directamente en Supabase:

- **6 en estado `listo`** — de ellas, 2 con avisos de `verificarCv` sobre
  términos que no aparecen en el CV original (`"Advanced"`, `"English"`,
  `"Tools"`, `"Spanish"`, `"Native"`, `"Advertising"` en una; `"Mapping"`,
  `"Optimization"`, `"Automation"`… y "18 avisos más parecidos" en otra).
  Vale la pena mirar si esos avisos son falsos positivos: son casi todos
  palabras sueltas en inglés de secciones de idiomas y herramientas.
- **1 en estado `error`**, con exactamente el mensaje del umbral de fallos.

---

# Estado de lo demás al cerrar el 25/08

Todo esto **sí quedó terminado y verificado**, no hay que volver:

- **T105**: `/ofertas` ya no tapa las ofertas de días anteriores.
- **T106**: sin perfil guardado, `/ofertas` lleva a `/perfil`.
- **T107**: las vistas previas ya pueden iniciar sesión (Redirect URL con
  comodín en Supabase Auth).
- **T99**: claves de Cloudflare en Vercel.
- **T100**: cumplida por primera vez (rama + vista previa antes de publicar).
- Fusionado a `master` y **desplegado a producción** (`0ddd243`), robot en
  verde. Mar confirmó que ve sus ofertas.

# Relacionado

- [incidente-ofertas-tapadas-25-08.md](incidente-ofertas-tapadas-25-08.md) —
  los tres arreglos de esta sesión.
- [incidente-esquema-desajuste-24-08.md](incidente-esquema-desajuste-24-08.md) —
  el mismo tipo de desajuste, dos días antes.
- [arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md) — por qué
  T95 sigue sin confirmarse.
- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md) — el
  modelo que usa `generarCvYCarta`.
- [paso-17-vigilancia.md](paso-17-vigilancia.md) — la tabla `metricas_ia`.
- `docs/06-tareas.md` — T108, T109.
- `docs/07-emergencia.md` — cómo deshacer una publicación.
