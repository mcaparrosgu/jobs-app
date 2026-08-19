---
type: Decision
title: Palabras clave cortas, del vocabulario de los anuncios
description: Las palabras clave que proponía la IA eran frases largas que no aparecen literalmente en ningún anuncio, así que la pantalla de ofertas salía vacía; se corrigen las tres capas (prompt, esquema y validación en código) y los términos largos se recortan al núcleo en vez de descartarse.
tags: [jobs-app, ia, prompt, emparejamiento, okf]
timestamp: 2026-08-19T20:00:00Z
---

# El problema

Al cerrar el Hito 6 quedó anotado en [log.md](log.md) un aviso abierto: las
palabras clave guardadas en el perfil de Mar eran frases como *"Coordinación
multitarea en entornos remotos"*, y **su pantalla de ofertas salía vacía**.

La causa no está en la pantalla, está en cómo se busca. Cada palabra clave
acaba en `app/api/ofertas/route.ts` convertida en un filtro
`titulo.ilike.*término*` — una coincidencia **literal**, un Ctrl+F contra el
texto de la oferta. Una frase de siete palabras no aparece tal cual en ningún
anuncio del mundo. Cada palabra clave larga era, en la práctica, una palabra
clave muerta: ocupaba sitio y no encontraba nada.

El fallo venía del Hito 3, y el prompt lo empujaba activamente: pedía *"sé
exhaustiva explorando variantes y sinónimos"*, que es un incentivo a alargar.

`docs/05-ia.md` §6.3 ya prometía como defensa 3 *"descartar duplicados,
vacíos y frases largas"*. Lo de las frases largas nunca se implementó: esto
no era una funcionalidad nueva, era una deuda documentada.

# Qué se ha hecho

Las tres capas de defensa de `docs/05-ia.md` §6.1, aplicadas al mismo fallo.

1. **Prompt** (`lib/ia.ts`). Fuera el *"sé exhaustiva con variantes y
   sinónimos"*. Entra la regla del buscador: cada palabra clave es un
   **término de búsqueda** de portal de empleo, de 1 a 3 palabras, sustantivo
   concreto, sin coletillas. Y ejemplos, no solo reglas (*few-shot*): tres de
   lo que está bien (`Python`, `Customer Success`, `SAP`) y tres de lo que
   está mal (`gestión de equipos multidisciplinares en entorno
   internacional`). Se conserva la utilidad del sinónimo —el término en
   inglés con el que aparece en los anuncios— pero acotado a 3 palabras.
2. **Esquema** (`lib/ia.ts`). `maxLength: 40` en cada casilla de la lista.
   Es un refuerzo, no la garantía: no todos los modelos gratuitos de
   OpenRouter respetan `maxLength`. Verificado en vivo que los dos modelos de
   la primera ronda lo aceptan sin devolver error.
3. **Validación en código** (`lib/palabras-clave.ts`, nuevo). La garantía de
   verdad, porque no depende de qué modelo conteste ese día.

# La decisión: recortar, no descartar

Ante una palabra clave demasiado larga había tres caminos: tirarla, recortarla
al núcleo, o devolvérsela al modelo para que la acorte. **Mar eligió
recortarla al núcleo**: *"gestión de equipos multidisciplinares en entorno
internacional"* → *"gestión de equipos"*. Descartar era más simple pero podía
dejar el perfil casi vacío; la segunda pasada con la IA era la más lista pero
gasta otra llamada de la cuota gratuita diaria por cada CV.

Límite elegido: **1 a 3 palabras, 40 caracteres**. Tres palabras porque hay
términos reales de recruiter que las necesitan: "Customer Success Manager",
"atención al cliente".

Detalles que aparecieron al construirlo:

- Las **coletillas de relleno** se quitan *antes* de contar palabras, o
  "experiencia en gestión de equipos" perdería justo "equipos".
- Las casillas con **varios términos dentro** ("Python, SQL / R") se abren en
  varias palabras clave. Pero la barra solo separa si lleva espacio a algún
  lado: la prueba en vivo devolvió `SAP FI/CO`, que partido queda destrozado
  (`SAP FI` + `CO`). Igual que `UX/UI`.
- **Mínimo de 3 caracteres**, con excepción para las siglas en mayúsculas
  (`UX`, `QA`, `PM`). Es el reverso del problema: con `ilike`, "ia" encuentra
  ofertas por aparecer dentro de "financiación".
- La limpieza se aplica **también a los términos de búsqueda** en
  `app/api/ofertas/route.ts`, no solo a lo que genera la IA: el puesto y las
  titulaciones del CV entraban enteros en el filtro, y "Grado en
  Administración y Dirección de Empresas" tampoco coincide con nada.

# En la pantalla

Cuando la usuaria escribe una palabra clave a mano, la web **avisa pero no
bloquea** (decisión de Mar): se añade igual y aparece un texto en gris
explicando que los términos cortos encuentran más ofertas. El perfil es suyo;
la app informa, no manda.

# Cómo se ha comprobado

Con un CV ficticio de perfil administrativo —escrito a propósito con frases
del tipo "capacidad demostrada de análisis y resolución de problemas
complejos"— contra los dos modelos reales de la primera ronda. Los dos
devolvieron HTTP 200 (el `maxLength` no rompe nada) y **todas** las palabras
clave salieron ya cortas: `SAP`, `Facturación`, `Cuentas a cobrar`, `Atención
al cliente`, `Excel`, `Tablas dinámicas`.

Queda pendiente lo evidente: **Mar tiene que volver a analizar su CV** en
`/perfil` para reemplazar las palabras clave largas que ya tiene guardadas.
Este arreglo cambia lo que se genera de ahora en adelante, no lo que está
grabado en la base de datos.

Relacionado: [hito-3-perfil.md](hito-3-perfil.md),
[hito-5-ver-ofertas.md](hito-5-ver-ofertas.md),
[hito-6-generar-cv.md](hito-6-generar-cv.md).
