---
type: Incidente
title: "T109 · Por qué fallaba generar el CV: el modelo razonaba 58 s y nunca llegaba a tiempo"
description: "La generación de CV falló al 100% del 23 al 25/08/2026 porque @cf/google/gemma-4-26b-a4b-it es un modelo de razonamiento que tarda 58,5 s con el prompt real, muy por encima del corte de espera (34 s) y del máximo de Vercel (60 s). La teoría del cupo agotado era falsa. Se vuelve a mistral-small-3.1-24b-instruct."
tags: [jobs-app, incidente, ia, cloudflare, modelos, latencia, t109]
okf_version: "0.2"
timestamp: 2026-08-25T14:20:00Z
---

# El síntoma

Del 23 al 25/08/2026, **el 100% de las generaciones de CV y carta falló**:

- Los 13 casos de `generarCvYCarta` de la tanda de evals del 24/08 (T95),
  todos por timeout de Cloudflare.
- Las 6 generaciones que intentó Mar en producción la mañana del 25/08, con
  cuota fresca del día y las claves de Cloudflare ya en Vercel (T99).

La usuaria veía: *"Ha fallado varias veces seguidas para esta oferta"*.

# La causa (medida, no deducida)

`@cf/google/gemma-4-26b-a4b-it` —el modelo que usaba `generarCvYCarta` desde
el 23/08— es un **modelo de razonamiento**: antes de escribir su respuesta se
escribe a sí mismo un borrador interno larguísimo que no aparece en el
resultado, pero que sí cuesta tiempo y tokens.

La analogía: es como pedirle a alguien un resumen de una página y que, antes
de escribirlo, llene medio cuaderno de notas para sí mismo. Las notas no te
las entrega, pero has esperado igual mientras las escribía.

Medido el 25/08 con el prompt real de producción, quitándole el corte de
espera para ver el tiempo de verdad:

| Modelo | Tiempo | Tokens de salida | Resultado |
|---|---|---|---|
| `@cf/google/gemma-4-26b-a4b-it` | **58,5 s** | 7.042 (≈4.800 de razonamiento invisible) | CV y carta correctos |
| el mismo, con `reasoning_effort: "low"` | **83,0 s** | 9.093 (27.965 caracteres de razonamiento) | CV y carta correctos |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | **16,7 s** | 570 | CV y carta correctos |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | **6,7 s** | 404 | CV y carta correctos |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 10,8 s | 384 | ❌ CV de 377 car., no pasa `validarGeneracion` |

El corte de espera de Cloudflare estaba en **34 s** y el máximo de una función
de Vercel es **60 s**. Con 58 s de latencia mínima, **esa llamada no podía
funcionar nunca** — ni en producción ni en los evals. No era un fallo
intermitente ni de saturación: era estructural desde el primer día.

La propia API de Cloudflare lo declara: el modelo tiene `reasoning: true` y
devuelve un campo `reasoning_content` aparte del contenido. No expone ningún
parámetro para apagarle el razonamiento, y `reasoning_effort: "low"` lo
empeora en vez de mejorarlo.

# La teoría anterior era falsa

El 24/08 se atribuyó el 100% de timeouts a que **la cuenta de Cloudflare había
gastado su cupo diario** con las 12 llamadas de `extraerPerfil` de la misma
tanda, y como cobertura se subió el corte de espera de 26 a 34 s
([arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md)).

Era falso, y la subida a 34 s no arreglaba nada: para que gemma-4 cupiera
habría hecho falta un corte de **60 s o más**, que no cabe en Vercel. La
evidencia que lo desmiente es directa: el 25/08, con cuota fresca, ese modelo
seguía tardando 58 s mientras `mistral-small` tardaba 16 en la misma cuenta y
el mismo minuto.

**Lección**: cuando un proveedor "no responde", medir el tiempo real de una
llamada suelta *sin el corte de espera* antes de teorizar sobre el cupo. La
diferencia entre "no le da tiempo" y "no le queda cuota" son dos minutos de
comprobación.

# Cómo se vio en los datos

La tabla `metricas_ia` (Paso 17) lo enseñaba sin gastar una sola llamada. Los
6 intentos de Mar del 25/08:

```
motivo_fallo = error_proveedor   proveedor = null
duracion_ms  = 36.254 / 36.224 / 36.776 / 36.560 / 36.535 / 36.205
```

Siempre ~36,3 s = **34 s del corte de espera de Cloudflare + ~2 s del respaldo
de OpenRouter fallando**. Un patrón tan estrecho no es un proveedor saturado:
es un reloj.

(Para comparar: los 3 fallos del 24/08 por la tarde duraron 2,6-3,0 s — esos
sí eran las claves de Cloudflare que aún no estaban en Vercel, T99.)

# El arreglo (T109)

Decidido con Mar el 25/08 entre las alternativas medidas de la tabla:

1. **`MODELO_CLOUDFLARE_GENERACION` vuelve a
   `@cf/mistralai/mistral-small-3.1-24b-instruct`**, el mismo que ya usa
   `extraerPerfil`. Ventaja: un solo modelo que mantener, y ya conocido.
2. **`TIMEOUT_CLOUDFLARE_GENERACION_MS` baja de 34 a 26 s** — los 34 eran la
   tirita del 24/08. Con 16,7 s medidos, 26 s vuelve a ser el margen holgado
   de siempre.
3. **`TIMEOUT_OPENROUTER_GENERACION_MS` sube de 10 a 14 s** por ronda, con los
   8 s que se liberan: con 10 s, cualquier modelo de respaldo que tarde lo
   normal caía por timeout en vez de por un fallo real.

Presupuesto total: 26 + 14 + 14 = **54 s**, con 6 s de margen bajo los 60 s de
Vercel.

Verificado de extremo a extremo con el código ya cambiado: **13,2 s**,
proveedor Cloudflare, CV de 509 y carta de 1.357 caracteres.

## Lo que este arreglo NO garantiza todavía

`mistral-small-3.1-24b-instruct` es **el mismo modelo que dio el ROJO del
23/08** en esta llamada (8 fallos de contenido; el más grave, inventarse una
carrera universitaria entera para un CV de 3 líneas —
[paso-13-evals.md](paso-13-evals.md), caso B06). Por eso se cambió entonces.

Pero aquel ROJO fue **con el prompt de antes de T94**, y el refuerzo de T94
contra la invención de secciones
([decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md))
**nunca ha llegado a probarse**: todas las tandas posteriores murieron por el
timeout de gemma-4 antes de producir una sola señal de contenido.

La tanda de evals lanzada tras este cambio es la primera que puede decir algo
real sobre T94. Si vuelve a salir ROJO, el siguiente candidato ya está medido:
`@cf/meta/llama-4-scout-17b-16e-instruct` (6,7 s).

# Lo que dijo la tanda de evals de este cambio (25/08, tarde)

**ROJO, pero por el motivo contrario al de agosto.** El detalle importa más
que el veredicto:

| Casos | CV generado | Resultado |
|---|---|---|
| B02, B04, B08, B12, B13 | 380-760 car. | ✅ |
| B01, B03, B05, B07, B09, B10 | 125-348 car. | ❌ demasiado corto |
| B06, B11 | — | ❌ sin saltos de línea reales |

**Ni un solo fallo de invención.** Ninguno. Ésa es la primera confirmación real
de que el refuerzo de T94
([decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md))
**funciona**: el modelo que en agosto se inventaba una carrera universitaria
entera ya no se inventa nada.

El problema es el opuesto: se ha vuelto tan cauto que escribe CVs de tres
líneas. La regla de T94 ("si el CV original no lo dice, omite la sección
entera") se pasó de frenada y el modelo la extendió a "recorta todo lo que
puedas". En agosto el péndulo estaba en *inventa*; ahora está en *no escribe*.

La mayoría de los fallos de `resistencia_inyeccion` del informe son efecto
secundario de lo mismo, no inyecciones que colaran: cuando el CV sale corto la
salida es un mensaje de error, y varias aserciones empiezan por
`if (output.error) return false`.

## El ajuste del prompt (25/08, decidido con Mar)

En `lib/ia.ts` (`mensajesDeGeneracion`) y en `prompts/system.md`, coherentes:

1. **Qué significa OMITIR**: solo secciones que el CV original no menciona;
   nunca una excusa para recortar lo que sí está. El CV generado recoge TODA
   la experiencia del original, reordenada — si el original tiene cuatro
   puestos, el generado lleva los cuatro. Ante la duda entre acortar y
   conservar algo que sí está, se conserva.
2. **Saltos de línea reales** dentro de `cv_texto` (el `
` del JSON): un CV
   en una sola línea corrida se rechaza por bueno que sea su contenido.

## Estado al cerrar el 25/08: mejora medida, pero SIN confirmar

Se relanzaron **solo los 8 casos que fallaban** (`--filter-pattern`), para no
gastar otra tanda entera. Resultado no concluyente:

- **2 pasan** (B01 subió de 348 a 468 caracteres — el ajuste hace efecto).
- **1 sigue corto** (212 caracteres).
- **5 se perdieron por timeout de Cloudflare**, no por calidad.

Los 5 timeouts no son falta de cupo: comprobado inmediatamente después, la
cuenta responde en 0,8 s a una llamada suelta, y tres generaciones completas
con el prompt nuevo y un CV de 11.274 caracteres tardaron **8,8 / 9,6 /
11,1 s**. Son picos de latencia de Cloudflare durante la tanda (la varianza ya
documentada el 23/08: 12,8-21,3 s en cinco peticiones iguales).

**A vigilar en la próxima tanda**: si vuelven a aparecer timeouts con
`TIMEOUT_CLOUDFLARE_GENERACION_MS` en 26 s, habrá que subirlo — pero
midiéndolo, no por corazonada, y quitándole entonces margen a las rondas de
OpenRouter, no a los 60 s de Vercel.

**Queda pendiente**: una tanda completa de `evals:generar` con cuota fresca
para saber si el ajuste del prompt basta. Si no basta, el siguiente candidato
ya está medido: `@cf/meta/llama-4-scout-17b-16e-instruct` (6,7 s).

# Hallazgo colateral: el respaldo de OpenRouter no respalda nada

Comprobado en vivo el mismo día:

- Los dos modelos de `RONDAS_MODELOS` (`google/gemma-4-26b-a4b-it:free` y
  `z-ai/glm-5.2:free`) devuelven **429 en menos de medio segundo**
  (`temporarily rate-limited upstream`, del pool compartido del proveedor, no
  de nuestra cuenta). Esos son los ~2 s que se sumaban a los 36 s.
- Además, la ronda 1 usaba **el mismo modelo lento de razonamiento** que
  Cloudflare, con solo 10 s de espera: condenado por partida doble.
- En el catálogo de OpenRouter, `google/gemma-4-26b-a4b-it:free` ni siquiera
  declara `structured_outputs`, que es el `response_format: json_schema` que
  esta cascada le pide siempre. De los 17 modelos `:free`, solo cuatro lo
  declaran, y de esos el único que respondió a una prueba real es
  `dots-studio/dots-3-note-preview:free` — que también razona.

No se ha tocado: la regla del propio fichero es no poner un modelo de respaldo
sin medirlo antes en vivo. Queda como **T112**.

> ✅ **T112 medida el 27/08/2026, y la respuesta es que no hay sustituto.**
> Probados los 17 modelos `:free` con el prompt real: ninguno genera el
> documento. `dots-3` confirma la sospecha de aquí arriba —razona y agota el
> techo antes de escribir nada—, pero el dato que manda es otro: **8 de los 17
> están bloqueados por la propia política de privacidad de la cuenta**, que es
> el precio correcto de haber apagado los endpoints que entrenaban con los CVs.
> En la práctica **Cloudflare es proveedor único**. Ver
> [medicion-t112-respaldo-openrouter.md](medicion-t112-respaldo-openrouter.md).

# Segunda vuelta: el arreglo del prompt rompió la generación otra vez

La misma tarde del 25/08, ya con el modelo arreglado, el ajuste de prompt
contra los CVs cortos (commit `7e41a11`) **volvió a dejar la generación al
0 %** — y por una causa distinta y más instructiva que la primera.

La regla añadida decía, en mayúsculas, que el CV generado "RECOGE TODA la
experiencia" del original y que "ante la duda entre acortar o conservar, se
conserva". Lo que no decía en ninguna parte era **dónde parar**. Con
`MAX_TOKENS_CLOUDFLARE_GENERACION = 12.000`, el modelo se puso a escribir y no
paró: a los 180 segundos Cloudflare cortaba con

    HTTP 408 · AiError: Request timeout (código 3046)

## Cómo se aisló

Todas las hipótesis baratas se descartaron **antes** de tocar el prompt, con
sondas en vivo de una llamada cada una:

| Sospecha | Prueba | Resultado |
|---|---|---|
| Cupo de Cloudflare agotado | petición mínima | HTTP 200 en **0,9 s** |
| El esquema JSON forzado | mismo prompt con y sin `response_format` | 10,2 s / 13,0 s |
| El tamaño del prompt | relleno de 2.102, 6.142 y 12.202 caracteres | 21,6 / 13,1 / 15,0 s |
| El endpoint compatible con OpenAI | `/ai/v1/chat/completions` contra `/ai/run/` | 15,8 s / 13,6 s |
| Una salida larga | pidiendo CV de 3.000 y carta de 1.500 caracteres | 16,8 s / 14,3 s |
| `max_tokens: 12.000` | contra 7.000, mismo prompt | 15,1 s / 19,9 s |

Ninguna reproducía el cuelgue. El que lo reprodujo fue el **A/B del prompt**,
en el mismo minuto y con la misma llamada real:

| Prompt | Resultado |
|---|---|
| Anterior (`4d7b87f`) | HTTP 200 en **13,0 s**, 510 tokens de salida |
| Ajustado (`7e41a11`) | **408 a los 182 s**, tres veces seguidas |

Quitar la regla de los saltos de línea no cambió nada: la culpable era la de
"conserva todo".

## Una conclusión precipitada, y su correccion

Al encontrarlo se dio por hecho que este cuelgue era **también** lo que había
llenado de "sin evaluar" la tanda de evals del robot esa tarde, y lo que le
hizo dictar NO CONCLUYENTE. **Los números lo desmienten**: la tanda con el
prompt desbocado tuvo **17** casos sin evaluar y la siguiente, ya con el
prompt acotado, tuvo **18**. Si el desbocamiento fuera la causa, habrían
bajado.

El cuelgue era real —A/B, tres repeticiones— pero rompía la generación **en
producción y en local**, no los evals del robot. Los timeouts del robot tienen
otra causa, todavía sin identificar (ver T114).

La lección que sí queda: **una explicación que encaja no es una explicación
comprobada**. Bastaba comparar los dos recuentos de "sin evaluar" para verlo,
y ese recuento estaba delante desde el primer momento.

## El arreglo

La regla se reescribió acotada, y con un final explícito:

> Cuando hayas recorrido el CV original una vez, PARA. No repitas secciones,
> no vuelvas sobre un puesto ya escrito y no rellenes para alargar: el CV
> generado ocupa aproximadamente lo mismo que el original, nunca varias veces
> más.

Medido: **13,5 s**, 471 tokens de salida, CV de 545 caracteres (con el prompt
anterior salían 509). La instrucción que faltaba no era más énfasis, era un
límite.

# Relacionado

- [pendiente-generacion-cv-falla-25-08.md](pendiente-generacion-cv-falla-25-08.md) —
  el planteamiento del problema, escrito antes de diagnosticarlo.
- [arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md) — la teoría
  del cupo, que este documento desmiente.
- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md) — por
  qué se eligió gemma-4 el 23/08 (por precio en neuronas y confianza previa,
  sin medir su latencia).
- [decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md) —
  el refuerzo de T94, todavía sin verificar.
- [paso-17-vigilancia.md](paso-17-vigilancia.md) — la tabla `metricas_ia`, que
  dio el diagnóstico sin gastar cuota.
