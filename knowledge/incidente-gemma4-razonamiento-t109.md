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
