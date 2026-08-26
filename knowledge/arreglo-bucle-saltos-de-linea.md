---
type: Arreglo
title: "La causa de todo: el prompt pedía saltos de línea y el modelo entraba en bucle generándolos"
description: "26/08/2026. El campo cv_texto se pedía como un texto con saltos de línea dentro, y el prompt insistía en ello porque 2 de 13 CVs salían en una sola línea. El modelo se pasaba al otro extremo: 3.089 líneas en un campo de quince, hasta agotar el techo de tokens y morir en un timeout. Arreglo: el esquema pide listas y el código las une."
tags: [jobs-app, arreglo, ia, prompt, esquema, poka-yoke, t113, t114]
okf_version: "0.2"
timestamp: 2026-08-26T15:00:00Z
---

# El síntoma que llevaba tres días cambiando de cara

Desde el 24/08/2026, la generación de CV fallaba de formas que parecían
distintas y se arreglaban una por una sin que nada mejorase del todo:

- CVs demasiado cortos (6 de 13 en la tanda del 25/08).
- CVs en una sola línea corrida, sin secciones (2 de 13).
- El modelo sin parar de escribir hasta un HTTP 408 a los 180 s.
- La puerta de calidad sin poder concluir, tanda tras tanda.

Cada arreglo empujaba el problema al lado contrario. Se reforzaba el prompt
contra los CVs cortos y el modelo se desbocaba; se acotaba el desbocamiento y
volvían los CVs cortos.

# La causa, encontrada por cómo fallaba otro modelo

Al medir `llama-4-scout` el 26/08 (una prueba que buscaba otra cosa: si el
problema era el modelo o Cloudflare), los fallos dejaron de ser timeouts
opacos y pasaron a ser errores de JSON con una pista dentro:

```
Expected ',' or '}' after property value in JSON at position 5200 (line 3089 column 1)
```

**Línea 3.089, con 5.200 caracteres.** El modelo no estaba escribiendo un CV
larguísimo: estaba escribiendo **saltos de línea**, miles, uno detrás de otro,
hasta agotar el techo de tokens.

Y la instrucción que lo provocaba estaba en `prompts/system.md`, añadida el
25/08 precisamente para arreglar los CVs de una sola línea:

> `cv_texto` **tiene que llevar saltos de línea reales dentro** (…): un CV
> entero en una sola línea corrida se rechaza, por bueno que sea su contenido.

Al modelo se le decía que si no ponía saltos de línea se le rechazaba el
trabajo. Respondió poniendo saltos de línea.

# El arreglo: quitarle la forma de equivocarse

No insistir mejor, sino cambiar lo que se le pide. `ESQUEMA_GENERACION` pasa
de pedir dos textos a pedir **dos listas**:

```json
{
  "puesto": "string",
  "cv_lineas": ["una línea del CV por elemento"],
  "carta_parrafos": ["un párrafo de la carta por elemento"]
}
```

`validarGeneracion` las une con `\n`, así que **hacia el resto de la app no
cambia nada**: `generarCvYCarta` sigue devolviendo `cv_texto` y `carta_texto`
como texto corrido, y los ayudantes de los evals, el PDF y la base de datos
siguen leyendo lo mismo que antes.

Lo que cambia es lo que el modelo puede hacer mal:

- **No escribe ni un salto de línea**, así que no puede atascarse generándolos.
- **No puede devolver un CV "en una sola línea"**: cada línea es un elemento.
- La instrucción confusa desaparece del prompt (tenía, además, un salto de
  línea literal partiéndola por la mitad en `prompts/system.md`).

Es la idea del Paso 11 del método, herramientas a prueba de errores: en vez de
pedirle al modelo que no se equivoque, diseñar la entrada para que no pueda.

# Verificación

Medido el mismo 26/08, con el techo de tokens forzado a 600 para provocar el
truncado a propósito:

| | Antes | Después |
|---|---|---|
| Línea donde revienta el JSON | **3.089** | **19** |

19 líneas es exactamente lo que tiene que tener un CV. El bucle no existe.

Cubierto por `tests/lib/ia-generacion-lineas.test.ts` (4 pruebas): la unión de
las listas, el descarte de elementos vacíos, el rechazo de una respuesta que
llegue como texto suelto, y el rechazo de un CV troceado en muy pocas líneas.

# Lo que este arreglo NO demuestra todavía

**La tasa de éxito no se pudo medir.** Las tandas del 26/08 por la tarde dan
entre 1 y 2 aciertos de 5 con cualquier combinación —modelo viejo, modelo
nuevo, scout, mistral—, porque Cloudflare estaba en muy mal momento: el mismo
caso B01 salió en 12,9 s por la mañana y se colgó 181 s una hora después.

Con ese nivel de ruido, la diferencia entre 1/5 y 2/5 no significa nada. El
mecanismo del bucle está arreglado y verificado; **la mejora en tasa de éxito
está pendiente de medirse con el proveedor en condiciones normales**. Es el
primer trabajo del día siguiente.

Relacionado: [[medicion-t114-desbocamiento]],
[[incidente-gemma4-razonamiento-t109]].
