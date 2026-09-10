---
type: Arreglo
title: "Guard de sesión en / + guía de 3 pasos + formulario de perfil en secciones (05/09/2026)"
description: "Mar probó la web ella misma antes de pasarla a la clase y la vio poco intuitiva, desordenada y con explicaciones insuficientes — decidió no lanzar la prueba de usabilidad hasta arreglarlo. Bug real confirmado: app/page.tsx (client component) nunca comprobaba la sesión, así que quien ya estaba logueada volvía a ver el formulario de email al visitar / (con el menú de MenuNavegacion pintándose encima, por añadidura). Arreglado con app/page.tsx como Server Component que redirige a /ofertas o /perfil según tenga perfil guardado (lib/perfil.ts centraliza la comprobación, reutilizada por auth/callback). GuiaPasos pasa de 2 a 3 pasos (Pide acceso / Pega tu CV / Mira tus ofertas) y acompaña las 3 pantallas reales, con subtítulo de orientación nuevo en /ofertas. FormularioPerfil se reestructura en secciones numeradas con el bloque opcional (experiencia, salario mínimo) visualmente atenuado. No toca lib/ia.ts ni el esquema de datos: no dispara evals. 352 pruebas (8 nuevas), build y lint en verde; verificado en vivo con la sesión real de Mar. Publicado en rama, sin fusionar a master."
tags: [jobs-app, arreglo, frontend, usabilidad, onboarding, sesion, prueba-usuarios, nextjs]
okf_version: "0.2"
timestamp: 2026-09-05T12:30:00Z
---

# Por qué

Mar probó la web ella misma antes de pasársela a sus 5 compañeras de clase
(preparación del frente 2, `prueba-usuarios-frente-2-prep.md`) y la encontró
poco intuitiva, desordenada y con explicaciones insuficientes. Decisión
explícita: no lanzar ninguna sesión de la prueba de usabilidad hasta que esto
mejore.

Tres quejas concretas, investigadas con una exploración de solo lectura del
código antes de tocar nada:

1. *"Si ya estoy logueada, veo el formulario de email otra vez"* — confirmado
   como **bug real, no percepción**: `app/page.tsx` era un client component
   que nunca comprobaba la sesión (sin `useEffect`, sin `getUser()`, sin
   `redirect()`). El único sitio que decidía "a perfil o a ofertas" era
   `app/auth/callback/route.ts`, y solo corría al pinchar el magic link, nunca
   al visitar `/` con sesión ya activa (pestaña nueva, recargar, atrás). De
   paso, como `app/layout.tsx` sí comprueba sesión para pintar
   `MenuNavegacion`, la usuaria veía el menú de la app **encima** del
   formulario de "pide tu acceso" a la vez — contradice `docs/03-spec.md`
   §3.1 ("vuelve otro día... entra directamente").
2. *"Falta información, está desordenada"* — `components/GuiaPasos.tsx` tenía
   2 pasos y solo se usaba en `/perfil`; nunca se mostraba en `/ofertas` pese a
   que el propio componente ya admitía `pasoActual: 2` — en la práctica,
   ninguna usuaria real veía nunca el paso 2 activo. `/ofertas` tampoco tenía
   ningún texto de orientación.
3. *"El proceso tiene que explicarse mejor"* — `FormularioPerfil.tsx` era un
   formulario largo y plano (nombre → CV → botón IA → puestos → palabras
   clave → checkbox → salario opcional → guardar), todo con el mismo peso
   visual: el salario mínimo (opcional) pesaba igual que el CV (obligatorio).

Decidido explícitamente con Mar (dos preguntas, no una elección empaquetada
dentro de un plan): **extender la guía de pasos existente** en vez de
rediseñar como landing/dashboard nuevo, y **sí reestructurar** el formulario
de perfil en esta misma ronda.

# Qué se cambió

## 1. Guard de sesión en `/`

- **`lib/perfil.ts`** (nuevo): extrae `tienePerfilGuardado(supabase, userId)`
  de la consulta que antes vivía inline en `app/auth/callback/route.ts` — un
  único sitio que decide "¿ya contó su perfil?", reutilizado por las dos
  rutas.
- **`app/page.tsx`**: pasa de client component a **Server Component**.
  Comprueba `supabase.auth.getUser()`; con sesión, `redirect('/ofertas')` o
  `redirect('/perfil')` según `tienePerfilGuardado`; sin sesión, renderiza el
  formulario. El problema del menú superpuesto desaparece sin tocar
  `app/layout.tsx`: en cuanto hay sesión, `/` redirige antes de pintar nada.
- **`components/FormularioAcceso.tsx`** (nuevo): todo el contenido
  `'use client'` que antes vivía en `app/page.tsx` (formulario de email,
  mensajes de error). El componente interno que usa `useSearchParams` se
  renombró de `FormularioAcceso` a `FormularioEmail` para no chocar con el
  nuevo export por defecto del mismo nombre.

## 2. Guía de 3 pasos

`components/GuiaPasos.tsx`: de 2 a 3 pasos — "Pide acceso" / "Pega tu CV" /
"Mira tus ofertas" (`pasoActual: 1 | 2 | 3`). Se muestra siempre en las 3
pantallas: `/` (paso 1, siempre — solo se renderiza sin sesión),
`/perfil` (paso 2, mientras no haya perfil guardado, igual que antes),
`/ofertas` (paso 3, **siempre** — quien no tiene perfil nunca llega aquí, así
que no hace falta ocultarla, y ocultarla tras la primera vista exigiría un
flag nuevo en base de datos, fuera de alcance). Subtítulo nuevo en
`/ofertas`: *"Marca las ofertas que te interesen: en cada una empezamos a
preparar un CV y una carta adaptados, listos para descargar en cuanto
terminen."*

## 3. Formulario de perfil en secciones numeradas

`components/FormularioPerfil.tsx`, cambio puramente de JSX/presentación (sin
tocar `useState`, handlers ni llamadas a `/api/extraer-perfil` o
`/api/perfil`):

- **"1. Tu CV"**: nombre, CV, botón "Analizar con la IA" + microcopy nuevo
  ("Al analizar, sustituimos los puestos y palabras clave que tengas ahora
  mismo por una propuesta nueva basada en este CV. Tarda unos segundos.").
- **"2. Revisa lo que propone la IA"**: puestos + palabras clave.
- **Bloque "Opcional"** (sin número, borde discontinuo, fondo atenuado):
  checkbox de experiencia + salario mínimo — antes pesaban igual que el CV
  obligatorio.
- **"3. Guarda tu perfil"**: mensajes, enlace "Ver mis ofertas →", botón
  Guardar.

# Verificación

- **`npm test`: 352 pruebas en verde** (349 antes + `tests/lib/perfil.test.ts`
  y `tests/app/pagina-inicio.test.tsx`, nuevos; `tests/components/GuiaPasos.test.tsx`
  y `tests/components/PantallaAcceso.test.tsx` reescritos para el nuevo
  componente/3 pasos).
- `npm run lint` y `npx tsc --noEmit` limpios. `npm run build` compila; `/`
  pasa de estático a dinámico (ƒ), correcto porque ahora comprueba sesión en
  cada petición.
- **Verificado en vivo** con la sesión real de Mar (Chrome, `npm run dev`):
  visitar `/` con sesión activa redirige de inmediato a `/ofertas`, sin ver el
  formulario ni el menú superpuesto; `/ofertas` muestra "3. Mira tus ofertas"
  resaltado y el subtítulo nuevo; `/perfil` muestra las 3 secciones numeradas
  y el bloque opcional atenuado con datos reales. Sin errores de consola.
- No toca `lib/ia.ts`, `prompts/system.md` ni ninguna columna de `perfiles`:
  **no dispara `npm run comprobar:esquema` ni los evals**.

# Estado

Rama `mejora-usabilidad-onboarding-05-09` (commit `83c0f62`), subida a
GitHub con permiso explícito de Mar. Robot de publicación en verde (lint +
352 pruebas; evals saltados, motivo "el cambio no toca la IA"). Vista previa
desplegada: `https://jobs-21egjth4a-mcaparrosgu-4812s-projects.vercel.app`.
**Sin fusionar a `master` todavía** — pendiente de que Mar la revise y decida
si esto ya es suficiente para arrancar la prueba de usabilidad con la clase
(`prueba-usuarios-frente-2-prep.md`) o si quiere seguir puliendo algo más.

# Relacionado

- [prueba-usuarios-frente-2-prep.md](prueba-usuarios-frente-2-prep.md) — la
  prueba que este arreglo desbloquea.
- [robustez-demo-frente-1.md](robustez-demo-frente-1.md) — frente 1
  (robustez de errores/descarga), publicado el 02/09; este documento es, en
  la práctica, un frente 1-bis centrado en usabilidad en vez de robustez.
- `docs/03-spec.md` §3.1 — promete la persistencia de sesión y la guía de
  pasos que este arreglo cumple; el texto se actualizó en la misma sesión
  ("en qué paso de los tres está", ya no "de los dos") para que siga
  describiendo el comportamiento real.
