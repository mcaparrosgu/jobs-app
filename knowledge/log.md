# Registro de cambios del bundle

## 2026-08-19
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
