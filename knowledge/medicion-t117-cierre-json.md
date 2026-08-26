---
type: Medicion
title: "T117 · El bucle no murió, se mudó: el modelo deja el JSON sin cerrar y el documento entero se tira a la basura"
description: "Medido el 26/08/2026 tras el arreglo de T116. El documento que genera el modelo es correcto y está completo, pero tras cerrar cv_lineas el modelo se queda escribiendo espacios en blanco hasta agotar el techo de tokens, nunca escribe el cierre del JSON ni el campo puesto, y el parseo lo descarta entero. 5 de 5 casos son recuperables si se ignora ese cierre que falta; 0 de 5 llegan por la vía normal."
tags: [jobs-app, medicion, ia, cloudflare, structured-outputs, generacion, t116, t117]
okf_version: "0.2"
timestamp: 2026-08-26T14:15:00Z
---

# Qué se quería averiguar

T116 arregló la causa de los tres días de fallos: el prompt exigía saltos de
línea dentro de `cv_texto` y el modelo se atascaba generándolos (3.089 líneas
en un campo de quince). El arreglo cambió el esquema a **listas**
(`cv_lineas`, `carta_parrafos`) para que el modelo no escriba ningún salto de
línea. Se verificó que la línea donde revienta el JSON baja de 3.089 a 19.

Lo que **no** se sabía es si eso arregla la generación o solo el bucle. Las
tandas de la tarde del 26/08 daban 1-2 de 5 con cualquier combinación, y se
atribuyeron a una mala racha de Cloudflare. T117 existía para repetir la
medida con el proveedor estable.

# Cómo se midió

Tres sondas sobre `generarCvYCarta` de `lib/ia.ts` — la función real — con
casos reales del golden dataset, sin tocar código de producción (el `fetch`
global envuelto, como en T114). La tercera guarda además la **respuesta cruda**
de Cloudflare, que es donde estaba la respuesta.

Coste: ~22 llamadas de generación, que agotaron la cuota diaria de Cloudflare
(**10.000 neuronas al día**, ~133 por generación normal, ~220 con el techo
subido a 2.500 tokens).

# Lo que se midió

## 1. No era una mala racha del proveedor

El caso B01, que el 26/08 por la mañana salía en 12,9 s, muere en los tres
intentos (24+14+14 s). Pero **medido sin corte de espera tarda 38,1 s y no se
cuelga**: llega al techo de 1.500 tokens y devuelve un JSON truncado. La
respuesta llega, el proveedor responde. Lo que falla es otra cosa.

## 2. El documento está bien; lo que falta es el cierre del JSON

Volcado crudo de B01 con el techo de producción (1.500 tokens):

- `finish_reason: length`, `completion_tokens: 1500`.
- El contenido es una carta correcta de 5 párrafos y un CV correcto de 12
  líneas, con EXPERIENCIA, FORMACIÓN e IDIOMAS, terminado en su `]`.
- **Falta el campo `puesto` y falta la llave de cierre `}`.**

Con el techo subido a 2.500 tokens se ve el mecanismo entero: de 3.854
caracteres generados, **1.832 son el documento y 2.022 son basura**. Después
de cerrar `cv_lineas`, el modelo no escribe la coma ni la clave que falta:
emite `\n␣␣` una y otra vez —693 líneas— hasta agotar el techo.

**Es el bucle de T116, desplazado.** Ya no ocurre dentro del texto del CV,
donde el esquema de listas lo hizo imposible, sino en el **espacio en blanco
entre claves del JSON**, donde el esquema no dice nada.

## 3. La restricción `strict: true` no la está aplicando nadie

El esquema declara `strict: true` y `required: ['puesto', 'cv_lineas',
'carta_parrafos']`. El modelo devuelve las claves **en orden inverso**
(`carta_parrafos`, `cv_lineas`, y `puesto` nunca), omite una clave obligatoria
y emite espacio en blanco ilimitado. Si Cloudflare estuviera restringiendo la
salida al esquema de verdad, ninguna de las tres cosas sería posible: el
`response_format: json_schema` se está comportando aquí como una sugerencia.

## 4. Tanda de 5 casos: 5/5 recuperables, 0/5 por la vía normal

Con el techo de producción (1.500 tokens), ignorando el whitespace de cola y
cerrando los corchetes que quedaron abiertos:

| Caso | Tiempo | CV | Carta |
|---|---|---|---|
| B01 · Caso base | 32,3 s | 12 líneas / 429 car. | 5 párrafos / 233 pal. |
| B04 · CV corto, recién graduada | 34,2 s | 4 líneas / 245 car. | 5 párrafos / 201 pal. |
| B07 · Inyección para inflar | 37,8 s | 6 líneas / 284 car. | 3 párrafos / 188 pal. |
| B10 · Documento de otra persona | 41,4 s | 13 líneas / 663 car. | 5 párrafos / 124 pal. |
| B13 · Caso fácil, sector IT | 35,8 s | 9 líneas / 420 car. | 3 párrafos / 186 pal. |

- **Documento recuperable: 5/5.** Por la vía normal: **0/5**.
- Falta el campo `puesto` en **5/5** — es la clave que el modelo deja para el
  final y nunca llega a escribir.
- Los CVs miden 245-663 caracteres: **2 de 5 pasan el umbral de 400** de los
  evals. El problema de T113 (CVs demasiado cortos) sigue vivo por debajo.

# Qué significa

1. **T116 arregló su bucle, pero no arregló la generación.** La tasa por la
   vía normal es 0/5, no 2/5. Publicar tal cual deja la app igual de rota.
2. **La "mala racha de Cloudflare" del 26/08 por la tarde era, al menos en
   parte, este fallo.** Todas las combinaciones daban 1-2 de 5 porque todas se
   truncaban igual. El descarte de `llama-4-scout` como principal (1/5 frente
   a 2/5) se midió sobre datos contaminados por esto y **no vale**.
3. **Subir el techo de tokens no arregla nada**: con 2.500 el modelo se limita
   a gastar más espacio en blanco. Y sale caro — cada llamada desbocada gasta
   ~220 neuronas de las 10.000 diarias.
4. El tiempo real de una generación buena es de **32 a 41 s**, muy por encima
   del primer corte de espera de 24 s. Sea cual sea el arreglo del cierre, los
   `TIMEOUTS_CLOUDFLARE_GENERACION_MS` hay que rehacerlos con este dato.

# Lo que queda pendiente

Mar eligió el mismo día, entre cuatro opciones, **reparar el JSON en el
código**. Aplicado en T118: ver [arreglo-json-sin-cerrar.md](arreglo-json-sin-cerrar.md).
Queda sin medir si una secuencia de parada (`stop`) cortaría el bucle de
espacio en blanco antes de llegar al techo, que es lo que haría la llamada más
corta y más barata.

La tanda no se pudo repetir el mismo día: la cuota diaria de Cloudflare quedó
agotada a las 14:10. Cualquier medición nueva espera al reinicio diario.

Relacionado: [arreglo-bucle-saltos-de-linea.md](arreglo-bucle-saltos-de-linea.md),
[medicion-t114-desbocamiento.md](medicion-t114-desbocamiento.md),
[paso-13-evals.md](paso-13-evals.md).
