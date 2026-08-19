---
type: Tarea
title: Hito 6 — Generar el CV y la carta con IA
description: Cierre del Hito 6 (Paso 9, T48-T57) — una llamada al modelo produce CV y carta adaptados a la oferta, con idioma decidido por código, verificación automática de cifras y nombres, límite de 5 al día y cola con reintentos desde el navegador.
tags: [jobs-app, ia, openrouter, supabase, hito-6, okf]
timestamp: 2026-08-19T16:00:00Z
---

# Qué se construyó

La pieza que da sentido al producto: marcar "me interesa" en una oferta
prepara sola un CV y una carta adaptados a ella.

## Archivos nuevos

- **`lib/idioma.ts`** (T49): decide en qué idioma se escribe el documento
  contando palabras muy frecuentes del castellano y del inglés en la
  oferta. **Sin librería externa**, elección explícita de Mar frente a
  `franc`: cubre los dos idiomas que traen las fuentes y no añade una
  dependencia que mantener. Ante la duda —texto corto o empate— elige
  castellano. Es la defensa 1 de [`docs/05-ia.md`](../docs/05-ia.md) §6.5
  llevada a la práctica: el modelo no elige el idioma, obedece.
- **`lib/verificarCv.ts`** (T54, T55): las dos comprobaciones automáticas
  del CV generado, explicadas abajo.
- **`lib/generaciones.ts`** (T56): el límite de 5 al día en un solo sitio,
  consultado desde los dos endpoints que lo necesitan.
- **`lib/fechas.ts`**: "el día de hoy en hora de España", que antes vivía
  dentro de `app/api/ofertas/route.ts` y ahora comparten el conteo diario y
  la comprobación de ingesta.
- **`lib/cola.ts`** (T57): la cola del navegador — las generaciones se
  preparan de una en una.
- **`app/api/generar/route.ts`** (T51, T53, T56, T57): el endpoint que hace
  el trabajo.
- **`supabase/migrations/0008_generaciones_cola_y_avisos.sql`**: columnas
  `iniciado_en` (cerrojo de turno) y `avisos` (resultado de T54-T55).

## Archivos ampliados

- **`lib/ia.ts`** (T48, T50): esquema de salida con dos casillas
  (`cv_texto`, `carta_texto`) y el prompt de generación.
- **`app/api/interes/route.ts`** (T52): además de guardar el interés, deja
  la fila de `generaciones` en estado `generando` para que la pantalla lo
  diga en el acto.
- **`app/api/ofertas/route.ts`**: devuelve el estado de preparación de cada
  oferta y si el cupo del día está agotado.
- **`components/TarjetaOferta.tsx`**: indicador de "preparando", resultado,
  avisos de verificación, mensaje de límite y botón de reintentar.

# Las decisiones que se tomaron sobre la marcha

## 1. El prompt cambia el encargo, no ruega

El prompt no dice "redacta un CV para esta oferta" sino **"reordena y
reformula la información de este CV"**. Es la defensa 1 de `docs/05-ia.md`
§6.1: adaptar en vez de crear. Un modelo que reordena no tiene por qué
inventarse nada; uno que redacta, sí.

## 2. Verificar de verdad, midiendo el ruido

Las dos verificaciones se probaron **sobre el CV real de Mar**, no en
abstracto, y la primera versión fue mala: **11 avisos, todos falsos**.
Comparaba frases enteras ("Operations Scheduling Officer Althaia
Healthcare Institution") que no aparecen literalmente en el original
aunque cada palabra sí esté, y tomaba por nombre propio la primera palabra
de cada punto de la lista ("- Documento los procesos…").

La versión final compara **palabra a palabra** y trata cada viñeta como
principio de frase. Medida sobre el mismo documento: **0 avisos falsos**.
Con una empresa y una cifra inventadas a mano ("equipo de 47 personas en
Zumbatrónica Ibérica"), las caza las dos.

> La lección, que vale para el resto del proyecto: **una verificación
> automática que avisa de todo no avisa de nada**. Si salta seis veces con
> un documento correcto, la usuaria aprende a ignorarla en dos días y la
> defensa deja de existir. Por eso se midió el ruido antes de darla por
> buena.

También se descartó una idea que parecía prudente: saltarse la
comprobación de nombres cuando el documento se escribe en otro idioma que
el CV. En la práctica **el CV real de Mar es bilingüe** (secciones en
inglés, contenido en castellano), así que la comprobación se saltaba
siempre y soltaba un aviso confuso. Los nombres de empresa no se traducen;
la comprobación se hace ahora siempre.

## 3. Los reintentos viven en el navegador, no en el servidor

`docs/05-ia.md` §6.7 pide reintentos con espera creciente. La forma obvia
—un bucle dentro del endpoint— se probó y **falló midiendo**: dos intentos
seguidos tardaron **112 segundos**, y una función del plan gratuito de
Vercel se corta a los 60. En producción, la usuaria no habría visto ni un
error decente: la petición se corta a media faena.

Ahora cada petición al servidor hace **un intento** (dos rondas de
modelos, ~25 s) y es la pantalla la que reintenta hasta tres veces con
esperas de 6 y 15 segundos. Cada intento es una petición nueva con su
minuto entero, y de paso se le da tiempo al proveedor saturado a
despejarse.

## 4. La cola es del navegador; el cerrojo, de la base de datos

Son dos cosas distintas y hacen falta las dos:

- **La cola** (`lib/cola.ts`) resuelve "marco tres ofertas seguidas": se
  preparan por turnos, no a la vez, que es lo que Mar eligió al preguntarle
  y lo que evita chocar con el límite de peticiones por minuto.
- **El cerrojo** (`iniciado_en`) resuelve "dos pestañas abiertas" y "la
  pestaña se cerró a medias". Quien va a generar escribe la hora en esa
  columna con un `update` condicional; si otra petición se le adelantó, el
  `update` no afecta a ninguna fila y se retira. Pasados 3 minutos el turno
  se considera abandonado y otra petición puede retomarlo. Lo arbitra la
  base de datos, no el orden en que lleguen las peticiones.

## 5. El interés se guarda aunque el cupo esté lleno

Al llegar a las 5 del día, marcar "me interesa" **sigue guardando el
interés** y solo se bloquea la preparación, con un mensaje que lo explica.
Así la oferta no se pierde: al día siguiente aparece con un botón
"Preparar mi CV y mi carta". Es lo que pide el caso límite de
`docs/03-spec.md` §6 ("la usuaria alcanza el límite diario a mitad de una
sesión").

# Cómo se comprobó

Todo contra la base de datos y los modelos reales, no simulado:

| Qué | Resultado |
| :-- | :-- |
| T52 · Marcar "me interesa" | "Te interesa ✓" y "Preparando tu CV y tu carta…" al instante |
| T53 · Documento listo | A los ~25 s pasa sola a "CV y carta preparados ✓"; sigue así al recargar |
| T54-T55 · Verificación | 0 avisos falsos sobre un CV real; caza la cifra y la empresa inventadas |
| T56 · Límite diario | Con el cupo lleno: mensaje claro, interés guardado igual, HTTP 429 |
| T57 · Fallo del modelo | Ocurrió de verdad durante las pruebas: rotación, reintento y estado `error` con su botón |

Los datos de prueba (una oferta ficticia y cinco generaciones de relleno)
se borraron después. El único documento que queda es uno real, generado
para una oferta real de Devoteam.

# Lo que quedó pendiente o avisado

- **Las palabras clave del perfil de Mar no encuentran ninguna oferta.**
  Son frases largas ("Coordinación multitarea en entornos remotos") que no
  aparecen literalmente en ningún anuncio, y el emparejamiento es por
  coincidencia de texto (`docs/05-ia.md`, deliberadamente sin IA). No es un
  fallo del Hito 6 —viene del Hito 3— pero deja la app vacía para ella.
  Hay que revisarlo con Mar.
- **La cuota gratuita de OpenRouter** limita las peticiones al día. Con dos
  modelos por generación en el caso normal, el uso realista cabe; el techo
  teórico del MVP (25 documentos al día entre las cinco) no cabría.
- El botón de **descargar el PDF** es el Hito 7. Ahora mismo el documento
  se prepara y se guarda, pero no hay forma de verlo desde la web.

# Relacionado

- [`docs/05-ia.md`](../docs/05-ia.md) §2.2, §6.2, §6.5, §6.6 y §6.7 — el
  diseño que este hito implementa.
- [`docs/06-tareas.md`](../docs/06-tareas.md) — T48-T57.
- [decision-modelo-ia.md](decision-modelo-ia.md) — la lista de modelos, que
  este hito renovó tras comprobarla en vivo.
- [hito-5-ver-ofertas.md](hito-5-ver-ofertas.md) — la pantalla sobre la que
  se monta todo esto.
