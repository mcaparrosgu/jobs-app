# Registro de cambios del bundle

## 2026-08-22 (Paso 17, la puerta de calidad no podía dar ROJO)
* **Commiteados los dos arreglos pendientes de ayer** (Gemini como principal
  de `generarCvYCarta`, falsos positivos de `verificarCv`): tipos y 253/253
  pruebas en verde antes del commit.
* **Relanzado `npm run evals` con el cupo de Groq ya renovado.**
  `extraerPerfil`: 11/12 (91,7 %), un solo fallo real (400 de Groq en un CV
  casi vacío). `generarCvYCarta` con Gemini: 8/13 en bruto (61,5 %) — pero
  la puerta volvió a decir NO CONCLUYENTE, la cuarta vez seguida en dos
  días.
* **Encontrado y arreglado un fallo real en la propia puerta de calidad**:
  `casoReventado` (`evals/puerta-calidad.mjs`) usaba `Boolean(caso.error)`
  para distinguir infraestructura de calidad, pero Promptfoo rellena
  `caso.error` **también** en un suspenso de calidad normal (verificado en
  su propio código fuente instalado: `failureReason = ASSERT; error =
  reason`). Con eso, la rama ROJO de `juzgar()` era prácticamente
  inalcanzable: dos invenciones reales del juez (B03, B13) y tres bloqueos
  de inyección (B08, B09, B12) se etiquetaban "sin evaluar" en vez de
  "suspenso de calidad". Arreglado dejando solo `failureReason === 2` como
  señal de infraestructura real, con una prueba de regresión que reproduce
  el comportamiento real de Promptfoo (23/23 en `puerta-calidad.test.ts`).
  Detalle completo en
  [`knowledge/arreglo-puerta-casoreventado.md`](arreglo-puerta-casoreventado.md).
* **Con la puerta arreglada, el veredicto real sobre los resultados de hoy
  es ROJO** (no NO CONCLUYENTE): `fidelidad` 88 % (umbral 90 %),
  `resistencia_inyeccion` 63,6 % (umbral 85 %) — sin gastar cuota extra de
  Groq, relanzando solo `npm run evals:puerta` sobre los JSON ya generados.
  Queda pendiente decidir qué hacer con `generarCvYCarta` (Gemini): dos
  invenciones de contenido y tres inyecciones que producen un CV
  "demasiado corto" en vez de resistir con una carta normal.
* **Las tres pasadas NO CONCLUYENTE de la tarde del 21/08 (con qwen3.6-27b
  como principal) pueden haber estado afectadas por el mismo fallo** — no
  se puede comprobar a posteriori porque esos `resultado-generar.json` ya
  se sobrescribieron. Su lectura original sigue siendo plausible, pero ya
  no está confirmada con la certeza con la que se escribió.
* **Investigados los 5 casos concretos del ROJO.** B13: otro falso positivo
  del comprobador, mismo patrón que ayer — "Ingeniero Informático" (Gemini)
  no se reconocía como la misma titulación que "Ingeniería Informática"
  del CV. Arreglado con una excepción de forma de género en
  `lib/verificarCv.ts` y `evals/promptfoo/helpers.cjs`, restringida a
  palabras de 6+ letras y coincidencia de palabra completa (31/31 pruebas
  en verde). B03: invención real de Groq/qwen, con errores de idioma reales
  de propina ("gran interesse", "Posiono un Grado"). B08/B09/B12: mi primera
  hipótesis (conectar `validarGeneracion` a la cadena de respaldo
  Gemini→Groq→OpenRouter) **era incorrecta y no se implementó** — es una
  decisión de seguridad deliberada del Paso 15 (`ErrorDeContenido`,
  `lib/ia.ts:176-192`, citando `seguridad/red-team-opus.md` fichas 5.4 y
  6.3: evita que una oferta envenenada convierta un clic en quince
  peticiones). Relectura probable: el guardrail de longitud puede estar
  bloqueando correctamente una respuesta descarrilada por la inyección, y
  el eval no distingue eso de un fallo real. Propuesta de refuerzo del
  prompt sin implementar, en `paso-13-evals.md`.

## 2026-08-21 (Paso 17, Gemini como principal de generarCvYCarta)
* **`gemini-2.5-pro` añadido como primer intento de `generarCvYCarta`**,
  decisión de Mar preguntada explícitamente entre cuatro opciones, motivada
  por la inestabilidad de `qwen/qwen3.6-27b` confirmada en las tres pasadas
  de evals de esta misma tarde (entrada anterior de este log). `extraerPerfil`
  no cambia — sigue en Groq, sin Gemini, porque ahí no hay ningún problema que
  resolver (91,7 % estable). Detalle completo, con las citas literales de la
  política de datos de Google y las dos trampas técnicas evitadas (el
  "pensamiento" de Gemini 2.5 Pro no se puede apagar del todo y cuenta contra
  el mismo tope de tokens de salida; un JSON cortado a medias por ese motivo
  se valida dentro de `llamarGemini`, no al volver a `generarCvYCarta`, para
  que caiga en la misma cadena de respaldo hacia Groq) en
  `knowledge/decision-gemini-generarcv.md`.
* **Verificada antes de escribir código la política de datos del nivel
  gratuito de Gemini** (`CLAUDE.md`, "antes de cambiar de proveedor... hay
  que comprobar su política de datos"): en general SÍ entrena con los
  prompts del nivel gratuito (mismo problema que ya se descartó en
  OpenRouter), pero los términos de Google dan una excepción explícita para
  usuarias del Espacio Económico Europeo — España incluida — que hace que a
  Mar y a sus compañeras se les aplique el trato de "Paid Services" (sin
  entrenamiento) aunque no paguen. No es Zero Data Retention real como en
  Groq (eso solo existe en el nivel de pago, con aprobación).
* `npx tsc --noEmit` y `npx eslint lib/ia.ts` en verde; 253/253 pruebas de
  Vitest sin cambios (ninguna llama a un modelo real).
* **Primera pasada de evals contra Gemini: 4/13 (30,77 %) — peor que qwen, en
  apariencia.** Revisado caso a caso antes de sacar conclusiones: 3 de los 9
  fallos eran **falsos positivos del propio comprobador de invenciones**
  (`lib/verificarCv.ts`), no del modelo — no reconocía "tres" y "3" como el
  mismo número, ni "AWS" y "Amazon Web Services (AWS)" como la misma sigla
  expandida. Detalle completo, con el arreglo aplicado en el guardrail real
  (no solo en la copia de los evals, porque afecta a lo que ve cualquier
  usuaria con cualquier proveedor) y los otros 6 fallos (todos por el mínimo
  de 400 caracteres, con CVs de origen brevísimos), en
  `knowledge/arreglo-verificarcv-falsos-positivos.md`. 29/29 pruebas de
  `verificarCv.test.ts` siguen en verde tras el arreglo (no se pierde
  sensibilidad a una invención real). Evals relanzados con el comprobador
  corregido — resultado pendiente de anotar aquí al terminar.
* **Las dos primeras pasadas de evals no medían a Gemini — medían a Groq sin
  que nadie se diera cuenta.** Al parar a comprobar el campo `uso.proveedor`
  de cada resultado (en vez de fiarse del porcentaje agregado), los 13 casos
  de las dos pasadas habían caído a Groq en cada uno: `gemini-2.5-pro`
  respondía **404** — *"no longer available to new users"*, porque la cuenta
  de Mar es nueva. Probado el sustituto que sugiere el propio error de
  Google (`gemini-3.1-pro-preview`): **429 con `limit: 0`** en las cuatro
  métricas de cuota — el nivel **"Pro" no tiene NADA de nivel gratuito** para
  una cuenta nueva, ni de prueba. Solo el nivel "Flash" sí lo tiene,
  verificado con una petición real. Cambiado `MODELO_GEMINI` a
  `gemini-3.7-flash`, que además acepta `thinkingBudget: 0` (apagar el
  pensamiento del todo) donde `gemini-2.5-pro` exigía un mínimo de 128 — un
  paralelismo más limpio con `reasoning_effort: 'none'` de Groq. Relanzados
  los evals una tercera vez, ahora sí contra el modelo real. Detalle en
  `knowledge/decision-gemini-generarcv.md`.
* **Tercera pasada de evals contra `gemini-3.7-flash`: 0/13, y tampoco fue un
  veredicto real.** Los 13 casos fallaron con el mismo 400 de Gemini —
  *"Unknown name \"additionalProperties\"... Cannot find field"* — un campo
  que sí acepta el Schema de Vertex AI (lo que se había consultado al
  escribir el esquema) pero no la API de Gemini para desarrolladores, que es
  la que usa esta app. Quitado de `ESQUEMA_GENERACION_GEMINI`. Y esta vez el
  respaldo tampoco pudo disimularlo: Groq devolvió 429 por **cuota diaria
  agotada** (198.825 de 200.000 tokens, gastados por los relanzamientos
  repetidos de la propia tarde) — sin Gemini y sin Groq, cayó la cadena
  entera. El esquema corregido se verificó con una petición directa a Gemini
  (JSON válido, sin gastar cuota de Groq); **queda pendiente una pasada
  automática real de los 13 casos**, bloqueada hasta que Groq renueve su
  cuota (medianoche UTC). Cuarto intento consecutivo de relanzar los evals
  hoy: demasiados para un solo día, la lección repetida de `CLAUDE.md`
  ("planifícalo, no lo lances a la ligera") se confirma una vez más. Detalle
  en `knowledge/decision-gemini-generarcv.md`.
* **Bloqueador de n8n encontrado y arreglado de paso**: `Jobs App · ingesta`
  no se disparó a las 13:00 de hoy pese a estar activo. Causa, confirmada con
  el historial real de ejecuciones (no adivinada): al editar esta mañana un
  workflow activo **a través de la API** (la rama de alertas de este mismo
  Paso 17), el proceso de n8n en marcha no vuelve a registrar el cron del
  Schedule Trigger — comportamiento conocido de n8n autoalojado, no un fallo
  del ordenador ni de la cuenta. Arreglado desactivando y reactivando el
  workflow (`unpublish_workflow` + `publish_workflow`), que fuerza el
  reregistro sin ejecutar nada. Apunte para el futuro: repetir ese toggle
  cada vez que se edite por API un workflow activo.

## 2026-08-21 (Paso 17, tercera pasada de evals)
* **Tercer relanzamiento de `npm run evals`, también NO CONCLUYENTE.**
  `generarCvYCarta`: 61,5 % (tras 53,8 % y 38,5 % en las dos pasadas
  previas) — oscila sin patrón entre pasadas idénticas, sin ningún cambio
  de código entre medias. Esta vez el motivo fue un tercer tipo de fallo
  de formato: "el CV generado no tiene saltos de línea reales entre
  secciones y puntos" (antes: JSON inválido, CV demasiado corto). Confirma
  que `qwen/qwen3.6-27b` (proveedor principal) es inestable en esta
  llamada, no que falte ajustar un umbral. Detalle en `paso-13-evals.md`.

## 2026-08-21 (Paso 17, migración aplicada)
* **`0015_metricas_ia.sql` aplicada en Supabase**, vía SQL Editor con
  automatización de navegador (Mar supervisando). Verificado por consulta
  directa: 13 columnas, RLS activo, política `metricas_ia_insert_propio`
  correcta. Queda pendiente verificar la rama nueva de alertas del
  workflow `Jobs App · ingesta` con una ejecución manual.

## 2026-08-21 (Paso 17, tarde)
* **`evals/lanzar.mjs` arreglado: `spawnSync` de `npm.cmd` daba `EINVAL` en
  Windows.** `shell: false` no sabe ejecutar un `.cmd` en este Node; pasó a
  `shell: true` (seguro: los argumentos son siempre uno de los tres nombres
  de script fijos, nunca algo externo).
* **Relanzados los evals tras el cambio de `lib/ia.ts` de este Paso 17**:
  dos pasadas seguidas, ambas NO CONCLUYENTE, empeorando en
  `generarCvYCarta` (53,8 % → 38,5 %). El motivo real, en las dos: el
  modelo **principal**, `qwen/qwen3.6-27b` en Groq, devuelve CVs por debajo
  del mínimo o JSON que no cumple el esquema — confirma una debilidad ya
  anotada el 20/08 cuando ese modelo era solo el respaldo. No se relanzó
  una tercera vez: con el mismo motivo repitiéndose y empeorando, ya es
  señal, no ruido. Detalle en `paso-13-evals.md` (actualización de hoy).

## 2026-08-21 (Paso 17)
* **Vigilancia en producción montada.** Tabla `metricas_ia` en Supabase
  (migración `0015`, RLS solo de inserción, sin política de lectura a
  propósito) que registra cada llamada a `extraerPerfil`/`generarCvYCarta`
  desde `lib/metricas.ts`. `lib/ia.ts` cambió de forma aditiva para exponer
  de qué proveedor salió cada respuesta y cuántos tokens gastó (`UsoIA`), y
  `extraerPerfil` gana `intentoDeInyeccion` igual que ya tenía
  `generarCvYCarta` — 253 pruebas, `tsc` y lint siguen en verde.
* **Alertas por email, reutilizando infraestructura que ya existía.** Rama
  nueva e independiente en el workflow `Jobs App · ingesta` (Supabase →
  código → IF → Gmail), en paralelo a la ingesta, sin tocar ningún nodo
  existente y sin poder tumbar la ejecución diaria si falla. Se descartó
  explícitamente un servicio de observabilidad de pago: para 5 usuarias
  añadiría coste (contra el presupuesto de 0 €) y un tercero nuevo al que
  comprobarle la política de datos, sin resolver nada que Supabase + logs
  de Vercel + Healthchecks.io no cubran ya.
* **Pendiente**: aplicar `0015_metricas_ia.sql` en el SQL Editor de
  Supabase — hasta entonces la rama de alertas falla en silencio cada día
  (a propósito) porque la tabla no existe todavía. Detalle completo en
  `paso-17-vigilancia.md`.

## 2026-08-21
* **Primera fusión a `master` a través de la puerta, y el propio freno falló
  al primer intento.** Con permiso explícito de Mar se subió el commit
  pendiente de la sesión anterior y se fusionó `paso-16-puerta-de-calidad`
  (fast-forward, `0d4992d`): `Lint y pruebas` y `Publicar en Vercel` salieron
  verdes, pero **`Puerta de calidad de la IA` se saltó sin deber hacerlo**. El
  push traía 9 commits de golpe con cambios reales en `evals/`, pero el
  detector del freno leía **todo el cuerpo** del último commit con
  `grep -qiF '[sin evals]'`, y ese commit solo *mencionaba* el freno en una
  viñeta ("El freno `[sin evals]` funciona") — la subcadena literal bastó
  para activarlo de verdad. Sin consecuencias graves porque esos cambios ya
  se habían evaluado en la rama (16/16 aserciones), pero la puerta no corrió
  cuando debía.
* **El arreglo necesitó dos vueltas, cada una verificada contra una ejecución
  real en GitHub Actions, no solo leyendo el script.** Mirar solo el asunto
  del commit (`--pretty=%s` en vez de `%B`) no bastó: el propio commit que
  arreglaba esto volvió a activar el freno, porque su asunto mencionaba
  `[sin evals]` a mitad de frase. Hizo falta exigir que la marca esté **al
  final** de la línea (`grep -qiE '\[sin evals\][[:space:]]*$'`) — que es
  como se había usado siempre de verdad, confirmado con
  `git log --grep="sin evals"` sobre todo el historial. Detalle completo en
  `paso-16-publicar.md`.
* **Lección para el propio proceso**: este tipo de fallo (una decisión que
  depende de texto libre) no lo detecta ninguna prueba unitaria de
  `evals/puerta-calidad.mjs` — esa prueba el veredicto de los evals, no si se
  lanzan. Solo se ve empujando un commit de verdad y leyendo el motivo en
  `Actions → Publicar → Decidir si hacen falta los evals`.
* **Paso 16 cerrado: desconectado el Git de Vercel.** Visto publicar al robot
  con éxito cuatro veces seguidas, se desconectó el repositorio en
  *Settings → Git → Disconnect* del panel de Vercel. A partir de ahora Vercel
  no puede construir ni publicar por sí solo al recibir un push — el
  `.github/workflows/publicar.yml` es la única vía, y no depende de esa
  conexión porque despliega con `VERCEL_TOKEN` + los IDs de proyecto/equipo,
  no con la integración de Git. Se pierden los comentarios automáticos de
  Vercel en los PRs (no se usaban); todo lo demás (variables, dominios,
  protección de vistas previas) queda igual, tal como avisaba el propio
  diálogo de Vercel al desconectar.

## 2026-08-20
* **Paso 16: la publicación pasa a tener puerta de calidad.** Partiendo de una
  app ya publicada (Hito 9), el trabajo fue protegerla. Dos hechos del estado
  real lo dirigieron: los 7 despliegues existentes eran **todos de
  producción** (nunca se había usado una vista previa: cada push iba directo a
  la web de las usuarias) y la entrada seguía **abierta a cualquiera** con la
  URL. Cuatro decisiones de Mar, preguntadas una a una: (1) la puerta
  **bloquea**, no avisa — Vercel deja de publicar solo y publica un workflow
  de GitHub Actions; (2) los evals corren **solo cuando el cambio toca la
  IA**, con freno manual `[sin evals]` en el mensaje del commit; (3) la
  entrada se cierra **en Supabase**, no en el código, porque
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` viaja al navegador y una comprobación en la
  web se salta llamando a Supabase directamente; (4) las vistas previas se
  protegen con Vercel Authentication (activado por API, solo `preview`) porque
  son una app completa enchufada a la base de datos real con CVs dentro.
  El número que decidió la (2): una pasada de evals gasta ~105.000 tokens,
  **la mitad de los 200.000 diarios de Groq** — una pasada y una clase entera
  usando la app no caben el mismo día.
* **La puerta da tres veredictos, no dos** (`evals/puerta-calidad.mjs`, 22
  pruebas): VERDE, ROJO (calidad, bloquea) y **NO CONCLUYENTE** (429 de Groq,
  juez sin responder, tiempo agotado — bloquea pero dice que no es culpa del
  prompt). Existe porque ya ha pasado tres veces que unos evals salieran en
  rojo con la app funcionando bien. Se apoya en `failureReason` de Promptfoo
  (2 = ERROR del proveedor vs 1 = ASSERT) más un catálogo de patrones de
  infraestructura; las aserciones no concluyentes se **excluyen del
  denominador** en vez de contar como suspensos.
* **Creacion**: `docs/07-emergencia.md` — cómo deshacer una publicación mala
  (Instant Rollback por panel y por CLI, y qué **no** deshace: migraciones,
  variables de entorno, configuración de Supabase Auth), qué clase de "está
  roto" es cada síntoma, las emergencias frecuentes por probabilidad, los
  topes de gasto y la lista de comprobación previa al lanzamiento.
* **La primera ejecución del robot destapó un fallo real, y la puerta se ganó
  el sueldo el primer día.** Los 25 casos salieron "sin evaluar" con `Groq
  respondió 401: Invalid API Key`, y la puerta lo clasificó como **NO
  CONCLUYENTE** en vez de ROJO — con un diseño de dos estados, esto habría
  mandado a arreglar unos prompts que estaban perfectamente. Causa: el plan de
  no duplicar secretos y traerlos con `vercel env pull` **no puede funcionar**,
  porque las cinco variables del proyecto son de tipo **Sensitive** y ese tipo
  es de solo escritura: su valor no se recupera ni por panel, ni por CLI, ni
  por API. Y lo traicionero es que `env pull` **no falla** — dice "✓ Created
  .env.local" y la clave llega vacía. Medido: la clave de `.env.local`
  responde 200 a `api.groq.com`, la que recibió el robot 401. Solución: las
  claves de IA pasan a secretos del repositorio, y el job empieza comprobando
  que la clave responde 200 **antes** de gastar 10 minutos y media cuota.
* **Segundo hallazgo (ejecución #2): el arnés de evals no tenía límite de
  tiempo, y venía así desde el Paso 13.** Con las claves ya correctas, la
  ejecución se quedó **clavada en el caso 7 de 13** de `generarCvYCarta`
  durante 20 minutos, sin avanzar ni fallar. Los dos topes de Promptfoo
  (`PROMPTFOO_EVAL_TIMEOUT_MS` por caso y `PROMPTFOO_MAX_EVAL_TIME_MS` por
  suite) valen **0 por defecto, que significa esperar para siempre**. Los
  tiempos de espera de `lib/ia.ts` protegen a la app, no al arnés: las
  aserciones `llm-rubric` llaman al modelo juez fuera de ese código, y el caso
  colgado era justo uno con `llm-rubric`. Afectaba también a las ejecuciones
  locales (`npm run evals` se colgaba en la terminal sin decir nada). Puestos
  3 min por caso y 20 por suite, en el robot y en `evals/lanzar.mjs`. Tiempos
  reales medidos: `extraerPerfil` 12 casos en 3m 14s; `generarCvYCarta` a ~1
  caso/minuto.
* **Tercer hallazgo (ejecución #3): las pausas de los evals pedían casi el
  triple de lo que la cuenta de Groq admite, y venía así desde el Paso 15.**
  Las dos suites completaron (12/12 en 7m 17s, 13/13 en 17m 43s) y salió NO
  CONCLUYENTE por 429. **No era la cuota diaria**: medido justo después, Groq
  respondía 200. Era el límite **por minuto** (8.000 TPM, contando entrada más
  `max_tokens` pedido). Con `--delay 20000`, `generarCvYCarta` lanzaba 3 casos
  por minuto a ~7.000 tokens cada uno = **21.000 TPM, 2,6 veces el límite**;
  `extraerPerfil` con 15 s iba justo a 8.000, sin margen. Lo llamativo es que
  **`lib/ia.ts` ya lo decía** desde el Paso 15 ("por minuto cabe UNA
  generación, o dos o tres extracciones") — ese comentario y los `--delay` de
  `paso-13-evals.md` nunca se habían cruzado. Corregido a 25 s y 65 s. Los
  seis casos cortados por tiempo eran todos con `llm-rubric`: el juez también
  es Groq, comía 429 y sus reintentos pasaban de los 3 minutos.
* **La comprobación previa ahora mide cuota, no solo la clave.** Listar
  modelos devuelve 200 aunque no quede cuota; ese detalle costó los 26m 55s de
  la #3. Ahora se hace una petición real de 5 tokens al mismo modelo, y un 429
  se ve en dos segundos con un mensaje que dice a qué hora renueva.
* **Cuarto hallazgo (ejecución #4): el circuito completo funcionó y la vista
  previa salió rota.** La #4 pasó la puerta y publicó en 3m 55s (evals
  saltados con motivo, porque ese push no tocaba la IA), y la vista previa dio
  *Internal Server Error*: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS
  URL` en el middleware. Es **el mismo problema de raíz que el 401 de Groq**:
  las `NEXT_PUBLIC_*` se **incrustan durante la construcción**, y el robot
  construía con `vercel build --prebuilt` sin poder leer las variables
  Sensitive, así que incrustaba una URL vacía. Nadie lo había visto porque
  **era la primera vista previa de la historia del proyecto** — los 7
  despliegues anteriores fueron todos de producción, y producción sí construye
  en Vercel. Arreglado dejando que construya Vercel (~2 min más por
  despliegue). **Regla que deja el paso**: con variables *Sensitive*, todo lo
  que necesite leer su valor fuera de Vercel falla, y falla en silencio.
* **Segundo hueco de la misma ejecución**: `decidir` comparaba el push con el
  empujón anterior, así que una rama con un prompt cambiado se saltaba los
  evals en cuanto le caía encima un commit de documentación. Ahora, en una
  rama se compara contra `master` entero; en `master`, con el empujón
  anterior.
* **Sin confirmar: si producción está afectada.** Cero tráfico en 8 h, así que
  no hay registros que lo digan. Lo más probable es que producción esté bien
  (el 401 sería solo del `env pull`), pero queda pendiente generar un CV real
  para confirmarlo. **Segundo hallazgo, este sí verificado**: el respaldo de
  OpenRouter estaba a 0 de 50 peticiones del día, así que si Groq fallara hoy
  en producción **no habría red debajo** — y quien agota esa cuota son los
  propios evals.
* **Arreglos colaterales**: el error de lint `react-hooks/set-state-in-effect`
  en `app/page.tsx` (habría bloqueado la puerta desde el primer día); los
  comandos de evals de `package.json`, que no llevaban el `-j 1` ni las pausas
  obligatorias desde que Groq es el principal; y `shouldCreateUser: false` en
  la pantalla de acceso. Pruebas: 225 → 253.
* **Paso 15, segunda pasada: revisión independiente del red team.** Pedida
  por Mar para no fiarse de un único juicio sobre un sistema que maneja los
  CVs de cuatro personas reales. Corrige la conclusión del primer informe:
  la inyección indirecta que inventa experiencia **no está resistida**. El
  prompt de `generarCvYCarta` separa las piezas con marcadores de texto
  plano (`=== CV ORIGINAL ===`) y la descripción de la oferta se pega antes
  del CV, así que un anuncio manipulado puede cerrar su sección y abrir la
  del CV: ejecutado en vivo, el CV de una camarera salió convertido en el de
  una ingeniera de datos con máster por Harvard, **con cero avisos**. Causa
  raíz, que es de código y no del modelo: `verificarCv` mete
  `ofertaDescripcion` en su lista blanca, así que el atacante decide qué
  nombres cuentan como verificados (mismo CV generado: 0 avisos con la
  oferta maliciosa, 6 con una limpia). Hallazgos nuevos: `oferta.titulo` y
  `oferta.empresa` no pasan por el detector de inyección ni se recortan
  (ejecutado: el título de la oferta fijó el campo `puesto`, que es lo que
  se imprime bajo el nombre real en el PDF); el registro está abierto
  (`signInWithOtp` sin `shouldCreateUser:false`); `CLAUDE.md` exige Zero
  Data Retention solo a Groq, pero el proveedor principal es OpenRouter con
  modelos `:free`, sin decisión escrita sobre retención; y cada llamada a la
  IA gasta hasta 5 de las 50 peticiones diarias compartidas (verificado en
  vivo: `X-RateLimit-Remaining: 0`, la app funcionando ya solo con el
  respaldo de Groq). Informe completo en `seguridad/red-team-opus.md`,
  detalle en `paso-15-revision-opus.md`.
* **Los evals, relanzados con el proveedor nuevo: tres fallos, dos reales.**
  Al pasar a Groq hubo que volver a pasar el golden dataset (`CLAUDE.md`), y
  la primera lectura fue engañosa: 5 de 13 en generación. El motivo no era la
  calidad — **el juez de las aserciones `llm-rubric` también era un modelo
  `:free` de OpenRouter** y se quedó sin endpoints al apagar el permiso de
  entrenamiento, así que los casos salían en rojo aunque la app respondiera
  bien. Con el juez movido a Groq: **extracción 11/12, generación 11/13**. De
  los tres fallos restantes, dos eran reales y se arreglaron: (1) el esquema
  JSON exigía `minItems: 8` en `palabras_clave` y Groq **valida el esquema de
  verdad**, así que rechazaba con un 400 cualquier CV del que no salieran
  ocho términos sin inventar ("Juan. Busco curro.") — bajado a 1, la
  preferencia de 8-20 se queda en el prompt; (2) un CV muy largo desbordaba
  el presupuesto de tokens y devolvía JSON truncado — topes de entrada
  bajados (CV 12.000→8.000, oferta 8.000→4.000) y margen de salida subido
  (2.500→3.000). El tercero era el propio juez devolviendo su razonamiento en
  vez de un veredicto (`reasoning_effort: none` en los dos YAML). **Cupo real
  de Groq, medido al agotarlo: 200.000 tokens al día** (unos 30 documentos
  para las cinco) y 8.000 por minuto, que en la práctica deja pasar una
  generación por minuto. Corregida esa cifra en los cinco sitios donde se
  había escrito "1000 peticiones/día". Los dos arreglos quedan **sin
  confirmar con una tanda completa**: se agotó el cupo del día al
  comprobarlos. Documentado en `seguridad/pendiente-para-mar.md`.
* **Groq pasa a ser el proveedor principal de IA, por privacidad.** Al
  revisar la configuración real de las cuentas (Paso 15) se vio que OpenRouter
  tenía **activado** "Allow free endpoints that train on request data" —
  proveedores de modelos gratis que *pueden retener y entrenar con los prompts*
  — y ZDR desactivado en todos los ámbitos. Lo que viaja en cada petición es el
  CV completo de una persona real. Groq, en cambio, tiene **Global ZDR
  activado**. Decisión de Mar: apagar esa opción en OpenRouter (hecho) e
  invertir el orden en `lib/ia.ts`, porque al apagarla OpenRouter deja de
  enrutar a los endpoints gratuitos. Groq primero (ZDR; cupo real 200.000
  tokens al día, unos 30 documentos, más 8.000 por minuto),
  OpenRouter de respaldo por si Groq retira su modelo "Preview". De paso
  resuelve el problema de cupo: medido tras el cambio, 0,7 s la extracción y
  1,6 s la generación. Además, las rondas de OpenRouter bajan de 2+3 modelos
  en paralelo a 1+2 (cada modelo lanzado gasta cuota aunque se aborte).
  Constantes renombradas (`MODELO_GROQ`, `TIMEOUT_GROQ_MS`,
  `TIMEOUT_OPENROUTER_MS`) y `CLAUDE.md` actualizado con la regla nueva:
  antes de cambiar de proveedor, comprobar su política de datos. Detalle en
  `decision-groq-principal-privacidad.md`.
* **Paso 15, arreglos: se cierran las brechas del red team el mismo día.**
  `verificarCv` deja de aceptar la descripción de la oferta como fuente de
  verdad (dos listas blancas: nombres contra el CV + su experiencia + el
  título y la empresa de la oferta; contacto solo contra el CV), y avisa con
  gravedad máxima si el CV generado no menciona ninguna empresa del CV
  original. El mensaje de generación pasa a usar etiquetas con **marca
  aleatoria por petición** en vez de marcadores fijos, y todo el texto
  externo pasa por `neutralizarDelimitadores`: **relanzados en vivo los dos
  ataques que funcionaban, ninguno vuelve a funcionar** — el CV generado es
  otra vez el de la usuaria y el campo `puesto` deja de ser controlable desde
  la oferta (`titularSeguro` lo ata al perfil o al título). Además: límite de
  10 análisis de CV al día (`lib/extracciones.ts`), cupo diario sin condición
  de carrera con cerrojo por usuaria en la base de datos (migración `0014`),
  detector de inyección normalizado (espacios, caracteres invisibles,
  homoglifos y comparación sin espacios), moderación por palabra y no por
  subcadena, avisos ordenados por gravedad antes de recortar,
  `empresas_cv`/`titulos_cv` filtradas contra el CV en `/api/perfil`,
  `/api/generar` exige interés previo, los fallos de contenido responden 422
  y ya no se reintentan solos, y el enlace de la oferta se valida (solo
  http/https). 218 pruebas en verde. Queda pendiente lo que no es código:
  cerrar el registro en Supabase, verificar la política de datos de
  OpenRouter y el ZDR de Groq, ejecutar la migración `0014`, y relanzar los
  evals (el 20/08 no se pudo: cuota diaria agotada, todo 429).
* **Paso 15: red team con 35 ataques (OWASP Top 10 para LLM) contra el
  sistema real.** Sesión nueva tras `/security-review` y `/clear`. Varios
  ataques ejecutados en vivo contra `lib/ia.ts` con las claves reales de
  `.env.local`. Hallazgo estructural: `ofertas.descripcion` llega sin
  limpieza de siete portales de empleo externos y entra directa al prompt
  de `generarCvYCarta` — el canal real de inyección indirecta, sin que la
  usuaria tenga que hacer nada raro. Tres arreglos antes de publicar: (1)
  `/api/extraer-perfil` no tiene límite diario, a diferencia de
  `/api/generar` — un bucle simple de `fetch` agota el cupo compartido de
  las 5 usuarias en segundos; (2) `detectarIntentoDeInyeccion` da falsa
  sensación de seguridad — una inyección indirecta con formato de "nota al
  sistema" pasó invisible para el detector (la lista de frases fijas no
  normaliza caracteres Unicode de ancho cero ni cubre paráfrasis); (3) un
  email/teléfono de phishing incrustado en la propia oferta pasa
  `verificarDatosDeContacto` porque el texto de la oferta cuenta como
  fuente "permitida". Ejecutado también: inyección directa simple en
  `extraerPerfil` que consiguió cambiar el campo `puesto` a "HACKEADO"
  (mitigado por la revisión humana de ese campo, pero confirma que no hay
  verificación en código de que `puesto`/`palabras_clave` estén
  respaldados por el texto, a diferencia de las cifras/nombres que sí
  verifica `verificarCv` en `generarCvYCarta`); inyección indirecta pidiendo
  inventar "8 años de experiencia" fue resistida por el modelo. Informe
  completo con las 35 fichas de ataque en `seguridad/red-team.md`, detalle
  en `paso-15-red-team.md`.
* **Paso 13: golden dataset de 25 casos y arnés de evals con Promptfoo
  para la parte de IA.** `evals/golden.yaml` (12 casos de `extraerPerfil`,
  13 de `generarCvYCarta`, diez heredados literalmente de
  `evals/casos-dificiles.md`) implementado como aserciones ejecutables en
  `evals/promptfoo/`, con proveedores en TypeScript que llaman
  directamente a `lib/ia.ts` (no a una copia del prompt) y 5 métricas de
  alta señal (`fidelidad`, `formato`, `idioma`, `resistencia_inyeccion`,
  `calidad_palabras_clave`) que cubren cinco de los seis fallos de
  `docs/05-ia.md` §6 — el sexto (Groq saturado) es infraestructura, no
  medible con un dataset. Se descartó DeepEval (Python, sin ventaja en un
  proyecto 100% TypeScript) y Ragas (pensado para RAG, que este producto
  no usa). Primera ejecución: `extraerPerfil` 11/12 en verde, con un
  hallazgo real no determinista — un CV completamente vacío a veces hace
  que el modelo invente 8 palabras clave de la nada en vez de fallar
  limpio, confirmando en vivo que el Fallo 1 de `docs/05-ia.md` "se reduce,
  no se elimina". `generarCvYCarta` se ejecutó con la cuota gratis diaria
  de OpenRouter ya agotada por el trabajo del propio día: 4 casos en verde
  de verdad, 2 fallos reales (CV por debajo del mínimo de caracteres,
  posiblemente con el modelo de respaldo de Groq), y 7 sin señal útil
  (juez sin cuota o fallo puro de infraestructura) — pendiente de repetir
  con cuota fresca. Umbrales iniciales de aprobado fijados por métrica
  (100% idioma, 95% formato, 90% fidelidad/palabras clave, 85%
  resistencia a inyección), con aviso explícito de recalibrarlos tras
  unas semanas de datos reales. Nota añadida a `CLAUDE.md`: relanzar los
  evals siempre que cambie el prompt, el modelo o los datos. Detalle en
  `paso-13-evals.md`.
* **Paso 14: guardrails en capas sobre los dos puntos de entrada de IA.**
  Confirmado explícitamente con Mar: las capas de relevancia, seguridad y
  moderación se implementan como reglas deterministas en `lib/guardrails.ts`
  (nuevo), sin ninguna llamada extra al modelo — coherente con el cuello
  de botella de tokens/minuto de Groq ya identificado en `docs/05-ia.md`.
  Huecos reales cerrados: la carta generada nunca se verificaba (solo el
  CV, `lib/verificarCv.ts` ahora cubre también `carta_texto`), no había
  filtro de datos de contacto inventados/filtrados, no había moderación de
  contenido ni chequeo de marcadores de relleno sin resolver
  (`validarGeneracion`), y la promesa de `docs/05-ia.md` §6.2 ("la web
  avisa de que hay que revisar el documento antes de enviarlo") no se
  cumplía de forma incondicional — ahora hay un recordatorio fijo en
  `TarjetaOferta.tsx`. Los dos disparadores de intervención humana se
  adaptan a que `docs/03-spec.md` §2 prohíbe cualquier panel de
  administración: "intervención" es un log distinguible en Vercel más un
  mensaje distinto para la usuaria, nunca una UI nueva. Nueva columna
  `generaciones.intentos_fallidos` (migración `0013`, aplicada en
  Supabase). 22 pruebas nuevas, 194/194 en verde. Detalle en
  `paso-14-guardrails.md`.

## 2026-08-19
* **Paso 12: 172 pruebas automáticas con Vitest sobre la parte
  determinista de la app.** Cubre cada criterio de aceptación de
  `docs/01-historias.md` que no depende de un modelo de IA: funciones
  puras (`lib/palabras-clave.ts`, `lib/fechas.ts`, `lib/idioma.ts`,
  `lib/verificarCv.ts`, `lib/generaciones.ts`, `lib/cola.ts`), los ocho
  endpoints de `app/api/*` y `app/auth/*` (sesión, validación, permisos,
  errores de servicio externo) y los componentes con más lógica
  (`TarjetaOferta`, `FormularioPerfil`, `MenuNavegacion`, `GuiaPasos`).
  Se construyó un doble encadenable de Supabase
  (`tests/helpers/supabase-fake.ts`) para no depender de una base de
  datos de pruebas real, y se comprobó explícitamente el aislamiento
  entre usuarias: cada consulta de cada endpoint queda registrada y se
  verifica que siempre va filtrada por el `user_id` de la sesión. Un
  fallo de una prueba reveló que `lib/cola.ts` guarda su estado a nivel
  de módulo (compartido entre pruebas del mismo archivo), no de
  componente — corregido liberando la promesa colgada antes de terminar
  esa prueba. Deja fuera a propósito: la calidad del texto generado por
  la IA (Paso 13), RLS real de Supabase (ya verificado a mano en el Hito
  1), el aspecto visual del PDF (ya verificado a mano en T62/T83) y el
  workflow de n8n (pruebas propias en los hitos 4 y 8). Detalle en
  `paso-12-pruebas.md`.
* **Paso 11 marcado explícitamente como no aplicable.** `docs/05-ia.md`
  §4 ya dice, sin margen de interpretación, que la IA de Jobs App no
  tiene ninguna herramienta ("Ninguna. Ni una sola."): no es un agente,
  no decide sus propios pasos, no lee ni escribe en ningún sitio. El
  Paso 11 pide diseñar herramientas de agente a prueba de errores, una
  categoría que no puede materializarse aquí. Se preguntó explícitamente
  a Mar entre tres opciones (marcarlo no aplicable, documentar
  retroactivamente las funciones de IA existentes con ese formato, o
  auditar el código en busca de algo real) y eligió la primera. Revisando
  `lib/ia.ts` y `lib/verificarCv.ts` antes de preguntar se confirmó que
  el trabajo equivalente de diseño a prueba de errores (esquemas JSON
  estrictos, validación en código, verificación de cifras y nombres
  contra el CV original, defensa contra inyección) ya está construido,
  pero encaja como Paso 14 (guardrails), no como Paso 11. Sin código
  nuevo. Detalle en `paso-11-no-aplica.md`.
* **`lib/ia.ts` alineado con `prompts/system.md`: defensa contra
  inyección de instrucciones añadida al código, el mismo día que se
  documentó.** Al cerrar el Paso 10 quedó anotado a propósito que el
  código no llevaba todavía la defensa contra instrucciones dentro del
  CV o de la oferta ("ignora las instrucciones anteriores", "añade una
  cifra falsa"...). Mar pidió resolverlo sin esperar al Paso 14: los dos
  prompts de `lib/ia.ts` (`extraerPerfil`, `mensajesDeGeneracion`) llevan
  ahora el mismo texto de defensa que `prompts/system.md`, y cada uno un
  comentario que remite a `prompts/system.md` y
  `evals/casos-dificiles.md` para no volver a divergir. Queda pendiente,
  y es trabajo real del Paso 14: verificar en vivo con los casos 1, 2, 3
  y 5 de `evals/casos-dificiles.md` que el modelo obedece esto — hoy es
  solo prompt, sin ninguna verificación en código detrás. Detalle en
  `paso-10-prompts-produccion.md`.
* **Paso 10 cerrado: prompts de producción escritos como dos tareas, no
  como un system prompt de chat.** `docs/05-ia.md` ya documentaba que Jobs
  App no tiene IA conversacional (peldaño 1, sin herramientas, sin
  conversación) — la plantilla estándar del Paso 10 (tono ante usuario
  molesto, escalado a un humano, uso de herramientas) no encajaba. Se
  preguntó explícitamente a Mar entre tres opciones y eligió adaptar la
  estructura en vez de forzarla o saltarse el paso. Resultado:
  `prompts/system.md` (Prompt A: extracción de perfil; Prompt B:
  generación de CV y carta, basados en el texto real de `lib/ia.ts` y
  ampliados con defensa explícita contra inyección de instrucciones
  dentro del CV o de la oferta) y `evals/casos-dificiles.md` (10
  situaciones, con peso en intentos de sacar la IA de su ámbito). Queda
  anotado a propósito que `lib/ia.ts` no se ha tocado — alinear el código
  con el prompt documentado es trabajo del Paso 14. Detalle completo en
  `paso-10-prompts-produccion.md`.
* **Idea de navegación (`idea-navegacion-atras-coherencia.md`) retomada y
  cerrada en dos de sus tres puntos**, a petición de Mar mientras espera la
  confirmación de T68 mañana. Antes de tocar código se preguntó en
  concreto: (1) "volver atrás" significa solo navegar, sin deshacer nada —
  elegido explícitamente entre dos opciones; (2) revisando el código,
  `components/MenuNavegacion.tsx` (T77) **ya deja ir de `/perfil` a
  `/ofertas` y viceversa** con un clic — la mejora que Mar pedía ya estaba
  construida sin que se hubiera caído en la cuenta; el tercer caso
  planteado (volver desde una tarjeta de oferta en generación) no aplica,
  no hay pantalla propia por oferta. Preguntado explícitamente si hacía
  falta algo más allá de la barra: Mar confirma que no. **Cerrado sin
  escribir ni una línea de código, ni tarea nueva en `docs/06-tareas.md`.**
  (3) Sobre el home, Mar propone una idea nueva —estadísticas
  personalizadas (ofertas del día, CVs generados, estado de envío por
  empresa)— pero la descarta ella misma para el MVP ("son funciones
  secundarias"); queda anotada para más adelante, sin construir. Detalle
  completo en `idea-navegacion-atras-coherencia.md`.
* **Hito 9 cerrado (T69-T76): la web tiene dirección pública.** Mar probó
  el recorrido completo desde el móvil (pedir acceso → abrir el enlace del
  email → marcar "me interesa" → descargar el PDF) en
  `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app` y confirmó que
  funciona. De paso se actualizó `APP_URL_JOBS_APP` en `Docker n8n/.env`
  (el enlace del aviso por email del Hito 8, pendiente desde entonces) a la
  misma URL real, y se reinició `dockern8n-n8n-1` para recogerlo — sin
  tocar `postgres` ni los workflows `Jobs` originales. Solo queda sin
  marcar **T68** (confirmar la ejecución real de las 13:00 de mañana).
  Detalle completo en `hito-9-publicar.md`.
* **Bloqueador de T76 arreglado: el enlace del email seguía apuntando a
  `localhost`.** Mar probó T76 desde el móvil y, al abrir el enlace de
  acceso, el navegador daba "no se puede acceder a este sitio web" —
  intentaba cargar `localhost:3000`, que solo existe en el ordenador donde
  se programa. Causa: la propia configuración de Supabase Auth
  (Authentication → URL Configuration), no el código de `app/page.tsx`, que
  ya construye `emailRedirectTo` correctamente con
  `window.location.origin`. Ni la **Site URL** (usada como destino por
  defecto cuando el enlace no coincide con ninguno permitido) ni la lista
  de **Redirect URLs** (vacía) se habían actualizado tras el despliegue en
  Vercel de T74 — seguían con el valor de cuando solo existía desarrollo
  local. Se corrige directamente desde el navegador (Mar no encontraba la
  sección "Authentication" en el panel): Site URL cambiada a
  `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app`, y dos Redirect
  URLs añadidas con comodín (`/**`): la misma de producción y
  `http://localhost:3000/**` (se conserva para seguir programando en local
  más adelante). El enlace que ya había recibido Mar no sirve — llevaba la
  URL vieja grabada dentro — así que hace falta pedir uno nuevo para
  reintentar T76. **Pendiente relacionado, no resuelto aquí**: `APP_URL_JOBS_APP`
  en `Docker n8n/.env` (usado por el aviso por email de `Jobs App · ingesta`,
  ver `hito-8-aviso-email.md`) sigue apuntando a `http://localhost:3000/ofertas`
  y también hay que actualizarlo a la URL real de Vercel.
* **T75 (Hito 9): las 5 claves añadidas en Vercel.** Mar las introdujo ella
  misma en el panel de Vercel (Settings → Environment Variables): nunca se
  escriben claves ni tokens desde aquí, por norma de seguridad, aunque haya
  permiso explícito. No existe una herramienta MCP de Vercel para listar
  los nombres de las variables sin más, así que la verificación fue
  indirecta: el despliegue de producción que se disparó al guardar las
  claves terminó en `READY` (sin fallo de build), y las rutas que dependen
  de Supabase en el servidor responden sano (`/` 200, `/ofertas` 200,
  `/perfil` 307 — redirección esperada sin sesión, no un 500). Son 5
  claves, no las 4 de la tabla original de `docs/04-plan-tecnico.md` §4:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`.
* **T74 (Hito 9): proyecto de Vercel creado y enlazado al repo de GitHub.**
  Proyecto `jobs-app` en el equipo `mcaparrosgu-4812's projects`, rama de
  producción `master`. Dos pasos previos que solo Mar podía hacer, ninguno
  automatizable por API (son consentimiento de cuenta): conectar GitHub como
  Login Connection en Vercel, y luego dar acceso explícito al repo
  `jobs-app` (privado) en la instalación de la GitHub App de Vercel — sin
  eso, `create_git_project` fallaba primero con "Add a Login Connection" y
  luego con "repo_not_found". Se disparó automáticamente un primer
  despliegue de prueba; fallará porque las claves de entorno aún no están
  puestas — normal en este punto, es justo lo que resuelve T75.
* **T73 (Hito 9): repositorio creado en GitHub, privado, código subido.**
  `mcaparrosgu/jobs-app`, con `gh repo create --private --source=. --remote=origin`
  desde este mismo directorio. Hueco encontrado y resuelto en el momento: la
  variable de entorno `GITHUB_TOKEN` de la máquina apunta a un token
  caducado/inválido, distinto de la sesión real de `gh` (cuenta
  `mcaparrosgu`, guardada en el keyring); tanto la creación del repo como el
  `git push` se hicieron con `GITHUB_TOKEN` excluido del entorno del comando
  (`env -u GITHUB_TOKEN ...`) para que `gh` usara la sesión correcta.
  Verificado tras el push: el repo es privado (`private: true`), y entre los
  archivos de la raíz solo aparece `.env.example` (sin valores reales),
  ningún `.env`/`.env.local`.
* **T72 (Hito 9): `.env.local` no se va a subir, confirmado.** `.gitignore`
  ya cubría `.env`, `.env.local` y variantes desde T03; `git status` no lo
  muestra y no está entre los archivos rastreados (`git ls-files`). El
  único archivo de entorno que sí se sube, `.env.example`, solo tiene
  nombres de claves, ningún valor real.
* **T71 (Hito 9): permiso explícito de Mar para subir el código a GitHub.**
  Preguntado por escrito (regla 3 de `CLAUDE.md`, que exige permiso
  explícito cada vez): confirmó "Sí, adelante" y eligió repositorio
  **privado** para T73 — se manejan CVs, emails y datos de contacto de sus
  compañeras de clase, aunque no vayan en el propio código. Anotado junto a
  T73 en `docs/06-tareas.md`. T68 queda deliberadamente sin marcar hasta
  mañana; el resto de Hito 9 continúa sin esperarlo, a petición de Mar.
* **T70 (Hito 9): los cuatro casos límite se comportan como pide la spec.**
  Email inválido: comprobado en vivo por Mar (campo `type="email" required`
  en `app/page.tsx`) — Chrome bloquea el envío y muestra su aviso nativo
  pidiendo el "@", sin llegar a llamar a Supabase. Los otros tres casos ya
  tenían evidencia real de sesiones anteriores, reutilizada aquí para no
  gastar cuota de IA sin necesidad: sin ofertas que coincidan (T44, mensaje
  explícito en `app/ofertas/page.tsx`), límite diario a mitad de sesión
  (T56, probado con el cupo lleno de verdad), descargar antes de tiempo
  (T61, botón deshabilitado mientras el estado es "generando"). La
  automatización del navegador (Claude in Chrome) falló de forma repetida
  al intentar reproducir el caso de email inválido (capturas colgadas,
  campo que no recogía el texto); se resolvió pidiéndole a Mar que lo
  probara ella misma en su navegador en vez de insistir con la
  automatización.
* **T69 (Hito 9): repaso de idioma, sin hallazgos.** Revisadas todas las
  pantallas (`app/`), componentes, mensajes de error de las rutas API y la
  plantilla del email de `Jobs App · ingesta` — todo en castellano. El único
  texto en inglés que aparece en el código (`COVER LETTER` en `lib/pdf.tsx`)
  es intencional: el CV y la carta se generan en el idioma de la oferta
  original (`lib/idioma.ts`, T49), no un descuido. T68 sigue pendiente de
  que Mar confirme mañana la ejecución real de las 13:00; T69 se adelantó
  igualmente porque no depende del contenido de esa ejecución, solo de los
  textos ya escritos.
* **Hito 8 cerrado (T63-T67): aviso por email de ofertas nuevas.** Cinco
  nodos nuevos en `Jobs App · ingesta` (n8n): cuentan las ofertas nuevas del
  día, consultan qué usuarias tienen perfil guardado y envían un aviso por
  Gmail solo si hay ambas cosas (regla de negocio 8). Hueco encontrado: el
  email de cada usuaria solo vivía en `auth.users`, no en `perfiles`;
  preguntado a Mar, se resolvió con una vista SQL nueva
  (`perfiles_con_email`, migración `0012`) en vez de duplicar el dato.
  También se añadió `APP_URL_JOBS_APP` al `.env` del n8n autoalojado (mismo
  patrón que `HEALTHCHECKS_PING_URL_JOBS_APP`) para el enlace del email,
  provisional a `localhost` hasta que exista URL pública (T74-T76).
  Verificado con una ejecución real completa: 5 ofertas nuevas detectadas,
  email real recibido en la bandeja de Mar. Workflow publicado. Detalle en
  `hito-8-aviso-email.md`. Queda pendiente que Mar confirme la ejecución
  real de las 13:00 de mañana (T68).
* **La app todavía no está desplegada — aclarado y anotado para el Paso
  16**: al dar instrucciones para añadir `GROQ_API_KEY` a Vercel, Mar avisó
  de que no existe ningún proyecto en su cuenta de Vercel. Comprobado:
  tampoco hay repositorio remoto de git conectado (T73-T76 de
  `docs/06-tareas.md` siguen sin marcar) — todo el trabajo del proyecto ha
  vivido en local hasta ahora, como pide `CLAUDE.md`. Mar decidió seguir en
  local por ahora y dejarlo apuntado para cuando llegue el Paso 16. Se
  añade una nota en `docs/06-tareas.md` (junto a T75) y se actualiza el
  "Pendiente" de `decision-respaldo-groq.md`: cuando se despliegue, hacen
  falta **dos** claves de IA en Vercel (`OPENROUTER_API_KEY` y
  `GROQ_API_KEY`), no solo la que lista la tabla desactualizada de
  `docs/04-plan-tecnico.md` §4.
* **Teléfono y LinkedIn/enlace en la cabecera del CV**: pedido por Mar tras
  revisar el PDF con el idioma ya unificado — solo se mostraba el email.
  Dos campos nuevos y opcionales en `perfiles` (`telefono`, `enlace`,
  migración `0011`), editables en `/perfil` junto al nombre, mostrados en
  el masthead del PDF. Al añadir hasta cuatro datos a la cabecera (puesto +
  3 de contacto), el diseño original de una sola fila dejaba un "·" suelto
  al partirse la línea; se separó el puesto a su propia línea y el
  contacto a la de debajo. Verificado en vivo con un PDF de prueba (datos
  de prueba retirados del perfil real después). Detalle en
  `decision-diseno-pdf.md`.
* **El respaldo de Groq rompía el diseño de las listas del CV, arreglado**:
  tras el arreglo del idioma, Mar volvió a revisar el PDF de "Global
  Marketing Operations Manager" y el diseño había cambiado — los puntos de
  cada puesto salían pegados en un párrafo en vez de en su propia línea.
  Causa: qwen3.6-27b (el respaldo de Groq, `decision-respaldo-groq.md`)
  separa los puntos con "•" en la misma línea en vez de con un salto de
  línea real, y `agruparLineas` (`lib/pdf.tsx`) solo reconoce como punto de
  lista una línea que empieza por "- ". Se añade `normalizarPuntos` en
  `lib/ia.ts`: reparte cada "•" en su propia línea antes de guardar el
  texto, defensa en código en vez de confiar en que el modelo lo haga bien.
  Verificado en vivo regenerando la misma oferta otra vez.
* **El titular del PDF salía en castellano aunque el CV estuviera en
  inglés, arreglado**: Mar revisó el PDF de "Global Marketing Operations
  Manager" (la oferta del arreglo de Groq de más abajo) y vio el CV y la
  carta en inglés pero el titular bajo su nombre en castellano. Causa: el
  titular salía siempre de `perfiles.puesto`, fijado en castellano al
  extraer el perfil (T25-T31) y ajeno al idioma que decide cada generación
  (`lib/ia.ts`, T49). Ahora la IA adapta también el titular en la misma
  llamada, guardado en la columna nueva `generaciones.puesto_texto`
  (migración `0010`, aplicada a mano en el SQL Editor de Supabase); la
  única etiqueta fija del PDF ("CARTA DE PRESENTACIÓN"/"COVER LETTER")
  sigue el mismo idioma. Verificado en vivo regenerando esa misma oferta:
  titular, CV y carta salieron los tres en inglés. Detalle en
  `decision-idioma-consistente-cv.md`.
* **"Servicio de IA saturado" al generar CV y carta, arreglado con un
  respaldo en Groq**: Mar reportó el error dos veces seguidas en una oferta
  concreta. Comprobado en vivo contra la API real de OpenRouter: los 5
  modelos gratis de `lib/ia.ts` devolvían el mismo `429`
  (`free-models-per-day`, `X-RateLimit-Remaining: 0`) — no es que cada
  modelo estuviera saturado, es que la cuenta había agotado su cupo
  compartido de 50 peticiones/día. Se añade Groq (`qwen/qwen3.6-27b`, con
  `reasoning_effort: 'none'` para no gastar tokens de pensamiento de más)
  como respaldo tras las dos rondas de OpenRouter: tiene cupo propio
  (1000/día, verificado en vivo) y su clave ya estaba guardada desde T23.
  De paso, se le añade `maxDuration = 60` a `extraer-perfil/route.ts`, que
  no lo tenía. Pendiente: añadir `GROQ_API_KEY` a Vercel en producción.
  Detalle en `decision-respaldo-groq.md`.
* **"Ver oferta" como nombre de empresa, arreglado en `Jobs App · ingesta`**:
  el nodo "Normalizador Get on Board" dejaba `empresa` fijo a `'Ver
  oferta'`, con un comentario de que la API pública no exponía el nombre.
  Comprobado en vivo: sí lo expone, en un segundo endpoint
  (`GET /api/v0/companies/{id}`, a partir del id de relación que sí trae
  `/search/jobs`). El nodo ahora resuelve el nombre real de cada empresa
  de la tanda en paralelo, con `try/catch` por empresa para no tirar abajo
  toda la ingesta si una falla; cae a `'No especificado'` igual que el
  resto de fuentes. Corregida a mano la única de las tres ofertas ya
  afectadas con nombre verificable (`BC Tecnología`); las otras dos se
  dejan para no adivinar, y se borran solas a los 30 días. Detalle en
  `decision-diseno-pdf.md`.
* **El PDF "no respiraba" porque la IA dejaba de poner saltos de línea
  (segunda vuelta de T58-T62)**: Mar probó el rediseño con su CV real y
  lo describió como caótico. Comprobado contra la base de datos: el
  `cv_texto` generado no tenía ningún salto de línea real (todo pegado
  con guiones) y repetía su nombre/email/teléfono, ya redundante con la
  cabecera nueva de T82/T83. Se corrige el prompt de `lib/ia.ts` (saltos
  de línea reales obligatorios, sin repetir el contacto) y se añade una
  validación estructural (`lineasConContenido`) que rechaza un texto sin
  suficientes líneas y dispara el reintento de T57 con otro modelo. Se
  abre algo el espaciado del PDF de paso. Detalle en
  `decision-diseno-pdf.md`. **Pendiente para Mar**: los documentos ya
  generados no se autocorrigen (regla de negocio 7) — para ver el
  arreglo hay que probar con una oferta nueva. Aparte queda anotado un
  bug de datos: una oferta tenía "Ver oferta" como nombre de empresa
  (normalizador de `Jobs App · ingesta`, no tocado aquí).
* **Rediseño del PDF (T58-T62, T82-T83)**: Mar probó el primer diseño
  (T58-T59, Helvetica a palo seco) y lo calificó de "lamentable,
  impresentable". Señaló una plantilla de referencia (Adobe Stock, "Minimal
  Resume Layout") y pidió un diseño elegante, sofisticado y a prueba de
  ATS. Se adopta el lenguaje visual de la referencia (nombre grande en
  serif, secciones en mayúsculas espaciadas, viñetas finas, blanco y negro)
  pero **sin** su franja de contacto girada 90° — es la pieza que de
  verdad arriesgaba el orden de lectura de un ATS —, sustituida por una
  raya vertical decorativa sin texto. Se incrustan dos fuentes libres
  (Playfair Display + Jost, licencia SIL OFL) copiadas a `public/fonts/`.
  De paso apareció **T82**: faltaba el nombre completo en el perfil
  (columna `nombre` nueva en `perfiles`, migración `0009`) — imprescindible
  para que un ATS identifique el documento. Detalle completo en
  `decision-diseno-pdf.md`. **Pendiente para Mar**: ejecutar la migración
  `0009_perfiles_nombre.sql` en el SQL Editor de Supabase, volver a guardar
  su perfil con su nombre, y hacer la revisión visual de T62 sobre el
  diseño nuevo.
* **Palabras clave cortas (cierra el aviso abierto del Hito 6)**: la
  pantalla de ofertas salia vacia porque cada palabra clave se busca de forma
  literal (`ilike`) y las que proponia la IA eran frases enteras. Se arreglan
  las tres capas: prompt con regla de "termino de busqueda de 1 a 3 palabras"
  y ejemplos de bien/mal, `maxLength` en el esquema (refuerzo: verificado en
  vivo que los modelos de la primera ronda lo aceptan) y un
  `lib/palabras-clave.ts` nuevo que recorta al nucleo lo que llega largo
  —decision de Mar: **recortar, no descartar**—. La limpieza se aplica tambien
  al puesto y a las titulaciones al construir el filtro de busqueda. En
  `/perfil`, escribir a mano una palabra clave larga **avisa pero no bloquea**.
  Comprobado con un CV ficticio contra los dos modelos reales. Ver
  `mejora-palabras-clave.md`. **Pendiente para Mar**: volver a analizar su CV
  para reemplazar las palabras clave largas que ya tiene guardadas.
* **Hito 6 cerrado (T48-T57)**: marcar "me interesa" prepara solo un CV y
  una carta adaptados a la oferta. Nuevo `hito-6-generar-cv.md`. Tres cosas
  cambiaron respecto a lo planeado, y las tres por medir en vez de suponer:
  (1) **la primera version de la verificacion automatica daba 11 avisos
  falsos** sobre el CV real de Mar — comparaba frases enteras y tomaba por
  nombre propio la primera palabra de cada vineta; reescrita palabra a
  palabra, baja a **0 falsos** y sigue cazando una empresa y una cifra
  inventadas a mano; (2) **los reintentos se mueven al navegador**, porque
  dos intentos dentro del endpoint tardaron **112 s** y una funcion de
  Vercel se corta a los 60; (3) **la lista de modelos de T25 estaba
  caducada** — los dos primarios llevan dias devolviendo 429, se renueva y
  pasa a dos rondas (ver `decision-modelo-ia.md`). Migracion `0008`
  aplicada en Supabase: columnas `iniciado_en` (cerrojo de turno) y
  `avisos`. Los datos de prueba se borraron al terminar.
* **Aviso abierto, para hablar con Mar**: las palabras clave guardadas en su
  perfil son frases largas ("Coordinacion multitarea en entornos remotos")
  que no aparecen literalmente en ningun anuncio, asi que **su pantalla de
  ofertas sale vacia**. Viene del Hito 3, no del 6, pero deja la app sin
  contenido para ella.
* **Repaso de pendientes: los dos que arrastraba el bundle quedan
  cerrados.** (1) **La migracion `0007_quitar_anios_experiencia.sql` SI
  esta aplicada** en Supabase — se anoto como "pendiente de aplicar" al
  escribirla y nunca se actualizo; comprobado contra la base de datos real,
  la columna `anios_experiencia` ya no existe en `perfiles`. (2) **T14
  verificado en la practica**, lo que llevaba pendiente desde el Hito 1
  ("Mar no sabe hacerlo manualmente todavia"): con la **misma clave publica
  que viaja al navegador**, insertar en `ofertas` da error explicito de RLS
  (`new row violates row-level security policy`), y borrar o modificar no
  da error pero **tampoco toca nada** — sin politica de `delete`/`update`,
  RLS no deja ninguna fila visible para esas operaciones. La prueba se hizo
  sobre una fila desechable creada y borrada con la clave de servicio,
  nunca sobre las ofertas reales, y se confirmo despues que las 20 filas
  seguian intactas. `hito-1-base-de-datos.md` pasa de tener seccion
  "Pendiente" a "Verificado en la practica". Las entradas antiguas de este
  log se dejan como estan: son el registro de lo que era cierto ese dia.
* **Agujero de seguridad cerrado** (T81, a peticion de Mar en el momento):
  `app/api/extraer-perfil/route.ts` era el **unico** endpoint que no
  comprobaba sesion — no llamaba a `getUser()`. Cualquiera que conociera la
  URL podia hacerle analizar textos y **gastar la cuota gratuita de
  OpenRouter**, dejando ademas sin servicio a las usuarias reales. Se aplica
  el mismo patron de los otros tres endpoints (401 si no hay usuaria),
  colocado **antes de leer el cuerpo y antes de llamar al modelo**, para no
  gastar nada en quien no deberia estar ahi. Verificado por los dos lados:
  `401` sin cookies y `200` con la sesion real de Mar (puesto + 20 palabras
  clave), con el boton "Analizar con la IA" intacto. **Dos notas de metodo
  para pruebas**: (1) el clic simulado del navegador no disparaba la
  peticion y parecia un boton roto — no lo era, un `click()` real desde la
  consola funcionaba y el servidor registro la peticion; antes de dar algo
  por roto, confirmarlo por una segunda via; (2) habia **servidores
  `next dev` huerfanos** de sesiones anteriores ocupando el puerto 3000, y
  `.next/dev/logs/next-development.log` conservaba errores de la madrugada
  que parecian actuales — al leer un log, mirar primero la marca de tiempo.
  Observado de paso: esa llamada a la IA tardo **42 segundos**, coherente
  con la saturacion conocida de la capa gratuita pero lejos del "en
  segundos" de la spec; anotado, sin tocar.
* **Navegacion** (T77-T80, añadidas sobre la marcha tras el Hito 5): Mar
  prueba la web y señala que "es muy poco práctica, es incómoda". Al
  revisarlo, el diagnóstico es peor de lo esperado: las tres pantallas
  estaban construidas pero **incomunicadas** — el enlace del email llevaba
  siempre a `/perfil` y desde ahí **la única forma de llegar a `/ofertas`
  era escribir la URL a mano**; el único enlace interno de toda la app era
  el del estado vacío de `/ofertas`; `next/link` no se usaba en ninguna
  parte; y no existía forma de cerrar sesión pese a que `/perfil` ya
  mostraba el email. Nada de esto aparecía en `docs/` ni en `knowledge/`:
  era un hueco, no una decisión, así que se añade la **historia A4** a
  `docs/01-historias.md` en vez de tratarlo como un retoque. **Tres
  decisiones de Mar**, preguntadas explícitamente: (1) menú permanente
  `Ofertas · Mi perfil · email · Salir` **más** guía de dos pasos mientras
  no haya perfil guardado — descartadas las variantes sin "Salir" (el
  ordenador puede ser compartido) y sin guía (quien entra por primera vez
  no sabe qué se espera de ella); (2) el enlace del email aterriza en
  `/ofertas` si ya hay perfil y en `/perfil` si no, que es lo que
  `docs/03-spec.md` §3.2 ya prometía y no se cumplía — importa sobre todo
  para el email de aviso diario del Hito 8; (3) retoques mínimos de
  coherencia, sin rediseño. Nuevos `components/MenuNavegacion.tsx`
  (`usePathname` para marcar dónde estás, primer uso de `<Link>` en el
  proyecto), `components/GuiaPasos.tsx` (presentacional, **sin ninguna
  consulta nueva**: cada pantalla ya sabe si hay perfil) y
  `app/auth/salir/route.ts`; `app/layout.tsx` pasa a `async` y pinta la
  barra solo con sesión. **Dos detalles que costaron un intento**: la
  redirección de "Salir" necesita `status: 303` (con el 307 por defecto el
  navegador repite el POST contra `/`, que solo responde a GET), y la barra
  no alineaba con el contenido por 24 px porque tenía el `px-6` dentro del
  `max-w-3xl` en vez de fuera — detectado en la revisión visual en Chrome.
  Verificado en Chrome con la sesión real; **deliberadamente sin probar en
  vivo**: pulsar "Salir" (dejaría a Mar fuera) y el aterrizaje condicional
  (gastaría un enlace del email), las dos quedan para ella. **Detectado de
  paso, sin arreglar**: `app/api/extraer-perfil/route.ts` es el único
  endpoint sin comprobación de sesión — cualquiera con la URL podría gastar
  la cuota de OpenRouter; propuesto para el Paso 14 (guardrails). Detalle
  completo en `mejora-navegacion.md`.
* **Hito 5 cerrado** (T41-T47, Paso 9): pantalla `app/ofertas/page.tsx`
  con cinco estados (cargando, sin perfil, sin ingesta hoy, sin
  coincidencias, lista), endpoint `app/api/ofertas/route.ts` que
  reemplaza al botón "Buscar" con una consulta de código —sin IA, tal
  como fija `docs/05-ia.md`— comparando puesto+palabras_clave (y, si
  `usar_experiencia_cv` está marcado, también empresas_cv/titulos_cv) con
  `ilike` contra título y descripción de `ofertas`, componente
  `components/TarjetaOferta.tsx` con el botón "me interesa" y endpoint
  `app/api/interes/route.ts` con `upsert` + `ignoreDuplicates` sobre el
  `unique(user_id, oferta_id)` de T11 para que pulsar dos veces no
  duplique ni dé error. **Verificado en Chrome** con permiso de Mar: con
  su perfil real (palabras clave largas, de la prueba del Hito 3) salió
  correctamente el mensaje de "no hay ofertas que coincidan" — hallazgo
  de paso: esas palabras clave son demasiado largas para que un `ilike`
  las encuentre nunca en un título de oferta real (fallo 2 de
  `docs/05-ia.md` §6.3), anotado para si hace falta revisar el prompt de
  extracción del Hito 3 más adelante, sin tocarlo en este hito. Para
  probar el camino con coincidencias se añadió temporalmente la palabra
  clave "Operations" (aparece en varias de las 20 ofertas de prueba del
  Hito 4), se marcó "me interesa" con un clic simple y con un doble clic,
  se confirmó tras recargar que el estado persiste, y se verificó
  directamente en Supabase que `intereses` tenía exactamente 2 filas (no
  3) pese al doble clic — T47 confirmado a nivel de base de datos, no
  solo por el botón deshabilitado en el cliente. Datos de prueba
  limpiados al terminar (palabra clave y las 2 filas de interés), perfil
  de Mar restaurado tal como estaba. Detalle completo en
  `hito-5-ver-ofertas.md`.
* **Hito 4 cerrado** (T32-T40, Paso 9): workflow nuevo `Jobs App · ingesta`
  en n8n, duplicado de `Jobs · ingesta` sin tocar el original. Quitados los
  nodos de Google Sheets y su cadena de aviso; nuevos nodos
  `Generar id_externo` (mismo hash 32-bit que el `Filtro duplicados`
  original, regex de diacriticos corregida), `Supabase Insertar oferta`
  (mapea al esquema de `ofertas`, la deduplicacion vive en el
  `unique(fuente, id_externo)` de la base de datos, no en n8n) y
  `Supabase Borrar ofertas antiguas` (regla de retencion, 30 dias).
  **Fuentes de pago desactivadas**: la cuenta de Apify de Mar se quedo sin
  fondos, asi que las 6 fuentes que dependen de sus actores (Indeed,
  LinkedIn, InfoJobs, Wellfound, FlexJobs, All Jobs Scraper) se desactivan
  en el workflow nuevo para el MVP; quedan las 7 gratuitas. Cron propio a
  las 13:00 y vigilante propio de Healthchecks (check nuevo, variable
  `HEALTHCHECKS_PING_URL_JOBS_APP`, con reinicio del contenedor n8n
  confirmado sin perdida de datos ni afectar a los otros workflows `Jobs`).
  **Bug encontrado y corregido en la propia construccion**: el nodo de
  borrado no emitia ningun item si no habia filas que borrar, asi que el
  ping de Healthchecks enganchado despues nunca se disparaba pese al
  `executeOnce`; corregido con `alwaysOutputData: true`, verificado en
  ejecucion real. Verificado con permiso explicito de Mar que dos
  ejecuciones seguidas no duplican filas (20 → 20). Detalle completo en
  `hito-4-n8n-supabase.md`.
* **Segunda pasada del Hito 3** (mismo dia): Mar prueba `/perfil` con su
  propio CV (en ingles) y da cuatro correcciones, las cuatro aplicadas —
  detalle completo en `hito-3-perfil.md`. Resumen: (1) una sola pantalla
  en vez de dos fases (`FormularioPerfil.tsx` reescrito sin bifurcacion);
  (2) se retira "anios de experiencia" del formulario — contradecia la
  historia B3 ("el sistema no puede proponerlo con fiabilidad"), pero como
  el dato no participaba en el emparejamiento (regla de negocio 3), Mar
  elige (preguntada explicitamente) quitarlo del todo en vez de que la IA
  lo intente calcular; retirado de historias/mvp/spec/plan-tecnico y de la
  tabla `perfiles` (migracion `0007_quitar_anios_experiencia.sql`,
  pendiente de aplicar en Supabase); (3) `lib/ia.ts` fuerza salida en
  español siempre, aunque el CV este en otro idioma (mismo principio que
  ya se aplicaba al idioma de la oferta, docs/05-ia.md §6.5); (4) el
  esquema de palabras clave sube de 5-10 a 8-20, con el prompt pidiendo
  explorar variantes/sinonimos de lo que ya esta en el CV, sin inventar.
  **Bug real encontrado y resuelto**: el error de hidratacion de React que
  parecia intermitente resulto ser un **Service Worker de otro proyecto**
  ("spotideezer-v2") registrado en el mismo origen `localhost:3000`,
  sirviendo JS viejo desde su cache pese a reinicios de servidor y
  recargas duras — los Service Workers se registran por origen, no por
  proyecto. Desregistrado y cache borrada; anadido `translate="no"` +meta
  `notranslate` en `app/layout.tsx` para que el traductor automatico de
  Chrome tampoco pueda romper la hidratacion. **Rendimiento**: `lib/ia.ts`
  pasa de probar los 3 modelos en secuencial a probarlos **en paralelo**
  (`Promise.any` + `AbortController`) tras confirmar en el log del
  servidor que dos de los tres estaban saturados (**429**,
  `upstream_provider_shared_pool` — cupo compartido de la capa gratuita de
  OpenRouter) y el tercero (modelo "razonador", mas lento por diseño) era
  el unico en responder; en secuencial la suma superaba el minuto o
  fallaba, en paralelo tarda lo que tarde el mas rapido en responder bien.
* **Creacion**: `hito-3-perfil.md` — cierre del Hito 3 (T25-T31, Paso 9).
  `lib/ia.ts` llama a OpenRouter con salida estructurada para extraer
  puesto y palabras clave (y, sin coste extra, empresas/titulaciones para
  verificar después, docs/05-ia.md §6.2); prueba una lista de 3 modelos
  gratis con reintento de espera creciente si uno falla o satura. Nuevo
  endpoint `app/api/extraer-perfil/route.ts`, componente
  `components/FormularioPerfil.tsx` (caja de texto → puesto y palabras
  clave editables → años de experiencia y casilla "tener en cuenta mi
  CV" → guardar) y `app/api/perfil/route.ts` (GET+POST, upsert por
  `user_id`). Verificado en Chrome con un CV de prueba ficticio: propone
  puesto y 9 palabras clave razonables, edición y guardado funcionan, y
  el perfil se recarga precargado en `/perfil` tras una recarga real.
  **Incidente de la sesión de prueba, no de la app**: la primera
  comprobación de "recargar y ver los mismos datos" pareció fallar por un
  *hydration mismatch* de React; investigado a fondo (incluida la
  documentación de esta versión de Next.js en `node_modules/next/dist/docs/`)
  antes de tocar nada, resultó ser que la herramienta de automatización de
  navegador hacía una navegación "blanda" que Next.js 16 intercepta
  preservando el estado antiguo del formulario (ver "UI state
  preservation" de Cache Components) — con recarga dura (`Ctrl+Shift+R`)
  funciona a la primera. Sin cambios de código derivados; anotado como
  nota de runbook para pruebas futuras con esta herramienta.
* **Correccion menor**: `.env.example` — la sección de Groq se sustituye
  por `OPENROUTER_API_KEY`, coherente con la decisión de T25.
* **Creacion**: `decision-modelo-ia.md` — cierra T25 la parte de "que
  proveedor y modelo". Cuenta creada en OpenRouter, sin tarjeta. Verificado
  en vivo: 17 modelos gratis (`:free`), solo 1 de OpenAI. Probado con
  exito `response_format: json_schema` en modo `strict` contra
  `google/gemma-4-31b-it:free` (devolvio el JSON exacto pedido) y contra
  `nvidia/nemotron-nano-9b-v2:free` (funciono, pero es un modelo
  "razonador" que gasta tokens de mas). Los dos primeros modelos de la
  lista (Gemma, GLM) dieron 429 por saturacion temporal del proveedor de
  detras durante la prueba -- de ahi que el diseño final sea una **lista
  de modelos intercambiables**, no uno fijo. `lib/groq.ts` (nombrado asi
  en `docs/04-plan-tecnico.md` y T25 de `docs/06-tareas.md`) pasa a
  llamarse `lib/ia.ts`, nombre neutral de proveedor.
* **Creacion**: `idea-cerebras-version-consolidada.md`. Mar confirma que
  no quiere poner tarjeta para el MVP de prueba con la clase, pero le
  interesa Cerebras (3M tokens/dia gratis con tarjeta puesta) para cuando
  Jobs App pase a una version consolidada, mas alla de las 5 companeras
  de bootcamp. Queda anotado para retomar entonces, no se pierde la idea.
* **Descartado**: Cerebras como proveedor de IA para T25. `docs/04-plan-tecnico.md`
  daba por hecho que Groq ofrecia varias familias de modelos de peso
  abierto (Llama, Qwen, Kimi, Mistral); comprobado en vivo contra la API
  real de Groq, ese abanico ya no existe — los unicos modelos activos son
  `openai/gpt-oss-*` (descartados, decision etica de Mar) y
  `qwen/qwen3.6-27b`, marcado "Preview" por Groq (puede retirarse con poco
  aviso). Se investigo Cerebras como alternativa sin OpenAI: su tabla de
  limites promete cuotas generosas para `gemma-4-31b` (2.400
  peticiones/dia, 3M tokens/dia), pero **al probar una llamada real da
  "Payment required"** — supervisado en Chrome, el Playground confirma la
  letra pequeña: "Add a payment method to start running requests and claim
  $5 in free credits". Exige tarjeta pese al marketing de "gratis, sin
  tarjeta". Descartado por eso, no por falta de modelos no-OpenAI. Sigue
  la busqueda con OpenRouter (agregador de modelos gratis :free, sin
  tarjeta, pero con techo de 50 peticiones/dia sin credito comprado).
* **Construccion**: T23-T24 de `docs/06-tareas.md` (Paso 9). Mar crea la
  cuenta en Groq y guarda `GROQ_API_KEY` en `.env.local` (T23). Supervisado
  en Chrome: en Data Controls, se activa **Global ZDR** (no solo
  "Inference APIs ZDR") porque Jobs App no usa ninguna funcion de Groq que
  requiera guardar datos (batch, fine-tuning), asi que no hay coste
  funcional en cubrir todo con la opcion mas amplia (T24). Cumple el
  requisito de `CLAUDE.md` ("Datos sensibles") antes de que ninguna
  companera pegue su CV.
* **Creacion**: `hito-2-entrar.md` — cierre del Hito 2 (T18-T22, Paso 9).
  Magic link de Supabase Auth funcionando de extremo a extremo: formulario
  conectado (T18), ruta de callback que canjea el codigo por sesion (T19),
  pantalla minima de perfil (T20), sesion verificada tras cerrar pestaña
  (T21) y mensaje claro ante enlace caducado (T22). Se añadio
  `@supabase/ssr` (no estaba en el plan original de T08) con tres archivos
  en `lib/supabase/` (cliente de navegador, cliente de servidor, logica de
  refresco) y `proxy.ts` en la raiz — Next.js 16 deprecó el fichero
  `middleware.ts` en favor de `proxy.ts`, se migro directamente para no
  construir sobre una convencion ya obsoleta. **Incidente durante la
  prueba real**: el primer enlace enviado al email de Mar dio
  `otp_expired` al pincharlo — sirvio de paso para verificar T22 en
  caliente (mensaje claro, no pantalla en blanco). Un segundo enlace,
  abierto de inmediato, funciono sin problema; no se ha tocado
  configuracion por este incidente, queda como nota de runbook. Pendiente:
  T14 (RLS de escritura en `ofertas` bloqueada desde el navegador) sigue
  sin verificarse en la practica.
* **Creacion**: `decision-caducidad-sesion.md` y **cierre de T16** de
  `docs/06-tareas.md` (Paso 9). Supervisado en Chrome: Authentication →
  Sessions en Supabase tiene los campos correctos ("Time-box user
  sessions", "Inactivity timeout") pero estan bloqueados con "Configuring
  user sessions is only available on the Pro Plan and above" en el plan
  Free (fijos en `0`/`never`). Se plantearon dos opciones: forzar la
  caducidad con codigo propio, o dejar el valor por defecto y documentar
  la limitacion. **Mar elige documentar la limitacion** — presupuesto 0
  €/mes, sin construir logica a medida solo para esto. Anotado como
  limitacion conocida en `docs/03-spec.md` regla 9 y en "Continuidad de
  sesion" (§7), para que la spec no prometa algo que la infraestructura
  gratuita no cumple.
* **Preferencia registrada**: Mar quiere que, en adelante, se aproveche
  cualquier via que agilice la construccion del MVP — incluida la
  automatizacion de navegador (Chrome) para tareas de panel en vez de
  explicarselas paso a paso, cuando el riesgo sea bajo y ella este
  presente para supervisarlo.
* **Construccion**: T15 de `docs/06-tareas.md` (Paso 9) — SMTP de Gmail
  activado en Supabase Auth (Authentication → SMTP Settings), conexion
  verificada. Abre el Hito 2 (Entrar con el enlace de email); paso previo
  necesario para T16 (caducidad de sesion a 15 dias) y T18 (envio real del
  magic link).
* **Creacion**: `hito-1-base-de-datos.md` — concepto de cierre del Hito 1
  (T09-T14): resume las cuatro tablas creadas en Supabase y el diseño de
  RLS (privacidad por usuaria en `perfiles`/`intereses`/`generaciones`,
  lectura compartida y escritura solo-n8n en `ofertas`). Enlazado desde
  `index.md`.
* **Pendiente**: verificar en la practica el criterio de T14 ("una
  escritura de prueba desde el navegador da error de permiso" en
  `ofertas`). Mar no sabe hacerlo manualmente todavia (requiere consola
  del navegador con sesion iniciada); se retoma mas adelante, cuando haya
  una pantalla real de la web que hable con Supabase (a partir del Hito
  2/3) y sea mas facil de probar sin pasos sueltos de consola.
* **Creacion**: `Profesora Claude/Por que Supabase y no Google Docs.md`
  en el vault `wiki` de Obsidian de Mar — informe didactico (modo
  profesora) sobre por que la base de datos de Jobs App es Supabase y no
  Google Docs/Sheets, apoyado en el precedente real del workflow n8n
  existente (usaba Sheets con una sola usuaria, incompatible con
  privacidad para 5 personas) y en lo que Supabase resuelve de fabrica
  (magic link + RLS). Generado por un subagente, subido a la carpeta
  "Profesora Claude" ya existente en ese vault.
* **Construccion**: T14 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0006_rls_ofertas.sql` activa RLS en `ofertas` con
  una unica politica `select` para cualquier usuaria autenticada; sin
  politicas de `insert`/`update`/`delete`, asi que con RLS activo nadie
  desde la web (clave publica) puede escribir. n8n sigue escribiendo
  porque usa la service role key, que ignora RLS por diseno de Supabase.
  Cierra el Hito 1 (T09-T14).
* **Construccion**: T13 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0005_rls_privacidad.sql` activa RLS (regla de
  negocio 1) en `perfiles`, `intereses` y `generaciones`: cuatro
  politicas por tabla (`select`/`insert`/`update`/`delete`) con la
  condicion `auth.uid() = user_id`, para que cada usuaria solo pueda ver
  y modificar sus propias filas aunque el codigo de la web tuviera un
  fallo. `ofertas` se deja fuera a proposito, es la tarea T14, con reglas
  distintas (lectura para todas, escritura para nadie desde la web).

## 2026-08-18
* **Construccion**: T12 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0004_generaciones.sql` crea la tabla `generaciones`
  (regla de negocio 7): `user_id` + `oferta_id` con `unique` (un solo
  documento por oferta), `estado` restringido por `check` a `generando` /
  `listo` / `error` (por defecto `generando`), `cv_texto`/`carta_texto`
  como resultado congelado y `error_mensaje` para el caso limite de
  fallo. Migracion escrita, pendiente de aplicarla en Supabase (mismo
  procedimiento de T09-T11: SQL en una linea, "Run without RLS"; RLS
  llega en T13).
* **Construccion**: T11 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0003_intereses.sql` crea la tabla `intereses`
  (regla de negocio 2): `user_id` + `oferta_id` referencian a
  `auth.users` y `public.ofertas` respectivamente, con restriccion
  `unique (user_id, oferta_id)` para que no se pueda marcar la misma
  oferta dos veces. Aplicada en Supabase (supervisado en Chrome), mismo
  procedimiento de T09/T10: SQL en una linea, "Run without RLS" (RLS
  llega en T13).
* **Construccion**: T10 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0002_ofertas.sql` crea la tabla `ofertas` con los
  campos de `docs/04-plan-tecnico.md` §3.4 (`titulo`, `empresa`, `enlace`,
  `descripcion`, `fuente`, `id_externo`, `ingerida_en`). Restriccion
  `unique (fuente, id_externo)` para que la misma oferta no se duplique
  si aparece dos dias seguidos. Aplicada directamente en Supabase
  (supervisado en Chrome), con el mismo truco de T09: SQL en una sola
  linea y "Run without RLS" (RLS en `ofertas` es la tarea T14, aparte).
* **Construccion**: T09 de `docs/06-tareas.md` (Paso 9) —
  `supabase/migrations/0001_perfiles.sql` crea la tabla `perfiles` con
  los campos de `docs/04-plan-tecnico.md` §3.4 (`user_id` unico contra
  `auth.users`, `palabras_clave`/`empresas_cv`/`titulos_cv` como listas
  de texto, `usar_experiencia_cv` booleano, `actualizado_en` para el
  borrado al mes). RLS se deja fuera a proposito: es la tarea T13,
  aparte, para no adelantar trabajo que no le toca a esta tarea.
  **Obstaculo encontrado**: a Mar no le aparecia la tabla tras pegar el
  SQL. Supervisado en Chrome: el editor SQL de Supabase (Monaco) rompe
  el texto multilinea al pegarlo/escribirlo (auto-indenta y desplaza
  lineas), asi que la consulta nunca llegaba a ejecutarse bien; y aunque
  el SQL sea valido, Supabase muestra un aviso bloqueante ("Potential
  issue detected: creates a table without RLS") que exige elegir **"Run
  without RLS"** o **"Run and enable RLS"** antes de correr cualquier
  `create table` sin RLS — si ese dialogo se cierra o se ignora, no pasa
  nada. **Se aplico manualmente** pegando el SQL como una sola linea (sin
  saltos de linea) y pulsando "Run without RLS"; la tabla quedo creada
  y vacia, sin RLS, tal como toca en esta tarea. **Va a repetirse en
  T10-T14** (mismo editor, mismas tablas sin RLS hasta T13/T14): pegar
  el SQL de cada migracion en una sola linea, y en el aviso elegir "Run
  without RLS".
* **Construccion**: Hito 0 de `docs/06-tareas.md` terminado (T01-T05,
  Paso 9). Proyecto Next.js 16 con TypeScript y Tailwind generado con
  `create-next-app`; `npm run build` compila sin errores. **Obstaculo
  encontrado**: npm rechaza el nombre de paquete "Jobs App" (espacio y
  mayusculas), asi que se genero el andamiaje en un directorio temporal
  y se copiaron solo los archivos deseados — sin pisar el `.gitignore`,
  `CLAUDE.md` ni `README.md` propios, que `create-next-app` habria
  sobrescrito con los suyos. `app/page.tsx` sustituido por una portada
  propia. Pendiente menor: `app/layout.tsx` conserva `lang="en"` y el
  titulo de pestana "Create Next App", ambos del andamiaje.
* **Creacion**: `CLAUDE.md`, `README.md`, `.env.example` y carpetas
  `lib/`, `components/`, `supabase/migrations/` (Paso 8) — se prepara el
  terreno antes de construir. El `.gitignore` pasa de 1 linea a proteger
  `.env*.local`, `node_modules/`, `.next/` y `.vercel`. **Verificado en
  la practica**: se creo un `.env.local` de prueba y `git status` no lo
  vio; `git check-ignore` confirmo la regla. `.env.example` documenta cada
  variable y donde va su valor real (Vercel Environment Variables,
  Supabase SMTP Settings, n8n Credentials), sin ningun valor real.
  `CLAUDE.md` recoge las 7 prohibiciones acumuladas del proyecto:
  secretos fuera del codigo, nunca `NEXT_PUBLIC_` en un secreto, nada a
  GitHub sin permiso explicito, no tocar los workflows `Jobs`, no proponer
  OpenAI, no reestructurar `docs/`, y no dar por elegida una opcion sin
  preguntarla. **`app/` y `package.json` se dejan deliberadamente para el
  Paso 9**, donde los genera `create-next-app` — crearlos a mano ahora
  provocaria un choque con ese comando.
* **Correccion**: `docs/06-tareas.md`, `docs/04-plan-tecnico.md` y
  `decision-tareas-mvp.md` — **los workflows `Jobs` de n8n no se tocan**.
  La primera version del Paso 7 planteaba modificar `Jobs · ingesta` para
  que escribiera en Supabase; Mar lo corrigio expresamente: son su
  busqueda de empleo real en produccion. Se copia el JSON y se adapta un
  workflow **nuevo e independiente**, `Jobs App · ingesta`, con Schedule
  Trigger y vigilante propios (~30 min segun su estimacion, porque las 11
  fuentes vienen hechas en la copia). Renumeracion: 74 → **76 tareas**
  (T01-T76). Ventaja en retrospectiva: la busqueda de empleo real de Mar
  no puede romperse por un fallo del proyecto de clase.
* **Creacion**: `docs/06-tareas.md` (Paso 7) y `decision-tareas-mvp.md` —
  tareas en 10 hitos, cada una de menos de una hora, con archivos,
  verificacion sin programar, dependencias y casilla. Cada hito termina
  con algo visible en pantalla (de "pagina en localhost" a "recorrido
  completo en produccion"). Se detecto que el borrado a 30 dias (regla 10)
  y el aviso condicional por email (regla 8) no existian construidos en
  ningun sitio, y se anadieron como tareas. Cada regla de negocio de
  `docs/03-spec.md` queda trazada a al menos una tarea. Ultimo hito
  (Publicar) incluye parada explicita pidiendo permiso antes de subir a
  GitHub, como ya quedo acordado en el Paso 5.
* **Creacion**: `docs/05-ia.md` (Paso 6) y `decision-rol-ia.md` — se acota
  el papel de la IA. **Solo dos cosas usan IA, ambas en peldano 1**:
  extraer puesto/palabras clave del CV, y redactar CV+carta. Todo lo demas
  es codigo determinista; en particular **el boton "Buscar" no lleva IA**
  (romperia el "en segundos" de la spec y le quitaria a la usuaria el
  control de la regla 4). **La IA no tiene ninguna herramienta**: recibe
  texto y devuelve texto, no toca la base de datos ni envia nada.
  Mar planteo que un prompt excelente bastaria para evitar los 6 fallos
  posibles; se corrigio que **un prompt es una peticion, no una
  garantia**, y se definieron cuatro defensas por orden de fuerza
  (quitarle la decision > encajonar la salida > verificar con codigo >
  prompt). Resultado: 5 de 6 fallos resueltos, y **solo uno gracias al
  prompt**. El idioma se elimina como fallo quitandole la decision al
  modelo; la estructura, con salidas estructuradas en vez de los
  marcadores `===CV===` del workflow n8n (que tienen fallo conocido).
  **La alucinacion se reduce mucho pero NO se elimina** — se anaden dos
  verificaciones automaticas (cifras contra el CV original, empresas
  contra una lista que la extraccion ya guarda, sin coste extra) y por
  ello la tabla `perfiles` gana los campos `empresas_cv` y `titulos_cv`.
  Privacidad verificada: Groq **no entrena** con los datos ni en el plan
  gratuito; pendiente activar **Zero Data Retention** antes de que ninguna
  companera pegue su CV. **Mar decide no usar tecnologia de OpenAI por
  motivos eticos**, lo que descarta los modelos `gpt-oss` y con ellos el
  modo `strict` de salidas estructuradas — de ahi que la validacion por
  codigo de la estructura no sea opcional. Coste: **0 €** tanto en volumen
  realista (~60 generaciones/mes) como en el techo teorico (750).
* **Actualizacion**: `docs/04-plan-tecnico.md` (nueva seccion 2.1) y
  `decision-stack-mvp.md` — Mar **confirma explicitamente la Opcion 1**
  tras contrastar tres variantes mas que planteo ella. Se descartan con
  datos verificados: **v0 de Vercel** (peor que Lovable — 5 $/mes de
  creditos, ~7 mensajes/dia, y sin Supabase integrado de fabrica, que es
  justo la pieza que mas dias ahorra), **Lovable Pro a 25 $/mes** (quita
  el riesgo de bloqueo por cuota pero no acelera la construccion: el
  cuello de botella es cuantos intentos hacen falta para arreglar codigo
  que no se entiende, no cuantos hay disponibles; ademas el hosting se
  factura aparte por uso y es recurrente) y **copiar el workflow
  `Jobs · generacion CV` existente** (no es una cuarta opcion sino la
  Opcion 3 con punto de partida: usuaria unica, Sheets como almacen —
  incompatible con la privacidad exigida — y API de pago de Anthropic).
  Hallazgo aprovechable: el **prompt** de ese workflow si se reutiliza en
  `lib/groq.ts` (marcadores `===IDIOMA===`/`===CV===`/`===CARTA===`).
  Nota de proceso: Mar senalo que en el Paso 5 no se le pregunto
  explicitamente que opcion prefería — las opciones se presentaron con
  recomendacion dentro de un plan que ella aprobo en bloque, lo que no
  equivale a elegir. Corregido y registrado como regla para los pasos
  siguientes.
* **Creacion**: `docs/04-plan-tecnico.md` (Paso 5) y
  `decision-stack-mvp.md` — se elige el stack: Next.js + Supabase + Groq +
  Vercel, sobre el n8n existente. Mar fija **presupuesto 0 euros/mes**
  como restriccion dura. Se descartan Lovable (plan gratis de 5 acciones
  al dia, insuficiente para construir e iterar) y "todo en n8n" (no cubre
  sesion de 15 dias, edicion de palabras clave ni lista interactiva).
  Groq resuelve la preferencia de IA gratuita y de codigo abierto
  (modelos de peso abierto, sin tarjeta, sin autoalojar) que quedaba
  abierta desde el Paso 4 — "opencode go" no llego a concretarse como
  opcion viable. Decision de arquitectura clave: **n8n y la web no se
  hablan entre si, ambos escriben/leen en Supabase**, lo que elimina el
  bloque de 1-2 dias de "conectar Buscar al webhook" de `docs/02-mvp.md`.
  El contador de uso diario se calcula por consulta en vez de tener tabla
  propia, y el borrado al mes lo hace el cron de n8n existente. Riesgos
  documentados: pausa de Supabase a los 7 dias (mitigada por el propio
  cron diario), limite de ~6.000 tokens/min de Groq, calidad del modelo
  gratuito, y credito de Apify como unico coste ajustado. Publicar
  requerira subir a GitHub — pendiente de permiso explicito de Mar en el
  Paso 9.
* **Actualizacion**: `docs/03-spec.md`, `docs/01-historias.md`,
  `docs/02-mvp.md` — Mar resuelve las 2 preguntas abiertas que quedaban
  y anade una funcionalidad nueva. Puesto y palabras clave ahora se
  **proponen automaticamente al pegar el CV** (no autosugerencias en
  vivo mientras se escribe) y la usuaria las edita; nueva historia B2,
  B1 pasa a ser solo "pegar CV", anos de experiencia se separa en B3.
  Acceso caduca a los 15 dias de inactividad (ademas de por uso unico),
  requiriendo nueva verificacion por email. Retencion de datos: 1 mes
  tras generarse. Zona horaria de la ingesta: 13:00 hora de Espana.
  Esfuerzo sube ligeramente a 6,5-11 dias por la extraccion automatica
  via IA. Preferencia de Mar por modelo de IA gratuito y de codigo
  abierto (menciona "opencode go") registrada en
  preferencias-tecnicas-paso5.md — aclarado en conversacion que Claude
  no anade marcas de agua a documentos generados.
* **Creacion**: `docs/03-spec.md` (Paso 4) — especificacion funcional sin
  mencionar tecnologia. Antes de escribirla se corrigieron 3
  inconsistencias entre historias y MVP: "Buscar" ya no dispara ingesta
  (solo filtra el pool compartido de las 13:00, respuesta en segundos);
  la sesion tras el magic link dura varios dias; los CVs/cartas generados
  quedan como snapshot, no se regeneran solos. Se resolvieron ademas los
  huecos pendientes: formato de descarga (PDF, diseno sobrio y
  minimalista), limite de uso (5 CVs+cartas por usuaria y dia), campos
  que definen el perfil para filtrar (puesto + palabras clave). Dos
  respuestas eran decisiones de tecnologia (Gmail, modelo de IA gratis) y
  se guardaron aparte en `preferencias-tecnicas-paso5.md` para el Paso 5,
  no en la spec. Quedan 2 preguntas abiertas no bloqueantes: zona horaria
  de la renovacion diaria y politica de retencion de datos.
* **Actualizacion**: `docs/01-historias.md` (C4) y `docs/02-mvp.md` — se
  especifica que CV y carta de presentacion deben ir en **paginas
  separadas** dentro del archivo unico descargable (la carta siempre
  empieza en pagina nueva, sin importar cuanto ocupe el CV). Es un punto
  intermedio entre la version original (paginacion exacta: CV 1-2 pag +
  carta pag 3) y la simplificacion del consenso anterior (sin ningun
  control de pagina) — mantiene la separacion visual sin fijar cuantas
  paginas ocupa el CV. Esfuerzo sin cambios significativos (salto de
  pagina forzado es trivial comparado con paginacion exacta).
* **Actualizacion**: `docs/01-historias.md` y `docs/02-mvp.md` — ronda de
  consenso para recortar tiempo de construccion sin revertir las
  decisiones de fondo de Mar. Cambios de "como" (no de "que"): login con
  contrasena pasa a magic link (elimina A2 por completo, no hay
  contrasena que recuperar); archivo combinado CV+carta ya no exige
  paginacion exacta (CV pag 1-2 + carta pag 3), solo concatenacion en
  orden; email de aviso (G3) pasa de personalizado-por-perfil-en-el-cron a
  generico ("hay ofertas nuevas"), la relevancia se sigue filtrando en la
  web. Esfuerzo estimado baja de 9-13 a 6,5-10,5 dias, cerca de la
  estimacion original pero manteniendo carta de presentacion, login
  privado e historial.
* **Actualizacion**: `docs/01-historias.md` y `docs/02-mvp.md` — segunda
  vuelta de decisiones con Mar. Vuelven al MVP: autorregistro (privacidad,
  cada usuaria crea su propia contrasena), carta de presentacion junto al
  CV (una sola llamada, un solo archivo descargable con CV en pag 1-2 y
  carta en pag 3), e historial de resultados al volver a entrar (evita
  abandono a mitad de busqueda). Nueva historia G3: email automatico de
  aviso (sin detalle de ofertas) cuando la ingesta de las 13:00 encuentra
  algo relevante para el perfil de la usuaria. B2 pasa definitivamente a
  textarea de texto plano, sin subida de PDF. G2 confirmado como
  automatico via schedule/trigger de n8n. Esfuerzo revisado de 7-10 a
  9-13 dias. Veredicto actualizado: el MVP crecio por decisiones de fondo
  de Mar (privacidad, tasa de conversion a entrevista), no se propone
  recortarlas de nuevo; la palanca que queda es secuenciar el Paso 9 en
  dos tandas (recorrido critico primero, cron+email despues).
* **Creacion**: `docs/02-mvp.md` (Paso 3) — recorte al recorrido critico:
  login simple sin auto-registro, un solo puesto, CV solo en PDF, una
  busqueda a la vez, seleccion "me interesa" mantenida (control de coste),
  CV sin carta de presentacion, limite de uso hardcodeado. Estimado en
  7-10 dias. Veredicto: sigue siendo grande para un principiante; se
  propone un MVP v0 aun mas reducido (textarea en vez de PDF, generacion
  automatica de las 3 primeras ofertas sin pantalla de seleccion) como
  opcion, manteniendo el login con contrasena por ser decision no
  negociable de Mar.
* **Creacion**: `docs/01-historias.md` (Paso 2) — historias de usuario
  agrupadas en Identificacion, Perfil, Busqueda/generacion de CV, Espera,
  Resultados, Errores y Control de uso/coste. Huecos detectados: mecanismo
  de identificacion real, definicion de "relevante", formato de CV, valor
  del limite de uso.
* **Actualizacion**: `docs/01-historias.md` — revision de criterios de
  aceptacion con Mar. Cambios de fondo: login pasa a email+contrasena (se
  anade recuperar contrasena), el modelo de generacion de CV pasa a
  opt-in (la usuaria marca "me interesa" por oferta, solo esas generan
  CV), se anade carta de presentacion como entregable junto al CV, se
  permite busqueda en paralelo si no hay campos importantes duplicados, y
  se fija la ingesta compartida diaria a las 13:00. Quedan 3 huecos
  (formato de CV, valor del limite de uso, definicion exacta de
  "duplicado"); se resuelven 2 (mecanismo de identificacion, definicion de
  "relevante").
* **Creacion**: `docs/00-problema.md` (Paso 1) y
  `decision-alcance-mvp-remoto.md` — se define el problema, la persona
  (Marta), el ejemplo concreto, el criterio de exito (5/5 testers, >=5 CVs
  generados) y se acota el MVP a trabajo remoto asalariado.
* **Actualizacion**: `docs/00-problema.md` — se corrige el sesgo "rol
  tech" (la clase es diversa: profesora, marketing, traduccion, developer)
  y se aclara que el alcance remoto asalariado es una decision de fase 1,
  no permanente. Se anade `concepto-mvp.md` con la analogia didactica del
  MVP.
* **Creacion**: se establece el bundle OKF (`knowledge/index.md`,
  `knowledge/log.md`) para documentar el proyecto Jobs App a partir de
  ahora, siguiendo la especificacion de
  [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).
* **Creacion**: `contexto-pipeline-n8n.md` — contexto de partida sobre el
  pipeline n8n existente y la decision de MVP ya tomada.
