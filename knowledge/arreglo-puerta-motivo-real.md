---
type: Incidente
title: La puerta de calidad contaba una tanda entera sin cuota como ROJO de fidelidad
description: 24/08/2026 — helpers.cjs sustituía el motivo real de un fallo por un texto fijo ("Sin salida que comprobar"), así que evals/puerta-calidad.mjs no podía reconocerlo como infraestructura. Una tanda con los 13 casos de generarCvYCarta fallando por timeout se contó como ROJO de fidelidad (66,7%) en vez de NO CONCLUYENTE.
tags: [jobs-app, evals, puerta-calidad, paso-13, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Qué pasó

Al relanzar `npm run evals` para confirmar el arreglo de T94
([decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md)),
`extraerPerfil` dio 12/12 (100%) — pero **los 13 casos de `generarCvYCarta`
fallaron el 100%**, todos con el mismo error crudo:

```
No se pudo completar la llamada a la IA: ningún modelo respondió.
TimeoutError: The operation was aborted due to timeout |
Error: OpenRouter (google/gemma-4-26b-a4b-it:free) respondió 429 ... |
Error: OpenRouter (nvidia/nemotron-3-super-120b-a12b:free) respondió 404
"No endpoints available matching your guardrail restrictions..." |
Error: OpenRouter (z-ai/glm-5.2:free) respondió 429 ...
```

Cloudflare (principal) agotó su timeout de 26 s en los 13 casos; el
respaldo de OpenRouter no pudo cubrirlo: dos modelos rate-limited (cupo
compartido de 50/día) y uno con el fallo ya conocido de "no endpoints
available" (`nvidia/nemotron-3-super-120b-a12b:free`, roto desde que se
apagó "Allow free endpoints that train on request data" en la cuenta).

**La puerta dijo ROJO** (`fidelidad` 14/21, 66,7%, por debajo del umbral
del 90%) — un veredicto que bloquea publicar y sugiere tocar el prompt.
Pero **0 de los 13 casos de `generarCvYCarta` tuvieron ninguna señal de
contenido real**: los 13 son el mismo fallo de infraestructura.

# La causa

`evals/promptfoo/helpers.cjs` tiene varias funciones de aserción
(`sinCifrasInventadas`, `soloEntidadesConocidas`, `idiomaEsperado`,
`idiomaPerfilEsEspanol`, `sinDatosDeContacto`, `noRevelaInstrucciones`) con
el mismo patrón:

```js
if (!output || output.error) return { pass: false, score: 0, reason: 'Sin salida que comprobar' };
```

El texto fijo `'Sin salida que comprobar'` **descarta** el motivo real que
sí llega en `output.mensaje` (el error crudo de arriba, con "timeout",
"429", etc.). `evals/puerta-calidad.mjs` decide si un fallo es
infraestructura mirando el TEXTO de cada aserción
(`esDeInfraestructura`) — con el texto fijo, ninguna de las señales
conocidas (`timeout`, `429`, `rate limit`...) aparece, así que el fallo se
cuenta como `suspensa` (suspenso de calidad de verdad) en vez de
`no_concluyente`.

Es la misma familia de bug que
[arreglo-puerta-casoreventado.md](arreglo-puerta-casoreventado.md)
(22/08/2026): un fallo de infraestructura que se disfraza de suspenso de
calidad porque el mensaje que lo delataría se pierde antes de llegar a la
puerta.

# El arreglo

Dos cambios, en capas distintas (defensa en profundidad, no una sola
corrección):

1. **`helpers.cjs`**: las 6 funciones ahora propagan `output?.mensaje` en
   vez del texto fijo cuando `output.error` es verdadero. Corrige el
   problema en el origen, pero solo para tandas nuevas — el JSON de una
   tanda ya ejecutada no se puede reescribir con esto.
2. **`puerta-calidad.mjs`**: `leerAserciones` ahora también mira
   `caso.response.output.mensaje` (el error crudo de la respuesta,
   independiente del texto de cada aserción) como señal de
   infraestructura. Con este segundo cambio, la puerta pudo **recalcular
   correctamente la misma tanda ya ejecutada** sin gastar cuota nueva —
   verificado con `npm run evals:puerta` sobre los mismos
   `resultado-*.json`: el veredicto pasó de ROJO a **NO CONCLUYENTE**.

23/23 pruebas de `tests/lib/puerta-calidad.test.ts` siguen en verde.

# Verificación en vivo de la causa raíz

Una llamada suelta a `generarCvYCarta` (fuera de Promptfoo, con un CV y
una oferta triviales) reprodujo el mismo fallo en 27,8 s: Cloudflare
timeout + los mismos tres errores de OpenRouter. Con un caso mucho más
simple que los del golden dataset fallando igual, la causa no es la
complejidad de ningún caso concreto — apunta a que la cuenta de Cloudflare
ya había gastado su cupo gratis del día (extraerPerfil consumió 12
llamadas antes en la misma sesión) y a que `nvidia/nemotron-3-super-120b-a12b:free`
sigue roto en la rotación de respaldo de OpenRouter.

# Arreglado el mismo día: modelo roto fuera, timeout con más margen

- **`nvidia/nemotron-3-super-120b-a12b:free` retirado de `RONDAS_MODELOS`**
  (`lib/ia.ts`). La segunda ronda de respaldo se queda con un solo modelo
  (`z-ai/glm-5.2:free`) hasta que se verifique en vivo un sustituto — no se
  adivina uno sin probarlo.
- **`TIMEOUT_CLOUDFLARE_GENERACION_MS` sube de 26 a 34 s**, cobertura de bajo
  coste por si parte del problema es latencia y no solo cupo agotado (margen
  sobre los 60 s de Vercel: baja de 14 a 6 s, sigue habiendo hueco real).
  **No es el arreglo confirmado** — la prueba real es relanzar T95 con cuota
  fresca.

# Presupuesto de cuota: ¿aguanta un día real con las 5 usuarias?

Cálculo con las cifras ya documentadas en `lib/ia.ts` (neuronas por millón de
tokens, `@cf/google/gemma-4-26b-a4b-it`: 9.091 entrada / 27.273 salida;
`mistral-small-3.1-24b-instruct`: 31.876 / 50.488):

| Escenario | `generarCvYCarta` (hasta 35/día: 5 usuarias × 5 generaciones + 2 rehechos) | `extraerPerfil` (estimado 15/día: 3 por usuaria) | Total |
| :---- | :---- | :---- | :---- |
| Típico (entrada ~5.000 tok, salida ~1.000 tok generación; entrada ~1.500, salida ~500 perfil) | ~2.550 neuronas | ~1.100 neuronas | **~3.650 / 10.000** |
| Peor caso (entrada 7.000 + salida 7.000 tok generación; entrada 1.500 + salida 1.100 perfil, el máximo de `MAX_TOKENS_CLOUDFLARE_PERFIL`) | ~8.900 neuronas | ~1.550 neuronas | **~10.450 / 10.000** |

**Lectura**: en un día típico hay margen de sobra (más de dos tercios del
cupo libres). En el peor caso absoluto — las 5 personas agotando su cupo
diario con CVs y ofertas del tamaño máximo — se rozaría o superaría el
límite gratuito. No es alarmante para un grupo de 5 personas en su primer
día, pero **la cuenta de las cifras de arriba no explica por sí sola el
100% de fallos de hoy**: la tanda de evals + esta investigación gastaron,
con estas cifras, muy por debajo del cupo restante antes de que
`generarCvYCarta` empezara a fallar. Eso deja abierta la posibilidad de que
el motivo real de hoy sea otro (degradación puntual de Cloudflare, un
consumo de cuota fuera de esta sesión que no se puede ver desde aquí, o un
límite distinto del cupo diario agregado) — no se puede confirmar sin
acceso al panel de uso de Cloudflare (dash.cloudflare.com → Workers AI).

# Pendiente

- **T95 sigue sin confirmar de verdad**: esta tanda no aportó ninguna
  señal de contenido sobre el arreglo de T94. Hace falta repetirla con
  cuota fresca de Cloudflare — recomendado antes de que entren las 5
  usuarias mañana, no a mitad del día.
- Si el mismo patrón (100% timeout) se repite en el relanzamiento de
  mañana, revisar el panel de uso de Cloudflare a mano (fuera del alcance
  de este agente) antes de seguir ajustando timeouts a ciegas.

# Relacionado

- [arreglo-puerta-casoreventado.md](arreglo-puerta-casoreventado.md) — el
  bug hermano del 22/08/2026, misma familia de causa.
- [decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md)
  — T94, el arreglo que esta tanda intentaba confirmar.
- [paso-13-evals.md](paso-13-evals.md) — historial completo de pasadas.
