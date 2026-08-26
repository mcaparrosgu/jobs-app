# 04 · Plan técnico

> Basado en `docs/03-spec.md` (qué hace el producto) y en
> `knowledge/preferencias-tecnicas-paso5.md` (preferencias de Mar: Gmail
> para el email, modelo de IA gratuito y de código abierto).
>
> **Contexto de quien lo va a construir**: experiencia programando
> ninguna/muy poca · presupuesto máximo **0 €/mes** · ~5 usuarias el primer
> año · sí se manejan datos sensibles (CV, email, datos de contacto) · solo
> web.
>
> Cada término técnico se explica la primera vez que aparece.

> ⚠️ **Actualización (T25, 2026-08-19)**: este documento eligió **Groq**
> dando por hecho que ofrecía varios modelos de peso abierto para elegir.
> Al construir T25 se comprobó en vivo que Groq ya no los tiene (solo
> quedan modelos de OpenAI, descartados, y uno solo no-OpenAI marcado
> "Preview", con riesgo de retirada). El proveedor de IA pasó a
> **OpenRouter**. El resto de este documento (por qué Next.js + Supabase +
> Vercel, cómo se factura, la arquitectura general) sigue siendo válido —
> solo cambia qué servicio ejecuta el modelo. Detalle completo en
> [`knowledge/decision-modelo-ia.md`](../knowledge/decision-modelo-ia.md).

> ⚠️ **Actualización (Paso 15, 2026-08-20)**: el proveedor principal vuelve a
> ser **Groq**, ahora por privacidad. El red team descubrió que la cuenta de
> OpenRouter permitía a los modelos gratuitos **entrenar con las peticiones**
> — y cada petición lleva el CV completo de una persona real. Se apagó esa
> opción, y como al apagarla OpenRouter deja de servir los modelos `:free`,
> se invirtió el orden: Groq primero (con *Zero Data Retention* activado),
> OpenRouter de respaldo. Sigue en pie el riesgo que motivó el cambio de T25
> (el modelo de Groq está marcado "Preview"), asumido a cambio de la
> privacidad. Detalle en
> [`knowledge/decision-groq-principal-privacidad.md`](../knowledge/decision-groq-principal-privacidad.md).

> ⚠️ **Actualización (2026-08-23)**: Groq se retiró **del todo** del
> proyecto (decisión de Mar). El proveedor principal de las dos llamadas a
> IA es ahora **Cloudflare Workers AI**, con OpenRouter como único
> respaldo — ya no hay un tercer proveedor en la cascada. El motivo no fue
> el riesgo de "Preview" que arrastraba Groq desde T25, sino que Mar
> reportó un CV real con datos inventados generado por Gemini (que ocupaba
> un hueco aparte solo en `generarCvYCarta`); al investigar el reemplazo se
> verificó que Cloudflare funciona bien también para `extraerPerfil`, y se
> decidió unificar ahí y quitar Groq entero en vez de dejarlo como
> respaldo. Detalle en
> [`knowledge/decision-cloudflare-generarcv.md`](../knowledge/decision-cloudflare-generarcv.md).

## 1. Tres opciones de stack

Un **stack** es simplemente la lista de herramientas que trabajan juntas
para que una web funcione: dónde vive la página, dónde se guardan los
datos, quién escribe los CVs. Como los electrodomésticos de una cocina:
cada uno hace una cosa y entre todos sale la comida.

| | **Opción 1 · Código real, paso a paso con Claude Code** | **Opción 2 · Constructor con IA (Lovable)** | **Opción 3 · Todo dentro de n8n** |
| :---- | :---- | :---- | :---- |
| **Cómo se construye la web** | Claude Code escribe el código contigo, tú lo entiendes y lo apruebas | Le describes la web en lenguaje natural y Lovable la escribe entera | No hay web propiamente dicha: formularios básicos que genera el propio n8n |
| **Piezas** | Next.js + Supabase + Groq + Vercel + el n8n que ya tienes | Lovable + Supabase + el n8n que ya tienes | Solo n8n (+ su base de datos) |
| **Coste al mes** | 0 € | 0 € (pero con muy poco margen de uso) | 0 € |
| **¿Cubre todo lo que pide la spec?** | Sí | Sí | **No** — la sesión de 15 días, la edición de palabras clave y la lista de ofertas interactiva no encajan bien |
| **Cuánto aprendes** | Mucho: ves el código y entiendes qué hace cada trozo | Poco: el código lo escribe otra IA y tú no lo tocas | Medio: aprendes n8n a fondo, pero no desarrollo web |
| **Qué pasa cuando algo se rompe y estoy sola** | Copias el mensaje de error del panel y se lo pegas a Claude Code. Es el conjunto de herramientas **más usado y mejor documentado que existe**, así que Claude Code lo reconoce al instante y te guía hasta arreglarlo. Es el camino con más red de seguridad. | Le describes el fallo a Lovable en una frase y su IA suele arreglarlo sin que toques nada. **Pero**: el plan gratis son 5 acciones al día. Si el arreglo tarda 3 intentos, gastas medio día de cuota — puedes quedarte bloqueada a mitad esperando a mañana. Y como no entiendes el código, dependes siempre de ella. | Lo depuras en el propio editor de n8n, terreno que ya conoces. **Pero** el problema típico aquí no es un fallo puntual: es descubrir a mitad de camino que **n8n no puede hacer eso**, y ahí no hay arreglo posible — hay que empezar de nuevo con otra herramienta. |
| **Riesgo principal** | Curva de aprendizaje al principio (primeras horas de "no entiendo nada") | Quedarte sin cuota diaria en mal momento | Chocar contra el techo de la herramienta a media construcción |

## 2. Recomendación: Opción 1

**Next.js + Supabase + Groq + Vercel**, conectado a tu n8n actual. Los
motivos, en orden de importancia para tu caso concreto:

1. **Es la única de las tres que cubre el 100 % de la spec sin retorcerla.**
   La opción 3 se queda corta de verdad (no es cuestión de esfuerzo, es
   que n8n no está hecho para eso), y eso lo descubrirías tarde.
2. **Es la que mejor aprovecha el método que estás siguiendo.** Los 17
   pasos culminan en construir con Claude Code (Paso 9). Este stack es el
   más documentado del mundo, así que Claude Code lo maneja con soltura y
   tú tienes ayuda real en cada atasco.
3. **Supabase te regala dos cosas que costarían días.** El acceso por
   enlace de un solo uso (el *magic link* de la historia A1) viene ya
   hecho de fábrica, y la base de datos también. No hay que programarlos.
4. **Groq cumple tu requisito de IA gratuita y de código abierto** sin
   tener que montar ningún servidor. Ejecuta modelos de peso abierto
   (Llama, Qwen, Kimi, Mistral) y su capa gratuita no pide tarjeta. El
   modelo concreto se elige en el Paso 6 — ver [`05-ia.md`](05-ia.md).
5. **Aprendes de verdad.** Siendo tu primer proyecto estructurado, salir
   de aquí entendiendo qué es una base de datos y cómo se publica una web
   vale más que la web en sí.

**Lo que renuncias eligiendo esta opción**: las primeras horas serán más
duras que con Lovable, porque verás archivos y comandos que no te dicen
nada todavía. Es una inversión, no una pérdida.

### 2.1 Alternativas que se miraron después y se descartaron

Antes de confirmar la Opción 1 se contrastaron tres variantes más. Se
dejan aquí registradas para no volver a plantearlas sin motivo nuevo:

- **v0 (de Vercel) en lugar de Lovable, dentro de la Opción 2.** Peor, no
  mejor: su capa gratuita son 5 $/mes de créditos con tope de ~7 mensajes
  al día (varias reseñas de 2026 lo describen como un *trial*, no como
  algo con lo que construir de forma sostenida), y **Supabase no viene
  integrado de fábrica** como sí ocurre en Lovable — hay hilos abiertos en
  el propio foro de Vercel sobre cómo hacer funcionar el login de Supabase
  en v0. Justo la pieza que más días ahorra es la que más fricción da.
- **Lovable Pro (25 $/mes, 100 créditos).** Resuelve el riesgo de quedarse
  sin cuota a media construcción, pero **no acelera la construcción**: el
  cuello de botella de quien construye por primera vez no es cuántos
  intentos tiene disponibles, sino cuántos intentos hacen falta para
  arreglar algo cuyo código no entiende. Pagar no reduce ese número.
  Además el hosting de Lovable Cloud se factura **aparte, por uso**: es un
  segundo grifo de gasto, no solo la cuota fija. Y es una factura
  recurrente mientras la app viva, no un coste puntual del MVP.
- **Copiar y adaptar el workflow `Jobs · generación CV` que ya existe en
  n8n.** No es una cuarta opción: es la Opción 3 con un punto de partida,
  y el punto de partida no arregla lo que la descarta. Ese flujo es de una
  sola persona (no hay login ni separación entre usuarias), usa una hoja
  de Google Sheets como almacén — inaceptable para 5 CVs con datos de
  contacto, por el requisito de privacidad de la spec — y llama a la **API
  de pago de Anthropic**, lo que rompe el presupuesto de 0 €. Adaptarlo
  para 5 personas obligaría a construir dentro de n8n exactamente lo que
  n8n no sabe hacer.

**Lo que sí se aprovecha de ese workflow**: la lógica del prompt, que ya
está probada en producción — combina el CV base con la oferta y separa la
respuesta del modelo con marcadores `===IDIOMA===` / `===CV===` /
`===CARTA===`. Esa estructura se traduce a la llamada al modelo de IA en
`lib/ia.ts` (ver §3.3) en vez de reinventar el prompt desde cero. Es
tiempo real ahorrado en el Paso 9, sin heredar ninguno de los problemas
del flujo original.

## 3. Plan técnico

### 3.1 Qué es cada pieza

- **Next.js** — el *framework* de la web. Un **framework** es un esqueleto
  ya montado con las paredes maestras puestas: en vez de construir la casa
  desde los cimientos, tú solo decoras las habitaciones. Next.js se ocupa
  de las rutas (qué se ve en `/perfil`, qué en `/ofertas`), de las
  pantallas y de la parte de servidor.
- **Supabase** — la base de datos y el control de acceso. Una **base de
  datos** es un armario de fichas muy ordenado: cajones (tablas) con
  fichas dentro (filas), y cada ficha con las mismas casillas rellenas
  (columnas). Supabase además trae el sistema de entrada por enlace de un
  solo uso ya resuelto.
- **Cloudflare Workers AI** — el servicio que ejecuta el modelo de IA
  principal (sustituye a Groq desde el 23/08/2026, ver aviso al principio
  del documento). Le mandas texto por internet y te devuelve texto. Es la
  pieza que lee el CV pegado y propone puesto y palabras clave, y la que
  redacta el CV y la carta adaptados. **OpenRouter** se queda como
  respaldo, por si Cloudflare falla o agota su cupo diario — aunque medido en
  vivo el 26/08/2026 no respalda casi nada: sus modelos gratuitos contestan
  `429` en menos de medio segundo (T112). Por eso, desde T116, la generación
  **reintenta tres veces contra Cloudflare** (24 + 14 + 14 s) antes de pasarle
  el turno: el fallo suele ser intermitente, y volver a intentarlo funciona
  mejor que cambiar de proveedor.
- **Vercel** — donde vive la web publicada. Es el "local a pie de calle":
  el sitio con dirección pública al que entran tus compañeras.
- **n8n** — un workflow **nuevo e independiente**, `Jobs App · ingesta`,
  que trae ofertas cada día a las 13:00 y envía los emails de aviso por
  Gmail. Se crea copiando el JSON de tu `Jobs · ingesta` actual y
  adaptando solo su parte final (unos 30 minutos): las 11 fuentes y sus
  normalizadores vienen ya hechos en la copia.

> ⚠️ **Tus workflows `Jobs` actuales no se tocan.** `Jobs · ingesta`,
> `Jobs · generación CV`, `Jobs · seguimiento` y `Jobs · archivado` son tu
> búsqueda de empleo real, en producción, y siguen funcionando igual.
> Jobs App es un producto distinto para 5 personas y vive en su propio
> workflow, con su propio Schedule Trigger y su propio vigilante.

### 3.2 Cómo se conectan (lo importante)

La decisión que más simplifica todo: **n8n y la web no se hablan entre
sí. Los dos hablan con la misma base de datos.**

```text
  Jobs App · ingesta (13:00) ──escribe ofertas──►  ┌──────────┐
  Jobs App · ingesta (Gmail) ──lee quién tiene──►  │ Supabase │
                                perfil            └──────────┘
                                            ▲
                                            │ lee y escribe
                                            │
                                     Web (Next.js/Vercel)
                                            │
                                            └──► OpenRouter (generar CV+carta)
```

Esto elimina un bloque entero del plan de esfuerzo: en `docs/02-mvp.md`
había 1–2 días para *"conectar el botón Buscar al webhook"*. Un **webhook**
es un timbre: una URL a la que llamas para avisar a otro sistema de que
haga algo. Ya no hace falta ninguno, porque desde el Paso 4 sabemos que
"Buscar" **solo filtra** las ofertas que ya están guardadas — y eso es
simplemente una consulta a la base de datos, cuestión de horas y no de
días.

El único servicio externo al que llama la web es OpenRouter.

### 3.3 Estructura de carpetas

```text
jobs-app/
├── app/                          # cada carpeta = una dirección de la web
│   ├── page.tsx                  # "/"           → pedir acceso con el email
│   ├── auth/callback/route.ts    # aterrizaje del enlace del email
│   ├── perfil/page.tsx           # "/perfil"     → pegar CV, revisar palabras clave
│   ├── ofertas/page.tsx          # "/ofertas"    → lista, "me interesa", descargar
│   └── api/                      # código que corre en el servidor, no en el móvil
│       ├── extraer-perfil/route.ts   # CV pegado → puesto + palabras clave (IA)
│       ├── generar/route.ts          # oferta + CV → CV y carta adaptados (IA)
│       └── descargar/[id]/route.ts   # texto guardado → PDF
├── components/                   # trozos de pantalla reutilizables (botón, tarjeta de oferta)
├── lib/                          # utilidades compartidas
│   ├── supabase/                 # conexión a la base de datos
│   ├── ia.ts                     # llamadas al modelo de IA, en un solo sitio
│   └── pdf.ts                    # cómo se dibuja el PDF
├── supabase/migrations/          # historial de cambios de la base de datos
├── .env.local                    # ⚠ claves secretas — NUNCA se sube a git
├── .gitignore                    # lista de archivos que git debe ignorar
└── docs/  ·  knowledge/          # lo que ya tienes
```

Regla mental: **`app/` es lo que se ve, `lib/` es lo que se reutiliza.**

### 3.4 Modelo de datos

Cuatro cajones. Cada `id` es un código único automático, como el número de
bastidor de un coche.

**`perfiles`** — uno por usuaria (regla de negocio 4)

| Campo | Tipo | Para qué |
| :---- | :---- | :---- |
| `id` | identificador | clave de la ficha |
| `user_id` | identificador, **único** | de quién es este perfil |
| `puesto` | texto | propuesto por la IA, editable |
| `palabras_clave` | lista de textos | propuestas por la IA, la usuaria añade/quita |
| `cv_texto` | texto largo | el CV tal como lo pegó |
| `usar_experiencia_cv` | sí/no | si se tiene en cuenta al emparejar (regla 3) |
| `empresas_cv` | lista de textos | empresas que aparecen en el CV — **solo para verificar** que la IA no invente otras (ver `05-ia.md` §6.2). La usuaria no las ve |
| `titulos_cv` | lista de textos | ídem con las titulaciones |
| `actualizado_en` | fecha y hora | para el borrado al mes (regla 10) |

**`ofertas`** — compartidas por todas, no son de nadie (regla 6)

| Campo | Tipo | Para qué |
| :---- | :---- | :---- |
| `id` | identificador | |
| `titulo`, `empresa`, `enlace` | texto | lo mínimo que ve la usuaria |
| `descripcion` | texto largo | lo que la IA lee para adaptar el CV |
| `fuente` | texto | adzuna / jooble / apify |
| `id_externo` | texto | el código que le da la fuente original |
| `ingerida_en` | fecha y hora | qué día entró |

> `fuente` + `id_externo` juntos son **únicos**: así, si la misma oferta
> aparece dos días seguidos, no se duplica en la lista.

**`intereses`** — qué usuaria marcó "me interesa" en qué oferta (regla 2)

| Campo | Tipo |
| :---- | :---- |
| `id` | identificador |
| `user_id` + `oferta_id` | juntos, **únicos** — no se puede marcar dos veces |
| `creado_en` | fecha y hora |

**`generaciones`** — el CV y la carta ya redactados (regla 7)

| Campo | Tipo | Para qué |
| :---- | :---- | :---- |
| `id` | identificador | |
| `user_id` + `oferta_id` | juntos, **únicos** | un solo documento por oferta |
| `estado` | texto | `generando` / `listo` / `error` — es lo que mueve el indicador de espera y el botón de descarga |
| `cv_texto`, `carta_texto` | texto largo | el resultado, congelado en el momento en que se generó |
| `error_mensaje` | texto | por si falla, para poder explicárselo (caso límite) |
| `creado_en` | fecha y hora | |

**Relaciones, en una frase:** una usuaria tiene **un** perfil, marca
**muchos** intereses, y cada interés puede tener **una** generación. Las
ofertas son un almacén común del que todas tiran.

**El contador diario (regla 5) no necesita tabla propia.** Se calcula
preguntando "¿cuántas filas hay en `generaciones` de esta usuaria con
fecha de hoy?". Un cajón menos que mantener sincronizado, y es imposible
que se descuadre.

**El borrado al mes (regla 10)** lo hace el propio n8n: un paso más en
`Jobs App · ingesta`, el flujo de las 13:00, que borra lo que tenga más de
30 días. Cero infraestructura nueva.

### 3.5 Usuarios y permisos

Supabase Auth ya trae el enlace de un solo uso montado: la usuaria escribe
su email, recibe el enlace, entra. Nada que programar. Los 15 días de
inactividad (regla 9) son un ajuste de configuración, no código.

La parte importante es cómo se garantiza el aislamiento entre compañeras
(requisito de privacidad): con **RLS** (*Row Level Security*, seguridad a
nivel de fila). Analogía: en vez de poner un guardia en la puerta del
armario que decide quién pasa, **cada ficha lleva grabado a quién
pertenece y el armario se niega a entregarla a otra persona**. Aunque el
código de la web tuviera un fallo y pidiera las fichas de otra, la base de
datos no las suelta.

Se activa una regla así en cada tabla:

- `perfiles`, `intereses`, `generaciones` → *"solo puedes ver y modificar
  filas donde `user_id` sea el tuyo"*.
- `ofertas` → *"cualquiera que haya entrado puede leerlas; nadie desde la
  web puede escribirlas"* (solo n8n las escribe).

Esto es lo que hace que la privacidad no dependa de que el código esté
bien escrito. Para datos sensibles como un CV, es exactamente la garantía
que necesitas.

### 3.6 El PDF

Se guarda el **texto** del CV y la carta en la base de datos, y el PDF se
dibuja en el momento de descargar, con `@react-pdf/renderer`. Ventajas:
no hay que almacenar archivos, el diseño sobrio se controla desde el
código, y forzar que la carta empiece en página nueva (historia C4) es una
sola instrucción.

### 3.7 Cómo se publica

1. El código vive en un **repositorio** (la carpeta del proyecto con
   historial de cambios). Ya lo tienes: es lo que llevas commiteando desde
   el Paso 1.
2. Se sube ese repositorio a GitHub y se conecta a Vercel una vez.
3. A partir de ahí: **cada `git push` publica la web automáticamente**, en
   un par de minutos, sin tocar nada más.

> ⚠️ **Esto requiere tu permiso explícito.** Hasta ahora todo se ha
> quedado en tu ordenador, tal como pediste. Publicar en Vercel obliga a
> subir el código a GitHub. Cuando llegue el momento (Paso 9), te lo
> pregunto antes de hacer nada. Ojo también con esto: el repo de `Docker
> n8n` tiene notas que no deben salir de local — este repo es distinto y
> no las contiene, pero conviene revisarlo antes de subir.

> ⚠️ **Actualización (Paso 16, 2026-08-20)**: el punto 3 de arriba dejó de
> ser cierto, y a propósito. **Vercel ya no publica solo.** Publica un
> workflow de GitHub Actions (`.github/workflows/publicar.yml`), y solo si
> pasan lint, las 253 pruebas y —cuando el cambio toca la IA— la puerta de
> calidad de los evals del Paso 13. El motivo: hasta entonces, cada push a
> `master` iba directo a la web que ven las cinco usuarias, sin ninguna
> comprobación por el camino.
>
> Lo que cambia en el día a día: se trabaja **en una rama**, se prueba en su
> vista previa (protegida, solo la abre quien tenga sesión en Vercel) y se
> fusiona a `master` cuando está bien. Detalle completo y las cuatro
> decisiones en
> [`knowledge/paso-16-publicar.md`](../knowledge/paso-16-publicar.md); cómo
> deshacer una publicación mala, en
> [`07-emergencia.md`](07-emergencia.md).

### 3.8 Una regla que no es obvia: las variables *Sensitive* de Vercel

Las cinco variables de entorno del proyecto se guardaron en Vercel marcadas
como **Sensitive**, que significa **solo escritura**: se pueden guardar y la
app las usa, pero **su valor no se puede volver a leer** — ni desde el panel,
ni con el CLI, ni por la API.

Es buena idea para la seguridad y **rompe dos cosas de forma silenciosa**, las
dos descubiertas el 20/08/2026:

1. **`vercel env pull` no falla, pero trae la clave vacía.** Dice
   `✓ Created .env.local` tan tranquilo. El robot recibía una clave vacía y
   Groq respondía `401 Invalid API Key`, lo que parecía un problema de calidad
   de los prompts sin serlo.
2. **Construir la web fuera de Vercel produce una app rota.** Las variables
   `NEXT_PUBLIC_*` no se leen al ejecutar: se **incrustan en el código al
   construir**. Construyendo en GitHub, se incrustaba una URL de Supabase
   vacía y la web moría con *"Invalid supabaseUrl"*.

**Regla, entonces**: con variables *Sensitive*, todo lo que necesite **leer**
su valor fuera de Vercel falla, y falla en silencio. Solo hay dos salidas —
que el trabajo lo haga Vercel (así se construye ahora), o duplicar el valor
donde haga falta (así llegan las claves de IA al robot, como secretos del
repositorio en GitHub).

## 4. Gestión de secretos

Una **clave de API** es la contraseña con la que un servicio te reconoce.
Quien la tenga puede gastar en tu nombre. **Nunca van escritas dentro del
código**, porque el código se sube a GitHub y quedaría a la vista.

Van siempre en **variables de entorno**: notas que la plataforma le pasa
al programa al arrancar, sin que estén escritas en ningún archivo del
proyecto. Como no apuntar el PIN en la tarjeta.

| Clave | Qué abre | ¿Secreta? | **Sitio exacto** |
| :---- | :---- | :---- | :---- |
| `NEXT_PUBLIC_SUPABASE_URL` | dirección de tu base de datos | No | Vercel → Project → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | acceso público limitado (lo frena RLS) | No | ídem |
| `SUPABASE_SERVICE_ROLE_KEY` | **acceso total, se salta RLS** | 🔴 **Sí** | ídem — y jamás en un archivo `app/` que vea el navegador |
| `GROQ_API_KEY` | tu cuota de IA | 🔴 **Sí** | ídem |
| Credenciales de Gmail y de Apify | envío de correo, scraping | 🔴 **Sí** | n8n → Credentials (ya están ahí, no se tocan) |
| Contraseña SMTP de Gmail | envío del enlace de acceso | 🔴 **Sí** | Supabase → Project Settings → Authentication → SMTP Settings |

**Y desde el Paso 16, tres más en GitHub** — el robot que publica también
necesita llaves. Van en **GitHub → repositorio → Settings → Secrets and
variables → Actions**, y una vez guardadas no se pueden volver a leer (que es
lo correcto):

| Secreto | Para qué | Por qué no se lee de Vercel |
| :---- | :---- | :---- |
| `VERCEL_TOKEN` | Que el robot pueda publicar en tu nombre | Es un permiso nuevo, no existía antes |
| `GROQ_API_KEY` | Lanzar los evals del Paso 13 | Las variables *Sensitive* no se pueden leer (§3.8) |
| `OPENROUTER_API_KEY` | El respaldo, durante los evals | Ídem |

> Duplicar `GROQ_API_KEY` y `OPENROUTER_API_KEY` en dos sitios no gustaba —
> cuantos menos lugares tenga una clave, mejor. Se intentó traerlas de Vercel
> y **no es posible** por lo que explica §3.8. Consecuencia práctica: **si
> algún día cambias una de esas dos claves, hay que cambiarla en los dos
> sitios**, o el robot empezará a dar 401 mientras la app funciona
> perfectamente.

**Mientras desarrollas en tu ordenador**: las mismas claves van en un
archivo `.env.local` en la raíz del proyecto, y `.env.local` **tiene que
estar listado en `.gitignore`**. Compruébalo antes del primer `push`; es
el error número uno de quien empieza.

**El prefijo `NEXT_PUBLIC_` es literal**: todo lo que lo lleve viaja al
navegador y **cualquiera puede leerlo**. Es como escribirlo en el
escaparate. Por eso solo lo llevan las dos claves que no importan, y
`SUPABASE_SERVICE_ROLE_KEY` **jamás** debe llevarlo.

## 5. Costes estimados al mes

**Total previsto: 0 €** con 5 usuarias. Ninguno de estos servicios cobra
de más automáticamente: al llegar al límite se paran, no facturan.

| Servicio | Capa gratuita | Uso previsto (5 usuarias) | Margen |
| :---- | :---- | :---- | :---- |
| **Vercel** (Hobby) | 100 GB tráfico, 1M peticiones/mes | insignificante | Enorme |
| **Supabase** | 500 MB datos, 50.000 usuarias activas/mes | 5 usuarias, unos pocos MB | Enorme |
| **Cloudflare Workers AI** | **10.000 "neuronas"/día**, sin tope por minuto (Groq, retirado el 23/08/2026, sí lo tenía — ver §6.2) | hasta 35 `generarCvYCarta`/día (5 usuarias × 5 generaciones + 2 rehechos, T93) + extracciones de perfil | **Calculado el 24/08/2026** (`knowledge/arreglo-puerta-motivo-real.md`): típico ~3.650/10.000 neuronas (margen de sobra), peor caso absoluto (todo el mundo al límite con CVs y ofertas largas) ~10.450/10.000 — rozaría el tope. Ajustado, no enorme |
| **Apify** | 5 $/mes de crédito | 1 ejecución diaria de ingesta | Ajustado, depende del actor |
| **Gmail** | ~500 envíos/día | máx. 5 avisos/día + accesos | Enorme |

> ⚠️ **Actualización (2026-08-24)**: el 24/08/2026, con la cuota del día ya
> gastada en pruebas (evals + una investigación de un timeout en vivo),
> `generarCvYCarta` empezó a fallar el 100% de las veces por timeout de
> Cloudflare, y el respaldo de OpenRouter se quedó sin su propio cupo
> compartido (50 peticiones/día) por las mismas pruebas. No se pudo
> confirmar si la causa fue el cupo diario de Cloudflare agotado — el
> cálculo de arriba no lo explica por sí solo con un uso típico — o una
> degradación puntual del servicio. Detalle completo en
> [`knowledge/arreglo-puerta-motivo-real.md`](../knowledge/arreglo-puerta-motivo-real.md).
> Vale la pena vigilar si se repite con tráfico real de las 5 usuarias.

**La primera señal de alarma sería Apify**, no los demás: si el actor que
usas consume mucho, esos 5 $ se agotan antes de fin de mes y la ingesta
deja de traer ofertas de esa fuente (Adzuna y Jooble seguirían
funcionando). Merece la pena mirar el consumo real los primeros días.

> Sobre tu idea de **programar tu propio actor de Apify**: es una palanca
> real, pero conviene saber que Apify cobra por el **tiempo de cómputo**
> que consume el actor al ejecutarse, sea tuyo o de la tienda — hacerlo tú
> no lo vuelve gratis. Lo que sí ganas es control: un actor que hace
> exactamente lo que necesitas consume menos que uno genérico lleno de
> funciones que no usas. Es una buena optimización **para más adelante**,
> no algo que deba bloquear el MVP.

## 6. Lo que va a doler

### 6.1 Supabase pausa el proyecto tras una semana sin actividad

En el plan gratuito, si nadie toca la base de datos durante 7 días, se
apaga y hay que despertarla a mano desde el panel. Con una clase que no
entra a diario, es probable que pase — y da mucho susto, porque la web
parece rota sin motivo.

**Mitigación**: viene resuelta de serie. `Jobs App · ingesta` escribe
ofertas en Supabase **todos los días** a las 13:00, así que el proyecto
nunca llega a estar 7 días inactivo. Aun así, apúntate que si alguna vez
ves "proyecto pausado", se arregla con dos clics y no has perdido nada.

### 6.2 El límite por minuto de Groq cuando varias generáis a la vez

> ⚠️ **Superado el 23/08/2026**: Groq se retiró del todo del proyecto;
> Cloudflare (su sustituto) no limita por tokens por minuto, solo por cupo
> diario de "neuronas" (§5). Esta sección se conserva porque explica una
> lección real (cómo se mide el límite, y el fallo de los evals que causó) y
> porque **el juez de las aserciones llm-rubric de los evals sigue usando
> Groq** y sigue sujeto a este mismo límite — pero ya no describe una
> restricción de la app en producción.

El tope por **tokens por minuto** es estrecho: **8.000**, medido en vivo en
esta cuenta. Un **token** es un trozo de palabra: la unidad con la que se
mide el texto que entra y sale de la IA.

Y hay un detalle que se pasa por alto con facilidad: **ese límite cuenta el
texto de entrada MÁS el `max_tokens` que pides, se gaste o no**. No se
descuenta lo que consumes, sino lo que reservas. Como pedir mesa para diez y
que te la cobren aunque vayáis cuatro.

Generar un CV + carta reserva del orden de **7.000 de esos 8.000**. Es decir:
**por minuto cabe una generación, o dos o tres extracciones**. Si dos personas
pulsan "me interesa" en el mismo minuto, la segunda recibe un error de
"demasiadas peticiones" — justo el escenario que ocurre cuando enseñas la app
a toda la clase a la vez.

> ⚠️ Este cálculo no es solo teoría de la app: **también manda en los evals**.
> El arnés del Paso 13 estaba configurado para lanzar tres generaciones por
> minuto, es decir **21.000 tokens/minuto contra un límite de 8.000**, y por
> eso media tanda salía con errores 429 que parecían fallos de calidad.
> Corregido el 20/08/2026 con pausas de 25 s y 65 s entre casos. Si algún día
> cambias `MAX_TOKENS_GROQ_GENERACION` en `lib/ia.ts`, **hay que rehacer esa
> división** — ver `knowledge/paso-13-evals.md`.

**Mitigación**, por orden de esfuerzo (detalle en
[`05-ia.md`](05-ia.md) §6.7):

1. Reintentar automáticamente tras unos segundos (unas líneas de código) y
   mostrar el estado `generando` mientras tanto — como la spec ya exige un
   indicador de espera, la usuaria ni se entera.
2. Procesar las generaciones **en cola, de una en una**, para que dos
   personas que marcan "me interesa" a la vez no choquen entre sí.
3. Si aun así molesta: usar un modelo más pequeño para la extracción de
   palabras clave (que es tarea fácil) y reservar el grande para redactar.

### 6.3 La calidad de lo que escribe un modelo gratuito

Es el riesgo 3 de `docs/00-problema.md` ("calidad del CV generado
insuficiente") y sigue vivo. Un modelo de peso abierto redacta bien, pero
puede **inventarse experiencia que no está en el CV** — algo grave cuando
el documento va a una empresa real.

**Mitigación** — reforzada en el Paso 6, ver [`05-ia.md`](05-ia.md) §6.2
para el detalle completo:

1. **Verificación automática de cifras**: toda cifra del CV generado
   (años, porcentajes, tamaños de equipo) tiene que aparecer en el CV
   original. Comprobación con código, no con prompt.
2. **Verificación automática de empresas y titulaciones**, usando las
   listas que la extracción de perfil ya guarda en `perfiles` (§3.4). Sin
   llamadas ni coste extra.
3. Cambiar el encargo: *"reordena y reformula"* en vez de *"redacta"* —
   adaptar, no crear.
4. Instrucciones explícitas al modelo: *"usa únicamente información
   presente en el CV; no inventes empresas, fechas ni títulos"*.
5. **Probarlo con tu propio CV antes de enseñárselo a nadie.** Es la
   prueba de fuego y cuesta 10 minutos.
6. Si no da la talla: el código de las llamadas a la IA está concentrado
   en `lib/ia.ts`, así que cambiar de modelo (o de proveedor) se toca en
   **un solo archivo**. Por eso está aislado ahí desde el principio — y es
   justo lo que permitió pasar de Groq a OpenRouter en T25 sin tocar nada
   más.
7. Avisar en la propia web de que hay que revisar el documento antes de
   enviarlo. Honestidad barata que evita un disgusto.

Aun con todo esto, **el riesgo se reduce mucho pero no desaparece**: una
responsabilidad inventada que suene plausible y no lleve cifras ni nombres
propios no la caza ninguna verificación automática.

## Relacionado

- [`docs/03-spec.md`](03-spec.md) — qué hace el producto (sin tecnología).
- [`docs/02-mvp.md`](02-mvp.md) — alcance y estimación de esfuerzo.
- [`knowledge/preferencias-tecnicas-paso5.md`](../knowledge/preferencias-tecnicas-paso5.md) —
  preferencias de Mar que se aplican aquí (Gmail, IA gratuita y abierta).
- [`knowledge/decision-stack-mvp.md`](../knowledge/decision-stack-mvp.md) —
  esta decisión registrada en formato OKF.
