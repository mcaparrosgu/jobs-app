# **Manual de obra · Edición Claude Code**

**Los 17 pasos, todos ejecutados desde la terminal**  
Misma metodología que el manual original, pero con los prompts reescritos para Claude Code: ya no pegas documentos, Claude los lee de la carpeta. Cada título indica qué herramienta usar y con qué modo. Agosto de 2026\.

## ---

**La respuesta corta**

**Los 17 pasos se hacen en Claude Code.** No hay ninguno que requiera el chat. Y hacerlos todos en Claude Code no es solo posible: es mejor, por una razón concreta.

| LA DIFERENCIA REAL En el chat, cada prompt te pide *pegar* el documento del paso anterior. En Claude Code no pegas nada: los documentos viven en la carpeta del proyecto y Claude los lee solo. Eso elimina el fallo más común —pegar una versión antigua sin darte cuenta— y desde el Paso 1 todo queda versionado en Git. |
| :---- |

| COMO EN LA VIDA REAL El chat es hablar con alguien por teléfono describiéndole la habitación. Claude Code es tenerlo dentro de la habitación, viendo lo mismo que tú. Ya no tienes que describir nada: mira y actúa. |
| :---- |

**La única pega, y cómo se resuelve:** en los Pasos 1 a 3 todavía no existe el proyecto. Solución: creas la carpeta vacía primero, entras en ella y arrancas Claude Code ahí. A partir de ese momento todo lo que generéis se guarda dentro.  
**CUÁNDO SÍ TIENE SENTIDO EL CHAT**

Para pensar en voz alta sin proyecto abierto, para preguntas sueltas de concepto, o cuando quieras comparar opciones leyendo tranquilamente desde el móvil. Nada de eso es un paso del método: es conversación previa.

## ---

**Preparación · antes del Paso 1**

Cuatro cosas, una sola vez.  
**1\. Crea la carpeta y entra en ella.** En la terminal:

| mkdir mi-proyecto cd mi-proyecto mkdir docs claude |
| :---- |

La carpeta docs es donde vivirán todos los documentos del método. Esa es la clave de que los prompts funcionen sin pegar nada.  
**2\. Configura los permisos.** Dentro de Claude Code, escribe /permissions y decide qué puede hacer sin preguntarte. Al principio, sé restrictivo: que te pregunte antes de ejecutar comandos.  
**3\. Aprende seis comandos.** Son los que vas a usar todo el rato.

| /plan | Modo plan: Claude lee y propone, pero no toca nada hasta que tú apruebas. También con Shift+Tab. Es la regla "valida antes de avanzar" convertida en función. |
| :---- | :---- |
| **/clear** | Empieza conversación nueva manteniendo la memoria del proyecto. Úsalo entre tarea y tarea. |
| **/rewind** | Devuelve el código *y* la conversación a un punto anterior. Tu salida de emergencia. |
| **/diff** | Ver exactamente qué ha cambiado. |
| **/context** | Cuánto espacio queda en la mesa de trabajo. Si está lleno, /compact o /clear. |
| **/usage** | Cuánto llevas gastado. Míralo cada día al principio. |

**4\. Convierte los 17 prompts en comandos tuyos.** Esto es lo que más tiempo te va a ahorrar.

| TUS PROPIOS COMANDOS Los comandos personalizados de Claude Code se crean como skills: un archivo en .claude/skills/paso-01/SKILL.md con el prompt dentro se invoca escribiendo /paso-01. Guarda los 17 prompts de este manual así una vez y ya no vuelves a copiar y pegar nunca. Como están dentro del repositorio, además quedan versionados junto al proyecto. |
| :---- |

Pídeselo a Claude Code con este prompt, una sola vez:

| PROMPT · PREPARACIÓN Voy a seguir un método de 17 pasos para construir esta app. Cada paso tiene un prompt fijo. Quiero convertirlos en comandos que pueda invocar escribiendo /paso-01, /paso-02, etc. Crea la estructura .claude/skills/paso-NN/SKILL.md para cada uno, con el frontmatter correcto (name y description) y el prompt como cuerpo. Te iré pegando los prompts de uno en uno. Empieza preguntándome por el primero. Cuando termines, dime cómo compruebo que los comandos aparecen al escribir "/". |
| :---- |

## ---

**Dónde vive cada documento**

Todos los prompts de este manual asumen esta estructura. Créala en el Paso 1 y no la cambies.

| docs/00-problema.md     ← Paso 1 docs/01-historias.md    ← Paso 2 docs/02-mvp.md          ← Paso 3 docs/03-spec.md         ← Paso 4   la verdad del proyecto docs/04-plan-tecnico.md ← Paso 5 docs/05-ia.md           ← Paso 6 docs/06-tareas.md      ← Paso 7   tu lista de trabajo CLAUDE.md              ← Paso 8 .claude/skills/        ← tus comandos /paso-NN |
| :---- |

# ---

**FASE A · Decidir qué construyes**

Pasos 1 a 4\. Sin código. La fase que más proyectos salva.

## **01 — Define el problema**

**▸ CLAUDE CODE · modo normal · genera docs/00-problema.md**

**Qué es.** Escribir qué problema resuelves, para quién, y cómo sabrás que funcionó. Sin hablar de tecnología.

| COMO EN LA VIDA REAL Antes de reformar la cocina no eliges los azulejos: decides si el problema es que falta almacenaje o que no cabéis dos cocinando. Son dos reformas distintas y el azulejo no arregla ninguna. |
| :---- |

**En Claude Code:** deja que él escriba el archivo directamente. No copies su respuesta a mano.

| PROMPT · PASO 1 Eres un product manager con experiencia en productos de IA. Vamos a definir con precisión este proyecto antes de construir nada. Mi idea en bruto: \[DESCRIBE TU IDEA EN 2-3 FRASES\] Antes de escribir nada, hazme las preguntas que necesites si algo es ambiguo. No asumas nada que yo no haya dicho. Cuando tengas mis respuestas, escribe el archivo docs/00-problema.md con estas secciones: 1\. PROBLEMA — En una sola frase, desde el punto de vista de quien lo sufre (no de la solución). 2\. USUARIO — Una persona concreta, con nombre, contexto y nivel técnico. 3\. EJEMPLO CONCRETO — Una escena real de uso, como un guion: qué hace, qué ve, qué pasa después. 4\. CRITERIO DE ÉXITO — Un número medible. 5\. QUÉ NO ES — Tres cosas que este producto NO va a hacer. 6\. RIESGOS — Las tres razones más probables de fracaso. Después de escribirlo, inicializa git si no existe y haz commit del archivo. |
| :---- |

## **02 — Historias de usuario**

**▸ CLAUDE CODE · modo normal · lee 00 · genera docs/01-historias.md**

**Qué es.** Cada función escrita como *"Como \[usuario\], quiero \[algo\], para \[conseguir algo\]"*, con las condiciones exactas que determinan que está terminada.

| COMO EN LA VIDA REAL La diferencia entre decirle al carpintero "quiero un mueble bonito" y decirle "como persona que teletrabaja, quiero un cajón que cierre con llave, para guardar documentos confidenciales". La segunda frase ya contiene medida, material y motivo. No tiene que adivinar. |
| :---- |

| PROMPT · PASO 2 Lee docs/00-problema.md. Actúa como analista de producto ágil y escribe docs/01-historias.md con las historias de usuario del producto. Reglas estrictas: \- Formato: "Como \[rol\], quiero \[acción\], para \[beneficio\]". \- Debajo de cada historia, CRITERIOS DE ACEPTACIÓN en formato Dado / Cuando / Entonces. Mínimo 2, máximo 5\. Cada criterio debe responderse solo con sí o no. \- Aplica INVEST. Si una historia es demasiado grande para completarse y probarse aislada, divídela. \- Incluye las historias aburridas que todo el mundo olvida: registro, recuperar contraseña, qué pasa si no hay datos, qué pasa si algo falla, qué ve el usuario mientras espera. \- Agrupa por bloques temáticos. \- Marca cada historia como IMPRESCINDIBLE / IMPORTANTE / DESEABLE. No inventes funciones que no se deduzcan del documento. Si detectas un hueco importante, ponlo en una sección HUECOS al final. Haz commit al terminar. |
| :---- |

## **03 — Recorta hasta el MVP**

**▸ CLAUDE CODE · modo normal · lee 01 · genera docs/02-mvp.md**

**Qué es.** La versión más pequeña que ya sirve para algo real. Ciclo **construir → medir → aprender** de Eric Ries.

| COMO EN LA VIDA REAL Para abrir un restaurante no montas el local entero: haces una cena para veinte personas y ves qué platos se dejan a medias. Aprendes en una noche lo que tardarías un año en descubrir con las facturas corriendo. |
| :---- |

| MALENTENDIDO FRECUENTE MVP no significa "producto cutre". Significa la versión que da el máximo aprendizaje validado con el mínimo esfuerzo. Lo poco que hace, lo hace bien. |
| :---- |

| PROMPT · PASO 3 Lee docs/01-historias.md. Actúa como fundador con experiencia en Lean Startup. Tu trabajo es recortar sin piedad, no añadir. Escribe docs/02-mvp.md con: 1\. RECORRIDO CRÍTICO — la única secuencia de acciones que un usuario debe poder completar de principio a fin para que el producto tenga algún valor. 2\. HISTORIAS DEL MVP — solo las que forman ese recorrido. 3\. VERSIÓN 2 — todo lo demás, aparcado. 4\. HIPÓTESIS — "Creemos que \[usuario\] hará \[comportamiento\] porque \[motivo\]. Sabremos que acertamos si \[métrica observable\]." 5\. ESFUERZO — cuántos días es esto para una persona sin experiencia técnica trabajando con Claude Code. 6\. VEREDICTO — dime honestamente si el MVP sigue siendo demasiado grande y, si lo es, propón una versión más reducida. Sé agresivo recortando. Si dudas entre incluir algo o no, déjalo fuera y explica por qué. Haz commit al terminar. |
| :---- |

## **04 — Escribe la especificación**

**▸ CLAUDE CODE · usa /plan primero · genera docs/03-spec.md**

**Qué es.** El documento que describe qué se construye y por qué, **sin decir con qué tecnología**. Es el corazón del *spec-driven development* que GitHub liberó con Spec Kit.

| COMO EN LA VIDA REAL El plano del arquitecto: dice cuántas habitaciones, dónde van las ventanas, por dónde pasa el agua. No dice de qué marca serán los grifos. Con el plano, cinco constructores te entregan la misma casa. Sin plano, cada uno te entrega la suya. |
| :---- |

| AQUÍ EMPIEZA A IMPORTAR /PLAN Escribe /plan antes del prompt. Claude leerá los tres documentos anteriores y te propondrá la estructura de la spec sin escribir el archivo todavía. Tú la revisas, corriges lo que falte, y solo entonces apruebas. Este es tu momento de mayor apalancamiento: cambiar una frase del plano cuesta un minuto; tirar un tabique, una semana. |
| :---- |

| PROMPT · PASO 4 — precedido de /plan Lee docs/00-problema.md, docs/01-historias.md y docs/02-mvp.md. Vas a escribir docs/03-spec.md siguiendo la metodología spec-driven development. REGLA ABSOLUTA: no menciones ninguna tecnología, lenguaje, framework ni base de datos. Esta spec describe QUÉ y POR QUÉ, nunca CÓMO. Estructura: 1\. OBJETIVO — qué construimos y por qué existe. Máximo 5 frases. 2\. USUARIOS Y PERMISOS — tipos de usuario y qué puede hacer cada uno. 3\. RECORRIDOS — cada recorrido del MVP paso a paso, con qué ve el usuario en cada pantalla. 4\. DATOS — qué guarda el sistema, qué campos, qué relaciones. En lenguaje natural. 5\. REGLAS DE NEGOCIO — condiciones que el sistema siempre debe respetar. 6\. CASOS LÍMITE — qué pasa si: no hay datos, falla la conexión, entran datos inválidos, hay dos acciones a la vez. 7\. REQUISITOS NO FUNCIONALES — privacidad, tiempos de respuesta, accesibilidad, idiomas. 8\. FUERA DE ALCANCE. 9\. PREGUNTAS ABIERTAS — todo lo que no puedas decidir sin mí. Preséntame el plan y las preguntas abiertas ANTES de escribir el archivo. No lo des por cerrado hasta que yo responda. |
| :---- |

# ---

**FASE B · Planificar cómo**

Pasos 5 a 7\. Entra la tecnología. Sigue sin escribirse código.

## **05 — Tecnología y plan técnico**

**▸ CLAUDE CODE · usa /plan · genera docs/04-plan-tecnico.md**

| COMO EN LA VIDA REAL Ya tienes el plano. Ahora eliges materiales: pladur o ladrillo, gas o vitrocerámica. Decisiones que condicionan el presupuesto y a quién llamas cuando algo se rompe. |
| :---- |

| PROMPT · PASO 5 — precedido de /plan Lee docs/03-spec.md. Actúa como arquitecto de software explicándole las opciones a alguien sin experiencia técnica. Nada de jerga sin explicar. MI CONTEXTO: \- Experiencia programando: \[NINGUNA / POCA / DESCRÍBELA\] \- Presupuesto mensual máximo: \[EJ: 0 € / 20 € / 100 €\] \- Usuarios esperados el primer año: \[EJ: 10 / 500 / 10.000\] \- Manejo datos sensibles: \[SÍ, CUÁLES / NO\] \- Debe funcionar en: \[WEB / MÓVIL / AMBOS\] Escribe docs/04-plan-tecnico.md con: 1\. TRES OPCIONES DE STACK comparadas en tabla, con una columna extra: "qué pasa cuando algo se rompe y estoy solo". 2\. RECOMENDACIÓN y por qué, dado mi nivel concreto. 3\. PLAN TÉCNICO de la opción elegida: estructura de carpetas; modelo de datos con tablas, campos y relaciones; gestión de usuarios y permisos; cómo se publica. 4\. GESTIÓN DE SECRETOS — dónde van las claves. Nunca dentro del código: siempre en el gestor de secretos o variables de entorno de la plataforma. Indica el sitio exacto. 5\. COSTES estimados al mes. 6\. LO QUE VA A DOLER — las tres partes que más probablemente me compliquen la vida, y cómo mitigarlas. Explica cada término técnico la primera vez que lo uses, con una analogía cotidiana. Preséntame las opciones antes de escribir el archivo. |
| :---- |

## **06 — Qué papel juega la IA**

**▸ CLAUDE CODE · usa /plan · genera docs/05-ia.md**

| COMO EN LA VIDA REAL Para calcular el IVA no llamas al asesor fiscal: usas la calculadora. El asesor lo reservas para lo que requiere criterio. Cada vez que le pides a la IA algo que una fórmula fija resolvería, pagas de más, tardas más y añades la posibilidad de que se equivoque. |
| :---- |

| LA ESCALERA DE COMPLEJIDAD Anthropic recomienda subir peldaño a peldaño y parar en cuanto funcione: 1\) una llamada a la IA con buenas instrucciones · 2\) lo mismo con tus documentos (RAG) · 3\) workflow de pasos fijos · 4\) agente que decide solo. La mayoría de productos reales viven en el peldaño 1 o 2\. |
| :---- |

| PROMPT · PASO 6 — precedido de /plan Lee docs/03-spec.md. Actúa como ingeniero de IA senior. Tu sesgo debe ser hacia la solución MÁS SIMPLE posible, no hacia la más impresionante. Escribe docs/05-ia.md con: 1\. QUÉ NO NECESITA IA — partes que se resuelven mejor con código determinista de toda la vida. Sé generoso con esta lista. 2\. QUÉ SÍ NECESITA IA — solo lo que requiere criterio, lenguaje natural o datos no estructurados. Para cada parte, en qué peldaño está y por qué:    1: una llamada al modelo con buenas instrucciones    2: lo anterior \+ acceso a mis documentos (RAG)    3: workflow de pasos fijos encadenados    4: agente que decide sus propios pasos 3\. JUSTIFICACIÓN de cada peldaño superior al 1: qué se rompe exactamente si me quedo en el anterior. 4\. HERRAMIENTAS que necesita la IA. Para cada una: qué hace, si solo lee o escribe, si es reversible, y riesgo BAJO/MEDIO/ALTO. 5\. COSTE por interacción y al mes con el volumen previsto. 6\. QUÉ PASA CUANDO SE EQUIVOCA en cada punto: consecuencia real y cómo lo detectaríamos. |
| :---- |

## **07 — Trocea en tareas pequeñas**

**▸ CLAUDE CODE · modo normal · genera docs/06-tareas.md**

| COMO EN LA VIDA REAL La diferencia entre "ordenar la casa" (que llevas aplazando tres meses) y "vaciar el cajón de la mesilla" (que haces esta tarde). Las tareas grandes generan parálisis; las pequeñas generan avance visible. |
| :---- |

| PROMPT · PASO 7 Lee docs/03-spec.md, docs/04-plan-tecnico.md y docs/05-ia.md. Escribe docs/06-tareas.md con la lista de tareas de implementación. Reglas: \- Cada tarea debe poder implementarse Y comprobarse de forma aislada. \- Cada tarea debe caber en menos de una hora. \- Nada de "implementar autenticación". Trocéalo en acciones concretas y verificables. \- Ordénalas por dependencia. Numéralas T01, T02, T03... Para cada tarea:   - Título (una acción concreta, empezando por verbo)   - Qué archivos toca   - CÓMO COMPRUEBO QUE ESTÁ BIEN — un paso concreto que yo, sin saber programar, pueda hacer para verificarlo con mis propios ojos   - De qué tareas depende   - Una casilla \[ \] para marcarla como hecha Agrupa en HITOS, y define cada hito de forma que al terminarlo yo pueda ver algo funcionando en pantalla. |
| :---- |

# ---

**FASE C · Construir**

Pasos 8 a 11\. Aparece el código. Tu trabajo es preparar el terreno y revisar.

## **08 — Prepara el terreno**

**▸ CLAUDE CODE · ejecuta /init y luego el prompt · aquí corre comandos**

| COMO EN LA VIDA REAL Antes de que entren los albañiles: proteges el suelo, pones el contenedor y dejas el plano colgado donde todos lo vean. Cuesta media mañana y te ahorra un mes de desastres. |
| :---- |

| EMPIEZA CON /INIT El comando /init genera el CLAUDE.md inicial del proyecto: el archivo que Claude Code lee siempre, con los comandos, las convenciones y las advertencias. Es "el README para la IA". Ejecútalo primero y luego afínalo con el prompt de abajo. Mantenlo breve: el contenido innecesario en este archivo empeora el rendimiento, no lo mejora. |
| :---- |

| NUNCA, BAJO NINGÚN CONCEPTO Ninguna clave, contraseña, token ni credencial se escribe dentro del código, ni en una URL, ni en un archivo que subas al repositorio. Van siempre en el gestor de secretos o variables de entorno de la plataforma. Si ves una clave escrita a mano en algo que genere la IA, páralo y cámbialo antes de seguir. |
| :---- |

| PROMPT · PASO 8 — después de /init Lee docs/04-plan-tecnico.md. Soy principiante total. Prepara el proyecto, explicándome qué hace cada comando ANTES de ejecutarlo y esperando mi confirmación: 1\. Crea la estructura de carpetas del plan técnico. 2\. Comprueba que git está inicializado. Explícame qué es un commit con una analogía. 3\. Crea el .gitignore correcto, para que las claves y archivos temporales NUNCA se suban por accidente. 4\. Crea .env.example documentando qué variables hacen falta, SIN valores reales. Dime dónde pongo los valores de verdad en mi plataforma. 5\. Revisa el CLAUDE.md que acabamos de generar con /init y añádele: la restricción principal del proyecto, consideraciones de seguridad y datos sensibles, y qué NO debe hacer nunca un agente en este repositorio. Mantenlo breve. 6\. Escribe un README.md aparte, dirigido a personas. Después de cada comando, dime qué debería ver si ha salido bien y qué hacer si veo un error. |
| :---- |

## **09 — Construye tarea a tarea**

**▸ CLAUDE CODE · /plan por tarea \+ /clear entre tareas · el bucle principal**

| COMO EN LA VIDA REAL Montar un mueble de Ikea siguiendo el orden de las instrucciones y comprobando cada pieza antes de la siguiente. Todos conocemos a alguien que fue por libre y acabó desmontándolo entero a las dos horas. |
| :---- |

**El bucle, en Claude Code:**

> 1. /plan \+ el prompt con **una sola tarea**.  
> 2. Revisas el plan. Apruebas.  
> 3. Compruebas con tus ojos, usando el paso de verificación del Paso 7\.  
> 4. /diff para ver qué cambió. Commit.  
> 5. /clear y siguiente tarea.

| POR QUÉ /CLEAR ENTRE TAREAS La conversación se llena de detalles de la tarea anterior que ya no importan y que empeoran las decisiones de la siguiente. /clear vacía la mesa pero mantiene la memoria del proyecto (el CLAUDE.md sigue ahí). Comprueba con /context si dudas. |
| :---- |

| CUANDO ENTRA EN BUCLE Si arregla y rompe lo mismo dos o tres veces, no insistas. Usa /rewind para volver al punto donde funcionaba, luego /clear, y replantea la tarea partiéndola en dos más pequeñas. Insistir en un hilo contaminado es la forma más rápida de perder una tarde. |
| :---- |

| PROMPT · PASO 9 — precedido de /plan, repetir por cada tarea Lee docs/03-spec.md y docs/06-tareas.md. Implementa ÚNICAMENTE la tarea \[T01\]. No toques nada que no pertenezca a esa tarea, aunque veas cosas mejorables. Procede así: 1\. Dime en 3-5 líneas qué vas a hacer y qué archivos vas a tocar. Espera mi aprobación. 2\. Implementa. 3\. Explícame en lenguaje llano qué has hecho, archivo por archivo. 4\. Dime EXACTAMENTE qué tengo que hacer yo para comprobar que funciona: qué comando ejecuto, qué abro, dónde hago clic y qué debería ver. 5\. Marca la tarea como hecha en docs/06-tareas.md y haz commit con un mensaje descriptivo. Restricciones: \- Ninguna clave, contraseña o token en el código. Siempre variables de entorno. \- Si la tarea requiere una decisión que no está en la spec, PARA y pregúntame. No la inventes. \- Si crees que esta tarea está mal definida o es demasiado grande, dímelo antes de empezar. |
| :---- |

## **10 — Instrucciones de la IA de tu app**

**▸ CLAUDE CODE · genera prompts/system.md · versionado en git**

| COMO EN LA VIDA REAL El manual de acogida que le das a alguien en su primer día: qué se hace, qué no se hace nunca, a quién se avisa si pasa algo raro, con qué tono se habla a los clientes. Sin ese manual, cada día improvisa distinto. |
| :---- |

| OJO: NO CONFUNDAS DOS COSAS El CLAUDE.md del Paso 8 es para Claude Code, que te ayuda a construir. El system prompt de este paso es para la IA que vivirá *dentro de tu app* y hablará con tus usuarios. Son archivos distintos con propósitos distintos. Guarda el segundo en prompts/system.md para que quede versionado en git. |
| :---- |

| PROMPT · PASO 10 Lee docs/03-spec.md y docs/05-ia.md. Escribe prompts/system.md: el system prompt de calidad de producción para la IA que vivirá dentro de la app. MATERIAL DE REFERENCIA (protocolos, políticas o guiones que ya tengo): \[PÉGALOS AQUÍ, O DIME LA RUTA DEL ARCHIVO SI YA LOS TENGO EN EL PROYECTO\] Estructura: 1\. ROL Y OBJETIVO — qué es y para qué existe. 2\. PROCEDIMIENTO — pasos numerados. Cada paso, una acción concreta. Sin ambigüedad. Escrito como directriz para un agente, no como descripción para una persona. 3\. USO DE HERRAMIENTAS — cuándo usar cada una y cuándo no. 4\. CASOS LÍMITE — qué hacer si: falta un dato, la pregunta se sale del ámbito, una herramienta falla, el usuario insiste tras una negativa, el usuario está molesto. 5\. LÍMITES DUROS — lo que no debe hacer NUNCA. 6\. CUÁNDO PASAR A UN HUMANO — condiciones exactas de escalado. 7\. TONO Y FORMATO. Escribe además evals/casos-dificiles.md con 10 situaciones con las que debería probarlo, incluyendo intentos de sacarlo de su ámbito. Haz commit de ambos. |
| :---- |

## **11 — Diseña las herramientas de la IA**

**▸ CLAUDE CODE · usa /plan · implementa y documenta a la vez**

| COMO EN LA VIDA REAL Si dejas una herramienta a alguien, la etiquetas bien y la haces difícil de usar mal. Un enchufe solo entra de una manera: no porque el usuario sea torpe, sino porque el diseño impide el error. Eso se llama *poka-yoke*, y con la IA funciona igual. |
| :---- |

| EL EJEMPLO REAL DE ANTHROPIC Su agente se equivocaba con rutas de archivo relativas. En vez de añadir instrucciones pidiéndole cuidado, cambiaron la herramienta para que solo aceptara rutas absolutas. El error desapareció. Arreglar la herramienta funciona mejor que pedirle al modelo que tenga cuidado. |
| :---- |

| PROMPT · PASO 11 — precedido de /plan Lee docs/05-ia.md y docs/03-spec.md. Diseña e implementa las herramientas que el agente de mi app va a poder usar. Para cada una, documenta en el propio código: 1\. NOMBRE — descriptivo e inconfundible respecto a las demás. 2\. DESCRIPCIÓN — como se la explicarías a alguien nuevo en el equipo: qué hace, cuándo usarla y cuándo NO usarla. 3\. PARÁMETROS — nombres sin ambigüedad posible ("user\_id", nunca "user"), con tipo y si es obligatorio. 4\. EJEMPLO de uso correcto y ejemplo de uso incorrecto frecuente. 5\. QUÉ DEVUELVE, incluido cuando no encuentra nada o falla. 6\. DISEÑO A PRUEBA DE ERRORES — cómo has diseñado los parámetros para que sea difícil equivocarse. Si detectas una forma en que el modelo podría usarla mal, REDISEÑA la herramienta en vez de añadir advertencias al prompt. 7\. NIVEL DE RIESGO (bajo/medio/alto). Limita el tamaño de lo que devuelve cada herramienta: una respuesta enorme llena el contexto y degrada al modelo. Propón paginación, filtros o truncado donde haga falta. |
| :---- |

# ---

**FASE D · Probar y proteger**

Pasos 12 a 15\. Aquí Claude Code brilla especialmente: no solo escribe las pruebas, las *ejecuta* y ve los resultados.

## **12 — Pruebas de toda la vida**

**▸ CLAUDE CODE · escribe Y ejecuta las pruebas · imprescindible aquí**

| COMO EN LA VIDA REAL Abrir todos los grifos y encender todos los enchufes antes de que se vaya el fontanero. Un minuto ahora, o una llamada de urgencia un domingo. |
| :---- |

**Por qué aquí el chat no sirve:** en el chat, la IA escribe pruebas a ciegas y tú tienes que ejecutarlas y contarle qué pasó. Claude Code las ejecuta, lee el error, y corrige. Ese bucle cerrado es la diferencia entre pruebas que funcionan y pruebas decorativas.

| PROMPT · PASO 12 Lee docs/01-historias.md y docs/03-spec.md. Escribe las pruebas automáticas de la parte determinista de la app (todo lo que NO depende de un modelo de IA), y ejecútalas. Cubre obligatoriamente: \- Cada criterio de aceptación (Dado/Cuando/Entonces) de mis historias de usuario debe tener su prueba. \- Casos límite: campos vacíos, formatos inválidos, valores extremos, caracteres raros, textos larguísimos. \- Permisos: que un usuario NO puede acceder a datos de otro. \- Errores: qué pasa si falla la conexión o un servicio externo. Después de escribirlas: ejecútalas, enséñame el resultado, y si algo falla arréglalo y vuelve a ejecutar hasta que pasen todas. Finalmente, dime: 1\. El comando para ejecutarlas yo mismo. 2\. Cómo interpreto el resultado y qué hago si algo sale en rojo. 3\. Qué partes importantes quedan SIN cubrir y por qué. |
| :---- |

## **13 — Evals: el examen de la IA**

**▸ CLAUDE CODE · instala la herramienta y la deja funcionando**

**Qué es.** Las pruebas normales no valen para la IA, porque no da siempre la misma respuesta exacta. Necesitas casos reales con la respuesta correcta conocida (el *golden dataset*) y métricas que midan si la respuesta es buena, no si es idéntica.

| COMO EN LA VIDA REAL No corriges una redacción comparándola letra a letra con un modelo: usas una rúbrica. "¿Responde a la pregunta? ¿Se ajusta a los datos que le dimos? ¿Está bien escrita?". Eso es un eval. |
| :---- |

| EL ERROR CLÁSICO Se prueba el prototipo con una docena de ejemplos a mano, "se ve bien", y se lanza. Tres semanas después un cambio de prompt rompe algo y nadie se entera hasta que se quejan los usuarios. La solución no es probar más a mano: es convertirlo en un proceso repetible y automático. |
| :---- |

| PROMPT · PASO 13 Lee docs/05-ia.md, prompts/system.md y evals/casos-dificiles.md. Monta el sistema de evaluación de la parte de IA. Explícamelo asumiendo que nunca he hecho esto, e instálalo y déjalo funcionando. 1\. GOLDEN DATASET — escribe evals/golden.yaml (o el formato de la herramienta) con 25 casos representativos y su respuesta correcta o los criterios que debe cumplir. Incluye casos fáciles, casos límite y casos que deberían ser rechazados. 2\. MÉTRICAS — POCAS métricas de alta señal: demasiadas hacen el sistema ruidoso, caro y difícil de interpretar. Si uso RAG, incluye fidelidad al contexto, relevancia de la respuesta y calidad de la recuperación. 3\. HERRAMIENTA — recomiéndame una (Promptfoo, DeepEval o Ragas según mi caso), instálala y escribe la configuración. 4\. EJECÚTALA y enséñame el resultado interpretado. 5\. UMBRALES iniciales de aprobado. Avísame de que tendré que recalibrarlos tras unas semanas con datos reales, porque los casos reales nunca se distribuyen como el dataset de prueba. 6\. Añade a CLAUDE.md una nota: relanzar los evals siempre que cambie el prompt, el modelo o los datos. |
| :---- |

## **14 — Barreras de seguridad**

**▸ CLAUDE CODE · usa /plan · las diseña y las implementa**

| COMO EN LA VIDA REAL La seguridad de un coche no es el cinturón: es el cinturón más el airbag más el ABS más el chasis. Cada uno falla en un escenario distinto; juntos cubren casi todos. |
| :---- |

| PROMPT · PASO 14 — precedido de /plan Lee docs/03-spec.md y docs/05-ia.md. Diseña e implementa las barreras de seguridad (guardrails) del sistema, en capas. Para cada capa dime qué la dispara, qué pasa cuando salta y qué ve el usuario: 1\. Clasificador de relevancia — bloquea lo que se sale del ámbito. 2\. Clasificador de seguridad — detecta intentos de manipular las instrucciones. 3\. Filtro de datos personales — revisa la salida antes de mostrarla. 4\. Moderación de contenido. 5\. Salvaguardas por herramienta según el riesgo del Paso 11: qué acciones exigen confirmación explícita y cuáles aprobación humana. 6\. Reglas deterministas simples — límites de longitud, listas de bloqueo, filtros de patrones. 7\. Validación de la salida — formato y tono. Además: \- Implementa los dos disparadores de INTERVENCIÓN HUMANA: superar un umbral de fallos, y cualquier acción sensible o irreversible. \- Ordena por prioridad, empezando por privacidad de datos y seguridad de contenido. \- Avísame de cualquier barrera que pueda molestar a usuarios legítimos y cómo equilibrarlo. \- Escribe pruebas que verifiquen que cada barrera funciona, y ejecútalas. |
| :---- |

## **15 — Ataca tu propio sistema**

**▸ CLAUDE CODE · sesión limpia (/clear) \+ /security-review**

| COMO EN LA VIDA REAL El simulacro de incendio. Nadie disfruta haciéndolo un martes por la mañana, pero es la única forma de descubrir que la puerta de emergencia está bloqueada antes de que haga falta. |
| :---- |

| DOS PASADAS, NO UNA Primero ejecuta /security-review: es un comando propio de Claude Code que revisa los cambios buscando vulnerabilidades. Después, con /clear para empezar limpio, lanza el prompt de ataque de abajo. Una sesión que acaba de construir algo tiende a defenderlo; una sesión nueva lo ataca mejor. |
| :---- |

| EL RIESGO NÚMERO UNO La inyección de prompt: alguien mete instrucciones ocultas —en un mensaje, en un documento que tu app procesa, en una web que consulta— para que tu IA haga algo que no debe. Encabeza la lista de OWASP y es el que más gente subestima, porque el ataque no llega por donde esperas. |
| :---- |

| PROMPT · PASO 15 — después de /clear y /security-review Lee prompts/system.md y el código de los guardrails. Actúa como equipo de red teaming. Tu trabajo es ROMPER este sistema, no defenderlo. Sé creativo y despiadado. Escribe los resultados en seguridad/red-team.md. Cubre el OWASP Top 10 para LLM: 1\. Inyección de prompt DIRECTA — el usuario escribe instrucciones maliciosas. 2\. Inyección de prompt INDIRECTA — instrucciones ocultas en un documento o web que el sistema procesa. Dedícale atención especial: es la más subestimada. 3\. Fuga del prompt de sistema. 4\. Filtración de datos sensibles. 5\. Agencia excesiva — conseguir que ejecute acciones que no debería. 6\. Manejo inseguro de la salida — que lo que devuelve el modelo se ejecute en otro sitio sin comprobarse. 7\. Consumo descontrolado de recursos. Para cada categoría: 5 ataques concretos con el texto exacto, tanto de un solo mensaje como de conversación larga (donde la manipulación se construye poco a poco), qué significaría que funciona, y cómo defenderse. Ejecuta los ataques contra el sistema real donde sea posible. Al final, ordena los hallazgos por impacto y probabilidad y dime cuáles arreglar antes de publicar. |
| :---- |

# ---

**FASE E · Lanzar y mantener**

Pasos 16 y 17\. Publicar no es el final: es cuando empiezas a aprender de verdad.

## **16 — Publica**

**▸ CLAUDE CODE · /diff y /code-review antes · imprescindible aquí**

| COMO EN LA VIDA REAL No abres el restaurante con el comedor lleno el primer día: haces una noche de prueba con amigos. Y tienes claro de antemano cómo cierras si algo va mal, sin improvisar en el momento. |
| :---- |

| ANTES DE PUBLICAR, DOS COMANDOS /diff te enseña exactamente qué ha cambiado. /code-review revisa esos cambios buscando errores de corrección, y con \--fix aplica las correcciones. Hazlo siempre antes de publicar: es tu última red antes de que lo vea un usuario. |
| :---- |

| PROMPT · PASO 16 Lee docs/04-plan-tecnico.md. Guíame para publicar la app, paso a paso, asumiendo que nunca he desplegado nada. Ejecuta lo que puedas y explícame lo que tengo que hacer yo en el navegador. DÓNDE QUIERO PUBLICARLO: \[PLATAFORMA, O "RECOMIÉNDAME UNA"\] 1\. Pasos exactos para publicar, con qué debería ver en pantalla en cada uno. 2\. Cómo configuro las variables de entorno y las claves EN LA PLATAFORMA, nunca en el código. Indícame el sitio exacto. 3\. Deja montado que cada cambio guardado en git se publique automáticamente. 4\. Añade una PUERTA DE CALIDAD que impida publicar si las evaluaciones del Paso 13 bajan del umbral. 5\. Cómo pruebo la app en un entorno de vista previa antes de que la vea nadie. 6\. CÓMO DESHAGO UNA PUBLICACIÓN MALA — los comandos o clics exactos para volver atrás. Quiero tenerlo claro ANTES de necesitarlo. Escríbelo en docs/07-emergencia.md. 7\. Lista de comprobación previa al lanzamiento, en docs/07-emergencia.md también. Y configúrame límites de gasto para que un error o un uso masivo no me genere una factura inesperada. |
| :---- |

## **17 — Vigila y cierra el ciclo**

**▸ CLAUDE CODE · configura la observabilidad · revisión semanal**

| COMO EN LA VIDA REAL Los Pasos 12 y 13 son la ITV: comprueban lo que ya sabes que puede fallar. La vigilancia en producción es el testigo del salpicadero: te avisa de lo que no habías previsto. Necesitas los dos; ninguno sustituye al otro. |
| :---- |

**El ciclo que no debe romperse:** un usuario real encuentra un fallo que no habías previsto → ese caso entra en el golden dataset del Paso 13 → se arregla, y la evaluación automática garantiza que ese fallo **nunca vuelve**.

| PROMPT · PASO 17 Lee docs/03-spec.md y docs/05-ia.md. Monta la vigilancia de la app en producción y el ciclo de mejora. Instala y configura lo que haga falta. 1\. QUÉ MIDO desde el primer día: coste por interacción, tiempo de respuesta, tasa de éxito, cuántas veces salta un guardrail, cuántas veces se escala a un humano. 2\. ALERTAS — qué umbrales las disparan y cómo me llegan. 3\. HERRAMIENTA de observabilidad adecuada a mi tamaño, configurada. 4\. RUTINA SEMANAL — escribe docs/08-rutina.md con qué reviso cada semana en 15 minutos, en qué orden. 5\. CICLO DE MEJORA — el procedimiento exacto para convertir una conversación fallida en producción en un caso nuevo del golden dataset. Escríbelo también en docs/08-rutina.md. 6\. Cómo distingo un fallo puntual de una degradación real que exige actuar. Explícame con analogías cotidianas la diferencia entre probar antes de publicar y vigilar después de publicar, y por qué necesito las dos cosas. |
| :---- |

## ---

**Resumen: qué usar en cada paso**

| Paso | Herramienta | Comando clave |
| :---- | :---- | :---- |
| 1 · Problema | Claude Code | — |
| 2 · Historias | Claude Code | — |
| 3 · MVP | Claude Code | — |
| 4 · Spec | Claude Code | /plan |
| 5 · Plan técnico | Claude Code | /plan |
| 6 · Papel de la IA | Claude Code | /plan |
| 7 · Tareas | Claude Code | — |
| 8 · Terreno | **Solo Claude Code** | /init |
| 9 · Construir | **Solo Claude Code** | /plan /clear /rewind |
| 10 · System prompt | Claude Code | — |
| 11 · Herramientas | Claude Code | /plan |
| 12 · Pruebas | **Solo Claude Code** | — |
| 13 · Evals | **Solo Claude Code** | — |
| 14 · Guardrails | Claude Code | /plan |
| 15 · Red teaming | Claude Code | /clear /security-review |
| 16 · Publicar | **Solo Claude Code** | /diff /code-review |
| 17 · Vigilar | Claude Code | /usage |

Las filas resaltadas son pasos donde el chat directamente no sirve: hay que ejecutar comandos, correr pruebas o leer el resultado real de la máquina.

## ---

**Los tres principios**

**01 · LO MÁS SIMPLE QUE FUNCIONE**  
Empieza asumiendo que no necesitas nada complicado. Añade complejidad solo cuando puedas demostrar que la versión simple se queda corta.  
**02 · LA ESPECIFICACIÓN MANDA, NO EL CHAT**  
Lo que decide qué se construye es un documento que puedes releer y corregir, no una conversación que se pierde. En Claude Code esto es literal: la spec está en el disco y Claude la lee cada vez.  
**03 · MIDE ANTES DE CRECER**  
Nada crece —ni en usuarios, ni en funciones, ni en autonomía— sin un examen automático que demuestre que sigue funcionando.

## ---

**Fuentes**

**CLAUDE CODE**

> * Documentación oficial de comandos: https://code.claude.com/docs/en/commands  
> * Visión general: https://docs.claude.com/en/docs/claude-code/overview

**METODOLOGÍA**

> * Anthropic — Building Effective Agents: https://www.anthropic.com/engineering/building-effective-agents  
> * Anthropic — Writing effective tools for AI agents: https://www.anthropic.com/engineering/writing-tools-for-agents  
> * OpenAI — A Practical Guide to Building Agents: https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf  
> * GitHub — Spec-driven development: https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/  
> * Eric Ries — The Lean Startup: https://theleanstartup.com/principles  
> * OWASP GenAI Security Project: https://genai.owasp.org/  
> * AGENTS.md — estándar abierto: https://agents.md/

---

Comandos de Claude Code verificados contra la documentación oficial en agosto de 2026\. Claude Code se actualiza con frecuencia: si un comando no aparece al escribir "/", comprueba tu versión con /doctor o consulta la documentación.