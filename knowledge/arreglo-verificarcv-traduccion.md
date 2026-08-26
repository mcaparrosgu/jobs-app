---
type: Incidente
title: El comprobador de invenciones no aguanta la traducción — 59 avisos, 0 aciertos
description: Medido sobre las seis generaciones reales guardadas en Supabase, lib/verificarCv.ts marcó 59 palabras y ninguna era una invención. La causa no es una lista de palabras incompleta: el documento se genera en el idioma de la oferta, y comparar palabra a palabra un CV en inglés contra un CV original en castellano no puede funcionar. Desde ahora esa comparación se calla cuando el documento va traducido; las otras tres comprobaciones, que sí aguantan la traducción, siguen en pie.
tags: [jobs-app, ia, guardrails, incidente, paso-14, okf, t111]
timestamp: 2026-08-26T15:45:00Z
---

# Qué se midió, y con qué

T111 sospechaba que los avisos de `verificarCv` eran falsos positivos, a
partir de dos generaciones que avisaban de `"English"`, `"Spanish"`,
`"Native"`, `"Advanced"`, `"Tools"`… La sospecha era correcta, pero se
quedaba corta.

En vez de razonar sobre ejemplos inventados se recalcularon los avisos sobre
**las seis generaciones reales** que Mar tiene guardadas en Supabase
(`estado = 'listo'`), con el código de producción y los datos de su perfil:

| Oferta | Palabras marcadas | Invenciones reales |
|---|---|---|
| Account Coordinator (Talkspace) | 13 | 0 |
| AI Transformation Owner (GitLab) | 23 | 0 |
| Global Marketing Ops (Ultradent) | 21 | 0 |
| Data Operations (Devoteam) | 1 | 0 |
| CRM Operations Specialist (micro1) | 3 | 0 |
| Subgerente de IA (BC Tecnología) | 1 | 0 |

**59 palabras marcadas, cero aciertos.** Y el reparto no es casual: las tres
generaciones con 13, 21 y 23 avisos salieron **en inglés**; las tres con 1, 1
y 3, **en castellano**.

# La causa: la heurística es correcta en castellano y falsa en inglés

`verificarNombres` (T55) se apoya en una regla que en castellano funciona:
una palabra en mayúscula **en medio de una frase** suele ser un nombre
propio. Si además no aparece en el CV original, es sospechosa.

Dos cosas la rompen a la vez cuando la oferta está en inglés:

1. **El documento se traduce.** `lib/idioma.ts` decide el idioma a partir de
   la oferta (T49, `decision-idioma-consistente-cv.md`), así que un CV
   original en castellano produce un CV generado en inglés. Ninguna palabra
   traducida aparece literalmente en el original: "mapeo de procesos" pasa a
   ser "Process Mapping".
2. **En inglés la mayúscula inicial no señala un nombre propio.** Los
   títulos, los encabezados y las listas de habilidades van en *Title Case*:
   `Process Mapping & Optimization`, `English (C1 Advanced)`, `March 2019`,
   `Change Management & Training`. Cada una de esas palabras encaja en la
   definición de "sospechosa".

Por eso ampliar `MAYUSCULAS_INOCENTES` no resuelve nada: el vocabulario de un
CV no cabe en una lista. Se midieron dos alternativas antes de decidir —
perdonar una palabra si aparece también en minúscula en el mismo documento, y
perdonar las terminaciones típicas de sustantivo común (`-tion`, `-ment`,
`-ing`, `-ción`) — y juntas bajaban de 59 a 19 avisos: no cierran el problema
y encima debilitan la detección de verdad, porque perdonarían `Consulting`,
`Solutions` o `Technologies`, que son justo las terminaciones de un nombre de
empresa inventado.

# La decisión (Mar, 26/08/2026)

**Cuando el documento va traducido, la comparación palabra a palabra se
calla.** Solo esa. Las otras tres comprobaciones de `verificarCv` sí aguantan
la traducción y siguen funcionando igual:

- **Las cifras no se traducen** (y "tres"/"three" ya lo cubría el diccionario
  de números escritos).
- **Un email o un teléfono tampoco.**
- **Los nombres de empresa tampoco** — que es exactamente en lo que se apoya
  `verificarQueEsElMismoCv`, el aviso crítico contra el CV suplantado por una
  oferta maliciosa (`seguridad/red-team-opus.md`, ficha 2.1).

Lo que se pierde: en un documento traducido, una empresa o una titulación
**inventada nueva** ya no genera aviso de nombre. Conviene ser honesto sobre
el tamaño de esa pérdida: hoy tampoco lo generaba en la práctica, porque
quedaba enterrada bajo veinte falsos positivos y el tope de seis avisos —
el mismo efecto silenciador que ya documenta la constante `GRAVEDAD` desde el
red team.

# Tres falsos positivos más, encontrados por el camino

Los tres valen para cualquier idioma y se han arreglado también:

1. **Genitivo sajón.** `GitLab's`, `Anthropic's` y `Ultradent's` se marcaban
   las tres estando las tres permitidas: el apóstrofo las convertía en una
   palabra distinta. Ahora se recorta antes de comparar.
2. **`once`.** El diccionario de números escritos era bilingüe en un solo
   saco, así que el `once` inglés ("una vez") se leía como el `once`
   castellano y generaba un aviso por "la cifra 11". Los diccionarios están
   ahora separados y se elige el del idioma del texto.
3. **El teléfono partido.** El CV original tiene `+34 670293436` y el
   documento generado lo escribió `+34 670 293 436`: el mismo dato, pero
   troceado en tres cifras "inventadas" (670, 293, 436) en dos de las seis
   generaciones. `verificarDatosDeContacto` nunca se dejó engañar por esto
   porque compara los dígitos sin separadores; ahora `verificarCifras`
   excusa los trozos de un teléfono que ya está permitido.

# Resultado

Sobre las mismas seis generaciones reales: **de 59 avisos a 2**. Los dos que
quedan no son ruido de traducción:

- `"Technical"` — un anglicismo suelto (`Technical Tools:`) dentro de un CV en
  castellano. Un aviso aislado, no una lista de veinte.
- `"IA.Attentamente,Mar"` — señala un fallo de formato real del modelo (se
  comió el espacio tras el punto final de la carta). El aviso se lee raro,
  pero apunta a algo que de verdad está mal en el documento.

Verificado con **288 pruebas en verde** (11 nuevas en
`tests/lib/verificarCv.test.ts`), incluidas las que comprueban que el arreglo
**no** quita detección: en un documento traducido siguen saltando la cifra
inventada, el email ajeno y el CV suplantado, y en un documento del mismo
idioma sigue saltando la empresa inventada de siempre ("Zumbatrónica
Ibérica"). `evals/promptfoo/helpers.cjs`, que mantiene una copia simplificada
de estas mismas funciones, queda sincronizado con el mismo criterio.

# Relacionado

- [arreglo-verificarcv-falsos-positivos.md](arreglo-verificarcv-falsos-positivos.md)
  — el arreglo anterior del mismo comprobador (21/08/2026): números escritos
  con letra y siglas expandidas. Aquel añadió tolerancia caso a caso; este
  reconoce que hay un escenario entero donde la comprobación no aplica.
- [decision-idioma-consistente-cv.md](decision-idioma-consistente-cv.md) — por
  qué el documento sale en el idioma de la oferta.
- [paso-14-guardrails.md](paso-14-guardrails.md) — T54/T55, el guardrail
  original y las cuatro comprobaciones.
- [paso-15-red-team.md](paso-15-red-team.md) — el tope de seis avisos como
  silenciador, y `verificarQueEsElMismoCv`.
