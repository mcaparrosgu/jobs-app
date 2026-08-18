# 01 · Historias de usuario

> Basado en `docs/00-problema.md`. Rol usado en las historias:
> **usuaria** (cualquier compañera/o de la clase buscando empleo remoto
> asalariado, de cualquier sector — no solo tech). Revisado y ajustado con
> Mar tras una primera vuelta de validación de criterios de aceptación.

## A. Identificación

### A1. Registrarme y entrar con email y contraseña
**IMPRESCINDIBLE**

Como usuaria, quiero crear una cuenta con mi email y una contraseña, y
entrar con esas mismas credenciales, para que mis resultados sean míos y
nadie más de la clase pueda entrar a verlos ni modificarlos (nos conocemos
todos los emails, así que sin contraseña cualquiera podría entrar como
otra persona).

- Dado que abro la web por primera vez, cuando me registro con un email y
  una contraseña, ¿queda creada mi cuenta y puedo entrar con esas
  credenciales? Sí/No.
- Dado que ya tengo cuenta, cuando entro con mi email y mi contraseña
  correcta, ¿veo mis propios resultados y no los de otra persona? Sí/No.
- Dado que escribo un email con formato inválido o una contraseña que no
  cumple el mínimo exigido, cuando intento registrarme, ¿me lo impide y me
  explica qué está mal? Sí/No.
- Dado que introduzco una contraseña incorrecta para un email ya
  registrado, cuando intento entrar, ¿me deniega el acceso sin decirme si
  el fallo es el email o la contraseña (para no facilitar averiguar qué
  emails están registrados)? Sí/No.

### A2. Recuperar el acceso si olvido mi contraseña
**IMPORTANTE**

Como usuaria, quiero poder restablecer mi contraseña si la olvido, para no
quedarme fuera de mi cuenta y mis resultados guardados.

- Dado que olvidé mi contraseña, cuando pido restablecerla con mi email,
  ¿recibo un enlace o código para crear una contraseña nueva? Sí/No.
- Dado que uso ese enlace o código para poner una contraseña nueva, cuando
  vuelvo a entrar con ella, ¿funciona y la contraseña anterior deja de
  ser válida? Sí/No.

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

### B2. Subir mi CV base para que se use como punto de partida
**IMPORTANTE**

Como usuaria, quiero subir mi CV actual (o pegar su contenido), para que la
generación de CV adaptado parta de mi experiencia real y no de cero.

- Dado que subo un archivo de CV en un formato soportado (PDF o texto),
  cuando confirmo, ¿queda asociado a mi cuenta para usarse en la
  generación? Sí/No.
- Dado que intento subir un archivo en un formato no soportado, ¿me avisa
  del formato esperado en vez de fallar en silencio? Sí/No.

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

### C4. Descargar el CV y la carta de presentación
**IMPRESCINDIBLE**

Como usuaria, quiero descargar el CV y la carta de presentación de una
oferta que seleccioné, para poder enviarlos yo misma a la empresa.

- Dado que ya se generaron el CV y la carta para una oferta seleccionada,
  cuando pulso "Descargar", ¿obtengo ambos archivos legibles y listos
  para enviar (no un volcado de texto sin formato)? Sí/No.
- Dado que el CV o la carta aún se están generando, cuando intento
  descargarlos, ¿el botón de descarga permanece deshabilitado en vez de
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

## HUECOS

Cosas que quedan por decidir antes o durante el Paso 4 (spec):

1. **Formato exacto de subida/descarga del CV y la carta** (B2, C4): no
   se especifica si el CV base se sube como PDF, Word o texto pegado, ni
   en qué formato se descargan el CV y la carta generados.
2. **Valor exacto del límite de uso** (G1): el Paso 1 identifica el riesgo
   de coste pero no da un número de búsquedas/generaciones permitidas por
   usuaria. Se decide en el Paso 5 (plan técnico).
3. **Qué "datos importantes" cuentan como duplicado** (C1): se acordó que
   dos búsquedas en paralelo se bloquean solo si el puesto u "otros datos
   importantes" coinciden — falta definir exactamente qué campos entran
   en esa comparación (¿solo el puesto? ¿también palabras clave?).

## Resuelto en esta revisión (ya no son huecos)

- **Mecanismo de identificación**: email + contraseña, con recuperación de
  contraseña (A1, A2). Se descartó login sin contraseña porque el grupo se
  conoce los emails entre sí.
- **Definición de "relevante"**: coincidencia con las palabras clave que
  puso la usuaria en su perfil (B1), más una pregunta opcional a la
  usuaria sobre si quiere que se tenga en cuenta la experiencia pasada que
  se ve en el CV que subió (B2) a la hora de valorar relevancia.
