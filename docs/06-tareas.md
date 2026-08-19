# 06 · Tareas de implementación

> Basado en `docs/03-spec.md` (qué hace el producto), `docs/04-plan-tecnico.md`
> (con qué se construye) y `docs/05-ia.md` (qué partes usan IA). Es la lista
> de tareas del **Paso 9**: la construcción real con Claude Code.

## Cómo leer este documento

- Cada tarea cabe en **menos de una hora**.
- **"Cómo compruebo que está bien"** es algo que tú, sin programar, puedes
  hacer con tus propios ojos: abrir una página, mirar un panel, pulsar un
  botón. Cuando una tarea es puramente interna (un archivo que otro archivo
  usa por dentro, sin nada que ver todavía en pantalla), lo dice
  explícitamente y te remite a la tarea donde sí se ve el resultado.
- **"Depende de"** son las tareas que tienen que estar hechas antes.
  Hazlas en orden; saltarte una casi siempre te deja algo a medio montar.
- Marca la casilla `[ ]` → `[x]` según las vayas completando con Claude
  Code en el Paso 9.
- 76 tareas en total, agrupadas en 10 hitos. Cada hito termina con algo
  visible en pantalla — es la forma de saber que vas avanzando de verdad y
  no solo escribiendo código que no hace nada todavía.
- Al final hay un bloque extra (**T77-T80**) añadido sobre la marcha, ya
  con el Hito 5 cerrado, para la navegación entre pantallas. Lo que se
  descubre construyendo se añade al final; no se renumera lo anterior.

> ⚠️ **Regla que atraviesa todo el documento**: los workflows `Jobs` que
> ya tienes en n8n (`Jobs · ingesta`, `Jobs · generación CV`,
> `Jobs · seguimiento`, `Jobs · archivado`) son la búsqueda de empleo real
> de Mar, en producción, y **no se tocan en ninguna tarea**. Jobs App usa
> un workflow **nuevo e independiente**, `Jobs App · ingesta`, creado
> copiando el JSON del existente y adaptando solo su parte final.

## Resumen de hitos

| Hito | Qué ves al terminarlo |
| :-- | :---- |
| 0 · Entorno | Una página propia funcionando en tu ordenador (`localhost`) |
| 1 · Base de datos | Las 4 tablas creadas en Supabase, con el candado de privacidad puesto |
| 2 · Entrar | Pides acceso con tu email, recibes el enlace, entras |
| 3 · Perfil | Pegas tu CV y ves el puesto y las palabras clave que propone la IA |
| 4 · n8n → Supabase | La tabla `ofertas` se rellena sola, sin tocar la web |
| 5 · Ver ofertas | Lista de ofertas filtrada por tu perfil, con botón "me interesa" |
| 6 · Generar con IA | Al marcar "me interesa" se genera el CV y la carta |
| 7 · PDF | Descargas un documento con tu CV y tu carta, en páginas separadas |
| 8 · Aviso por email | Te llega un correo cuando hay ofertas nuevas |
| 9 · Publicar | La web tiene una dirección pública, no solo `localhost` |

---

## Hito 0 · El ordenador preparado, la web arrancando en local

**Al terminar este hito verás**: una página con tu propio texto en
`http://localhost:3000`, aunque todavía no haga nada.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T01 | Instalar Node.js si no está instalado | — (el sistema) | Ejecutar `node --version` en la terminal: aparece un número como `v20.x.x`, no un error | — | [x] |
| T02 | Crear el proyecto Next.js en esta carpeta | todo `app/`, `package.json`, config base | Ejecutar `npm run dev` y abrir `localhost:3000`: se ve la página de bienvenida de Next.js | T01 | [x] |
| T03 | Confirmar que `node_modules/` y `.env.local` están en `.gitignore` | `.gitignore` | Abrir el archivo y ver esas dos líneas | T02 | [x] |
| T04 | Sustituir la página de bienvenida por un texto propio | `app/page.tsx` | Recargar `localhost:3000`: se ve "Jobs App" en vez del logo de Next.js | T02 | [x] |
| T05 | Primer commit del proyecto Next.js | todos los nuevos | `git log` muestra un commit nuevo con esos archivos | T03, T04 | [x] |

## Hito 1 · La base de datos creada, con el candado de privacidad puesto

**Al terminar este hito verás**: en el panel de Supabase, las 4 tablas
(`perfiles`, `ofertas`, `intereses`, `generaciones`) creadas y vacías, cada
una con el icono verde de RLS activado.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T06 | Crear la cuenta y el proyecto en Supabase | — (supabase.com) | Entras con tu cuenta y ves un proyecto llamado "jobs-app" en el panel | — | [x] |
| T07 | Guardar la URL y la clave pública en `.env.local` | `.env.local` | El archivo tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` rellenas | T06 | [x] |
| T08 | Crear el archivo de conexión a Supabase | `lib/supabase/client.ts` | Interno — se verifica junto con T09 | T07 | [x] |
| T09 | Migración: tabla `perfiles` | `supabase/migrations/0001_perfiles.sql` | En Supabase → Table Editor aparece `perfiles` con sus columnas | T08 | [x] |
| T10 | Migración: tabla `ofertas`, única por `fuente`+`id_externo` | `supabase/migrations/0002_ofertas.sql` | Aparece `ofertas`; intentar insertar dos filas con el mismo `fuente`+`id_externo` da error | T08 | [x] |
| T11 | Migración: tabla `intereses` | `supabase/migrations/0003_intereses.sql` | Aparece `intereses` en Table Editor | T09, T10 | [x] |
| T12 | Migración: tabla `generaciones` | `supabase/migrations/0004_generaciones.sql` | Aparece `generaciones` en Table Editor | T11 | [x] |
| T13 | Activar RLS: "cada una ve solo lo suyo" en `perfiles`, `intereses`, `generaciones` | `supabase/migrations/0005_rls_privacidad.sql` | Las 3 tablas muestran el icono verde "RLS enabled" | T09, T11, T12 | [x] |
| T14 | RLS en `ofertas`: lectura para todas, escritura para nadie desde la web | `supabase/migrations/0006_rls_ofertas.sql` | Mismo icono verde en `ofertas`; una escritura de prueba desde el navegador da error de permiso | T10 | [x] |

## Hito 2 · Entrar con el enlace de email

**Al terminar este hito verás**: pides acceso con tu email, te llega un
correo, pinchas el enlace y aparece una pantalla que te reconoce.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T15 | Activar el envío de emails por Gmail en Supabase Auth | — (panel de Supabase) | Authentication → SMTP Settings muestra los datos de Gmail y "conexión correcta" | T06 | [x] |
| T16 | ~~Configurar~~ Comprobar la caducidad de sesión por inactividad (regla 9) — bloqueada por el plan gratuito, ver `knowledge/decision-caducidad-sesion.md` | — (panel de Supabase) | Authentication → Sessions muestra "Inactivity timeout" en `0 / never` (límite del plan Free) y la limitación queda anotada en `docs/03-spec.md` §5.9 | T15 | [x] |
| T17 | Crear la página para pedir acceso | `app/page.tsx` | En `localhost:3000` hay una caja para el email y un botón "Entrar" | T04 | [x] |
| T18 | Conectar el botón "Entrar" al envío del enlace | `app/page.tsx` | Escribes tu email, pulsas "Entrar", y te llega un correo con un enlace | T16, T17 | [x] |
| T19 | Crear la página que recibe el enlace | `app/auth/callback/route.ts` | Pinchas el enlace del correo y no da error 404 | T18 | [x] |
| T20 | Pantalla provisional "ya has entrado" | `app/perfil/page.tsx` (versión mínima) | Tras pinchar el enlace, ves un texto con tu email | T19 | [x] |
| T21 | Comprobar que la sesión persiste al cerrar el navegador | — (prueba manual) | Cierras la pestaña, la reabres en `/perfil`, sigues dentro sin pedir el enlace otra vez | T20 | [x] |
| T22 | Probar un enlace ya usado o caducado | — (prueba manual) | Usas el mismo enlace dos veces: la segunda ves un mensaje claro de caducado, no una pantalla en blanco | T19 | [x] |

## Hito 3 · Contar tu perfil: el CV y las palabras clave que propone la IA

**Al terminar este hito verás**: pegas tu CV, esperas unos segundos y ves un
puesto y una lista de palabras clave ya propuestos, que puedes editar y
guardar.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T23 | Crear la cuenta en Groq y guardar la clave | `.env.local` | El archivo tiene `GROQ_API_KEY` rellena | T07 | [x] |
| T24 | Activar Zero Data Retention en Groq | — (panel de Groq) | Data Controls muestra la opción activada | T23 | [x] |
| T25 | Escribir la función que llama al modelo de IA (OpenRouter) para extraer perfil | `lib/ia.ts` | Interno — se verifica junto con T29 | T24 | [x] |
| T26 | Definir el esquema de salida (puesto, palabras_clave, empresas_cv, titulos_cv) | `lib/ia.ts` | Interno — se verifica junto con T29 | T25 | [x] |
| T27 | Crear el endpoint que recibe el CV y llama al modelo de IA | `app/api/extraer-perfil/route.ts` | Interno — se verifica junto con T29 | T26 | [x] |
| T28 | Construir la pantalla de perfil: caja de texto y botón "Continuar" | `app/perfil/page.tsx` | Se ve una caja de texto grande y un botón | T20 | [x] |
| T29 | Conectar el botón al endpoint y mostrar los resultados, editables | `app/perfil/page.tsx` | Pegas tu CV real, pulsas "Continuar" y en segundos ves puesto + palabras clave que puedes borrar o añadir | T27, T28 | [x] |
| T30 | ~~Añadir años de experiencia y~~ la casilla "tener en cuenta mi CV" (años de experiencia retirado, ver `knowledge/hito-3-perfil.md`) | `app/perfil/page.tsx` | Ves una casilla junto a la propuesta de la IA | T29 | [x] |
| T31 | Guardar el perfil al pulsar "Guardar" | `app/perfil/page.tsx`, `app/api/perfil/route.ts` | Pulsas "Guardar", recargas la página y ves los mismos datos que guardaste | T30, T13 | [x] |

## Hito 4 · Un workflow nuevo de n8n alimenta la base de datos de ofertas

> ⚠️ **Los workflows `Jobs` actuales NO se tocan.** `Jobs · ingesta`,
> `Jobs · generación CV`, `Jobs · seguimiento` y `Jobs · archivado` son la
> búsqueda de empleo real de Mar, en producción. Se queda todo como está.
>
> Lo que se hace es **exportar el JSON de `Jobs · ingesta`, importarlo como
> workflow nuevo** llamado `Jobs App · ingesta`, y adaptar solo su parte
> final. Las 11 fuentes de ofertas y sus normalizadores vienen ya hechos en
> la copia: el trabajo real es cambiar dónde escribe. Estimado: ~30 minutos.

**Al terminar este hito verás**: en Supabase, la tabla `ofertas` tiene filas
reales, sin haber tocado la web ni ninguno de tus workflows actuales.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T32 | Añadir credenciales de Supabase en n8n | — (n8n → Credentials) | La credencial nueva existe y "Probar conexión" da correcto | T10 | [x] |
| T33 | Exportar el JSON de `Jobs · ingesta` e importarlo como workflow nuevo `Jobs App · ingesta`, **desactivado** | — (n8n) | En la lista de workflows aparecen los dos por separado; el nuevo está inactivo y el original sigue activo e intacto | — | [x] |
| T34 | Quitar del workflow nuevo todo lo que no sea ingesta (archivado, escritura en Google Sheets) | workflow `Jobs App · ingesta` | El lienzo del workflow nuevo ya no tiene nodos de Google Sheets | T33 | [x] |
| T35 | Sustituir la salida por un nodo que escriba cada oferta en Supabase | workflow `Jobs App · ingesta` | Ejecución manual de prueba: aparecen filas nuevas en Table Editor → `ofertas` | T32, T34 | [x] |
| T36 | Confirmar que las ofertas duplicadas no se insertan dos veces | mismo nodo | Ejecutas el workflow nuevo dos veces seguidas y el número de filas no se duplica | T35 | [x] |
| T37 | Añadir un paso de borrado de datos con más de 30 días (regla 10) | workflow `Jobs App · ingesta` | Insertas una fila de prueba con fecha antigua y, tras ejecutar ese paso, ha desaparecido | T35 | [x] |
| T38 | Poner su propio Schedule Trigger a las 13:00 y su propio vigilante de Healthchecks | workflow `Jobs App · ingesta` | El workflow nuevo tiene su check propio en Healthchecks, distinto del de `Jobs · ingesta` | T37 | [x] |
| T39 | Activar y publicar el workflow nuevo | — (n8n) | `Jobs App · ingesta` aparece "Activo"; `Jobs · ingesta` sigue activo y sin cambios | T38 | [x] |
| T40 | ~~Insertar ofertas de prueba a mano~~, innecesario: las pruebas de T36/T38 ya dejaron 20 filas reales en `ofertas` (Adzuna, Himalayas, Jooble, Get on Board, We Work Remotely, RemotoJob, Jobicy) | — (Supabase Table Editor) | La tabla `ofertas` ya tiene filas con las que probar el Hito 5 | T10 | [x] |

## Hito 5 · Ver ofertas y marcar "me interesa"

**Al terminar este hito verás**: entras en `/ofertas`, ves una lista
filtrada por tu perfil, y puedes marcar una oferta como "me interesa".

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T41 | Crear la pantalla de ofertas | `app/ofertas/page.tsx` | Se abre `localhost:3000/ofertas` sin error, aunque esté vacía | T20 | [x] |
| T42 | Consultar las ofertas que coinciden con puesto/palabras clave del perfil | `app/api/ofertas/route.ts` | Con las ofertas de prueba (T40), ves en pantalla solo las que coinciden con tu perfil guardado | T31, T40 | [x] |
| T43 | Mostrar título, empresa y enlace en tarjetas | `components/TarjetaOferta.tsx` | Cada oferta se ve como una tarjeta legible, no como texto plano | T42 | [x] |
| T44 | Mensaje de "no hay ofertas que coincidan" con la lista vacía | `app/ofertas/page.tsx` | Cambias tus palabras clave a algo que no coincide con nada y ves el mensaje, no una pantalla en blanco | T42 | [x] |
| T45 | Añadir el botón "me interesa" en cada tarjeta | `components/TarjetaOferta.tsx` | Cada tarjeta muestra el botón | T43 | [x] |
| T46 | Guardar el interés al pulsar el botón | `app/api/interes/route.ts` | Pulsas el botón, recargas la página y sigue marcado como pulsado | T45, T13 | [x] |
| T47 | Impedir marcar la misma oferta dos veces | `app/api/interes/route.ts` | Pulsas el botón dos veces seguidas: no hay duplicado ni error visible | T46, T11 | [x] |

## Hito 6 · Generar el CV y la carta con IA

**Al terminar este hito verás**: al marcar "me interesa" aparece un
indicador de "generando…" y, poco después, el botón de descargar se
activa solo.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T48 | Definir el esquema de salida de generación (cv_texto, carta_texto) | `lib/ia.ts` | Interno — se verifica junto con T52 | T26 | [x] |
| T49 | Detectar el idioma de la oferta con código, no con IA (§6.5 de `05-ia.md`) | `lib/idioma.ts` | Interno — se verifica junto con T52. **Sin librería externa** (decisión de Mar): cuenta palabras muy frecuentes del castellano y del inglés | — | [x] |
| T50 | Escribir el prompt de generación: "reordena y reformula", no "redacta" | `lib/ia.ts` | Interno — se verifica junto con T52 | T48, T49 | [x] |
| T51 | Crear el endpoint que dispara la generación | `app/api/generar/route.ts` | Interno — se verifica junto con T52 | T50, T12 | [x] |
| T52 | Conectar "me interesa" a la generación, estado `generando` | `app/api/interes/route.ts`, `app/api/generar/route.ts` | Comprobado con una oferta real: al pulsar sale "Te interesa ✓" y "Preparando tu CV y tu carta…" al instante | T46, T51 | [x] |
| T53 | Guardar el resultado y pasar a estado `listo` | `app/api/generar/route.ts` | Comprobado: a los ~25 s la tarjeta pasa sola a "CV y carta preparados ✓", y sigue así al recargar | T52 | [x] |
| T54 | Verificación automática: las cifras del CV generado deben estar en el original | `lib/verificarCv.ts` | Comprobado sobre un CV real: 0 avisos falsos; con una cifra inventada a mano ("equipo de 47"), la caza | T53 | [x] |
| T55 | Verificación automática: las empresas del CV generado deben estar en `empresas_cv` | `lib/verificarCv.ts` | Mismo tipo de prueba: con una empresa inventada a mano ("Zumbatrónica Ibérica"), la caza | T54, T29 | [x] |
| T56 | Poner el límite de 5 generaciones al día (regla 5) | `app/api/generar/route.ts`, `lib/generaciones.ts` | Comprobado con el cupo lleno: la sexta muestra "Has llegado al máximo de 5 documentos por hoy…", el interés se guarda igual | T53 | [x] |
| T57 | Manejar el fallo del modelo de IA: reintento + rotación entre modelos gratis + cola + estado `error` | `lib/ia.ts`, `components/TarjetaOferta.tsx`, `lib/cola.ts` | Comprobado en vivo (los modelos primarios estaban saturados): rota entre modelos, reintenta desde el navegador con espera creciente y acaba en "error" con mensaje y botón de reintentar | T53 | [x] |

> **Cambios respecto a lo planeado**, salidos de probarlo en vivo:
> - **La cola y los reintentos viven en el navegador**, no en el servidor
>   (`lib/cola.ts` y `components/TarjetaOferta.tsx`). Una función de Vercel se
>   corta a los 60 segundos: reintentar dentro de la misma petición se comía el
>   tiempo y dejaba a la usuaria sin ni siquiera un error claro. Desde el
>   navegador, cada intento es una petición nueva con su minuto entero.
> - **Los modelos se llaman en dos rondas** (`lib/ia.ts`): primero dos, y solo
>   si ninguno responde, los otros tres. La lista se renovó tras comprobar en
>   vivo que los dos modelos primarios de T25 llevan días devolviendo 429.
>   Detalle en `knowledge/decision-modelo-ia.md`.
> - **Migración `0008`**: dos columnas nuevas en `generaciones` (`iniciado_en`,
>   que hace de cerrojo para no preparar dos veces lo mismo, y `avisos`, para
>   el resultado de T54-T55).

## Hito 7 · Descargar el documento en PDF

**Al terminar este hito verás**: pulsas "Descargar" y se abre un PDF con tu
CV en la primera página y la carta empezando en una página nueva.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T58 | Crear la plantilla del PDF, diseño sobrio | `lib/pdf.tsx` | Interno — se verifica junto con T60 | — | [x] |
| T59 | Forzar que la carta empiece en página nueva (historia C4) | `lib/pdf.tsx` | Interno — se verifica junto con T60 | T58 | [x] |
| T60 | Crear el endpoint de descarga | `app/api/descargar/[id]/route.ts` | Con una generación en estado "listo", entras a la URL de descarga y se abre un PDF sin error | T53, T59 | [x] |
| T61 | Botón "Descargar", desactivado hasta que esté listo | `components/TarjetaOferta.tsx` | Con estado "generando" el botón está gris; en "listo" se activa | T60, T53 | [x] |
| T62 | Revisión visual del PDF con tu propio CV real | — (prueba manual) | Lees el PDF entero y confirmas que no hay ninguna experiencia inventada | T61 | [x] |

## Hito 8 · Aviso por email cuando hay ofertas nuevas

**Al terminar este hito verás**: al día siguiente de una ingesta con
ofertas nuevas, te llega un correo con un enlace de vuelta a la app.

> Todo este hito ocurre dentro de `Jobs App · ingesta`, el workflow nuevo
> del Hito 4. Los workflows `Jobs` originales **siguen sin tocarse**.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T63 | Contar cuántas ofertas nuevas entraron hoy | `Jobs App · ingesta` | En una ejecución de prueba, ese paso muestra un número | T36 | [x] |
| T64 | Consultar en Supabase qué usuarias tienen perfil guardado | `Jobs App · ingesta` | La ejecución de prueba devuelve tu email si ya tienes perfil guardado | T32, T31 | [x] |
| T65 | Condicional: seguir solo si hay ofertas nuevas Y hay usuarias con perfil (regla 8) | `Jobs App · ingesta` | Con 0 ofertas nuevas, el flujo no llega al paso de enviar el email | T63, T64 | [x] |
| T66 | Redactar la plantilla fija del email de aviso, en castellano | `Jobs App · ingesta` (nodo Gmail) | El nodo Gmail muestra asunto y cuerpo ya escritos, con el hueco del enlace | T65 | [x] |
| T67 | Enviar el email a cada usuaria con perfil | `Jobs App · ingesta` | Ejecutas el flujo a mano una vez y te llega el correo de aviso | T66 | [x] |
| T68 | Publicar el workflow y esperar la ejecución real de las 13:00 | — (n8n) | Al día siguiente, si hubo ofertas nuevas, revisas tu bandeja y el aviso ha llegado | T67 | [ ] |

## Hito 9 · Publicar en internet

**Al terminar este hito verás**: la web tiene una dirección pública de
verdad, ya no solo `localhost`.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T69 | Repasar que toda la interfaz, mensajes de error y el email están en castellano | — (prueba manual) | Recorres cada pantalla y no encuentras ningún texto en otro idioma | T62, T68 | [x] |
| T70 | Probar los casos límite de la spec uno por uno | — (prueba manual) | Provocas cada caso (email inválido, sin ofertas que coincidan, límite diario alcanzado a mitad de sesión, descargar antes de tiempo) y el mensaje que aparece es el que describe `docs/03-spec.md` §6 | T69 | [x] |
| T71 | ⚠️ Pedir tu permiso explícito antes de subir nada a GitHub | — | Confirmación tuya, por escrito, antes de continuar | T70 | [x] |
| T72 | Revisar que `.env.local` no está entre los archivos a subir | `.gitignore` | `git status` no muestra `.env.local` en la lista de cambios | T71 | [x] |
| T73 | Crear el repositorio en GitHub y subir el código, **privado** (confirmado en T71) | — | Recargas la página del repositorio en GitHub y ves los archivos | T72 | [x] |
| T74 | Conectar el repositorio a Vercel | — | En el panel de Vercel, el proyecto aparece enlazado a tu repositorio | T73 | [x] |
| T75 | Añadir las claves secretas en Vercel (5, ver nota de abajo) | — (panel de Vercel) | Environment Variables muestra las 5 claves, sin verlas en ningún archivo del repositorio | T74 | [x] |
| T76 | Primer despliegue y prueba completa en la dirección pública | — | Desde el móvil (no el ordenador donde programaste), pides acceso, entras y completas el recorrido entero hasta descargar un PDF | T75 | [x] |

> ⚠️ **Nota para cuando se haga T75** (19/08/2026): la tabla de claves de
> `docs/04-plan-tecnico.md` §4 quedó desactualizada tras el cambio de
> proveedor de IA (Groq → OpenRouter, T25, `knowledge/decision-modelo-ia.md`)
> y el respaldo añadido después (`knowledge/decision-respaldo-groq.md`). Las
> claves de IA que hay que añadir en Vercel en T75 son, en realidad,
> **`OPENROUTER_API_KEY`** (primaria) **y `GROQ_API_KEY`** (respaldo, ya
> existe en `.env.local` desde T23) — no solo `GROQ_API_KEY` como dice la
> tabla. Sin la segunda, el respaldo no funciona en producción aunque
> funcione en local. No se toca la tabla de `docs/04-plan-tecnico.md`
> (documento del Paso 5, congelado): esta nota vive aquí, junto a la tarea
> que de verdad se ejecuta.

## Añadido después del Hito 5 · Navegación y un agujero de seguridad

> Estas tareas **no estaban en el plan original de 76**. Salieron al probar
> la web con el Hito 5 ya cerrado: las pantallas funcionaban una por una,
> pero estaban incomunicadas entre sí — la única forma de llegar a
> `/ofertas` era escribir la dirección a mano (T77-T80). Revisando ese
> trabajo apareció además **T81**, que no es de navegación: el endpoint que
> llama a la IA no comprobaba quién lo llamaba. Se numeran a continuación
> de T76 para no renumerar nada de lo ya hecho. Historia A4 de
> `docs/01-historias.md`; detalle en `knowledge/mejora-navegacion.md`.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T77 | Menú permanente con "Ofertas", "Mi perfil", tu email y "Salir" | `components/MenuNavegacion.tsx`, `app/layout.tsx` | En `/perfil` y `/ofertas` ves la barra arriba, y la pantalla en la que estás sale subrayada. En la pantalla de acceso (`/`), antes de entrar, **no** aparece | T41 | [x] |
| T78 | Cerrar sesión de verdad al pulsar "Salir" | `app/auth/salir/route.ts` | Pulsas "Salir": vuelves a la pantalla de acceso y, si escribes `/perfil` a mano, te devuelve allí. Para volver a entrar hace falta un enlace nuevo del email | T77 | [x] |
| T79 | Entrar por el enlace del email aterriza donde toca | `app/auth/callback/route.ts` | Con perfil ya guardado, el enlace del email te lleva directa a `/ofertas`; sin perfil todavía, a `/perfil` | T31, T42 | [x] |
| T80 | Guía de dos pasos y salida clara del perfil | `components/GuiaPasos.tsx`, `components/FormularioPerfil.tsx`, `app/perfil/page.tsx`, `app/ofertas/page.tsx` | Sin perfil guardado ves "1. Pega tu CV → 2. Mira tus ofertas" y desaparece al guardarlo; al pulsar "Guardar" sale "Perfil guardado. Ver mis ofertas →" y el enlace funciona | T77, T31 | [x] |
| T81 | ⚠️ Exigir sesión para analizar el CV con la IA | `app/api/extraer-perfil/route.ts` | Era el único endpoint sin comprobar quién llama: cualquiera con la URL podía gastar la cuota de OpenRouter. Comprobado que sin sesión responde "No has iniciado sesión" y que con sesión el botón "Analizar con la IA" sigue funcionando igual | T23 | [x] |

## Añadido durante el Hito 7 · El nombre en el perfil y el rediseño del PDF

> Tampoco estaban en el plan original. Salieron de la revisión visual de
> T62: el primer diseño del PDF (T58-T59) le pareció a Mar pobre e
> impresentable. Pidió uno elegante y a prueba de ATS, inspirado en una
> plantilla de referencia. Revisando eso apareció **T82**, que no es de
> diseño: un CV a prueba de ATS necesita el nombre real de la candidata
> arriba, y el perfil no lo guardaba en ningún sitio — solo el email de la
> cuenta. Se numeran a continuación de T81 para no renumerar nada de lo ya
> hecho. Detalle en `knowledge/decision-diseno-pdf.md`.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T82 | Añadir el nombre completo al perfil | `supabase/migrations/0009_perfiles_nombre.sql`, `components/FormularioPerfil.tsx`, `app/api/perfil/route.ts`, `app/perfil/page.tsx` | En `/perfil` escribes tu nombre completo, guardas, recargas la página y sigue ahí | T31 | [x] |
| T83 | Rediseño elegante del PDF, a prueba de ATS | `lib/pdf.tsx`, `app/api/descargar/[id]/route.ts`, `public/fonts/` | Descargas un CV: tu nombre arriba en una tipografía elegante, el puesto y tu email debajo, secciones en mayúsculas espaciadas con una línea fina, viñetas finas — todo en una sola columna de lectura (nada de texto girado ni columnas paralelas, para que un lector automático no lo desordene) | T82, T60 | [x] |

## Relacionado

- [`docs/03-spec.md`](03-spec.md) — qué hace el producto; cada regla de
  negocio está cubierta por al menos una tarea de este documento.
- [`docs/04-plan-tecnico.md`](04-plan-tecnico.md) — con qué se construye
  cada pieza.
- [`docs/05-ia.md`](05-ia.md) — el detalle de las verificaciones de IA de
  T54, T55 y T57.
- `Docker n8n/knowledge/workflows/jobs/` — la documentación de los
  workflows originales que **no se tocan**, y de donde sale el JSON que se
  copia en T33.
