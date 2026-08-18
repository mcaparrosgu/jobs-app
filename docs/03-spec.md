# 03 · Especificación funcional

> La verdad del proyecto. Describe QUÉ hace el producto y POR QUÉ, nunca
> CÓMO — ninguna mención de tecnología, lenguaje, framework ni base de
> datos. Basado en `docs/00-problema.md`, `docs/01-historias.md` y
> `docs/02-mvp.md`.

## 1. Objetivo

El sistema ayuda a una persona que busca empleo remoto asalariado a
encontrar ofertas que encajan con su perfil y a preparar, para cada oferta
que le interesa, un currículum y una carta de presentación adaptados —sin
tener que escribirlos ella misma cada vez. Existe porque adaptar el CV y
la carta oferta a oferta es un trabajo manual y repetitivo que consume
horas, y ese trabajo es el mismo sin importar el sector de quien busca
empleo. El sistema no busca empleo por la persona ni decide por ella: solo
le ahorra la parte mecánica de preparar los documentos, dejando en sus
manos elegir a qué ofertas quiere aplicar y enviarlas ella misma.

## 2. Usuarios y permisos

Hay un único tipo de usuario: **la persona que busca empleo** (en esta
primera prueba, un grupo cerrado y conocido de 5 personas). Cada usuaria:

- Solo puede ver y controlar su propio perfil, sus propias selecciones de
  interés y sus propios CVs/cartas generados. No existe ninguna pantalla
  ni función para ver los datos de otra persona.
- No necesita ni tiene ningún rol especial dentro del propio producto —
  no hay panel de administración visible para nadie, incluida la persona
  responsable del proyecto. El control del coste (ver Reglas de negocio)
  es una regla automática del sistema, no algo que alguien opera a mano
  desde dentro del producto.
- Accede sin crear ni recordar ninguna contraseña: pide acceder con su
  email y entra a través de un enlace de un solo uso que le llega a esa
  bandeja de entrada. Una vez dentro, permanece identificada en ese
  dispositivo durante varios días, sin tener que repetir ese paso cada vez
  que vuelve.

## 3. Recorridos

### 3.1 Recorrido principal: de "quiero buscar" a "tengo el documento listo"

1. **Pedir acceso.** La usuaria escribe su email y pide entrar. No ve
   ningún campo de contraseña.
2. **Entrar.** Recibe un mensaje en ese email con un enlace de un solo
   uso. Al pulsarlo, entra al sistema y queda identificada en ese
   dispositivo para las próximas visitas.
3. **Contar su perfil** (solo la primera vez, o cuando quiera actualizarlo
   más adelante). Ve un formulario corto: el puesto que busca, palabras
   clave que la describen, sus años de experiencia, y un espacio donde
   pega el texto de su CV actual. También puede indicar si quiere que, a
   la hora de valorar qué ofertas encajan con ella, se tenga en cuenta la
   experiencia que aparece en ese CV pegado (además de las palabras
   clave).
4. **Ver ofertas.** Pulsa "Buscar" y, en cuestión de segundos, ve una
   lista de ofertas de empleo remoto asalariado que coinciden con su
   puesto y sus palabras clave — de cualquier sector, no solo tecnología.
   Cada oferta muestra al menos su título, la empresa y un enlace al
   anuncio original. Ninguna oferta trae todavía un CV ni una carta
   asociados.
5. **Elegir en cuáles aplicar.** Para cada oferta de la lista, la usuaria
   puede marcarla como "me interesa". En el momento en que lo hace, el
   sistema empieza a preparar el CV y la carta de presentación adaptados
   a esa oferta concreta. Mientras tanto, ve un indicador de que se están
   generando. Las ofertas que no marca se quedan sin CV ni carta — no se
   gasta trabajo en las que no le interesan.
6. **Descargar el documento.** Cuando termina la preparación, la usuaria
   descarga un único archivo con el currículum adaptado y, a continuación
   en una página propia, la carta de presentación adaptada — ambos
   pensados para poder enviarse tal cual a la empresa. El diseño del
   documento es sobrio, cuidado y fácil de leer, no una plantilla
   genérica.
7. **Enviar la candidatura.** La usuaria envía ese documento a la empresa
   por su cuenta — este paso ocurre fuera del sistema.
8. **Volver otro día.** Si la usuaria cierra la pestaña y vuelve más
   tarde (ese mismo día u otro), entra directamente (sigue identificada) y
   ve el estado en el que dejó su búsqueda: su perfil guardado, las
   ofertas que ya había visto, y los CVs/cartas que ya había generado —
   sin tener que repetir nada desde cero.

### 3.2 Recorrido secundario: aviso de ofertas nuevas

1. Una vez al día, el sistema revisa si hay ofertas de empleo remoto
   nuevas disponibles (para todas las usuarias en conjunto, no una
   búsqueda por persona).
2. Si encuentra alguna oferta nueva ese día, cada usuaria que ya tiene su
   perfil guardado recibe un aviso corto por email, con un enlace directo
   de vuelta al sistema. Si no encuentra ninguna oferta nueva, no se
   envía ningún aviso ese día — para no generar ruido innecesario.
3. Al pulsar el enlace del email, la usuaria entra directamente a sus
   resultados (sigue identificada, no tiene que volver a pedir acceso) y
   continúa desde el paso 4 del recorrido principal: ver qué ofertas
   coinciden con su perfil y decidir en cuáles marcar interés.

Este recorrido existe para que la usuaria no tenga que acordarse de
volver a entrar por su cuenta cada día — reduce el riesgo de que abandone
la búsqueda de empleo a mitad de camino simplemente por olvido.

## 4. Datos

En lenguaje natural, lo que el sistema necesita recordar:

- **Identidad de la usuaria**: su email, que es también lo único que la
  identifica (no hay nombre de usuario ni contraseña que guardar).
- **Perfil de búsqueda**, por usuaria: el puesto que busca, sus palabras
  clave, sus años de experiencia, el texto de su CV tal como lo pegó, y si
  quiere o no que ese CV se tenga en cuenta al valorar qué ofertas le
  encajan. Un perfil por usuaria — al actualizarlo, sustituye al anterior
  para las búsquedas futuras (no afecta a lo que ya se generó, ver más
  abajo).
- **Ofertas de empleo**: compartidas entre todas las usuarias (no son
  propiedad de una persona), con al menos título, empresa y enlace al
  anuncio original. Se renuevan una vez al día.
- **Selección de interés**, por usuaria y por oferta: si esa usuaria
  marcó "me interesa" en esa oferta concreta o no. Es lo que decide si
  existe o no un CV/carta para esa combinación.
- **CV y carta generados**, por usuaria y por oferta marcada como
  interesante: el documento final listo para descargar. Es una fotografía
  del momento en que se generó — si la usuaria actualiza su perfil o su
  CV pegado después, los documentos ya generados no cambian solos; para
  obtener una versión actualizada de una oferta concreta, tendría que
  volver a intervenir sobre ella.
- **Cuenta de uso diario**, por usuaria: cuántos CVs+cartas ha generado
  ese día, para poder aplicar el límite (ver Reglas de negocio).

## 5. Reglas de negocio

1. **Cada usuaria solo ve y controla sus propios datos** — perfil,
   selecciones de interés, CVs/cartas y contador de uso. Nunca los de
   otra persona.
2. **Una oferta solo tiene CV y carta si la usuaria la marcó como "me
   interesa" explícitamente.** No se genera nada por defecto ni de forma
   automática al aparecer en la lista.
3. **El emparejamiento entre perfil y ofertas se basa en el puesto y las
   palabras clave** que la usuaria puso en su perfil, más —si ella lo pide
   explícitamente— la experiencia que aparece en el CV que pegó. Los años
   de experiencia se muestran pero no participan en ese emparejamiento.
4. **Existe un máximo de 5 CVs+cartas generados por usuaria y día.**
   Alcanzado ese máximo, el sistema impide generar más ese día y se lo
   explica a la usuaria; por debajo del máximo, la generación funciona con
   normalidad. Esta regla existe para mantener acotado el coste variable
   de generar cada documento.
5. **La renovación de ofertas ocurre una única vez al día, para todas las
   usuarias a la vez** — ninguna acción individual de una usuaria dispara
   una renovación nueva; todas comparten el mismo conjunto de ofertas del
   día, cada una viendo solo las que coinciden con su propio perfil.
6. **Un CV/carta generado es definitivo en el momento en que se genera.**
   Cambios posteriores en el perfil o el CV pegado no regeneran
   automáticamente lo que ya existía.
7. **El aviso por email solo se envía si, ese día, hay ofertas nuevas Y la
   usuaria ya tiene un perfil guardado.** Si falta cualquiera de las dos
   condiciones, no se envía nada ese día.
8. **El acceso solo es válido una vez y caduca.** Un enlace de acceso ya
   usado, o que ha pasado demasiado tiempo sin usarse, deja de funcionar;
   la usuaria puede pedir uno nuevo en cualquier momento.

## 6. Casos límite

- **No hay ofertas que coincidan con el perfil de la usuaria**: el
  sistema se lo dice de forma explícita en vez de mostrar una lista vacía
  sin explicación.
- **Todavía no ha corrido ninguna renovación de ofertas ese día** (por
  ejemplo, muy temprano el primer día de la prueba): el sistema lo indica
  en vez de mostrar una lista vacía indistinguible de "no hay nada para
  ti".
- **La preparación de un CV/carta falla** (por cualquier motivo interno):
  la usuaria ve un mensaje de error claro para esa oferta concreta, en vez
  de quedarse esperando indefinidamente o recibir un archivo vacío o
  roto.
- **La usuaria intenta descargar antes de que termine la preparación**:
  la descarga permanece deshabilitada hasta que el documento esté listo.
- **La usuaria marca "me interesa" en varias ofertas casi a la vez**: cada
  una genera su propio CV/carta de forma independiente, sin mezclarse
  entre sí.
- **La usuaria alcanza el límite diario a mitad de una sesión**: las
  ofertas que ya tenían CV/carta generado siguen disponibles para
  descargar con normalidad; solo se bloquean generaciones nuevas hasta el
  día siguiente.
- **La usuaria pega un email con formato inválido al pedir acceso**: el
  sistema se lo impide y explica qué está mal, sin llegar a intentar
  enviar nada.
- **La usuaria usa un enlace de acceso caducado o ya usado**: se le
  deniega el acceso con un mensaje claro y la opción de pedir uno nuevo,
  sin dar pistas sobre si ese email está o no registrado.
- **Llega el momento de enviar el aviso por email pero la usuaria aún no
  ha completado su perfil**: no recibe ningún aviso ese día, porque no hay
  con qué comparar relevancia ni resultados que mostrarle.

## 7. Requisitos no funcionales

- **Privacidad**: los datos de cada usuaria (perfil, CV pegado, CVs/cartas
  generados) están aislados de las demás. Nadie del grupo puede ver ni
  acceder a los datos de otra persona bajo ninguna circunstancia normal de
  uso.
- **Idioma**: la interfaz y las comunicaciones del sistema (mensajes,
  email de aviso) están en castellano. El contenido de las ofertas de
  empleo puede venir en cualquier idioma, tal como lo publica cada fuente
  original.
- **Tiempos de respuesta**: ver la lista de ofertas tras pulsar "Buscar"
  ocurre en segundos. Preparar un CV+carta puede tardar más (del orden de
  minutos) y el sistema debe comunicarlo con un indicador visible mientras
  ocurre, para que no se perciba como una avería.
- **Continuidad de sesión**: una vez que la usuaria entra, permanece
  identificada en ese dispositivo durante varios días, sin tener que
  repetir el acceso en cada visita.
- **Accesibilidad de perfil técnico**: pensado para personas sin
  experiencia técnica previa — sin jerga, con mensajes de error que se
  entienden sin contexto adicional.

## 8. Fuera de alcance

Remitido en detalle a `docs/02-mvp.md` sección 3 (Versión 2). En resumen,
quedan fuera de este MVP:

- Autosugerencias de puesto mientras se escribe, y varios puestos a la
  vez en un mismo perfil.
- Permitir varias búsquedas o generaciones en paralelo con lógica de
  detección de duplicados.
- Mensajes de error con sugerencias accionables (ampliar palabras clave,
  reintento automático) — el MVP se limita a un mensaje claro de qué pasó.
- Cualquier panel de administración o aviso proactivo sobre el uso antes
  de llegar al límite diario.
- Incluir el detalle de las ofertas (título, empresa, enlace) dentro del
  propio email de aviso — el email solo avisa y enlaza a la web.
- Empleo freelance o presencial (solo remoto asalariado en esta fase, ver
  `docs/00-problema.md`).
- Seguimiento del proceso después de enviar la candidatura (entrevistas,
  negociación).
- Recuperación de acceso mediante un mecanismo distinto al propio enlace
  de un solo uso (no aplica un "he olvidado mi contraseña" porque no
  existe contraseña).

## 9. Preguntas abiertas

Estas no bloquean dar el Paso 4 por cerrado, pero sí deben resolverse
antes o durante el Paso 5 (plan técnico):

1. **Zona horaria de la renovación diaria de ofertas**: ¿hora de España o
   la que use el sistema por defecto? No tiene impacto funcional visible
   para la usuaria salvo en el momento exacto en que ve ofertas nuevas.
2. **Retención de datos**: cuánto tiempo se conservan el perfil, el CV
   pegado y los CVs/cartas generados de cada usuaria tras acabar el
   periodo de prueba — no se ha decidido si se borran, durante cuánto
   tiempo se guardan, o si la usuaria puede pedir su borrado.

## Relacionado

- [`docs/00-problema.md`](00-problema.md) — problema, usuaria y criterio
  de éxito.
- [`docs/01-historias.md`](01-historias.md) — historias de usuario
  detalladas con criterios de aceptación.
- [`docs/02-mvp.md`](02-mvp.md) — recorte al MVP, hipótesis y esfuerzo.
- [`knowledge/preferencias-tecnicas-paso5.md`](../knowledge/preferencias-tecnicas-paso5.md) —
  preferencias de tecnología de Mar (email, modelo de IA) para el Paso 5,
  deliberadamente no incluidas aquí.
