---
type: Decision
title: Un solo idioma para todo el documento (CV, carta y titular)
description: El PDF salía con el titular bajo el nombre fijo en castellano mientras el CV y la carta se generaban en inglés (idioma de la oferta). La IA adapta ahora también el titular, y el único texto fijo del PDF ("CARTA DE PRESENTACIÓN") sigue el mismo idioma.
tags: [jobs-app, okf, ia, decision, incidente, pdf]
timestamp: 2026-08-19T00:00:00Z
---

# El problema

Mar revisó el PDF de "Global Marketing Operations Manager" (la misma oferta
de [decision-respaldo-groq.md](decision-respaldo-groq.md)) y encontró un CV
con los títulos de sección y todo el contenido en inglés, pero el titular
bajo su nombre en castellano ("ESPECIALISTA EN OPERACIONES Y PROCESOS"). Un
documento con dos idiomas mezclados.

# La causa

`lib/ia.ts` decide el idioma de cada generación con código, a partir del
idioma de la oferta (docs/05-ia.md §6.5) — eso ya funcionaba bien: el CV y
la carta salían enteros en el idioma correcto. El problema estaba en dos
piezas del PDF que **no** salen de esa decisión:

1. El titular bajo el nombre (`lib/pdf.tsx`, `Masthead`) usaba siempre
   `perfiles.puesto` — el puesto que la IA extrajo **una sola vez**, al
   pegar el CV, y siempre en castellano (T25-T31: "la salida siempre es en
   español"). Ese valor es fijo por perfil, no por generación: no tenía
   forma de saber en qué idioma iba esta oferta en concreto.
2. La etiqueta de la segunda página, "CARTA DE PRESENTACIÓN", estaba escrita
   directamente en el JSX, en castellano siempre, sin mirar el idioma de la
   generación.

# Decisión

**Todo el documento sigue el mismo idioma, decidido una vez por generación
(lib/ia.ts, ya existente) y aplicado también al titular y a la etiqueta
fija del PDF:**

1. La IA, en la misma llamada que ya adapta el CV y la carta
   (`generarCvYCarta`), adapta ahora también el titular: se le pasa el
   `puesto` original del perfil como referencia ("TITULAR ACTUAL DEL
   PERFIL" en el prompt) y se le pide traducirlo/adaptarlo al idioma
   decidido — no inventar un cargo distinto, solo ponerlo en el idioma y
   vocabulario correctos. Sale como un tercer campo (`puesto`) en el
   esquema JSON, junto a `cv_texto` y `carta_texto`.
2. Ese titular adaptado se guarda congelado en una columna nueva,
   `generaciones.puesto_texto` (migración `0010`) — misma regla de negocio 7
   que `cv_texto`/`carta_texto`: una vez generado, no cambia.
3. La etiqueta "CARTA DE PRESENTACIÓN" pasa a ser un diccionario de dos
   entradas (`es`/`en`) en `lib/pdf.tsx`, y `DocumentoGeneracion` recibe un
   prop `idioma` para elegir la correcta.
4. La pantalla de descarga (`app/api/descargar/[id]/route.ts`) calcula ese
   `idioma` con la MISMA función determinista que se usó al generar
   (`detectarIdioma`, sobre el título y la descripción de la oferta, que no
   cambian) — así no hace falta guardar el idioma aparte, siempre da el
   mismo resultado.

**Generaciones antiguas** (de antes de esta columna) tienen
`puesto_texto = NULL`: la descarga cae al `perfiles.puesto` de siempre para
esas — vuelven a salir con el titular en castellano si el resto está en
inglés, pero no se regeneran (regla de negocio 7: un CV generado es
definitivo, y la app no tiene botón para regenerar uno ya "listo").

# Verificado en vivo

Se reinició manualmente (vía SQL, con el permiso de continuar de Mar) la
fila de "Global Marketing Operations Manager" para volver a generarla con
el código nuevo. Resultado, comprobado directamente en la base de datos:

- `puesto_texto`: `"Global Marketing Operations Manager"` (antes: nada,
  caía al `perfiles.puesto` en castellano).
- `cv_texto` y `carta_texto`: en inglés, como ya venían.
- La descarga (`/api/descargar/{id}`) responde 200 con un PDF distinto del
  anterior (distinto tamaño en bytes) — consistente con el nuevo titular y
  la nueva etiqueta.

# Relacionado

- [decision-respaldo-groq.md](decision-respaldo-groq.md) — la oferta usada
  para verificar este arreglo es la misma que reveló el problema del cupo
  de OpenRouter.
- [hito-6-generar-cv.md](hito-6-generar-cv.md) — T49, la decisión original
  de decidir el idioma con código en vez de con la IA.
- [decision-diseno-pdf.md](decision-diseno-pdf.md) — el masthead del PDF que
  ahora recibe el prop `idioma`.
