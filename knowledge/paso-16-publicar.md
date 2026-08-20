---
type: Decision
title: Paso 16 — Publicación con puerta de calidad, vista previa y marcha atrás
description: La publicación deja de ser automática de Vercel y pasa a un robot de GitHub Actions que solo publica si lint, pruebas y (cuando el cambio toca la IA) los evals del Paso 13 superan sus umbrales. Incluye vistas previas protegidas, entrada cerrada por invitación y docs/07-emergencia.md.
tags: [jobs-app, publicacion, vercel, github-actions, evals, puerta-calidad, paso-16, okf]
timestamp: 2026-08-20T17:30:00Z
---

# El punto de partida

La app ya estaba publicada desde el [Hito 9](hito-9-publicar.md): repositorio
privado en GitHub, proyecto en Vercel y primer recorrido probado desde el
móvil. El Paso 16 no era, por tanto, "publicar", sino **proteger lo ya
publicado**.

Dos hechos del estado real motivaron casi todo lo que sigue:

1. **Los 7 despliegues existentes eran de producción.** Ni una sola vista
   previa: cada push a `master` iba directo a la web que ven las cinco
   usuarias, sin ninguna comprobación por el camino.
2. **La entrada estaba abierta.** `signInWithOtp` sin `shouldCreateUser:false`
   y el registro habilitado en Supabase: cualquiera que diera con la URL se
   convertía en usuaria. Ya lo había señalado el
   [red team](paso-15-revision-opus.md); aquí se cierra.

# Las cuatro decisiones de Mar

Preguntadas una a una, con las opciones y sus costes reales sobre la mesa
(regla 7 de `CLAUDE.md`).

## 1. La puerta bloquea, no avisa

Vercel deja de publicar por su cuenta. Publica un workflow de GitHub Actions
(`.github/workflows/publicar.yml`) y **solo si las comprobaciones pasan**.

La alternativa descartada era dejar que Vercel publicara y que el robot avisara
después por email. Se descartó por un detalle del caso concreto: las cinco
compañeras entran **una vez, el día que Mar se lo enseña**. Un fallo de veinte
minutos no se diluye como en una app de uso diario — se lleva por delante la
única oportunidad.

Coste asumido: un `VERCEL_TOKEN` guardado como secreto del repositorio, y una
pieza más que mantener.

## 2. Los evals solo cuando el cambio toca la IA

El robot mira los archivos del commit. Si toca `lib/ia.ts`,
`prompts/system.md`, `lib/guardrails.ts`, `lib/verificarCv.ts` o `evals/`,
lanza los 25 casos. Si no, se los salta.

**El número que decidió esto**: una pasada completa consume unos **105.000
tokens**, más o menos **la mitad de los 200.000 diarios** de la capa gratuita
de Groq. Con 25 casos que llaman a la IA más 10 aserciones `llm-rubric` que
consultan al modelo juez (también en Groq), correrlos en cada push habría
dejado a la app sin gasolina en dos pushes. Y como 5 usuarias × 5 documentos
son 25, y el día da para ~30: **una pasada de evals y una clase entera usando
la app no caben el mismo día.**

Se añadió un **freno manual**: `[sin evals]` en el mensaje del commit los
salta a conciencia (lint y pruebas siguen corriendo). Sirve para el caso real
de "los lancé a mano hace diez minutos" o "voy a enseñar la app esta tarde y
necesito la cuota entera". Queda escrito en el historial, que es lo que lo
hace honesto.

Esto automatiza la regla que ya estaba escrita a mano en `CLAUDE.md` desde el
[Paso 13](paso-13-evals.md).

## 3. Entrada cerrada por invitación

Se apaga el registro en Supabase (*Authentication → Sign In / Providers →
Allow new users to sign up*) y Mar invita a las cinco desde el panel.

**Por qué en Supabase y no en el código**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
viaja al navegador por definición, así que una comprobación en la web es un
cartel de "solo socios" con la puerta de servicio abierta — se puede llamar a
Supabase directamente saltándose la pantalla. Cerrarlo en Supabase es el mismo
principio que ya sostiene [RLS](hito-1-base-de-datos.md): **la garantía no
depende de que el código esté bien escrito.**

`shouldCreateUser: false` se añade igualmente en `app/page.tsx`, pero no como
barrera: como forma de dar un mensaje honesto ("ese email no está en la lista
de personas invitadas") en vez de un error genérico.

**Es además el tope de gasto más eficaz del sistema.** Los límites de
`lib/generaciones.ts` (5 documentos/día) y `lib/extracciones.ts` (10
análisis/día) se aplican *por persona*: sin lista cerrada, seis desconocidos
agotan la cuota diaria de Groq entera.

## 4. Vistas previas protegidas

*Vercel Authentication* activado **solo para preview** (`deploymentType:
"preview"`), gratis en el plan Hobby, sin tocar producción.

El motivo concreto: una vista previa es una app completa funcionando y
**enchufada a la misma base de datos de Supabase que producción**, con los CVs
reales dentro. Sus URLs quedan además escritas para siempre en el historial de
GitHub. Se descartó montar una Supabase aparte para pruebas: es gratis, pero
obliga a mantener dos bases de datos sincronizadas con sus migraciones y su
correo — más trabajo del que ahorra para cinco usuarias.

Contrapartida aceptada: para abrir un preview desde el móvil hay que iniciar
sesión en `vercel.com` en ese móvil una vez.

# Qué se construyó

| Pieza | Para qué |
| :---- | :---- |
| `.github/workflows/publicar.yml` | El robot: decidir → comprobar → evals → publicar |
| `evals/puerta-calidad.mjs` | Lee los resultados de Promptfoo y da el veredicto |
| `evals/umbrales.json` | Los cinco umbrales del Paso 13, editables sin tocar código |
| `evals/lanzar.mjs` | `npm run evals` portable entre PowerShell y Git Bash |
| `tests/lib/puerta-calidad.test.ts` | 22 pruebas de la propia puerta |
| `tests/components/PantallaAcceso.test.tsx` | 6 pruebas de la entrada por invitación |
| [`docs/07-emergencia.md`](../docs/07-emergencia.md) | Marcha atrás y lista de comprobación previa |

## El detalle que más importa de la puerta: tres veredictos, no dos

`evals/puerta-calidad.mjs` no responde "pasa / no pasa". Responde tres cosas:

- **VERDE** (código 0) — todas las métricas por encima de su umbral.
- **ROJO** (código 1) — el modelo respondió y la calidad bajó. Bloquea.
- **NO CONCLUYENTE** (código 2) — 429 de Groq, juez sin responder, tiempo
  agotado. Bloquea también, **pero dice claramente que no es culpa del
  prompt**.

Ese tercer estado existe porque el problema ya ha aparecido **tres veces**
(ver [paso-13-evals.md](paso-13-evals.md)): cuota de OpenRouter agotada, cuota
del juez agotada, y juez sin endpoints tras apagar el permiso de
entrenamiento. En los tres casos los evals salieron en rojo con la app
funcionando perfectamente. Sin esta distinción, la puerta habría mandado a Mar
a arreglar prompts que no estaban rotos.

La clasificación se apoya en dos señales: el campo `failureReason` de
Promptfoo (2 = ERROR del proveedor, frente a 1 = ASSERT, que sí es calidad) y
un catálogo de patrones de infraestructura en el motivo del fallo (429, 5xx,
*rate limit*, *no endpoints available*, tiempos agotados, errores de red).
Además, una métrica con más de un 25 % de aserciones sin evaluar, o con menos
de 3 evaluables, se declara no concluyente en vez de inventarse un porcentaje
sobre una muestra que no lo soporta.

**Las aserciones no concluyentes se excluyen del denominador**, no cuentan
como suspensos. Es la diferencia entre medir calidad y medir la suerte que
tuvo la cuota ese día.

# Lo que descubrió la primera ejecución del robot

La ejecución #1 (20/08/2026) terminó en **NO CONCLUYENTE**, y eso fue una
buena noticia por partida doble: la puerta hizo exactamente lo que se diseñó
que hiciera, y de paso destapó un problema que nadie sabía que existía.

**Los 25 casos salieron "sin evaluar" con `Groq respondió 401: Invalid API
Key`.** El diseño de tres veredictos se ganó el sueldo el primer día: con una
puerta de dos estados, esto habría salido como ROJO y habría mandado a Mar a
arreglar unos prompts que estaban perfectamente.

## La causa: las variables "Sensitive" de Vercel no se pueden volver a leer

El plan era elegante: no duplicar secretos en GitHub y traerlos con
`vercel env pull` desde Vercel, que ya es donde viven. **No funciona.**

Las cinco variables del proyecto son de tipo **Sensitive**, y ese tipo es de
*solo escritura*: su valor no se puede recuperar, ni desde el panel ni con el
CLI ni por la API. Lo traicionero es que **`vercel env pull` no falla**:
imprime `✓ Created .env.local file` tan tranquilo, y la clave llega vacía. De
ahí el 401.

Medido para descartar las otras explicaciones:

| Comprobación | Resultado |
| :---- | :---- |
| Clave de `.env.local` contra `api.groq.com/v1/models` | **200** — la clave buena funciona |
| Clave que recibió el robot | **401** `Invalid API Key` |
| Paso `vercel env pull` en el robot | **éxito**, 2 s, archivo creado |
| Variables en el panel de Vercel | las 5 presentes, tipo **Sensitive** |
| Tráfico en producción en las últimas 8 h | **ninguno** |

**Solución**: las claves de IA pasan a ser secretos del repositorio
(`GROQ_API_KEY`, `OPENROUTER_API_KEY`), y el job de evals empieza con un paso
que comprueba que la clave responde 200 **antes** de gastar 10 minutos y media
cuota diaria. Un 401 ahora se detecta en dos segundos, no al final.

Se pierde la elegancia de tener las claves en un solo sitio. A cambio, el
robot funciona y el fallo es imposible de confundir con un problema de
calidad.

## Segundo hallazgo (ejecución #2): el arnés de evals no tenía límite de tiempo

Con las claves ya bien puestas, la ejecución #2 llegó al caso **7 de 13 de
`generarCvYCarta` y se quedó clavada ahí 20 minutos**, sin avanzar ni fallar,
hasta que hubo que matarla.

La causa está en Promptfoo, y venía de fábrica desde el Paso 13:

| Variable | Valor por defecto | Qué significa |
| :---- | :---- | :---- |
| `PROMPTFOO_EVAL_TIMEOUT_MS` | **0** | Ningún límite por caso: espera para siempre |
| `PROMPTFOO_MAX_EVAL_TIME_MS` | **0** | Ningún límite para la suite entera |

Los tiempos de espera de `lib/ia.ts` (12 s + 15 s de OpenRouter, 20 s de Groq)
protegen **a la app**, no al arnés: las aserciones `llm-rubric` llaman al
modelo juez por su cuenta, fuera de ese código, y ahí no había nada que
cortara. El caso que se colgó (el octavo, con `llm-rubric`) encaja con esa
explicación.

**Esto afecta igual a las ejecuciones locales**: un `npm run evals` que pillara
al juez en mal momento se quedaba colgado en la terminal sin decir nada.

Arreglado en los dos sitios — 3 minutos por caso, 20 por suite — y el límite
del trabajo sube de 40 a 60 minutos para que, si algo se corta, el paso del
veredicto llegue a ejecutarse y lo explique, en vez de que GitHub mate el
trabajo sin dejar rastro. Los casos cortados salen como error, así que la
puerta los cuenta como "sin evaluar" y no como suspensos de calidad.

**Tiempos reales medidos** (útiles para calibrar expectativas): `extraerPerfil`
12 casos en **3m 14s**; `generarCvYCarta` iba a ritmo de ~1 caso/minuto antes
de colgarse, es decir unos **12-13 minutos** para sus 13 casos.

## Lo que queda sin confirmar

**No se pudo verificar si producción está afectada.** No hay tráfico en las
últimas 8 horas, así que no hay ni un solo registro que lo demuestre en un
sentido ni en otro. Quedan dos posibilidades:

- **(A)** La clave de Vercel es correcta y el 401 es solo del `env pull`.
  Producción está bien. *Es lo más probable*, dado que las cinco variables son
  Sensitive y el síntoma encaja exactamente.
- **(B)** La clave guardada en Vercel es distinta o caducada. Entonces
  producción también daría 401 en Groq.

**Comprobación pendiente** (2 minutos, requiere sesión): generar un CV real en
producción. Si sale, es (A). Mientras tanto, volver a guardar la clave buena
en Vercel es barato y descarta (B) sin más análisis.

Un segundo hallazgo, este sí verificado y con consecuencias: **el respaldo de
OpenRouter estaba hoy a 0 de 50 peticiones** (`free-models-per-day`). Es decir,
si Groq fallara en producción hoy, **no habría red debajo**. La redundancia
Groq→OpenRouter solo es real mientras la cuota diaria de OpenRouter no esté
agotada, y la agotan los propios evals.

# Efectos colaterales del paso

- **Arreglado un error de lint que estaba en el repositorio**
  (`react-hooks/set-state-in-effect` en `app/page.tsx`): el aviso de "enlace
  caducado" se ponía con un `useEffect` que solo servía para llamar a
  `setState` en el primer render. Ahora se calcula como estado inicial. Sin
  esto, la puerta habría bloqueado desde el primer día.
- **Corregidos los comandos de evals de `package.json`**: no llevaban el
  `-j 1` ni las pausas que `CLAUDE.md` marca como obligatorios desde que Groq
  es el proveedor principal. Quien lanzara `npm run evals:perfil` se comía
  429s que parecían fallos de calidad.
- Las pruebas pasan de 225 a **253**.

# Pendiente de Mar (no automatizable)

- [x] Crear el `VERCEL_TOKEN` en Vercel y guardarlo como secreto del
      repositorio (*Settings → Secrets and variables → Actions*). Hecho el
      20/08/2026. Es el único secreto que hace falta en GitHub: las claves de
      Groq y Supabase no se duplican, el robot se las pide a Vercel con
      `vercel env pull`.
- [ ] **Apagar *Allow new users to sign up* en Supabase e invitar a las cuatro
      compañeras.** Aplazado al **lunes 24/08/2026**, a la vuelta de
      vacaciones (ver [[project_vuelta_clase_24_agosto]] y
      [`docs/07-emergencia.md`](../docs/07-emergencia.md) §6, donde está el
      procedimiento completo con capturas de qué debe verse en cada paso).
      Hasta que se haga, **la entrada sigue abierta**: el código ya manda
      `shouldCreateUser: false`, pero la barrera de verdad es el interruptor
      de Supabase, y ese sigue encendido.
- [ ] Verificar que ninguna cuenta tiene método de pago (§5 de
      `docs/07-emergencia.md`).
- [ ] **Solo después de ver el robot publicar con éxito**: desactivar el
      despliegue automático de Vercel. Hacerlo antes dejaría el proyecto sin
      ninguna forma de publicar si el robot falla al configurarse.

# Relacionado

- [`docs/07-emergencia.md`](../docs/07-emergencia.md) — la marcha atrás y la
  lista de comprobación previa al lanzamiento.
- [hito-9-publicar.md](hito-9-publicar.md) — la primera publicación, que este
  paso protege.
- [paso-13-evals.md](paso-13-evals.md) — los umbrales que aplica la puerta y
  el historial de evals en rojo por infraestructura.
- [paso-15-revision-opus.md](paso-15-revision-opus.md) — señaló el registro
  abierto que aquí se cierra.
- [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md) —
  el cupo de Groq que obliga a racionar los evals.
