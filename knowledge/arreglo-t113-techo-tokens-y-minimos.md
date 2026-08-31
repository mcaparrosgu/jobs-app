---
type: Arreglo
title: "T113 · Los CVs cortos eran tres averías distintas: un listón mal puesto, un techo de tokens y una regla que faltaba"
description: "Medido el 30/08/2026 con cuota fresca. La sonda descartó lo primero que había que descartar: la secuencia de parada de T119 NO es la causa de los CVs cortos (B02/B03/B06 salen igual de cortos sin ella). Volcando la respuesta cruda salieron tres averías separadas que se estaban leyendo como una: (1) el mínimo de longitud exigía a un CV honesto más de lo que la entrada daba, porque reformatear COMPRIME; (2) B05 no salía corto, salía TRUNCADO a media faena por el techo de tokens, que con un CV de entrada enorme no da para el documento; (3) la carta se inventaba el carácter de la empresa cuando la oferta no traía descripción — regla documentada en prompts/system.md pero nunca escrita en el prompt real. De paso, dos cosas que se probaron y se retiraron por medición."
tags: [jobs-app, arreglo, ia, cloudflare, generacion, evals, guardrails, t94, t113, t116, t117, t119]
okf_version: "0.2"
timestamp: 2026-08-30T11:30:00Z
---

# De dónde se venía

[arreglo-t113-cv-corto-entrada-pobre.md](arreglo-t113-cv-corto-entrada-pobre.md)
(29/08) arregló que los mínimos contaran el texto ajeno al CV (B07/B10) y dejó
una hipótesis por medir: **que fuera la secuencia de parada `\t\t\t` de
[T119](medicion-t119-secuencia-parada.md) la que cortaba los CVs de
B02/B03/B05/B06**, ya que solo se había validado sobre 5 casos.

# Lo primero: la hipótesis era falsa

`STOP=ninguna` en la sonda (opción nueva: le quita `stop` a la petición sin
tocar `lib/ia.ts`, que es código de producción):

| Caso | Con parada | Sin parada | Veredicto |
|---|---|---|---|
| B02 | 184 car. | **177** | igual de corto |
| B03 | 221 car. | **224** | igual de corto |
| B06 | 130 car. | **130** | idéntico |
| B05 | 215 car. | **1499** | aquí sí cambia |

**La parada no tiene nada que ver con B02/B03/B06.** Se queda donde está: sigue
siendo lo que baja una generación de 36,5 s a 11,2 s cuando dispara.

Y esto separó el problema en dos, que es lo que llevaba dos días sin verse.

# Avería 1 · El listón, no el modelo: reformatear COMPRIME

`largoMinimoCv` ancla el mínimo a la longitud del CV de **entrada**. Sobre una
entrada ya minúscula, un CV fiel sale **por debajo** de ella sin que falte
nada: al reformatear se funde el encabezado, se quita el "Experiencia:" de
delante, se unen líneas sueltas. B02 quedaba a 42 caracteres del listón, B03 a
21, B06 a 27.

Se pidió un CV correcto y se rechazó por 15-40 caracteres.

**Arreglo** (`largoMinimoCv`): por debajo de `UMBRAL_CV_CORTO` (250 car. de
entrada) el mínimo pasa a ser `TOLERANCIA_CV_CORTO` (72 %) de lo que traía la
entrada, y el suelo duro baja de 150 a 110. Por encima del umbral, el mínimo de
siempre. `evals/promptfoo/helpers.cjs` replica la misma forma (regla de
`CLAUDE.md`: si se toca un validador, el helper no puede contradecirlo).

**Resultado en la tanda completa: B02, B04, B06 y B11 pasan, sin una sola
regresión.** `idioma` sube de 83,3 % a **100 %**.

# Avería 2 · B05 no salía corto, salía truncado

B05 (export de LinkedIn gigante) daba **203, 1.074, 1.499 y 1.847 caracteres en
cuatro llamadas**. Eso no es un modelo que resume de más: es un corte en un
sitio distinto cada vez.

Volcando la respuesta cruda (`VER_CRUDO=1`, opción nueva de la sonda) se ve:
`finish_reason: "length"`, 1.500 de 1.500 tokens. **El modelo intenta recoger
entero un CV enorme, se queda sin techo A MEDIA FAENA**, y `repararJsonCortado`
(T118) solo puede salvar las líneas ya cerradas — de ahí que el resultado varíe
según por dónde le pillara.

**Subir el techo no es opción**: a ~40 tokens/s, 1.500 tokens ya son ~38 s y el
corte de Cloudflare está en 48 s. El documento tiene que **caber**.

**Arreglo**: `CV_ENTRADA_LARGA_CARACTERES` (3.000). Por encima de ahí,
`mensajesDeGeneracion` añade una regla que le pide seleccionar lo relevante en
vez de recogerlo todo, sin pasar de ~30 líneas.

## El detalle que casi cuesta caro: el techo tiene que ser CONDICIONAL

La primera versión puso ese límite como regla fija para todos. Medido en vivo:
**B01, el caso base del golden dataset, bajó de 421 a 366 caracteres y suspendió
su propio mínimo de 400.** El modelo lee un límite superior como objetivo.

Es exactamente el patrón de T109 y T116: un refuerzo de prompt que arregla un
caso y rompe otro. Aquí se cazó en la misma sesión porque la sonda medía B01 al
lado de B05.

**La regla se decide en código, no en el prompt**: una generación normal recibe
el prompt de siempre, byte a byte, y la regresión es imposible por
construcción. Prueba en `tests/lib/ia-cv-entrada-pobre.test.ts`, **vista fallar
a propósito** poniendo el umbral a 0.

# Avería 3 · La carta se inventaba la empresa

Aparecida al arreglar la avería 1: hasta entonces B03 ni llegaba a generarse.
Con una oferta que solo trae **título y empresa**, la carta le atribuía a
"Residencial Buenavida" un carácter que nadie había dado.

`prompts/system.md` §4 lo documentaba como caso límite desde el principio —
*"no inventes requisitos ni funciones que la oferta no ha declarado"*— pero
**esa regla nunca llegó al prompt real** de `mensajesDeGeneracion`. La
documentación describía un comportamiento que el código no pedía.

**Arreglo**: regla nueva en el prompt. La empresa es un DATO, no un tema; sin
descripción, la carta la nombra y no la describe. Frases como *"su reconocida
trayectoria"* son información inventada igual que una cifra falsa.

# Avería 4 · Un listón que vigilaba un fallo ya imposible

`LINEAS_MINIMAS_CV = 6` se puso cuando el modelo devolvía el CV como **texto
libre** y podía escribirlo todo corrido. Desde T116 el esquema pide una
**lista** (`cv_lineas`): un CV "todo en un bloque" es hoy una lista de un
elemento, que el suelo de 3 caza sin ayuda.

El 6 se quedó vigilando un fallo imposible y tumbando documentos correctos:
**B13 —el caso *fácil*— salió en 5 líneas y se llevó por delante `formato` y
`fidelidad` enteros**. B03, B08 y B10 salen habitualmente en 5-6. El listón
estaba justo encima de lo que produce un CV honesto de dos puestos: una moneda
al aire, no una comprobación. Baja a 5.

# El multiplicador que hace que todo esto duela tanto

Vale la pena dejarlo escrito, porque explica por qué la puerta parece tan
frágil: **cuando `validarGeneracion` lanza, TODAS las aserciones de ese caso
caen**, no solo la de `formato`. Un CV 30 caracteres corto se cuenta también
como fallo de `fidelidad`, de `idioma` y de `resistencia_inyeccion`.

Por eso B05 y B13 solos hundieron cuatro métricas el 30/08. Y por eso un listón
mal calibrado no es un detalle cosmético: es el mayor amplificador de ruido que
tiene el arnés.

# Lo que se probó y se RETIRÓ

Dos cosas escritas esta misma sesión y quitadas por medición, no por opinión:

1. **Un reintento sin secuencia de parada** cuando el CV salía corto. Se retiró
   por dos razones: (a) no hacía falta — la cola cruda enseña que el documento
   **siempre** está entero cuando empieza el relleno (cierra `cv_lineas` con
   `]`), de eso ya se ocupa `repararJsonCortado`; y (b) **no cabía**: medido en
   vivo sobre B01, primera llamada más reintento se fueron a **51 s**, con
   `maxDuration = 60` en la ruta. Encima el reintento iba sin parada y agotaba
   los 1.500 tokens rellenando de tabuladores que la parada sí habría cortado.
2. **El techo de tamaño como regla fija** — ver la avería 2.

# Estado y qué falta

Verificado en vivo (sonda, cuota fresca del 30/08):

| Caso | Antes | Después | |
|---|---|---|---|
| B01 · base | 366 (con el techo fijo) | **423 car.**, 13,7 s | ✅ |
| B03 · sin descripción | inventaba la empresa | **221 car.**, 10,4 s | ✅ |
| B05 · CV enorme | 203 car. | **1.805 car.**, 33,8 s | ✅ |
| B13 · fácil | 5 líneas, mínimo 6 | **412 car.**, 14,2 s | ✅ |

306 pruebas en verde, tipos y lint limpios. Las pruebas nuevas se han **visto
fallar a propósito**.

✅ **31/08/2026 — tanda completa hecha, puerta VERDE. T113 y T95 cerradas.**
`npm run evals` (las dos llamadas) con cupo fresco, 0 errores: formato 100 %,
calidad_palabras_clave 100 %, fidelidad 92 %, idioma 100 %,
resistencia_inyeccion 90,9 % — todas por encima de umbral. Ninguna de las
cuatro señales de esta avería volvió (B01/B03/B05/B13 pasan) y **B12** salió
`[PASS]` (lo cerró `depurarDatosDeContacto` el 30/08). `resultado-perfil.json`
se regeneró ese día, así que la trampa de la tanda vieja también queda resuelta;
los 3 fallos residuales son de `extraerPerfil` (A06, A10, B07), con las métricas
por encima de umbral. Acto seguido, `medicion-t114` se publicó a producción con
`[sin evals]`. Ver `knowledge/log.md` (31/08).

# Lecciones

- **La forma de un fallo intermitente caduca, y también su causa aparente.** La
  hipótesis de la parada era razonable y estaba escrita; costó dos
  generaciones descartarla y sin eso se habría tocado el prompt a ciegas.
- **Un límite superior en un prompt se lee como objetivo.** Si hay que ponerlo,
  que lo decida el código y solo para el caso que lo necesita.
- **Una regla documentada no es una regla implementada.** `prompts/system.md`
  llevaba desde el principio el caso "oferta sin descripción" que el prompt
  real nunca dijo. Merece un repaso: puede haber más.

# Relacionado

- [arreglo-t113-cv-corto-entrada-pobre.md](arreglo-t113-cv-corto-entrada-pobre.md)
  — el arreglo del 29/08, del que sale la hipótesis que aquí se descarta.
- [medicion-t119-secuencia-parada.md](medicion-t119-secuencia-parada.md) — la
  parada, que se queda como está.
- [medicion-t117-cierre-json.md](medicion-t117-cierre-json.md) y
  [arreglo-json-sin-cerrar.md](arreglo-json-sin-cerrar.md) —
  `repararJsonCortado`, la red que hace innecesario el reintento retirado.
- [decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md) —
  T94, de donde viene `largoMinimoCv` flexible.
- [paso-13-evals.md](paso-13-evals.md) — umbrales y lectura del veredicto.
