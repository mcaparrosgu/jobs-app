---
type: Decision
title: Arreglo del ROJO de generarCvYCarta — prompt reforzado + mínimo de CV flexible
description: T94 (24/08/2026) — decidido con Mar entre cuatro opciones. Se ataca a la vez el prompt (invención de secciones, inyección colando datos falsos) y el mínimo fijo de 400 caracteres del CV generado, que penalizaba a los CVs de entrada más cortos.
tags: [jobs-app, ia, evals, paso-13, generarcvycarta, okf]
timestamp: 2026-08-24T00:00:00Z
---

# Qué se decidió

El ROJO del 23/08/2026 (`paso-13-evals.md`) agrupaba tres problemas
distintos en `generarCvYCarta` con Cloudflare. Preguntado explícitamente
—regla de `CLAUDE.md`, no cerrar una elección entre varias opciones sin
preguntar— entre cuatro caminos (reforzar solo el prompt, flexibilizar solo
`LARGO_MINIMO_CV`, las dos cosas en el mismo cambio, o investigar otro
modelo), **Mar eligió "las dos cosas a la vez"**: reforzar el prompt y
flexibilizar el mínimo, en un único cambio, para gastar una sola tanda de
evals (~25 min, mitad del cupo diario) en vez de dos.

# Qué se encontró y qué se hizo

**1. El refuerzo del prompt ya estaba hecho.** Al revisar `lib/ia.ts` y
`prompts/system.md` para implementarlo, ambos ya contenían, sin commitear,
las reglas explícitas contra los dos fallos más graves del ROJO:

- Omitir una sección entera (formación, idiomas, certificaciones) en vez de
  rellenarla con contenido inventado — contra **B06**, la invención de una
  carrera universitaria completa para un CV de tres líneas.
- Tratar cualquier frase que pida AÑADIR un dato de contacto, una cifra o un
  logro como manipulación, nunca como instrucción legítima — contra **B07**
  (cifras infladas) y **B12** (datos de contacto falsos).

No se sabe con certeza si ese texto ya estaba presente durante la pasada del
23/08 que dio ROJO o se añadió justo después sin relanzar evals — el
`git status` de ese momento no se conservó. En cualquier caso, **no se ha
confirmado con una pasada de evals que este refuerzo funcione**: sigue
pendiente en **T95**.

**2. `LARGO_MINIMO_CV` pasa de fijo a flexible** (`lib/ia.ts`):

```
const LARGO_MINIMO_CV = 400;            // el ideal, sin cambios
const LARGO_MINIMO_CV_ABSOLUTO = 150;   // suelo: sigue cazando una respuesta vacía o truncada
function largoMinimoCv(largoCvOriginal: number) {
  return Math.max(LARGO_MINIMO_CV_ABSOLUTO, Math.min(LARGO_MINIMO_CV, largoCvOriginal));
}
```

El mínimo real que exige `validarGeneracion` ya no es siempre 400: es el
menor entre 400 y el tamaño del CV original, con un suelo de 150 que sigue
cazando una respuesta vacía o gravemente truncada **sea cual sea el CV de
entrada** — así que **B05** (CV de entrada largo, salida de 240 caracteres)
seguiría fallando igual que antes: con un CV original largo, el mínimo
exigido sigue siendo 400. Solo baja el listón cuando el CV original mismo
es corto (**B03, B04, B08**), que es exactamente el caso donde exigir 400
solo podía cumplirse inventando.

`validarGeneracion` gana un tercer parámetro, `largoCvOriginal: number`
(la longitud del CV que escribió la usuaria, no la respuesta del modelo).
Es una función privada de `lib/ia.ts` con un único punto de llamada, así
que el cambio de firma no afecta a nada fuera del fichero.

# Qué no se ha tocado

- **B05 y B13** (fallos de formato: corte a media frase con un CV de
  entrada largo; sin saltos de línea reales) — no encajan en ninguno de los
  dos frentes de T94. Quedan para revisar después de ver el resultado de
  T95: puede que el refuerzo del prompt ya ayude indirectamente (las
  instrucciones de formato no cambiaron), o puede que sigan reproduciéndose
  igual que con `qwen3.6-27b` antes de Cloudflare.
- **`extraerPerfil` con Cloudflare** — sigue sin pasar por el golden dataset
  con `mistral-small-3.1-24b-instruct` (T95 tiene que cubrir las dos
  llamadas, no solo `generarCvYCarta`).

# Pendiente

- **T95**: relanzar `npm run evals` completo y comprobar si la puerta deja
  de dar ROJO. Sin esto, todo lo de aquí arriba es una hipótesis reforzada
  con código, no un arreglo confirmado — mismo aviso que ya se hizo el
  22/08/2026 con el primer refuerzo del prompt.
- 275/275 pruebas deterministas en verde y tipos limpios tras el cambio
  (ninguna llama a un modelo real, así que no comprueban esto).

# Relacionado

- [paso-13-evals.md](paso-13-evals.md) — el ROJO completo, caso a caso.
- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md) — por
  qué Cloudflare es el proveedor principal.
- `docs/06-tareas.md` — T94 y T95, dentro del bloque de prioridades del
  24/08/2026.
