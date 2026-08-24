---
type: Decision
title: Rediseño de perfil, sugerencias de la IA y caducidad de ofertas
description: T84-T92 (23/08/2026) — quitar teléfono/LinkedIn, varios puestos seleccionables con casillas, autocompletado de palabras clave, y las ofertas caducan a los 15 días.
tags: [jobs-app, perfil, ofertas, ia, prompt, evals]
okf_version: "0.2"
timestamp: 2026-08-23T10:30:00Z
---

# Que cambio y por que

Mar probó la app ya publicada y encontró el formulario de perfil "cutre y
poco práctico": pedía teléfono y LinkedIn (datos que ya suelen venir en el
cuerpo del CV pegado), solo dejaba elegir un puesto, y las palabras clave no
tenían autocompletado. Además quería que las ofertas no desaparecieran de
un día para otro, para poder decidir con más calma si tirar el CV a una.

Antes de construir (con solo 10 minutos de Mar disponibles) se preguntaron
explícitamente 4 decisiones — regla del proyecto de no dar por cerrada una
elección sin preguntarla (`CLAUDE.md`, punto 7):

1. **Nombre**: se mantiene a mano (no lo adivina la IA) — teléfono y
   LinkedIn sí se quitan. Motivo de Mar: la spec ya decía explícitamente que
   el nombre "es un dato suyo, no algo que la IA adivine", para que nunca
   salga mal escrito en un documento oficial.
2. **Puestos**: la IA propone 3-5 alternativas al analizar el CV.
3. **Autocompletado de palabras clave**: la IA amplía la lista al analizar
   el CV (no un diccionario fijo ni datos agregados de otras usuarias).
4. **Caducidad de ofertas**: desaparecen de verdad a los 15 días, no solo
   visualmente.

**Esto revierte una frase explícita de `docs/03-spec.md` §8** ("Fuera de
alcance"), que excluía "varios puestos a la vez en un mismo perfil". La
spec y `docs/02-mvp.md` se actualizaron en la misma sesión (T92) para que
el documento describa lo que la app hace de verdad, no lo que decía antes
de que Mar pidiera el cambio.

# Diseño técnico: aditivo, no destructivo

La decisión de diseño que evitó romper los evals existentes (que ya daban
91,7% en `extraerPerfil`) fue **añadir campos nuevos al esquema de IA en vez
de sustituir los que ya había**:

- `puesto` (el principal, un string) **se queda tal cual** — sigue siendo lo
  que usan los criterios de los 12 casos existentes del golden dataset.
- `puestos_sugeridos` es un campo **nuevo**: 3-5 alternativas, con `puesto`
  añadido siempre al frente en código (`lib/ia.ts`, `validarPerfil`), no
  solo si el modelo lo repite ahí.
- `palabras_clave` (las 8-20 de siempre) **tampoco cambia**.
- `palabras_clave_sugeridas` es **nueva**: una lista más amplia (hasta 30)
  para alimentar el autocompletado del formulario — no tiene que estar
  literalmente en el CV (a diferencia de `empresas_cv`/`titulos_cv`), son
  sugerencias que la usuaria decide si añadir.

Con esto, los 12 casos de `evals/promptfoo/extraer-perfil.yaml` no
necesitaron tocarse uno a uno: se añadieron 2 aserciones nuevas en
`defaultTest.assert` (aplican a los 12 casos por igual, comprobando solo la
FORMA de los dos campos nuevos) en vez de reescribir cada caso.

**Dos trampas encontradas y arregladas en las tres pasadas de evals que
hicieron falta**:

1. El caso A12 (CV completamente vacío, que debe fallar limpio a
   propósito) daba FAIL porque las dos aserciones globales nuevas no
   distinguían "no hay salida que evaluar" de "la salida está mal
   formada" — un fallo controlado (`output.error`) no es un defecto de
   `puestos_sugeridos` en concreto. Arreglado tratando `output.error` como
   PASS en las dos funciones nuevas de `evals/promptfoo/helpers.cjs`,
   igual que ya hacía la aserción `fidelidad` propia de A12.
2. Con eso arreglado, la segunda pasada dio 11/12 (91,7%, el baseline ya
   conocido de este modelo) pero con un fallo DISTINTO: A09 (inyección
   forzando cambio de idioma) fallaba con el mismo 400 de Groq
   `"Generated JSON does not match the expected schema"` que documenta
   `lib/ia.ts` para otras causas. La causa real: `MAX_TOKENS_GROQ_POR_DEFECTO`
   seguía en 700, calibrado para un JSON de 4 campos (200-300 tokens) —
   T86/T88 añadieron `puestos_sugeridos` (hasta 5 puestos más) y
   `palabras_clave_sugeridas` (hasta 30 términos más), y con un CV que
   además arrastra una inyección (más texto que analizar, respuesta más
   larga), el JSON se truncaba a mitad de esas listas nuevas y Groq
   rechazaba la respuesta entera. Subido a 1.100 (`lib/ia.ts`).

**Resultado final, tercera pasada: 12/12 (100%)**. `npm run evals:puerta`
confirma los cinco umbrales de `extraerPerfil` en verde (`formato`,
`calidad_palabras_clave`, `fidelidad`, `idioma`, y `resistencia_inyeccion`
sube de 54,5% a 63,6% al arreglarse A09 — el resto de ese número es el
hallazgo preexistente de `generarCvYCarta`, ver más abajo). T91 cerrada.

**Hallazgo aparte, no de esta sesión**: al ejecutar `npm run evals:puerta`
reutilizando el `resultado-generar.json` existente (no se tocó
`generarCvYCarta`, así que no hacía falta relanzarlo), la puerta dio
**ROJO** por `resistencia_inyeccion` (54,5%, bajo el umbral del 85%) —
pero ese resultado es el mismo hallazgo ya documentado el 21-22/08 en
[paso-13-evals.md](paso-13-evals.md) ("pendiente... antes de invitar a las
compañeras el 24/08"), no algo nuevo de hoy. Sigue pendiente, y no bloquea
este trabajo porque nada de lo de hoy se ha publicado.

# Otros cambios de código

- **Migración de datos** (`supabase/migrations/0017_perfiles_puestos.sql`):
  `perfiles.puesto` (texto) → `perfiles.puestos` (lista). El primer elemento
  de la lista es el que usa `lib/ia.ts` (`puestoMasRelevante`, nueva
  función) como contexto por defecto al generar un CV/carta, eligiendo el
  puesto guardado que más palabras comparte con el título de la oferta
  concreta — no siempre el primero de la lista.
- **Migración** (`0016_quitar_contacto.sql`): se borran `telefono` y
  `enlace` de `perfiles` (añadidos en la 0011). `lib/pdf.tsx` ya no los
  muestra en la cabecera del CV.
- **Ofertas caducan a los 15 días** (`app/api/ofertas/route.ts`,
  `lib/fechas.ts`): un `.gte('ingerida_en', haceDiasEnMadridISO(15))` nuevo
  en la consulta — antes no había ningún corte por fecha, solo un
  `.limit(50)`. `app/ofertas/page.tsx` agrupa visualmente por día
  (`diaEnMadrid`, `etiquetaDiaEnMadrid`) sin volver a ordenar nada: la API
  ya devuelve las ofertas de más reciente a más antigua.

# Relacionado

- [`docs/03-spec.md`](../docs/03-spec.md) §4, §5 (regla 11 nueva), §8.
- [`docs/02-mvp.md`](../docs/02-mvp.md) §3 — B2 ya no está aparcada.
- [`docs/06-tareas.md`](../docs/06-tareas.md) T84-T92.
- [paso-13-evals.md](paso-13-evals.md) — el arnés de evals que estos cambios
  tuvieron que respetar.
