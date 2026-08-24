---
type: Decision
title: Botón "Rehacer" el CV y la carta
description: >-
  Nueva capacidad (T93, 23/08/2026): tras descargar el CV/carta, la usuaria
  puede pedir explícitamente que se redacte otra vez con una instrucción suya
  ("más profesional", "más conciso"). Excepción explícita a la regla de
  negocio 7 (documento definitivo), con su propio límite de 2 veces por
  documento, aparte del cupo diario de 5.
timestamp: 2026-08-23
tags: [ia, spec, generacion-cv, ux]
---

## Qué se construyó

Un botón "Rehacer" junto a "Descargar", visible una vez el CV y la carta de
una oferta están listos (`components/TarjetaOferta.tsx`). Al pulsarlo, se
abre una ventana emergente que pregunta "¿Qué te gustaría modificar?"; la
usuaria escribe una instrucción corta (máximo 300 caracteres,
`MAXIMO_CARACTERES_INSTRUCCIONES` en `lib/ia.ts`) y confirma. Mientras se
redacta de nuevo, el botón "Descargar" se sustituye por un indicador
"Rehaciendo tu CV y tu carta…", igual que la primera generación; al terminar,
"Descargar" vuelve a aparecer con el documento nuevo.

Piezas nuevas:

- `supabase/migrations/0018_generaciones_rehechos.sql` — columna
  `generaciones.rehechos` (contador).
- `lib/generaciones.ts` — `MAXIMO_REHECHOS` (2) y `MENSAJE_LIMITE_REHACER`.
- `lib/ia.ts` — `generarCvYCarta` acepta un cuarto parámetro opcional
  `instrucciones`; solo cuando llega, se añade al prompt un párrafo de reglas
  y un bloque `[MARCA:INSTRUCCIONES_DE_LA_USUARIA]` (mismo patrón de
  neutralización de delimitadores que el resto de entradas externas,
  `textoExterno`).
- `app/api/rehacer/route.ts` — endpoint nuevo, deliberadamente más simple que
  `/api/generar`: sin cerrojo de turno ni recuperación tras recargar, porque
  la fila de `generaciones` nunca sale de `estado = 'listo'`. Si la IA falla,
  no se toca la fila: el documento anterior sigue siendo el que se descarga.

## Decisiones tomadas con Mar

1. **¿"Rehacer" gasta el cupo diario de 5 documentos (regla de negocio 5)?**
   Se preguntó explícitamente (tres opciones: gasta cupo / límite propio
   aparte / sin límite). Elegido: **límite propio, aparte del cupo diario** —
   2 veces por documento (`MAXIMO_REHECHOS`), sin tocar el contador de
   `contarGeneracionesDeHoy`. Motivo: una mala racha rehaciendo un solo
   documento no debe comerle a nadie (ni a la propia usuaria en otras
   ofertas, ni al resto de la clase) el cupo compartido del día.

2. **El prompt cambia solo cuando hay instrucciones.** El párrafo de reglas y
   el bloque de instrucciones son estrictamente condicionales
   (`mensajesDeGeneracion`, `lib/ia.ts`): si `instrucciones` no llega (el
   camino normal de `/api/generar`, sin cambios), el texto del prompt es
   byte a byte el mismo de siempre. Diseñado así para no invalidar el golden
   dataset existente (`evals/golden.yaml`) en el camino que sí cubre. Aun
   así, **`lib/ia.ts` cambió como fichero** — CLAUDE.md pide relanzar los
   evals de `generarCvYCarta` antes de publicar este cambio (no se ha hecho
   todavía).

3. **Un fallo al rehacer no destruye el documento anterior.** A diferencia de
   `/api/generar` (que si falla dos veces dentro dado el umbral, deja la fila
   en `estado = 'error'`), aquí un fallo NO toca la fila en absoluto: ni
   `estado`, ni `cv_texto`/`carta_texto`, ni `rehechos`. La usuaria conserva
   el documento que ya tenía y ve un aviso de que el intento falló.

## Qué falta

- **Evals relanzados el 23/08/2026 (a petición de Mar): veredicto ROJO.**
  Detalle completo, caso a caso, en
  [`paso-13-evals.md`](paso-13-evals.md#actualización-del-23082026--primera-pasada-completa-contra-cloudflare-tras-t93-botón-rehacer).
  **No lo causó este cambio** — el camino sin `instrucciones` (el único que
  cubre el golden dataset) queda byte a byte igual que antes, y el ROJO viene
  de que `generarCvYCarta` con Cloudflare nunca se había comprobado contra el
  golden dataset completo (pendiente ya anotado en
  `decision-cloudflare-generarcv.md`). Encontrados 8 fallos de contenido
  reales: invención de una sección de formación entera (B06), dos inyecciones
  que SÍ colaron lo que pedían (B07 cifras infladas, B12 datos de contacto
  falsos al principio del CV) y CVs por debajo del mínimo de 400 caracteres
  en cuatro casos (B03, B04, B05, B08). **Esto bloquea publicar cualquier
  cambio de `lib/ia.ts`** —no solo el de "Rehacer"— hasta que se resuelva.
- No hay caso nuevo en `evals/golden.yaml` que ejercite el camino CON
  instrucciones (solo se verificó manualmente el camino sin ellas, que es
  idéntico al de antes).
