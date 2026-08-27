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

**Stack**: Next.js + Supabase + Cloudflare Workers AI + Vercel, más un
workflow de n8n. Detalle en `docs/04-plan-tecnico.md`.

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
  no basta con que sea gratis. Estado verificado el 23/08/2026:
  - **Cloudflare Workers AI** (principal desde el 23/08/2026, sustituye a
    Groq): declaración oficial de que no entrena con el contenido por
    defecto. Ver `knowledge/decision-cloudflare-generarcv.md`.
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
`prompts/system.md`), el modelo (`MODELO_CLOUDFLARE` / `RONDAS_MODELOS` en
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

`-j 1` (sin concurrencia) sigue activo desde que Groq era el proveedor
principal: limitaba por **tokens por minuto** (8000 en esa cuenta), y con la
concurrencia por defecto de 4 los casos se pisaban entre sí y fallaban con un
429 que parecía un fallo de calidad y no lo era. Groq se retiró del todo de
la app el 23/08/2026 (Cloudflare es ahora el principal, sin ese límite por
minuto — ver `knowledge/decision-cloudflare-generarcv.md`), pero el juez de
las aserciones "llm-rubric" **sigue llamando a Groq** y sigue sujeto al mismo
límite, así que `-j 1` y las pausas no se han tocado.

Ambos llaman a las funciones reales de `lib/ia.ts` (consumen cuota gratis de
Cloudflare/OpenRouter, igual que la app en producción, más la cuota de Groq
del modelo juez). Los umbrales de aprobado y cómo leer el resultado están
documentados en `knowledge/paso-13-evals.md`.

### Antes de creerte una tanda, mira si el proveedor está estable

Lección del 26/08/2026, que costó una tarde entera. Cloudflare tiene rachas
malas: **el mismo caso, el mismo código y el mismo modelo** salieron en 12,9 s
por la mañana y se colgaron 181 s una hora después. Durante esa racha, todas
las combinaciones probadas —modelo viejo, modelo nuevo, `mistral`, `scout`—
daban entre 1 y 2 aciertos de 5, así que **ninguna medición distinguía nada**.

Antes de concluir que un cambio mejora o empeora, comprueba que el proveedor
responde con normalidad. Para eso está la sonda, que llama a la función real
de `lib/ia.ts` sobre casos reales del golden dataset y cuesta una fracción de
una tanda de evals:

```
npm run medir:generacion            # 5 casos repartidos por el dataset
npm run medir:generacion 3          # 3 casos
FILTRO=B01 npm run medir:generacion # solo ese caso
```

Además acepta `SIN_CORTE=1` (quita el tiempo de espera, para ver cuánto tarda
de verdad algo que muere en el timeout), `MAX_TOKENS=600`,
`MODELO=@cf/...` y `STOP='\n\n\n'` (secuencias de parada, varias separadas
por una barra vertical) — los cuatro envolviendo el `fetch`, **sin tocar
`lib/ia.ts`**, que es código de producción y cuyo cambio dispara los evals al
publicar.

Con 5 casos y una tasa de acierto del 20-40 %, la diferencia entre 1/5 y 2/5
es ruido, no señal.

### La forma concreta de un fallo intermitente caduca — vuelve a mirar el crudo

Lección del 27/08/2026. `knowledge/medicion-t117-cierre-json.md` documentaba,
medido y con volcado, que el modelo agota el techo de tokens emitiendo
`\n␣␣` una y otra vez. Al día siguiente el relleno eran **1.013 tabuladores
seguidos, sin un solo salto de línea**, y en otra llamada del mismo día,
`\n␣\n␣`. La secuencia de parada escrita contra el patrón documentado no
cortaba nada, y sin volcar la respuesta cruda no había forma de saber por qué.

Un documento que describe **el mecanismo** de un fallo (el modelo no cierra el
JSON y rellena hasta el techo) sigue siendo válido. Uno que describe **los
caracteres concretos** vale para el día en que se midió. Antes de construir
nada que dependa de la forma exacta —una secuencia de parada, una expresión
regular, un parseo—, vuelve a volcar la respuesta cruda.

Corolario, medido el mismo día: **al elegir esa forma, prefiere la que no
pueda aparecer en una salida buena.** Tres tabuladores no caben en un
documento que se indenta con espacios, así que cortan solo basura (5/5). Las
paradas de saltos de línea parecían cubrir más patrones y **bajaron a 2/5**,
porque el modelo deja líneas en blanco dentro del CV. Cubrir de más costó más
que cubrir de menos.

Y ojo con el coste de medir: una sola llamada desbocada gasta en cuota lo que
decenas de generaciones normales.

## Publicación (Paso 16)

**Vercel ya no publica solo — y desde el 21/08/2026, ni puede.** El repositorio
Git se desconectó del proyecto en Vercel (*Settings → Git*), así que la única
vía de publicación es `.github/workflows/publicar.yml`: solo publica si pasan
lint, las pruebas y —cuando el cambio toca la IA— la puerta de calidad de los
evals. Push a `master` → producción; push a cualquier otra rama → vista previa
protegida. El robot no depende de esa conexión: despliega con `VERCEL_TOKEN` +
los IDs de proyecto/organización (`vercel pull` / `vercel deploy --token=...`).

- Antes de mandar algo a producción, **pruébalo en una rama** y abre su vista
  previa. Nunca se había hecho hasta el Paso 16: los 7 primeros despliegues
  fueron todos directos a producción.
- **Para saber si hacen falta los evals, el robot compara con lo que hay
  publicado**, no con el push anterior (T115, 26/08/2026): le pregunta a Vercel
  qué commit está servido en producción. Antes, un cambio de IA que la puerta
  bloqueó se quedaba en `master` sin publicar y el siguiente commit inocuo lo
  arrastraba a producción sin evals. Si no se puede saber qué hay publicado,
  **se evalúa**. En ramas y PR la base sigue siendo `master`.
- **Si tocas el paso `decidir` de `publicar.yml`, pasa `npm run
  probar:decidir` antes.** Son 15 escenarios que sacan el guión del propio
  YAML y lo ejecutan contra repositorios de mentira, sin red ni cuota.
  Equivocarse ahí sale caro en las dos direcciones: publicar IA sin medir, o
  tirar media cuota diaria en evals que no hacían falta.
- Un commit con **`[sin evals]`** en el mensaje salta los evals a conciencia
  (lint y pruebas siguen). Es para cuando hace falta la cuota de Cloudflare o
  de Groq (el juez) para otra cosa, no para esquivar un rojo. **La marca solo
  cuenta si está al final del asunto del commit** (primera línea) — ver
  trampa 3 más abajo.
- Si la puerta dice **NO CONCLUYENTE**, no es un fallo del prompt: es falta de
  cuota o el modelo juez sin responder. Relanzar, no "arreglar".
- **Deshacer una publicación mala**: `docs/07-emergencia.md` §1. El rollback de
  Vercel devuelve el código, **no** las migraciones, las variables de entorno
  ni la configuración de Supabase Auth.

### Cuatro trampas verificadas en vivo (20-26/08/2026)

Las tres primeras costaron horas. No volver a caer:

1. **Las variables de entorno de Vercel son de tipo *Sensitive*: su valor no
   se puede leer desde fuera.** Y falla **en silencio** — `vercel env pull`
   dice `✓ Created .env.local` y trae la clave vacía. Por eso las claves de IA
   se duplican como secretos de GitHub, y por eso **construye Vercel** y no el
   robot (`vercel deploy` sin `--prebuilt`): las `NEXT_PUBLIC_*` se incrustan
   al construir, y construir fuera produce una app rota con
   *"Invalid supabaseUrl"*. Detalle en `docs/04-plan-tecnico.md` §3.8.

2. **Groq cuenta el `max_tokens` que PIDES, no el que gastas**, contra su
   límite de 8.000 por minuto. Cuando Groq generaba de verdad (hasta el
   23/08/2026), una generación reservaba ~7.000: **cabía una por minuto**.
   Las pausas de los evals (25 s y 65 s) salen de esa división, no de una
   corazonada. Groq se retiró del todo de la app el 23/08/2026 (Cloudflare no
   tiene ese límite por minuto), pero el juez de las aserciones "llm-rubric"
   **sigue llamando a Groq**, así que las pausas no se han tocado sin poder
   comprobarlo en vivo — son más conservadoras de lo estrictamente necesario,
   no un problema. Si algún día tocas el tamaño de lo que le pide el juez, o
   quieres relajar las pausas, **rehaz el cálculo primero contra el límite de
   8.000/minuto de Groq** y ajusta los `--delay` de `package.json` y del
   workflow, o media tanda saldrá con 429 que parecen fallos de calidad.

3. **El freno `[sin evals]` solo cuenta si está al final del asunto del
   commit** (`.github/workflows/publicar.yml`, job `decidir`). El detector
   mira solo la primera línea del mensaje, y solo si la marca es lo último
   de esa línea — nunca una mención en medio de una frase. Dos commits reales
   de este mismo repositorio (uno explicando que "el freno funciona", otro
   arreglando este mismo detector) mencionaban `[sin evals]` sin querer
   activarlo, y la puerta se saltó de verdad. **Al escribir sobre este freno
   en un mensaje de commit — incluida esta misma documentación —, nunca
   pongas `[sin evals]` como lo último de la primera línea salvo que de
   verdad quieras saltarte los evals.** Detalle en `knowledge/paso-16-publicar.md`
   (sesión 21/08/2026).

Y una cuarta, del 26/08/2026, que no costó horas porque se cazó a tiempo:
**una prueba que no se ha visto fallar no se sabe si prueba algo.** El banco
de `npm run probar:decidir` daba 15 de 15 y no comprobaba nada — el `jq` de
mentira traía el camino escrito dentro en vez de interpretar el del workflow,
así que se podía romper el filtro de verdad y seguía todo verde. Antes de
fiarte de unas pruebas nuevas, rómpelas a propósito y mira que se quejen.

Corolario para el ritmo de trabajo: una tanda de evals dura **~25 minutos** y
se lleva **la mitad de la cuota diaria**. Planifícalo, no lo lances a la
ligera.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
