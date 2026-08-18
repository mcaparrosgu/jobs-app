# Registro de cambios del bundle

## 2026-08-18
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
