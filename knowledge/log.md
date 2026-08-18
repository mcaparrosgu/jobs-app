# Registro de cambios del bundle

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
