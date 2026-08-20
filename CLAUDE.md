# CLAUDE.md — Jobs App

Instrucciones para cualquier agente que trabaje en este repositorio.

## Qué es esto

Web que ayuda a buscar empleo remoto asalariado: la usuaria pega su CV, el
sistema le propone puesto y palabras clave, le muestra ofertas que encajan
y le genera un CV y una carta adaptados a cada oferta que le interese.

Primera prueba: **5 personas** (la clase de un bootcamp de AI Engineering).
Es el primer proyecto estructurado de Mar, que **no tiene experiencia
programando**. Explica cada término técnico la primera vez que lo uses, con
una analogía cotidiana. Todo se escribe **en castellano**.

**Stack**: Next.js + Supabase + Groq + Vercel, más un workflow de n8n.
Detalle en `docs/04-plan-tecnico.md`.

## La restricción principal

**Presupuesto: 0 €/mes. Es una restricción dura, no una preferencia.**

Cualquier propuesta que implique pagar algo —un plan de pago, un modelo de
IA de pago, un servicio con tarjeta— está descartada salvo que Mar lo pida
expresamente. Si una solución técnica solo funciona pagando, dilo
claramente en vez de proponerla como si fuera gratis.

## Datos sensibles

Se manejan **CVs, emails y datos de contacto de personas reales** que no
son Mar: sus cuatro compañeras de clase.

- El aislamiento entre usuarias se garantiza con **RLS** en Supabase (cada
  fila lleva su dueña grabada), no con lógica en el código.
- El texto de los CVs sale hacia el proveedor de IA. **Antes de cambiar de
  proveedor o de añadir uno nuevo, hay que comprobar su política de datos** —
  no basta con que sea gratis. Estado verificado el 20/08/2026:
  - **Groq** (principal): *Zero Data Retention* global activado. ✓
  - **OpenRouter** (respaldo): tenía activado "Allow free endpoints that train
    on request data", es decir, los modelos gratuitos podían **entrenar con
    los CVs**. Se apagó. Ver
    `knowledge/decision-groq-principal-privacidad.md`.
- Los datos se borran automáticamente al mes (regla 10 de la spec).

## Lo que NUNCA se debe hacer en este repositorio

1. **Escribir una clave, contraseña, token o credencial dentro del
   código**, en una URL o en cualquier archivo que se suba. Van siempre en
   `.env.local` (local) o en Environment Variables de la plataforma.
2. **Poner el prefijo `NEXT_PUBLIC_` a un secreto.** Todo lo que lo lleve
   es visible para cualquiera en el navegador.
3. **Subir nada a GitHub ni hacer `git push` sin permiso explícito de
   Mar**, cada vez. Todo el trabajo vive en git local hasta que ella diga
   lo contrario.
4. **Tocar los workflows `Jobs` de n8n** (`Jobs · ingesta`,
   `Jobs · generación CV`, `Jobs · seguimiento`, `Jobs · archivado`). Son
   la búsqueda de empleo real de Mar, en producción. Jobs App usa un
   workflow **nuevo e independiente**, `Jobs App · ingesta`, creado
   copiando el JSON.
5. **Proponer modelos ni servicios de OpenAI.** Decisión ética de Mar,
   incluye los modelos de peso abierto `gpt-oss`. No relitigarlo.
6. **Renombrar o reestructurar `docs/`.** El esqueleto `00-problema.md` …
   `06-tareas.md` es fijo.
7. **Dar por cerrada una elección entre varias opciones sin habérsela
   preguntado explícitamente.** Presentar opciones con una recomendación
   dentro de un plan no equivale a que ella haya elegido.

## Documentación

- `docs/00-problema.md` … `docs/06-tareas.md` — el método de 17 pasos.
  `docs/03-spec.md` es la verdad funcional del proyecto.
- `knowledge/` — bundle **OKF** con las decisiones y su porqué. Después de
  cada cambio relevante hay que actualizar `knowledge/index.md` y
  `knowledge/log.md`.

## Evals de la IA

`evals/` contiene el arnés de pruebas de las dos llamadas a IA de
`lib/ia.ts` (Paso 13): `evals/golden.yaml` (25 casos), y su implementación
ejecutable con Promptfoo en `evals/promptfoo/`.

**Relanza los evals siempre que cambie el prompt (`lib/ia.ts`,
`prompts/system.md`), el modelo (`MODELO_GROQ` / `RONDAS_MODELOS` en
`lib/ia.ts`), o el formato de los datos de entrada o salida.** Un cambio
que no se comprueba contra el golden dataset puede arreglar un caso y
romper otro sin que nadie se entere hasta que le pase a una usuaria real.

```
npm run evals          # los dos evals seguidos y después la puerta de calidad
npm run evals:puerta   # solo el veredicto, sobre los resultados ya generados
```

Desde el Paso 16 esta regla la cumple también el robot de publicación: si el
push toca `lib/ia.ts`, `prompts/system.md`, `lib/guardrails.ts`,
`lib/verificarCv.ts` o `evals/`, los evals corren solos y **bloquean la
publicación** si bajan de los umbrales de `evals/umbrales.json`.

`-j 1` (sin concurrencia) es obligatorio desde que Groq es el proveedor
principal: limita por **tokens por minuto** (8000 en esta cuenta), y con la
concurrencia por defecto de 4 los casos se pisan entre sí y fallan con un 429
que parece un fallo de calidad y no lo es.

Ambos llaman a las funciones reales de `lib/ia.ts` (consumen cuota gratis
de OpenRouter/Groq, igual que la app en producción). Los umbrales de
aprobado y cómo leer el resultado están documentados en
`knowledge/paso-13-evals.md`.

## Publicación (Paso 16)

**Vercel ya no publica solo.** Publica `.github/workflows/publicar.yml`, y solo
si pasan lint, las pruebas y —cuando el cambio toca la IA— la puerta de
calidad de los evals. Push a `master` → producción; push a cualquier otra rama
→ vista previa protegida.

- Antes de mandar algo a producción, **pruébalo en una rama** y abre su vista
  previa. Nunca se había hecho hasta el Paso 16: los 7 primeros despliegues
  fueron todos directos a producción.
- Un commit con **`[sin evals]`** en el mensaje salta los evals a conciencia
  (lint y pruebas siguen). Es para cuando hace falta la cuota de Groq para
  otra cosa, no para esquivar un rojo.
- Si la puerta dice **NO CONCLUYENTE**, no es un fallo del prompt: es falta de
  cuota o el modelo juez sin responder. Relanzar, no "arreglar".
- **Deshacer una publicación mala**: `docs/07-emergencia.md` §1. El rollback de
  Vercel devuelve el código, **no** las migraciones, las variables de entorno
  ni la configuración de Supabase Auth.

### Dos trampas verificadas en vivo el 20/08/2026

Las dos costaron horas. No volver a caer:

1. **Las variables de entorno de Vercel son de tipo *Sensitive*: su valor no
   se puede leer desde fuera.** Y falla **en silencio** — `vercel env pull`
   dice `✓ Created .env.local` y trae la clave vacía. Por eso las claves de IA
   se duplican como secretos de GitHub, y por eso **construye Vercel** y no el
   robot (`vercel deploy` sin `--prebuilt`): las `NEXT_PUBLIC_*` se incrustan
   al construir, y construir fuera produce una app rota con
   *"Invalid supabaseUrl"*. Detalle en `docs/04-plan-tecnico.md` §3.8.

2. **Groq cuenta el `max_tokens` que PIDES, no el que gastas**, contra su
   límite de 8.000 por minuto. Una generación reserva ~7.000: **cabe una por
   minuto**. Las pausas de los evals (25 s y 65 s) salen de esa división, no
   de una corazonada. Si cambias `MAX_TOKENS_GROQ_GENERACION` en `lib/ia.ts`,
   **rehaz el cálculo y ajusta los `--delay`** de `package.json` y del
   workflow, o media tanda saldrá con 429 que parecen fallos de calidad.

Corolario para el ritmo de trabajo: una tanda de evals dura **~25 minutos** y
se lleva **la mitad de la cuota diaria**. Planifícalo, no lo lances a la
ligera.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
