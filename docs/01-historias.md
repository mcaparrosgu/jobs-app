# 01 · Historias de usuario

> Basado en `docs/00-problema.md`. Rol usado en las historias:
> **usuaria** (cualquier compañera/o de la clase buscando empleo remoto
> asalariado, de cualquier sector — no solo tech). Donde el documento del
> Paso 1 no especifica un mecanismo (p. ej. login con contraseña), se ha
> optado por la versión más simple compatible con lo descrito, y se anota
> como supuesto en HUECOS.

## A. Identificación

### A1. Identificarme para no mezclar mis resultados con los de otras personas
**IMPRESCINDIBLE**

Como usuaria, quiero identificarme con mi email antes de buscar, para que
mis ofertas y CVs se guarden bajo mi propio `user_id` y no se mezclen con
los de mis compañeros de clase.

- Dado que abro la web por primera vez, cuando escribo mi email y confirmo,
  ¿queda mi email guardado como mi identificador (`user_id`) para esta
  sesión? Sí/No.
- Dado que ya me identifiqué antes, cuando vuelvo a abrir la web más tarde
  con el mismo email, ¿veo mis propios resultados anteriores y no los de
  otra persona? Sí/No.
- Dado que escribo un email con formato inválido (sin `@`), cuando intento
  confirmar, ¿me impide continuar y me explica qué está mal? Sí/No.

### A2. Volver a acceder a mis resultados sin repetir la búsqueda
**IMPORTANTE**

Como usuaria, quiero volver a ver mis ofertas y CVs generados en otra
visita, para no perder el trabajo ya hecho si cierro la pestaña.

- Dado que ya generé resultados antes con mi email, cuando vuelvo a
  identificarme con el mismo email, ¿veo los resultados de mi búsqueda
  anterior sin tener que relanzarla? Sí/No.
- Dado que nunca he buscado antes con ese email, cuando me identifico,
  ¿veo un estado vacío claro en vez de un error o una pantalla en blanco?
  Sí/No.

## B. Perfil de búsqueda

### B1. Contar qué busco para recibir ofertas relevantes
**IMPRESCINDIBLE**

Como usuaria, quiero rellenar un formulario corto con mi perfil (puesto que
busco, palabras clave/tecnologías, años de experiencia), para que la
búsqueda de ofertas se ajuste a mí y no a un perfil genérico.

- Dado que abro el formulario, cuando lo relleno con puesto y palabras
  clave y lo envío, ¿se dispara la búsqueda con esos datos? Sí/No.
- Dado que intento enviar el formulario sin rellenar el puesto que busco
  (campo obligatorio), ¿me lo impide y me indica qué falta? Sí/No.
- Dado que soy la profesora de secundaria de la clase (perfil no-tech),
  cuando relleno el formulario con mi propio puesto y palabras clave,
  ¿el formulario me deja completarlo igual que a un perfil tech, sin
  suponer que busco un puesto de programación? Sí/No.

### B2. Subir mi CV base para que se use como punto de partida
**IMPORTANTE**

Como usuaria, quiero subir mi CV actual (o pegar su contenido), para que la
generación de CV adaptado parta de mi experiencia real y no de cero.

- Dado que subo un archivo de CV en un formato soportado (PDF o texto),
  cuando confirmo, ¿queda asociado a mi `user_id` para usarse en la
  generación? Sí/No.
- Dado que intento subir un archivo en un formato no soportado, ¿me avisa
  del formato esperado en vez de fallar en silencio? Sí/No.

## C. Búsqueda y generación de CVs (núcleo del producto)

### C1. Lanzar la búsqueda de ofertas remotas
**IMPRESCINDIBLE**

Como usuaria, quiero pulsar un botón de "Buscar" tras rellenar mi perfil,
para que se dispare la ingesta de ofertas remotas (Adzuna, Jooble, Apify)
ya existente en el backend de n8n.

- Dado que ya rellené mi perfil, cuando pulso "Buscar", ¿se llama al
  webhook de n8n con mis datos? Sí/No.
- Dado que ya hay una búsqueda en curso para mi `user_id`, cuando pulso
  "Buscar" otra vez, ¿el sistema evita lanzar una segunda búsqueda
  duplicada en paralelo? Sí/No.

### C2. Recibir un CV adaptado por cada oferta relevante
**IMPRESCINDIBLE**

Como usuaria, quiero que se genere un CV adaptado a cada oferta relevante
encontrada, para no tener que reescribirlo yo misma oferta por oferta.

- Dado que la búsqueda encontró ofertas relevantes para mi perfil, cuando
  termina el proceso, ¿tengo un CV adaptado por cada una de esas ofertas?
  Sí/No.
- Dado que una oferta encontrada no es relevante para mi perfil (ej. pide
  un sector totalmente distinto), ¿el sistema evita generar un CV para esa
  oferta? Sí/No.

### C3. Descargar el CV adaptado
**IMPRESCINDIBLE**

Como usuaria, quiero descargar el CV adaptado a una oferta concreta, para
poder enviarlo yo misma a la empresa.

- Dado que ya tengo un CV generado para una oferta, cuando pulso
  "Descargar", ¿obtengo un archivo legible y listo para enviar (no un
  volcado de texto sin formato)? Sí/No.
- Dado que el CV aún se está generando, cuando intento descargarlo,
  ¿el botón de descarga permanece deshabilitado en vez de darme un archivo
  vacío o roto? Sí/No.

## D. Espera y estado

### D1. Saber que mi búsqueda está en curso
**IMPRESCINDIBLE**

Como usuaria, quiero ver un indicador de progreso mientras se ejecuta la
ingesta y generación de CVs, para saber que el sistema está trabajando y no
se ha quedado colgado.

- Dado que acabo de pulsar "Buscar", cuando el proceso está en marcha,
  ¿veo un estado visible de "buscando"/"generando" en vez de una pantalla
  en blanco? Sí/No.
- Dado que el proceso lleva varios minutos, cuando sigo en la página,
  ¿el estado se actualiza (aunque sea de forma aproximada) en vez de
  quedarse estático todo el tiempo? Sí/No.

## E. Resultados

### E1. Ver la lista de ofertas encontradas
**IMPRESCINDIBLE**

Como usuaria, quiero ver la lista de ofertas remotas encontradas para mi
perfil, con su CV adaptado asociado, para elegir a cuál aplicar primero.

- Dado que la búsqueda terminó con resultados, cuando entro a mis
  resultados, ¿veo cada oferta con al menos su título, empresa y enlace de
  origen? Sí/No.
- Dado que hay varias ofertas, cuando las veo en la lista, ¿cada una tiene
  su propio CV adaptado accesible por separado? Sí/No.

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
generación de CV falla, para saber que no fue algo que hice mal y qué
puedo intentar.

- Dado que el webhook de n8n falla o no responde, cuando eso ocurre,
  ¿veo un mensaje de error explícito en vez de quedarme en el estado de
  "cargando" indefinidamente? Sí/No.
- Dado que hay un error, ¿el mensaje me ofrece una acción (reintentar,
  contactar) en vez de solo decir "algo salió mal"? Sí/No.

## G. Control de uso y coste

### G1. Limitar el uso para no disparar el coste variable
**IMPRESCINDIBLE**

Como responsable del proyecto (Mar), quiero limitar cuántas búsquedas puede
lanzar cada usuaria en el periodo de prueba, para que el coste de Apify y
Anthropic no se dispare sin control (riesgo ya identificado en el Paso 1).

- Dado que una usuaria ya alcanzó el límite de búsquedas permitido, cuando
  intenta lanzar otra, ¿el sistema se lo impide y se lo explica en vez de
  ejecutarla igualmente? Sí/No.
- Dado que una usuaria está por debajo del límite, cuando lanza una
  búsqueda, ¿se ejecuta con normalidad? Sí/No.

## HUECOS

Cosas que el documento del Paso 1 no especifica y que hay que decidir antes
o durante el Paso 4 (spec):

1. **Mecanismo de identificación real**: el Paso 1 solo dice "guarda el
   resultado separado por `user_id`". Aquí se ha asumido identificación
   simple por email, **sin contraseña** (grupo cerrado y conocido de 5
   personas). Si en el futuro se abre a más gente, hará falta un login real
   — con su historia de "recuperar contraseña" correspondiente, que no
   tiene sentido escribir todavía porque no hay contraseña que recuperar.
2. **Qué significa "relevante"**: el Paso 1 no define cómo se decide que
   una oferta es relevante para el perfil de la usuaria (¿coincidencia de
   palabras clave? ¿juicio del modelo?). Afecta directamente a C2 y F1.
3. **Formato exacto de subida/descarga del CV** (B2, C3): no se especifica
   si el CV base se sube como PDF, Word o texto pegado, ni en qué formato
   se descarga el CV generado.
4. **Valor exacto del límite de uso** (G1): el Paso 1 identifica el riesgo
   de coste pero no da un número. Se decide en el Paso 5 (plan técnico),
   coherente con las ideas de coste-cero ya anotadas ahí.
5. **Ámbito de "recuperar acceso"**: sin contraseña, no aplica recuperación
   de contraseña; sí podría aplicar "he perdido acceso porque cambié de
   email" — no está claro que sea necesario para 5 testers conocidos, se
   deja fuera del MVP explícitamente.
