# 02 · MVP

> Basado en `docs/01-historias.md`. Revisado con Mar en dos rondas: la
> primera devolvió al MVP cosas que se habían aparcado (autorregistro,
> carta de presentación, historial, aviso por email) porque Mar las
> considera fundamentales. La segunda buscó **consenso para recortar
> tiempo de construcción sin tocar esas decisiones de fondo** — cambiando
> el "cómo" en vez del "qué".

## 1. Recorrido crítico

La única secuencia que una usuaria debe poder completar de principio a fin
para que el producto tenga algún valor:

1. **Entra escribiendo su email** y pulsando el enlace de un solo uso
   (magic link) que le llega — sin crear ni recordar contraseña. Mismo
   nivel de privacidad que exigía Mar (solo quien controla ese email
   entra), sin construir registro ni recuperación de contraseña.
2. **Rellena el formulario**: puesto que busca, palabras clave, años de
   experiencia, y **pega el texto de su CV** en un campo de texto (sin
   subir archivo).
3. **Pulsa "Buscar"**. Espera viendo un indicador de "buscando" mientras
   corre la ingesta.
4. **Ve la lista de ofertas** remotas asalariadas encontradas.
5. **Marca "me interesa"** en las ofertas que quiere. Espera viendo
   "generando" mientras se crean el CV y la carta de presentación
   adaptados, en una sola llamada.
6. **Descarga un único archivo** con el CV y la carta de presentación de
   esa oferta, **cada uno en su propia página** (la carta siempre empieza
   en página nueva, sin importar cuánto ocupe el CV).
7. Lo envía ella misma a la empresa (fuera del producto).

Además, **por fuera** de este recorrido (pero igual de necesario para que
el producto funcione en la práctica, no solo en la demo):

- Cada día a las 13:00, la ingesta compartida corre automáticamente vía
  el schedule/trigger de n8n (sin que nadie la dispare a mano). Si
  encuentra ofertas nuevas ese día, envía un email genérico ("hay ofertas
  nuevas, entra a verlas") a las 5 — sin calcular relevancia por persona
  dentro del cron, eso se sigue filtrando cuando cada una entra a la web.
- Si una usuaria vuelve a entrar otro día, ve sus resultados anteriores
  sin tener que repetir la búsqueda desde cero.

Si esta secuencia funciona de principio a fin para 1 persona, el MVP ya
demuestra el valor central: ahorrar el trabajo manual de adaptar el CV (y
ahora la carta) a cada oferta.

## 2. Historias del MVP

- **A1 · Entrar con magic link.** Cambiado de contraseña a enlace de un
  solo uso por email — consenso: cubre el mismo objetivo de privacidad de
  Mar (nadie más puede entrar como otra persona) sin construir registro,
  validación de contraseña ni recuperación de contraseña. A2 (recuperar
  contraseña) desaparece por completo — no hay contraseña que recuperar.
- **A3 · Volver a ver mis resultados sin repetir la búsqueda.** Vuelve al
  MVP (estaba aparcada): Mar señala que sin esto la usuaria se cansa a
  mitad de proceso y abandona la búsqueda de empleo. Se implementa como
  parte natural de guardar los datos por cuenta, no hace falta una
  pantalla nueva compleja — solo mostrar lo último guardado al entrar.
- **B1 · Formulario de perfil.** Recortado: un solo campo de puesto (no
  varios), sin autosugerencias mientras escribe. Texto libre.
- **B2 · Pegar CV base en texto.** Recortado respecto a la idea original
  de subir archivo: **solo textarea de texto plano**, sin subida de PDF.
  Evita depender de que un PDF se lea bien — menos piezas que puedan
  fallar, sin perder la función.
- **C1 · Lanzar búsqueda.** Recortado: mientras haya una búsqueda en curso
  para esa usuaria, el botón "Buscar" se deshabilita — no hay lógica de
  detectar duplicados por campo ni de permitir paralelas. Una a la vez.
- **E1 · Ver lista de ofertas.** Tal cual, es el corazón del recorrido.
- **C2 · Seleccionar "me interesa".** Tal cual: sin esto no hay forma de
  decidir qué generar, y es lo que mantiene bajo control el coste (riesgo
  del Paso 1). Mar lo confirma como fundamental.
- **C3 · Generar CV y carta de presentación juntos.** Vuelve al MVP
  (estaba aparcada): Mar confirma que sin carta es más difícil conseguir
  entrevista, especialmente para los perfiles no-tech de la clase
  (marketing, educación, traducción) y para quien está en transición de
  carrera. Se generan en **una sola llamada** al modelo (mismo contexto,
  mismo prompt) — no duplica coste como se pensaba en el primer recorte.
- **C4 · Descargar CV + carta en un único archivo, páginas separadas.**
  Vuelve ampliada: CV y carta en el mismo archivo, pero **cada uno en su
  propia página** — la carta siempre arranca en página nueva, sin
  importar cuánto ocupe el CV. No se fija un número de página exacto para
  el CV (podría ser 1, 2 o más), solo que no se mezclen en la misma
  página con la carta.
- **D1 + D2 · Espera.** Fusionadas en un único estado simple: "procesando"
  mientras dura cualquiera de las dos fases (búsqueda o generación).
- **F1 + F2 · Sin resultados / error.** Fusionadas en un mensaje mínimo:
  "no se encontraron ofertas" o "algo falló, inténtalo de nuevo" — sin
  sugerencias accionables ni botón de reintento automático.
- **G1 · Límite de uso.** Recortado a lo mínimo: un número fijo
  hardcodeado (a decidir en el Paso 5) de búsquedas/generaciones por
  usuaria y día. Sin panel, sin aviso proactivo.
- **G2 · Ingesta compartida automática a las 13:00.** Tal cual: vía
  schedule/trigger de n8n, reutilizando el cron que el backend ya tiene
  montado — Mar confirma que debe ser automático, no manual.
- **G3 · Email de aviso cuando hay ofertas nuevas.** Nueva, entra al MVP:
  aviso genérico + enlace a la web (sin listar detalle de ofertas ni
  calcular relevancia por persona dentro del cron — consenso: eso ya
  ocurre cuando la usuaria entra a la web, no hace falta duplicarlo).

## 3. Versión 2 (aparcado)

Lo que queda fuera del MVP porque el recorrido crítico funciona sin ello:

- **B1 · Autosugerencias de puesto mientras se escribe, y varios puestos a
  la vez.** Azúcar de UX, cero impacto en si el producto funciona.
- **C1 · Búsquedas en paralelo cuando no hay campos duplicados.** Lógica
  fina que no aporta nada si de partida solo se permite una búsqueda a la
  vez por usuaria.
- **F1/F2 · Mensajes de error accionables** (sugerir ampliar palabras
  clave, botón de reintento, distinguir causa del fallo).
- **G1 · Panel de uso / aviso proactivo antes de llegar al límite.**
- **G3 · Detalle de las ofertas dentro del email.** El email del MVP es
  solo un aviso con enlace; listar título/empresa/enlace directamente en
  el correo es una mejora posterior.

## 4. Hipótesis

Creemos que **las 5 personas de la clase** (perfiles diversos: profesora,
marketing, traducción, developer, Marta) **usarán el MVP para su búsqueda
real de empleo remoto asalariado y generarán al menos un CV y carta
adaptados cada una**, porque **les ahorra el trabajo manual y repetitivo
de adaptar el CV y escribir una carta a cada oferta, algo que hoy hacen a
mano sin método (o directamente no hacen, en el caso de la carta)**.

Sabremos que acertamos si, durante el periodo de prueba, **las 5 personas
entran con su propia cuenta y generan CVs+cartas de verdad para ofertas
que les interesan** (no solo prueban la web una vez) — el mismo criterio
de éxito ya fijado en `docs/00-problema.md`: 5 de 5 usuarias activas, al
menos 5 CVs generados en total.

## 5. Esfuerzo

Para alguien sin experiencia técnica previa trabajando con Claude Code,
partiendo de que **el backend de n8n ya existe y funciona** (hay que
conectarlo y **adaptar el nodo de ingesta de empleo existente** a este
MVP, no construir el pipeline desde cero):

| Bloque | Días estimados |
| :---- | :---- |
| Login con magic link (sin registro, sin contraseña, sin recuperación) | 0,5–1 |
| Formulario + textarea de CV + guardado de perfil | 1 |
| Conectar el botón "Buscar" al webhook + estado de espera | 1–2 |
| Lista de ofertas + selección "me interesa" + disparo de generación | 1–2 |
| Generación conjunta de CV + carta (prompt) y archivo único con salto de página forzado entre ambos | 0,5–1 |
| Ver resultados anteriores al volver a entrar (persistencia simple) | 0,5–1 |
| Adaptar el nodo n8n de ingesta de empleo al schedule de las 13:00 + email de aviso genérico | 0,5–1 |
| Límite de uso por usuaria/día | 0,5 |
| Mensajes de error/sin resultados mínimos | 0,5 |
| Pruebas con la clase real y arreglos | 1–2 |

**Total estimado: 6,5–10,5 días** de trabajo enfocado (no necesariamente
jornada completa), con apoyo de Claude Code en cada tarea del Paso 9 —
frente a los 9–13 días de la versión anterior de este documento.

## 6. Veredicto

**Con el consenso de esta ronda, el MVP vuelve a un tamaño razonable.** La
ronda anterior había crecido a 9–13 días porque varias historias volvían
al alcance por razones de fondo válidas (privacidad, tasa de conversión a
entrevista, abandono a mitad de búsqueda). Esta ronda no revierte ninguna
de esas decisiones — sigue habiendo login privado, carta de presentación,
historial y aviso automático — pero cambia **cómo se construye cada una**
por la versión más barata que cumple el mismo objetivo:

- Login con contraseña → **magic link**: mismo nivel de privacidad, sin
  registro/validación/recuperación de contraseña.
- Archivo con paginación exacta (CV 1-2 páginas + carta en página 3
  concreta) → **CV + carta en páginas separadas, sin fijar cuántas
  ocupa el CV**: mismo "un solo archivo, cada documento en su página",
  con solo un salto de página forzado en vez de contar páginas exactas.
- Email con relevancia calculada en el cron → **aviso genérico**: mismo
  efecto de traer de vuelta a la usuaria, sin duplicar la lógica de
  coincidencia en dos sitios.

Resultado: **6,5–10,5 días**, de vuelta cerca de la estimación original de
7–10 días de la primera versión de este documento, pero ahora **con**
carta de presentación, autorregistro (via magic link) e historial
incluidos — no solo el recorrido mínimo de antes.

Sigue quedando una palanca sin usar si el plazo aprieta: **secuenciar el
Paso 9 en dos tandas** — primero el recorrido crítico sin G2/G3 (ingesta
bajo demanda), y el cron + email al final. Eso no cambia el alcance, solo
el orden — lo dejo anotado para el Paso 7 (tareas).
