---
type: Arreglo
title: "T118 · Si el modelo no cierra el JSON, lo cierra el código: la reparación del documento cortado"
description: "Aplicado el 26/08/2026 tras la medición de T117. El modelo escribe la carta y el CV completos pero nunca escribe el cierre del JSON ni el campo puesto, y el documento entero se perdía. Ahora se recorta el espacio en blanco de cola, se cierra lo que quedó abierto y el titular que falta se toma del perfil de la usuaria. Sin verificar en vivo: la cuota diaria de Cloudflare se agotó midiendo."
tags: [jobs-app, arreglo, ia, cloudflare, structured-outputs, generacion, t117, t118]
okf_version: "0.2"
timestamp: 2026-08-26T16:20:00Z
---

# El problema, en una frase

`JSON.parse(resultado.contenido)` tiraba a la basura un documento que estaba
bien escrito, porque al modelo le faltaba por escribir una llave.

La medición está en [medicion-t117-cierre-json.md](medicion-t117-cierre-json.md):
el modelo escribe la carta y el CV completos, cierra `cv_lineas`, y a partir de
ahí emite un salto de línea y dos espacios hasta agotar el techo de tokens.
Nunca escribe el campo `puesto` ni el `}` final. Por la vía normal: **0 de 5**.
Ignorando ese cierre: **5 de 5**.

# La decisión

Mar eligió el 26/08/2026, entre cuatro opciones medidas, **reparar el JSON en
el código**. Las otras tres: sacar `puesto` del esquema (no resuelve el bucle,
solo le quita una clave), probar otro modelo (cuesta cuota y no hay garantía)
y abandonar el JSON por texto plano con separadores (prompt, parser y evals
nuevos).

El motivo de elegir esta: es la única que **no depende de que el proveedor
cambie de comportamiento**. Cloudflare declara `strict: true` en el esquema y
no lo aplica —devuelve las claves en orden inverso y omite una obligatoria—,
así que confiar en que el modelo cierre bien el JSON es confiar en algo que ya
sabemos que no se cumple.

# Lo que hace el arreglo

En `lib/ia.ts`:

1. **`repararJsonCortado(contenido)`** sustituye al `JSON.parse` de
   `generarCvYCarta`. Prueba primero el parseo normal —si el JSON viene bien,
   no toca nada—, y solo si falla recorta el espacio en blanco de cola y cierra
   los corchetes y llaves que quedaron abiertos. Si ese punto de corte no
   parsea, retrocede al elemento anterior y vuelve a probar, hasta 40 veces.
2. **Una cadena a medias no se cierra con una comilla.** Es la trampa evidente
   de este tipo de reparación: cerrar `"- Nubelo (2021-2024): coordinación de
   equi` colaría media frase en el CV de una persona. Cuando el corte pilla una
   cadena abierta, ese punto se descarta entero y se retrocede al anterior.
3. **El `puesto` que falta se toma del perfil de la usuaria.** Es la clave que
   el corte se lleva siempre (5 casos de 5). No es un invento: `titularSeguro`
   ya usaba el titular del perfil como respaldo cuando el que devuelve el
   modelo no supera los guardrails del Paso 15, y aquí se hace lo mismo con el
   que no llegó a venir. Si tampoco hay titular en el perfil, se rechaza.
4. **`TIMEOUTS_CLOUDFLARE_GENERACION_MS` pasa de `[24_000, 14_000, 14_000]` a
   `[48_000]`.** Los tres intentos se calcularon cuando una generación buena
   tardaba 13 s; hoy tarda de 32 a 41 s, porque el modelo nunca emite el token
   de fin y toda llamada llega al techo. Con cortes de 24 y 14 s **no se
   completaba ninguna**: los tres intentos fallaban por definición. Es un solo
   intento largo porque `app/api/generar/route.ts` declara `maxDuration = 60`:
   con el caso más lento en 41,4 s, 48 s dejan margen para ese caso y para lo
   que la ruta hace después, pero no para un segundo intento — y un reintento
   corto no serviría, no le daría tiempo a terminar.

# Lo que el arreglo NO hace

**No da por bueno un documento a medias.** `repararJsonCortado` se limita a
recuperar el objeto; `validarGeneracion` sigue exigiendo después el largo
mínimo del CV y de la carta, el número mínimo de líneas y de párrafos, y todos
los guardrails de siempre. Un corte que pille el CV por la mitad se queda corto
y se rechaza igual que antes. Hay una prueba para eso.

**No arregla los CVs cortos** (T113): de los 5 casos medidos, solo 2 pasaban el
umbral de 400 caracteres. Ese problema sigue vivo por debajo de este.

**No ahorra cuota.** El modelo sigue escribiendo espacio en blanco hasta el
techo, y eso se paga en neuronas y en segundos. La vía para recortarlo —darle a
Cloudflare una secuencia de parada (`stop`) que corte el bucle en cuanto
empiece— está sin medir y sin aplicar: si funcionara, la llamada bajaría a
~20 s y volverían a caber dos intentos.

> ✅ **Medida y aplicada el 27/08/2026 (T119).** Funciona, y mejor de lo
> previsto: **11,2 s y 70 neuronas** frente a 36,5 s y 133, con el CV idéntico.
> Pero la secuencia hubo que elegirla mirando la respuesta cruda, porque el
> relleno no eran los saltos de línea documentados en T117 sino **tabuladores**,
> y el patrón cambia de un día para otro. **No vuelven a caber dos intentos**:
> la parada no siempre dispara y algún caso sigue tardando 35 s. Ver
> [medicion-t119-secuencia-parada.md](medicion-t119-secuencia-parada.md).

# Verificación

- 295 pruebas en verde, 7 nuevas en `tests/lib/ia-json-cortado.test.ts`, que
  cubren la respuesta cortada real, el corte a mitad de frase, el corchete que
  va dentro de una cadena, la basura que no es JSON, y la generación de punta a
  punta con el titular tomado del perfil.
- Tipos y lint limpios.
- ~~⚠️ **Sin verificar en vivo.**~~ La cuota diaria de Cloudflare (10.000
  neuronas) se agotó a las 14:10 con las ~22 llamadas de la medición. Antes de
  publicar hay que pasar `npm run medir:generacion` con cuota fresca y ver que
  la tasa sube del 0/5 de hoy.
- ✅ **Verificado en vivo el 27/08/2026 a las 08:44, con cuota fresca: 5 de 5**
  (32,4 a 36,5 s, CVs de 338 a 411 caracteres), frente al 0 de 5 del 26/08. El
  arreglo aguanta contra el proveedor real y la app vuelve a generar CVs.
  Detalle en [medicion-t119-secuencia-parada.md](medicion-t119-secuencia-parada.md) §1.

Relacionado: [medicion-t117-cierre-json.md](medicion-t117-cierre-json.md),
[arreglo-bucle-saltos-de-linea.md](arreglo-bucle-saltos-de-linea.md),
[medicion-t114-desbocamiento.md](medicion-t114-desbocamiento.md).
