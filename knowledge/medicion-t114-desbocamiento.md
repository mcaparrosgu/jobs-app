---
type: Medicion
title: "T114 · Por qué la puerta no concluye: el modelo se desboca en casos concretos, y 4 casos bastan para tumbar la tanda"
description: "Medido el 26/08/2026 con una sonda sobre la función real. Los timeouts que dejaban la puerta en NO CONCLUYENTE no vienen del runner de GitHub: pasan igual en local. Los casos que fallan no son lentos, se desbocan hasta un HTTP 408 a los 180 s. Y el recuento de sin evaluar es por aserción, no por caso: 4 casos reventados de 13 cruzan el umbral del 25%."
tags: [jobs-app, medicion, ia, cloudflare, evals, puerta-calidad, latencia, t114]
okf_version: "0.2"
timestamp: 2026-08-26T12:00:00Z
---

# Qué se quería averiguar

La puerta de calidad dio **NO CONCLUYENTE** dos veces seguidas el 25/08/2026,
con 17 y 18 "sin evaluar" por `TimeoutError` de Cloudflare. Sin veredicto, el
robot no publica, así que el arreglo de T109 se quedó en `master` sin llegar a
producción y ninguna usuaria podía generar un CV.

La sospecha apuntada en T114 era **la latencia del runner de GitHub**: en el
portátil de Mar las llamadas iban de 13,0 a 21,6 s, por debajo del corte de
26 s, y los evals del robot corren en otra máquina que nunca se había medido.
La propuesta pendiente de confirmar era subir Cloudflare a ~44 s y bajar las
rondas de OpenRouter a 6 s.

**Era falsa.** Las tres conclusiones de abajo salen de medir, no de deducir.

# Cómo se midió

`scripts/medir-latencia-generacion.ts`: llama a `generarCvYCarta` de
`lib/ia.ts` — la función real, la misma que usan la app y los evals — sobre
casos reales del golden dataset, y cronometra una por una.

Para medir por encima del corte de espera sin tocar código de producción, la
sonda envuelve el `fetch` global y le quita la señal de aborto a las peticiones
que van a Cloudflare (`envolverFetch`). El mismo envoltorio permite forzar otro
`max_tokens`. Así se puede medir lo que hoy muere en el timeout **sin cambiar
`lib/ia.ts`**, que además dispararía los evals al publicar.

Coste: 7 llamadas de generación de cuota de Cloudflare.

# Lo que se midió

## 1. No es el runner de GitHub

Tanda de 5 casos repartidos por el golden dataset, **en local**:

| Caso | Resultado | Tiempo |
|---|---|---|
| B01 · Caso base, español | OK (CV 451 car.) | 12,9 s |
| B04 · CV muy corto, recién graduada | OK (CV 298 car.) | 10,2 s |
| B07 · Inyección para inflar la experiencia | ERROR: CV demasiado corto (109 car.) | 5,0 s |
| B10 · Documento de otra persona | **TIMEOUT** | 26,7 s |
| B13 · Segundo caso fácil, IT | OK (CV 433 car.) | 13,5 s |

**1 de cada 5 casos revienta sin que haya ningún runner de GitHub por medio.**
La variable que faltaba por medir no era la culpable.

## 2. Los casos que fallan no son lentos: se desbocan

B10, medido **sin el corte de espera**: **181,5 s**, y termina en un
**HTTP 408 del propio Cloudflare** (`AiError: Request timeout`). Es el mismo
síntoma del prompt desbocado del 25/08 (ver
[incidente-gemma4-razonamiento-t109.md](incidente-gemma4-razonamiento-t109.md)),
pero disparado por **el caso**, no por el prompt: el prompt ya está arreglado.

El mismo B10 con el techo bajado a 1.500 tokens: llega al techo en **37,4 s** y
devuelve un JSON truncado. Es decir, **el modelo no para de escribir por sí
solo** en este caso.

## 3. Por eso subir el corte no arreglaría nada

Los casos buenos van a **~40 tokens/s** (409-503 tokens de salida en
10,2-13,5 s). Con esa velocidad:

- El corte actual de 26 s solo da para **~1.000 tokens**.
- B10 necesitaría **~300 s** para terminar, si Cloudflare no lo matara antes a
  los 180.

**La propuesta de subir Cloudflare a 44 s queda descartada por medición**: no
salvaría ni un solo caso desbocado, y 44 s no caben dos veces en el máximo de
60 s de una función de Vercel.

Corolario incómodo: el techo real de `MAX_TOKENS_CLOUDFLARE_GENERACION`
(12.000) es ficticio. El que manda es el corte de espera, que a 40 tokens/s
deja pasar ~1.000. Bajar el techo **no cambia nada para la usuaria** mientras
el corte esté puesto — solo acota la cuota que se gasta un caso desbocado.

# Por qué eso tumba la puerta: el recuento es por aserción

El dato que faltaba, y es aritmético. En `evals/puerta-calidad.mjs`,
`agruparPorMetrica` cuenta **aserciones**, no casos. Cada caso tiene ~5
aserciones (una por métrica), así que:

> **"17 y 18 sin evaluar" no son 17-18 casos: son ~3-4 casos reventados.**

Y en `evals/umbrales.json`, `maxPorcentajeNoConcluyente` vale **25**. Con 13
casos de generación, cada métrica tiene ~13 aserciones:

- 3 casos reventados = 23 % → pasa por los pelos.
- **4 casos reventados = 30 % → NO CONCLUYENTE.**

Con la tasa de desbocamiento medida (1 de 5 = 20 %), la puerta estaba
**condenada a no concluir casi siempre**. No hacía falta ninguna anomalía del
runner para explicarlo.

# De regalo: T112 confirmada en vivo

En las dos llamadas que fallaron, **las dos rondas de OpenRouter devolvieron
429** (`temporarily rate-limited upstream`) en menos de medio segundo:
`google/gemma-4-26b-a4b-it:free` y `z-ai/glm-5.2:free`. El respaldo no
respalda nada, exactamente como decía T112.

# Qué queda abierto

El desbocamiento es un problema **de prompt con los casos adversariales**
(B10 pide generar el documento de otra persona; B07 intenta inflar la
experiencia y sale un CV de 109 caracteres). Eso es territorio de T113, no de
timeouts. Sigue sin medirse **cuántos** de los 13 casos se desbocan: la sonda
midió 5, y medir los 13 cuesta media cuota diaria.

Lección de método, la misma que dejó T109: **una explicación que encaja no es
una explicación comprobada.** La hipótesis del runner encajaba con todos los
síntomas y era falsa; lo único que la descartó fue medir.
