---
type: Medicion
title: "T119 · Una secuencia de parada corta el bucle de basura: la generación pasa de 36 s a 11 s y cuesta la mitad"
description: "Medido el 27/08/2026 con cuota fresca. Confirma primero que T118 funciona (5/5 frente al 0/5 del 26/08). El relleno con el que el modelo agota el techo de tokens resultó ser tabuladores, no saltos de línea, y una parada de tres tabuladores lo corta sin tocar el documento: 133 → 70 neuronas y 36,5 → 11,2 s con el mismo CV. Añadir paradas de saltos de línea empeora, porque cortan el documento por la mitad."
tags: [jobs-app, medicion, ia, cloudflare, generacion, coste, t117, t118, t119]
okf_version: "0.2"
timestamp: 2026-08-27T09:10:00Z
---

# Qué se quería averiguar

Dos cosas, en este orden:

1. **Si el arreglo de T118 funciona de verdad.** Se escribió el 26/08 y quedó
   sin comprobar contra el proveedor real, porque la cuota se agotó ese mismo
   día. Ver [arreglo-json-sin-cerrar.md](arreglo-json-sin-cerrar.md).
2. **Si una secuencia de parada (`stop`) corta el bucle** antes de llegar al
   techo de tokens, que es [T119](../docs/06-tareas.md). Cada generación
   gastaba los 1.500 tokens completos escribiendo basura: ~10 s y ~60 neuronas
   tirados por documento.

# 1. T118 funciona: 5 de 5

Primera tanda del día, con cuota recién renovada y sin tocar nada:

| Caso | Tiempo | CV |
|---|---|---|
| B01 · Caso base | 36,5 s | 411 car. |
| B04 · CV corto, recién graduada | 36,2 s | 341 car. |
| B07 · Inyección para inflar | 36,4 s | 338 car. |
| B10 · Documento de otra persona | 32,4 s | 401 car. |
| B13 · Caso fácil, sector IT | 35,3 s | 403 car. |

**5 de 5, frente al 0 de 5 del 26/08.** `repararJsonCortado` recupera el
documento que el modelo deja abierto, y la app vuelve a generar CVs.

Un detalle del JSON de la medición que importa para lo que viene: los cinco
casos gastan `tokensSalida: 1500`, el techo entero. **El bucle sigue ahí.** Lo
que cambió es que ahora el código lo repara en vez de tirar el documento.

# 2. El relleno son tabuladores, no saltos de línea

El primer intento de parada fue `\n␣␣\n␣␣\n␣␣`, siguiendo lo que documentaba
T117 ("emite `\n␣␣` una y otra vez"). **No cortó nada**: 33 s y 1.500 tokens,
igual que sin parada.

Comprobado primero que Cloudflare respeta el parámetro (con `stop: [',']` la
respuesta muere en 0,9 s), se volcó la respuesta cruda. El relleno del 27/08
es **un espacio seguido de 1.013 tabuladores, sin un solo salto de línea**:

```
--- últimos 120 car. del documento útil ---
"... \"IDIOMAS\",\n  \"- Español nativo.\",\n  \"- Inglés B2.\"\n]"
--- primeros 200 car. de la cola de basura ---
" \t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t..."
longitudes distintas de los tramos entre saltos: [ 1014 ]
número de saltos de línea en la cola: 0
```

**El patrón del relleno cambia de un día para otro.** El 26/08 eran saltos de
línea indentados; el 27/08, tabuladores; en otra llamada del mismo día, `\n \n `.
Es la lección de método de esta medición: un documento que describe *la forma
concreta* de un fallo intermitente caduca rápido, y conviene volver a mirar el
crudo antes de fiarse de él.

# 3. Tres tabuladores cortan la basura y no el documento

El documento se indenta siempre con espacios y **nunca** con tabuladores, así
que tres tabuladores seguidos no pueden aparecer dentro de un JSON válido.
Mismo caso, misma hora, con y sin parada:

| | sin parada | con `\t\t\t` |
|---|---|---|
| Tiempo | 36,5 s | **11,2 s** |
| Tokens de salida | 1.500 | **472** |
| Neuronas | 133 | **70** |
| CV generado | 411 car. | **411 car.** |

El volcado crudo con la parada puesta lo confirma: `finish_reason: stop`, y el
contenido **termina en `]`** — el array `cv_lineas` cerrado, el documento
entero. Lo único que se pierde es el relleno.

# 4. Lo que NO hay que hacer: añadir paradas de saltos de línea

Como el relleno cambia de forma, la tentación es cubrir todos los patrones.
Se probó con `['\t\t\t', '\n  \n  \n  ', '\n\n\n']` sobre los 5 casos:

| Paradas | Aciertos |
|---|---|
| ninguna | 5/5 |
| solo `\t\t\t` | 3/5 |
| las tres | 2/5 |

Los fallos de las paradas con saltos de línea son documentos **cortados por la
mitad** ("110 caracteres, mínimo 311"), porque el modelo sí deja líneas en
blanco *dentro* del CV, entre secciones. Una parada basada en saltos de línea
no distingue eso de la basura.

**Conclusión: solo tabuladores.** La red de seguridad universal es
`repararJsonCortado` (T118), que funciona con cualquier relleno; la parada es
solo la optimización de coste para el patrón dominante. Si un día deja de
disparar, se pierde el ahorro y no se rompe nada.

# 5. El 3/5 no lo causa la parada: es T113

Queda explicar por qué `\t\t\t` dio 3/5 y no 5/5. Los dos fallos fueron B04 y
B07, y la causa **no** es la parada:

* El volcado crudo de B04 **con** la parada puesta muestra el documento
  completo, terminado en `]`, con `finish_reason: stop` y 323 tokens. La
  parada disparó **después** del documento, no dentro.
* Medidos B04 y B07 **sin ninguna parada**, en dos vueltas seguidas: B07 falló
  en una de las dos, y B04 dio CVs de **240 y 270 caracteres** — por debajo del
  umbral de los evals.

Son casos con un CV de entrada pobre, y el CV que sale es demasiado corto. Eso
es [T113](../docs/06-tareas.md), que sigue abierta, y ocurre con parada y sin
ella. Con 5 casos y esta variabilidad, la diferencia entre 3/5 y 5/5 en una
sola tanda es ruido — la advertencia que ya está en `CLAUDE.md`.

# Qué se cambió

`lib/ia.ts`: constante `PARADAS_CLOUDFLARE_GENERACION = ['\t\t\t']`, un
parámetro `paradas` en `llamarModelo` y una opción `paradasCloudflare` en
`llamarAlModelo`. Solo la usa `generarCvYCarta`; ni `extraerPerfil` (no ha
dado este problema) ni el respaldo de OpenRouter (sin medir ahí).

Cuatro pruebas nuevas en `tests/lib/ia-paradas.test.ts`, **vistas fallar a
propósito** en dos roturas: quitar la parada (3 de 4 fallan) y añadirle una de
saltos de línea (2 de 4 fallan). 299 pruebas en verde, tipos y lint limpios.

# Lo que queda pendiente

* ✅ **31/08/2026: la parada `\t\t\t` corrió en la tanda completa `npm run evals`
  sin regresiones — puerta VERDE.** El cambio de `lib/ia.ts` está en producción
  desde el merge `a90ab93`.
* ✅ **T113 cerrada el 31/08.** No era el mecanismo de generación ni la parada:
  eran el listón que exigía de más, el techo de tokens que truncaba a B05 y la
  carta inventándose la empresa (arreglados el 30/08). Ver
  [arreglo-t113-techo-tokens-y-minimos.md](arreglo-t113-techo-tokens-y-minimos.md).
* El coste de medir: ~30 generaciones agotaron los 10.000 neuronas del día.
  Renueva a medianoche UTC (02:00 hora española).

Relacionado: [arreglo-json-sin-cerrar.md](arreglo-json-sin-cerrar.md),
[medicion-t117-cierre-json.md](medicion-t117-cierre-json.md),
[arreglo-bucle-saltos-de-linea.md](arreglo-bucle-saltos-de-linea.md),
[paso-13-evals.md](paso-13-evals.md).
