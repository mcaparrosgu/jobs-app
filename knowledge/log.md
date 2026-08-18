# Registro de cambios del bundle

## 2026-08-18
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
