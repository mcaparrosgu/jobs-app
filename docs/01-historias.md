# 01 · Historias de usuario

> Basado en `docs/00-problema.md`. Rol usado en las historias:
> **usuaria** (cualquier compañera/o de la clase buscando empleo remoto
> asalariado, de cualquier sector — no solo tech). Revisado y ajustado con
> Mar tras una primera vuelta de validación de criterios de aceptación.

## A. Identificación

### A1. Entrar con un enlace de un solo uso enviado a mi email (magic link)
**IMPRESCINDIBLE**

Como usuaria, quiero entrar escribiendo solo mi email y pulsando el enlace
de un solo uso que me llega, sin crear ni recordar ninguna contraseña,
para que mis resultados sean míos y nadie más de la clase pueda entrar a
verlos (solo quien tiene acceso a ese email puede entrar, igual de privado
que una contraseña, sin tener que gestionar contraseñas).

- Dado que escribo mi email y pido entrar, ¿recibo un enlace de un solo
  uso en ese email que me deja entrar al pulsarlo? Sí/No.
- Dado que ya entré antes con mi email, cuando vuelvo a pedir un enlace y
  lo uso, ¿veo mis propios resultados y no los de otra persona? Sí/No.
- Dado que escribo un email con formato inválido, cuando pido el enlace,
  ¿me lo impide y me explica qué está mal? Sí/No.
- Dado que intento usar un enlace ya usado antes o caducado, ¿me deniega
  el acceso y me deja pedir uno nuevo? Sí/No.

> Nota: esto sustituye al login con contraseña de la primera versión de
> este documento. Sin contraseña no hace falta una historia de
> "recuperar contraseña" — si alguien no recibe el email, el problema es
> de entrega de correo, no de contraseña olvidada (ver F2).

### A3. Volver a acceder a mis resultados sin repetir la búsqueda
**IMPORTANTE**

Como usuaria, quiero volver a ver mis ofertas y CVs generados en otra
visita, para no perder el trabajo ya hecho si cierro la pestaña.

- Dado que ya generé resultados antes, cuando vuelvo a entrar con mi
  cuenta, ¿veo los resultados de mi búsqueda anterior sin tener que
  relanzarla? Sí/No.
- Dado que nunca he buscado antes, cuando entro por primera vez, ¿veo un
  estado vacío claro en vez de un error o una pantalla en blanco? Sí/No.

## B. Perfil de búsqueda

### B1. Contar qué busco para recibir ofertas relevantes
**IMPRESCINDIBLE**

Como usuaria, quiero rellenar un formulario corto con mi perfil (uno o
varios puestos que busco, palabras clave, años de experiencia), con
sugerencias de puestos mientras escribo para ir más rápido, para que la
búsqueda de ofertas se ajuste a mí y no a un perfil genérico.

- Dado que abro el formulario, cuando lo relleno con puesto(s) y palabras
  clave y lo envío, ¿se dispara la búsqueda con esos datos? Sí/No.
- Dado que empiezo a escribir un puesto, cuando tecleo unas letras,
  ¿se me sugieren puestos ya existentes para completarlo más rápido, sin
  impedirme escribir uno distinto si no está en la lista? Sí/No.
- Dado que intento enviar el formulario sin rellenar ningún puesto (campo
  obligatorio), ¿me lo impide y me indica qué falta? Sí/No.
- Dado que soy la profesora de secundaria de la clase (perfil no-tech),
  cuando relleno el formulario con mi propio puesto y palabras clave,
  ¿el formulario me deja completarlo igual que a un perfil tech, sin
  suponer que busco un puesto de programación? Sí/No.

### B2. Pegar mi CV base para que se use como punto de partida
**IMPRESCINDIBLE**

Como usuaria, quiero pegar el texto de mi CV actual en un campo de texto
(sin subir archivo), para que la generación de CV adaptado parta de mi
experiencia real y no de cero, sin depender de que un PDF se lea bien.

- Dado que pego el texto de mi CV en el campo y confirmo, ¿queda asociado
  a mi cuenta para usarse en la generación? Sí/No.
- Dado que intento continuar sin pegar nada en el campo (obligatorio),
  ¿me lo impide y me indica que hace falta? Sí/No.

## C. Búsqueda, selección y generación de CV + carta de presentación

### C1. Lanzar la búsqueda de ofertas remotas
**IMPRESCINDIBLE**

Como usuaria, quiero pulsar un botón de "Buscar" tras rellenar mi perfil,
para que se dispare la ingesta de ofertas remotas (Adzuna, Jooble, Apify)
ya existente en el backend de n8n.

- Dado que ya rellené mi perfil, cuando pulso "Buscar", ¿se llama al
  webhook de n8n con mis datos? Sí/No.
- Dado que ya tengo una búsqueda en curso con el mismo puesto u otros
  datos importantes duplicados, cuando pulso "Buscar" otra vez con esos
  mismos datos, ¿el sistema evita lanzar una segunda búsqueda duplicada?
  Sí/No.
- Dado que ya tengo una búsqueda en curso pero lanzo otra con un puesto o
  datos distintos (no duplicados), ¿el sistema permite que ambas búsquedas
  corran en paralelo? Sí/No.

### C2. Seleccionar las ofertas que me interesan
**IMPRESCINDIBLE**

Como usuaria, quiero marcar "me interesa" o "no me interesa" en cada
oferta encontrada, para que solo se genere automáticamente el CV y la
carta de presentación en las que de verdad quiero aplicar (y no se gaste
generación en las que no).

- Dado que veo la lista de ofertas encontradas, cuando marco "me interesa"
  en una de ellas, ¿se dispara automáticamente la generación de su CV y
  carta de presentación adaptados? Sí/No.
- Dado que marco "no me interesa"/"descartar" en una oferta, ¿el sistema
  no genera CV ni carta de presentación para esa oferta? Sí/No.
- Dado que no he marcado nada todavía en una oferta, ¿el sistema no genera
  CV ni carta de presentación para ella hasta que yo decida? Sí/No.

### C3. Recibir el CV y la carta de presentación de cada oferta seleccionada
**IMPRESCINDIBLE**

Como usuaria, quiero que se genere un CV y una carta de presentación
adaptados a cada oferta que marqué como "me interesa", para no tener que
escribirlos yo misma oferta por oferta.

- Dado que marqué una oferta como "me interesa", cuando termina el
  proceso, ¿tengo un CV Y una carta de presentación adaptados a esa
  oferta concreta? Sí/No.
- Dado que tengo varias ofertas marcadas como "me interesa" a la vez,
  ¿cada una recibe su propio CV y carta, sin mezclarse entre ofertas?
  Sí/No.

### C4. Descargar el CV y la carta de presentación en un único archivo, en páginas separadas
**IMPRESCINDIBLE**

Como usuaria, quiero descargar un único archivo con el CV y la carta de
presentación de una oferta que seleccioné, **cada uno empezando en su
propia página** (sin mezclarse en la misma página), para poder enviarlo
yo misma a la empresa como un documento legible y bien separado, sin
tener que adjuntar dos archivos por separado.

- Dado que ya se generaron el CV y la carta para una oferta seleccionada,
  cuando pulso "Descargar", ¿obtengo un único archivo con el CV primero y
  la carta después, empezando esta última siempre en una página nueva
  (sin depender de cuánto ocupe el CV)? Sí/No.
- Dado que el CV ocupa más de una página, cuando reviso el archivo
  descargado, ¿la carta sigue empezando en una página propia y no a mitad
  de la última página del CV? Sí/No.
- Dado que el CV o la carta aún se están generando, cuando intento
  descargar, ¿el botón de descarga permanece deshabilitado en vez de
  darme un archivo vacío o roto? Sí/No.

## D. Espera y estado

### D1. Saber que mi búsqueda está en curso
**IMPRESCINDIBLE**

Como usuaria, quiero ver un indicador de progreso mientras se ejecuta la
ingesta de ofertas, para saber que el sistema está trabajando y no se ha
quedado colgado.

- Dado que acabo de pulsar "Buscar", cuando el proceso está en marcha,
  ¿veo un estado visible de "buscando" en vez de una pantalla en blanco?
  Sí/No.
- Dado que el proceso lleva varios minutos, cuando sigo en la página,
  ¿el estado se actualiza (aunque sea de forma aproximada) en vez de
  quedarse estático todo el tiempo? Sí/No.

### D2. Saber que se está generando mi CV y carta de presentación
**IMPORTANTE**

Como usuaria, quiero ver un indicador de progreso tras marcar "me
interesa" en una oferta, mientras se genera su CV y carta, para saber que
el sistema está trabajando y cuándo estarán listos para descargar.

- Dado que acabo de marcar "me interesa" en una oferta, cuando la
  generación está en marcha, ¿veo un estado visible de "generando" en esa
  oferta concreta? Sí/No.
- Dado que la generación termina, ¿el estado cambia a "listo para
  descargar" sin que tenga que refrescar la página manualmente? Sí/No.

## E. Resultados

### E1. Ver la lista de ofertas encontradas
**IMPRESCINDIBLE**

Como usuaria, quiero ver la lista de ofertas remotas encontradas para mi
perfil, para decidir en cuáles marcar "me interesa" y generar su CV y
carta de presentación.

- Dado que la búsqueda terminó con resultados, cuando entro a mis
  resultados, ¿veo cada oferta con al menos su título, empresa y enlace de
  origen? Sí/No.
- Dado que hay varias ofertas en la lista, ¿cada una muestra CV y carta
  solo si yo la he seleccionado como "me interesa" — y no antes? Sí/No.

## F. Casos sin datos y errores

### F1. Saber que no hay ofertas para mi perfil
**IMPORTANTE**

Como usuaria, quiero ver un mensaje claro cuando la búsqueda no encuentra
ninguna oferta relevante, para no pensar que la web está rota.

- Dado que la búsqueda terminó sin ninguna oferta relevante, cuando veo mis
  resultados, ¿el mensaje me dice explícitamente que no hubo resultados
  (en vez de una lista vacía sin explicación)? Sí/No.
- Dado que no hubo resultados, ¿el mensaje sugiere algo accionable (ej.
  ampliar las palabras clave) en vez de un callejón sin salida? Sí/No.

### F2. Saber que algo falló y qué hacer
**IMPORTANTE**

Como usuaria, quiero ver un mensaje de error claro si la búsqueda o la
generación de CV/carta falla, para saber que no fue algo que hice mal y
qué puedo intentar.

- Dado que el webhook de n8n falla o no responde, cuando eso ocurre,
  ¿veo un mensaje de error explícito en vez de quedarme en el estado de
  "cargando" indefinidamente? Sí/No.
- Dado que hay un error, ¿el mensaje me ofrece una acción (reintentar,
  contactar) en vez de solo decir "algo salió mal"? Sí/No.

## G. Control de uso y coste

### G1. Limitar el uso para no disparar el coste variable
**IMPRESCINDIBLE**

Como responsable del proyecto (Mar), quiero limitar cuántas búsquedas y
generaciones de CV/carta puede lanzar cada usuaria en el periodo de
prueba, para que el coste de Apify y Anthropic no se dispare sin control
(riesgo ya identificado en el Paso 1).

- Dado que una usuaria ya alcanzó el límite permitido, cuando intenta
  lanzar otra búsqueda o generación, ¿el sistema se lo impide y se lo
  explica en vez de ejecutarla igualmente? Sí/No.
- Dado que una usuaria está por debajo del límite, cuando lanza una
  búsqueda o marca "me interesa" en una oferta, ¿se ejecuta con
  normalidad? Sí/No.

### G2. Compartir la ingesta de ofertas entre toda la clase
**IMPORTANTE**

Como responsable del proyecto (Mar), quiero que la ingesta de ofertas
(Adzuna/Jooble/Apify) se ejecute una vez al día para toda la clase — a las
13:00 — en vez de relanzarse por cada búsqueda individual, para
aprovechar mejor cada llamada a las fuentes externas y reducir el coste
variable.

- Dado que son las 13:00, cuando llega esa hora, ¿se ejecuta
  automáticamente la ingesta compartida sin que ninguna usuaria tenga que
  disparar nada? Sí/No.
- Dado que una usuaria pulsa "Buscar" fuera de las 13:00, ¿su búsqueda usa
  el resultado de la última ingesta compartida en vez de disparar una
  ingesta nueva? Sí/No.

### G3. Avisarme por email cuando hay ofertas nuevas
**IMPRESCINDIBLE**

Como usuaria, quiero recibir un email corto cuando la ingesta compartida de
las 13:00 encuentra ofertas nuevas, con un enlace a la web para ver las
que coinciden con mi perfil, para no tener que entrar a la web activamente
cada día a comprobar si hay algo nuevo (reduce el riesgo de que alguien
abandone a mitad de la búsqueda de empleo por no acordarse de volver).

- Dado que la ingesta de las 13:00 encuentra al menos una oferta nueva
  (para cualquier perfil, no solo el mío), ¿recibo ese mismo día un email
  con un aviso corto y un enlace directo a la web? Sí/No.
- Dado que la ingesta de las 13:00 no encuentra ninguna oferta nueva ese
  día, ¿NO recibo email (para no generar ruido)? Sí/No.
- Dado que aún no he rellenado mi perfil cuando se ejecuta la ingesta de
  las 13:00, ¿el sistema no me envía email ese día (no tiene a dónde
  mandarlo ni perfil que mostrar)? Sí/No.

> Nota: el filtrado por relevancia a mi perfil ocurre cuando entro a la
> web (igual que en cualquier búsqueda), no dentro del propio email ni en
> el cálculo del cron — así no hay que correr la lógica de coincidencia
> dos veces.

## HUECOS

Cosas que quedan por decidir antes o durante el Paso 4 (spec):

1. **Formato exacto del archivo descargado** (C4): PDF con formato,
   Word, o texto plano — el contenido y el orden (CV seguido de la carta)
   ya están decididos, falta el formato de archivo.
2. **Valor exacto del límite de uso** (G1): el Paso 1 identifica el riesgo
   de coste pero no da un número de búsquedas/generaciones permitidas por
   usuaria. Se decide en el Paso 5 (plan técnico).
3. **Qué "datos importantes" cuentan como duplicado** (C1): se acordó que
   dos búsquedas en paralelo se bloquean solo si el puesto u "otros datos
   importantes" coinciden — falta definir exactamente qué campos entran
   en esa comparación (¿solo el puesto? ¿también palabras clave?).
4. **Proveedor de email** (G3): qué servicio envía el correo de aviso
   (¿el mismo n8n con un nodo de email? ¿un servicio externo tipo Resend?)
   — se decide en el Paso 5.

## Resuelto en esta revisión (ya no son huecos)

- **Mecanismo de identificación**: **magic link** — entrar con email y un
  enlace de un solo uso, sin contraseña (A1). Decisión de consenso: cubre
  el objetivo de privacidad de Mar (solo quien controla el email entra,
  nadie más de la clase) sin el coste de construir registro, validación de
  contraseña y recuperación de contraseña — todo eso desaparece porque no
  hay contraseña que gestionar.
- **Formato del archivo combinado**: CV seguido de la carta de
  presentación en un mismo archivo, **cada uno en páginas separadas**
  (la carta siempre empieza en página nueva, sin importar cuánto ocupe el
  CV) — no se exige un número de página fijo para el CV, pero sí que no
  se mezclen en la misma página (C4).
- **Alcance del email de aviso**: aviso genérico ("hay ofertas nuevas,
  entra a verlas") a las 5 si la ingesta encontró algo ese día, sin
  calcular relevancia por persona dentro del propio cron (G3) — la
  relevancia se sigue filtrando en la web, no se duplica esa lógica.
- **Definición de "relevante"**: coincidencia con las palabras clave que
  puso la usuaria en su perfil (B1), más una pregunta opcional a la
  usuaria sobre si quiere que se tenga en cuenta la experiencia pasada que
  pegó en su CV (B2) a la hora de valorar relevancia.
- **Formato de entrada del CV**: textarea de texto plano (B2), sin subida
  de archivo — evita depender de que un PDF se lea bien.
- **CV y carta de presentación van juntos**: se generan en una sola
  llamada (mismo contexto, mismo prompt) y se descargan como un único
  archivo (C3, C4). Justificación de negocio: fuera del sector tech puro
  —marketing, educación, traducción, y perfiles en transición de
  carrera— la carta de presentación sigue siendo relevante para conseguir
  entrevista.
