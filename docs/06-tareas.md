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

## Añadido el 23/08/2026 · Rediseño de perfil, sugerencias y caducidad de ofertas

> A petición de Mar tras usar la app: el formulario de perfil pedía datos que
> ya suelen venir en el CV pegado (teléfono, LinkedIn), solo dejaba elegir un
> puesto y las palabras clave no tenían autocompletado; las ofertas, además,
> no tenían ningún límite de tiempo visible. **Esto revierte una frase de
> `docs/03-spec.md` §8 ("Fuera de alcance")**, que excluía explícitamente
> "varios puestos a la vez en un mismo perfil" — T92 actualiza la spec para
> que dependa de la construcción, no al revés. Decisiones preguntadas y
> confirmadas por Mar el 23/08/2026 (mantener el nombre a mano, no la IA;
> sugerir 3-5 puestos con la IA; autocompletado de palabras clave con lista
> ampliada por la IA; las ofertas caducan a los 15 días de verdad). Se
> numeran a continuación de T83 para no renumerar nada de lo ya hecho.

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T84 | Quitar teléfono y LinkedIn del perfil (se mantiene el nombre, a mano) | `supabase/migrations/0016_quitar_contacto.sql`, `components/FormularioPerfil.tsx`, `app/api/perfil/route.ts`, `lib/pdf.tsx` | En `/perfil` ya no ves esos dos campos; el PDF descargado ya no los muestra, solo nombre y email | T82 | [x] |
| T85 | Las ofertas caducan a los 15 días y se agrupan por fecha con separador visual | `app/api/ofertas/route.ts`, `app/ofertas/page.tsx`, `lib/fechas.ts` | En `/ofertas` ves las más recientes arriba, un separador con la fecha cada vez que cambia el día de ingesta, y una oferta encontrada hace más de 15 días ya no aparece aunque siga coincidiendo con tu perfil | T44 | [x] |
| T86 | La IA amplía la lista de palabras clave sugeridas (para el autocompletado) | `lib/ia.ts`, `evals/golden.yaml`, `prompts/system.md` | Al analizar un CV, la respuesta trae, además de las palabras clave de siempre, una lista más amplia de sugerencias relacionadas | T31 | [x] |
| T87 | Autocompletado real en el campo "Añadir palabra clave" | `components/FormularioPerfil.tsx` | Mientras escribes ahí ves una lista desplegable con sugerencias de T86 que puedes pulsar en vez de escribir la palabra entera | T86 | [x] |
| T88 | La IA sugiere varios puestos posibles, no solo uno | `lib/ia.ts`, `evals/golden.yaml`, `prompts/system.md` | El análisis del CV devuelve entre 3 y 5 puestos posibles, además de mantener el puesto principal de siempre | T31 | [x] |
| T89 | Migrar el perfil a varios puestos seleccionados a la vez | `supabase/migrations/0017_perfiles_puestos.sql`, `app/api/perfil/route.ts`, `app/api/ofertas/route.ts`, `app/api/generar/route.ts` | Guardas el perfil con más de un puesto marcado; las ofertas que aparecen coinciden con cualquiera de ellos | T88 | [x] |
| T90 | Casillas + barra libre para elegir puestos en el formulario | `components/FormularioPerfil.tsx` | Tras analizar el CV ves varias casillas con los puestos sugeridos (el principal ya marcado) y una barra para escribir puestos propios y añadirlos | T89 | [x] |
| T91 | Relanzar los evals tras los cambios de prompt/esquema de T86 y T88 | — | `npm run evals` sigue por encima de los umbrales de `evals/umbrales.json` | T86, T88 | [x] |
| T92 | Actualizar `docs/03-spec.md` y `docs/02-mvp.md` con el nuevo alcance | `docs/03-spec.md`, `docs/02-mvp.md` | §8 de la spec ya no excluye varios puestos a la vez; §4 y §5 describen el perfil y las ofertas tal como quedan | T84-T90 | [x] |

## Añadido el 23/08/2026 (quinquies) · Botón "Rehacer" el CV y la carta

> A petición de Mar: tras descargar el CV y la carta de una oferta, poder
> pedir que la IA los redacte otra vez con una instrucción propia ("más
> profesional", "más conciso"). Excepción explícita a la regla de negocio 7
> (documento definitivo). Pregunta explícita antes de construir: ¿"Rehacer"
> gasta el cupo diario de 5 documentos, o queda aparte? Elegido con Mar:
> límite propio (2 por documento), sin tocar el cupo diario. Detalle en
> [`knowledge/decision-rehacer-cv-carta.md`](../knowledge/decision-rehacer-cv-carta.md).

| # | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :---- | :---- | :---- | :-- | :-: |
| T93 | Botón "Rehacer" junto a "Descargar", con ventana emergente para pedir un cambio | `supabase/migrations/0018_generaciones_rehechos.sql`, `lib/generaciones.ts`, `lib/ia.ts`, `app/api/rehacer/route.ts`, `app/api/ofertas/route.ts`, `components/TarjetaOferta.tsx` | Con un documento listo, pulsas "Rehacer", escribes qué cambiar y el documento se redacta otra vez sin tocar el contador de los 5 al día; al llegar a 2 rehechos, el botón se deshabilita y lo explica | T57 | [x] |

> ⚠️ **Evals relanzados el 23/08/2026: veredicto ROJO — no publicable.** No lo
> causó este cambio (el camino sin instrucciones de la usuaria queda byte a
> byte igual que antes); revela que `generarCvYCarta` con Cloudflare nunca se
> había comprobado contra el golden dataset completo. 8 fallos de contenido
> reales, el más grave una invención total de una sección de formación sin
> ningún respaldo en el CV original, y dos inyecciones que colaron cifras
> infladas y datos de contacto falsos. Detalle caso a caso en
> [`knowledge/paso-13-evals.md`](../knowledge/paso-13-evals.md). Bloquea
> publicar cualquier cambio de `lib/ia.ts`, no solo T93 — ver **T94**, primera
> tarea del bloque de prioridades de más abajo.

## Pendientes para cerrar el MVP — orden de prioridad (24/08/2026)

> La clase vuelve el lunes 24/08/2026 y con ella las cinco usuarias reales.
> Este bloque junta, en un solo sitio y en el orden en que hay que
> atacarlos, todo lo que antes vivía disperso en dos bloques de "pendientes
> sueltos" (23/08 bis y ter) más el aviso que cerraba T93. Se numeran ya
> como tareas porque ahora sí hay un plan concreto que ejecutar — la razón
> por la que antes se dejaron sin número.

| # | Prioridad | Tarea | Archivos | Cómo compruebo que está bien | Depende de | |
| :-- | :-- | :---- | :---- | :---- | :-- | :-: |
| T94 | 1 · Crítica | Arreglar la causa del ROJO de `generarCvYCarta` en Cloudflare — decidido con Mar: reforzar el prompt (invención de secciones, inyección colando datos falsos) **y** flexibilizar `LARGO_MINIMO_CV` (CVs de entrada muy cortos) a la vez | `lib/ia.ts`, `prompts/system.md` | Interno — el refuerzo del prompt ya estaba escrito; `LARGO_MINIMO_CV_ABSOLUTO`/`largoMinimoCv` implementados, tipos limpios, 275/275 pruebas en verde. Se confirma de verdad en T95 | T93 | [x] |
| T95 | 2 · Crítica | Relanzar `npm run evals` completo (las dos llamadas) y confirmar que la puerta ya no da ROJO. **2 intentos el 24/08, los dos NO CONCLUYENTE** (local, y el del robot al publicar) — timeout de Cloudflare en `generarCvYCarta` los dos cupos (Cloudflare y OpenRouter) quedaron agotados por las propias pruebas de hoy. Un dato suelto en el 2º intento (B08, 110 caracteres) apunta a que puede haber algo más que solo cuota — vigilar. **Repetir mañana temprano**, cuota fresca, antes de avisar a la clase | `evals/` | `npm run evals:puerta` sobre el resultado nuevo da VERDE (o al menos ya no las mismas señales de contenido) | T94, T102, T103 | [ ] |
| T96 | 3 · Alta | Comprobar que la instancia de n8n está encendida y fiable para el disparador de las 13:00 de mañana (lleva 3 días sin correr — 21, 22 y 23/08 — ver `knowledge/arreglo-ingesta-duplicado-bloqueaba-lote.md`) | — (infraestructura, decisión de Mar) | Activado "Start Docker Desktop when you sign in" en Docker Desktop → Settings → General | — | [x] |
| T97 | 4 · Alta | Commitear el trabajo de T84-T93, todavía sin commitear en local | todos los pendientes de `git status` | `git log` muestra los commits nuevos | T95 | [x] |
| T98 | 5 · Media | Añadir `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` como secretos en GitHub (Settings → Secrets and variables → Actions) | — | `gh secret list` los muestra junto a `GROQ_API_KEY`, `OPENROUTER_API_KEY` y `VERCEL_TOKEN` | T97 | [x] |
| T99 | 6 · Media | Añadir las mismas 2 variables en Vercel (Settings → Environment Variables) — a mano, la CLI no tiene sesión iniciada y las variables son *Sensitive* (nota de T75, `CLAUDE.md`) | — | Producción usa Cloudflare como principal, no cae a OpenRouter en silencio | T97 | [x] |
| T100 | 7 · Media | Probar en una rama y su vista previa antes de publicar a `master` (regla de `CLAUDE.md`) | — | Hecho por primera vez el 25/08 con la rama `arregla-ofertas-tapadas-25-08`: vista previa protegida verificada por Mar antes de fusionar | T98, T99 | [x] |
| T101 | 8 · Media | Publicar a `master`, con tu permiso explícito. **Primer intento (24/08, mañana)**: push directo, sin pasar por T100 — el robot bloqueó el despliegue por NO CONCLUYENTE (ver T95). **Segundo intento (24/08, ~13:30)**: incidente real en producción (`perfiles.puesto` borrado por la migración 0017, ver `knowledge/incidente-esquema-desajuste-24-08.md`) — Mar decide publicar con `[sin evals]` en vez de esperar a mañana. Robot en verde, desplegado | — | La URL pública sirve la versión nueva — confirmar entrando por el enlace del email | T95 | [x] |
| T102 | Descubierta el 24/08 (P1) | Sacar `nvidia/nemotron-3-super-120b-a12b:free` de `RONDAS_MODELOS`: llevaba devolviendo 404 desde antes del 23/08, una de las dos tiradas de respaldo en paralelo siempre fallaba por nada | `lib/ia.ts` | Tipos limpios, 275/275 pruebas en verde. Se confirma de verdad con T95 | — | [x] |
| T103 | Descubierta el 24/08 (P2) | Subir `TIMEOUT_CLOUDFLARE_GENERACION_MS` de 26 a 34 s — cobertura de bajo coste, no arreglo confirmado (el 100% de fallos de hoy apunta más a cupo agotado que a latencia) | `lib/ia.ts` | Tipos limpios, 275/275 pruebas en verde. Se confirma de verdad con T95 | — | [x] |
| T104 | Descubierta el 24/08 (P4) | Calcular el presupuesto de neuronas de Cloudflare para un día real con las 5 usuarias | — (cálculo, documentado) | Típico ~3.650/10.000 (margen de sobra), peor caso absoluto ~10.450/10.000 (roza el límite) — detalle en `knowledge/arreglo-puerta-motivo-real.md` | — | [x] |
| T105 | Descubierta el 25/08 | Arreglar `/ofertas`, que tapaba las ofertas de días anteriores (todavía válidas por la caducidad de 15 días de T85) hasta que corría la ingesta de las 13:00 — regresión del Hito 5, anterior a T85 | `app/ofertas/page.tsx` | Entrando por la mañana ves las ofertas de días anteriores en vez de "Todavía no se ha actualizado la lista de ofertas de hoy" — confirmado en vista previa con 8 ofertas reales | T85 | [x] |
| T106 | Pedida por Mar el 25/08 | Al entrar por el enlace del email, quien no tiene perfil va a `/perfil` y quien sí lo tiene a `/ofertas` — el callback de login ya lo hacía (`docs/03-spec.md` §3.2), pero el enlace del email entra directo a `/ofertas` sin pasar por él | `app/ofertas/page.tsx` | Una usuaria nueva que pincha el enlace del email aterriza en el formulario de perfil, no en una pantalla de ofertas vacía | T105 | [x] |
| T107 | Descubierta el 25/08 al verificar T100 | Permitir que las vistas previas de Vercel inicien sesión: Supabase Auth solo admitía producción y `localhost`, y cada vista previa estrena URL — al no coincidir, caía en silencio a producción. Sin esto, la regla de probar en vista previa era imposible de cumplir para cualquier pantalla con sesión | — (Supabase Auth → URL Configuration, a mano) | Añadida la Redirect URL `https://jobs-*-mcaparrosgu-4812s-projects.vercel.app/**`; verificado en vivo entrando por el enlace del email a la vista previa | T100 | [x] |

> **26/08 · T114 medida y cerrada como diagnóstico.** La sospecha (latencia
> del runner de GitHub) era falsa: los timeouts pasan igual en local, y los
> casos que fallan no son lentos sino que **se desbocan** hasta un 408 a los
> 180 s. Subir el corte a 44 s no habría salvado ninguno. Además, el "sin
> evaluar" se cuenta **por aserción**: ~4 casos de 13 bastan para cruzar el
> umbral del 25 % y tumbar la tanda. Detalle en
> `knowledge/medicion-t114-desbocamiento.md`.
>
> Decisión de Mar el 26/08: **desbloquear producción primero**. El arreglo de
> T109, verificado a mano de extremo a extremo, se publica sin esperar a un
> veredicto de la puerta; la calidad (**T113**, el desbocamiento del prompt en
> casos adversariales) se arregla después, sin la app rota de por medio.
>
> Historia previa: T108 la hizo Mar y las ofertas ya se ven; T109 se arregló
> en dos vueltas (el modelo razonaba 58 s; después, el propio ajuste del
> prompt desbocaba al modelo). Detalle en
> `knowledge/incidente-gemma4-razonamiento-t109.md`; el planteamiento
> original, en `knowledge/pendiente-generacion-cv-falla-25-08.md`.

| Tarea | Prioridad | Qué hay que hacer | Dónde | Cómo se comprueba | Depende de | Hecha |
|---|---|---|---|---|---|---|
| T108 | 1 · Crítica (rápida) | Aplicar la migración `0018_generaciones_rehechos.sql`, escrita en el repo pero **nunca ejecutada en Supabase**. Sin la columna `rehechos`, la consulta de `generaciones` falla entera y el código la degrada en silencio: **los CVs ya generados son invisibles** y no se pueden descargar | Supabase SQL Editor (a mano, en una línea) | `/ofertas` muestra "CV y carta preparados ✓" con Descargar y Rehacer en las 6 ofertas que Mar ya tenía generadas. **Hecha por Mar el 25/08**: las ofertas y los CVs ya generados se ven | — | [x] |
| T109 | 2 · Crítica | **Arreglado el 25/08.** La generación fallaba al 100% porque `@cf/google/gemma-4-26b-a4b-it` es un modelo **de razonamiento**: tarda **58,5 s** con el prompt real (medido sin el corte de espera), muy por encima del corte de 34 s y del máximo de 60 s de Vercel — no podía funcionar nunca. La teoría del 24/08 (cupo agotado) era falsa; `metricas_ia` lo enseñaba con 6 fallos clavados en ~36,3 s = 34 s de corte + 2 s del respaldo. Arreglo elegido con Mar: vuelta a `mistral-small-3.1-24b-instruct` (16,7 s), corte de Cloudflare 34 → 26 s y rondas de OpenRouter 10 → 14 s. Detalle en `knowledge/incidente-gemma4-razonamiento-t109.md` | `lib/ia.ts` | Verificado de extremo a extremo con el código ya cambiado: 13,2 s, CV de 509 y carta de 1.357 car. Falta que Mar genere una de verdad en producción | T108 | [x] |
| T110 | 3 · Alta | Evitar la tercera vez: una comprobación que valide que el esquema real de Supabase tiene lo que el código pide, **antes** de publicar. Dos desajustes en dos días (`perfiles.puesto` el 24/08, `generaciones.rehechos` el 25/08), ambos rompiendo producción, porque las migraciones se aplican a mano y nada comprueba que se hizo | `tests/`, o un paso de `.github/workflows/publicar.yml` | Una migración sin aplicar hace fallar la comprobación en vez de llegar a producción | T108 | [ ] |
| T111 | 4 · Media | **Confirmado el 26/08 y arreglado: eran falsos positivos, todos.** Recalculados los avisos sobre las **6 generaciones reales** de Supabase: **59 palabras marcadas, 0 invenciones**. Las 3 generaciones en inglés aportaban 13, 21 y 23; las 3 en castellano, 1, 1 y 3. La causa no es una lista de palabras corta: el documento sale en el idioma de la oferta, y comparar palabra a palabra un CV en inglés contra un CV original en castellano no puede funcionar (en inglés la mayúscula inicial no señala un nombre propio: `Process Mapping`, `English (C1 Advanced)`, `March 2019`). Decisión de Mar: cuando el documento va traducido se calla **solo** esa comparación; cifras, contacto y "¿es este mi CV?" —que sí aguantan la traducción— siguen. De paso, tres falsos positivos más: el genitivo (`GitLab’s`), el `once` inglés leído como el 11 castellano, y el teléfono escrito con espacios troceado en tres cifras. Detalle en `knowledge/arreglo-verificarcv-traduccion.md` | `lib/verificarCv.ts`, `evals/promptfoo/helpers.cjs`, `tests/lib/verificarCv.test.ts` | Medido sobre las mismas 6 generaciones reales: **de 59 avisos a 2**, y ninguno de los dos es ruido de traducción. 288 pruebas en verde (11 nuevas) | T109 | [x] |
| T114 | 1 · Crítica | **Medida el 26/08: la sospecha era falsa y la causa es otra.** No es el runner de GitHub — los timeouts pasan igual en local, 1 de cada 5 casos. Los casos que fallan **no son lentos, se desbocan**: B10 medido sin corte tarda **181,5 s** y muere en un HTTP 408 del propio Cloudflare. A ~40 tokens/s, el corte de 26 s solo da para ~1.000 tokens y B10 necesitaría ~300 s, así que **subir el corte a 44 s no salvaría ni un caso**: propuesta descartada. Y el "sin evaluar" se cuenta **por aserción, no por caso**: los 17-18 son ~4 casos de 13, que con `maxPorcentajeNoConcluyente: 25` dan 30 % y tumban la tanda. Lo que queda es el desbocamiento del prompt en casos adversariales, que es **T113**. Detalle en `knowledge/medicion-t114-desbocamiento.md` | `scripts/medir-latencia-generacion.ts` (sonda) | Diagnóstico medido y documentado; la decisión de Mar (26/08) es desbloquear producción primero y arreglar la calidad después | T109, T112 | [x] |
| T115 | ✅ Arreglada el 26/08 | **El robot ya no compara con el push anterior, sino con lo que Vercel dice tener servido en producción.** Antes, un cambio de IA que la puerta bloqueó se quedaba en `master` sin publicar y el siguiente commit inocuo lo arrastraba a producción sin evals. Se consulta `targets.production` del proyecto — no el despliegue más reciente: tras un rollback no son el mismo — y para que ese dato exista, `vercel deploy` graba el commit con `--meta sha=` (hace falta a mano: el repositorio se desconectó de Vercel el 21/08). Si no se puede saber qué hay publicado, **se evalúa**. Comprobado con 15 escenarios en verde (`npm run probar:decidir`), que sacan el guión del propio YAML; el primer banco daba 15 de 15 **sin probar nada** y está contado. ⚠️ La consulta real a Vercel **no se ha visto en vivo**: lo dirá la primera publicación a `master`, y si fallara se gastan evals de más pero nada se publica sin medir. Ver `knowledge/arreglo-agujero-robot-t115.md` | `.github/workflows/publicar.yml`, `scripts/probar-paso-decidir.sh` | Hecho: `npm run probar:decidir` en verde. Queda ver el resumen del robot en la primera publicación a master | T110 | [x] |
| T116 | 1 · Crítica | **Arreglada la causa de raíz el 26/08**: el prompt exigía saltos de línea reales dentro de `cv_texto` y el modelo se pasaba al otro extremo, **3.089 líneas** en un campo de quince, hasta agotar el techo de tokens y morir en un timeout. Ahora el esquema pide **listas** (`cv_lineas`, `carta_parrafos`) y el código las une: el modelo no escribe ningún salto de línea, así que el bucle es imposible, y tampoco puede devolver un CV en una sola línea. También baja el techo de tokens de 12.000 a 1.500 y la llamada hace **tres intentos** (24+14+14 s) porque el fallo es intermitente. Detalle en `knowledge/arreglo-bucle-saltos-de-linea.md` | `lib/ia.ts`, `prompts/system.md`, `tests/lib/ia-generacion-lineas.test.ts` | Verificado: la línea donde revienta el JSON baja de 3.089 a 19. 279 pruebas en verde. **Falta medir la tasa de éxito** con Cloudflare en condiciones normales | T114 | [x] |
| T117 | ✅ Medida el 26/08 | **Medida la tasa de éxito tras T116: 0 de 5 por la vía normal.** T116 arregló su bucle pero no la generación: el bucle se mudó al **espacio en blanco entre claves del JSON**. El modelo escribe carta y CV bien, cierra `cv_lineas`, y a partir de ahí emite un salto de línea y dos espacios, una y otra vez, hasta agotar el techo — nunca escribe el campo `puesto` ni la llave de cierre, y el parseo tira un documento que estaba entero. **5 de 5 casos son recuperables** ignorando ese cierre. No era mala racha del proveedor (B01 sin corte: 38,1 s, no se cuelga). Subir el techo de tokens no arregla nada. Una generación buena tarda **32-41 s**, muy por encima del primer corte de 24 s. Ver `knowledge/medicion-t117-cierre-json.md` | `scripts/medir-latencia-generacion.ts` | Hecho: tanda de 5 casos con el detalle en el documento de conocimiento | T116 | [x] |
| T118 | 1 · Crítica | **Arreglado el cierre del JSON que el modelo no escribe** (26/08, decisión de Mar entre cuatro opciones: reparar el JSON en el código). `repararJsonCortado` recorta el espacio en blanco de cola y cierra lo que quedó abierto; una cadena a medias **no** se cierra con una comilla, se descarta y se retrocede. El `puesto` que falta se toma del perfil, como ya hacía `titularSeguro`. Timeouts de `[24_000, 14_000, 14_000]` a **`[48_000]`**: los tres intentos se calcularon cuando una generación tardaba 13 s y hoy tarda 32-41 s, así que fallaban por definición. 295 pruebas en verde (7 nuevas), tipos y lint limpios. ⚠️ **Falta verificarlo en vivo**: la cuota diaria de Cloudflare se agotó a las 14:10 midiendo T117. Ver `knowledge/arreglo-json-sin-cerrar.md` | `lib/ia.ts`, `tests/lib/ia-json-cortado.test.ts` | `npm run medir:generacion` con cuota fresca da una tasa claramente mejor que el 0/5 del 26/08 | T117 | [~] |
| T119 | 2 · Alta | **Medir si una secuencia de parada (`stop`) corta el bucle de espacio en blanco** antes de llegar al techo de tokens. Hoy toda llamada agota los 1.500 tokens escribiendo basura: son ~10 s y ~60 neuronas tirados por generación, y es lo que impide tener un segundo intento dentro del `maxDuration = 60` de la ruta. Si funciona, la llamada baja a ~20 s. La sonda ya lo admite sin tocar `lib/ia.ts`: `STOP='\n\n\n' npm run medir:generacion`, y admite varias secuencias separadas por una barra vertical | `lib/ia.ts` (`llamarModelo`), `scripts/medir-latencia-generacion.ts` | Con `stop`, una generación buena tarda ~20 s y el documento sale entero | T118 | [ ] |
| T113 | 3 · Alta | **Confirmar la calidad de la generación**: la tanda del 25/08 salió ROJO por CVs demasiado cortos (6 de 13, entre 125 y 348 car.) y sin saltos de línea (2 de 13) — **ni un solo fallo de invención**, así que el refuerzo de T94 funciona y el problema es el contrario. Se ajustó el prompt el mismo día, y **el ajuste rompió la generación entera**: la regla decía "conserva todo" sin decir dónde parar, el modelo agotaba los 12.000 tokens y Cloudflare cortaba con un 408 a los 180 s. Eso, y no la falta de cuota, es lo que llenó de "sin evaluar" la tanda del robot y le hizo dictar NO CONCLUYENTE. Reescrita acotada la misma noche ("cuando hayas recorrido el CV original una vez, PARA"): 13,5 s, CV de 545 car. **Sigue faltando una tanda completa concluyente** que diga si los CVs ya no salen cortos. Si no basta, el siguiente candidato ya está medido: `llama-4-scout` (6,7 s) — **ojo: su descarte como principal (1/5) se midió sobre datos contaminados por T117 y no vale** | `lib/ia.ts`, `prompts/system.md`, `evals/` | `npm run evals:generar` seguido de `npm run evals:puerta` da VERDE | T109 | [ ] |
| T112 | 5 · Media | El respaldo de OpenRouter **no respalda nada**: sus dos modelos devuelven **429 en menos de medio segundo** (`temporarily rate-limited upstream`, pool compartido del proveedor), y la ronda 1 usaba el mismo modelo lento de razonamiento que Cloudflare, con 10 s de espera. Además `google/gemma-4-26b-a4b-it:free` ni declara `structured_outputs`, que es lo que esta cascada le pide siempre. Buscar sustitutos **midiéndolos en vivo** (solo 4 de los 17 modelos `:free` declaran `structured_outputs`; el único que respondió a una prueba real es `dots-studio/dots-3-note-preview:free`, que también razona) | `RONDAS_MODELOS` en `lib/ia.ts` | Con Cloudflare forzado a fallar, la generación sale igualmente por el respaldo | T109 | [ ] |
| — | 9 · Espera (mañana) | **T68**, ya numerada en el Hito 8: confirmar que el email de aviso llega de verdad tras la ejecución real de las 13:00 | — | Ver Hito 8 más arriba | T96 | [ ] |
| — | 10 · Opcional | Corregir el `comment on column` de `supabase/migrations/0015_metricas_ia.sql`, que sigue mencionando a Groq (no urgente, no bloquea nada; exige una migración nueva, no tocar la 0015) | migración nueva | El comentario en Supabase ya no menciona a Groq | — | [ ] |

> ⚠️ **T94 necesita tu decisión antes de tocar código** (regla de
> `CLAUDE.md`: no cerrar una elección entre varias opciones sin habértela
> preguntado explícitamente). Las 8 señales del ROJO agrupan en problemas
> distintos que probablemente piden arreglos distintos — detalle caso a caso
> en [`knowledge/paso-13-evals.md`](../knowledge/paso-13-evals.md):
> - **Invención de secciones enteras y datos falsos colados por inyección**
>   (B06, B07, B12) → reforzar el prompt.
> - **CVs de entrada genuinamente cortos que no pueden llegar a los 400
>   caracteres sin inventar** (B03, B04, B08) → flexibilizar
>   `LARGO_MINIMO_CV`, no el prompt.
> - **Fallos de formato transversales** (B05, B13: cortes a media frase, sin
>   saltos de línea reales) → puede que ni sea el prompt ni el modelo, es el
>   mismo patrón ya visto con `qwen3.6-27b` antes de Cloudflare.
>
> **Cerrado el 26/08/2026 (T116)**: sí era el prompt, y en concreto esta
> tercera señal. El refuerzo que se le puso encima el 25/08 ("un CV en una sola
> línea se rechaza") metió al modelo en un bucle de saltos de línea que se
> llevó por delante los tres días siguientes. Ya no se pide un texto con
> saltos dentro, sino una lista de líneas. Ver
> `knowledge/arreglo-bucle-saltos-de-linea.md`.
>
> También sigue pendiente, de la misma tanda: `extraerPerfil` nunca se ha
> probado en el golden dataset con `mistral-small-3.1-24b-instruct` (sigue
> ahí con Groq) — T95 debe cubrir las dos llamadas, no solo
> `generarCvYCarta`.

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
