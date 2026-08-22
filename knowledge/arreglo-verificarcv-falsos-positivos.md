---
type: Incidente
title: Dos falsos positivos reales en verificarCv, encontrados al evaluar Gemini
description: Al relanzar los evals de generarCvYCarta contra Gemini, tres de nueve fallos resultaron ser falsos positivos del comprobador de invenciones — no del modelo. La misma limitación vive en lib/verificarCv.ts, el guardrail real que ven las usuarias, así que el arreglo se aplicó ahí (no solo en los evals) y se relanzó la pasada.
tags: [jobs-app, ia, guardrails, evals, incidente, paso-17, okf]
timestamp: 2026-08-21T21:35:00Z
---

# Cómo se encontró

Al relanzar `npm run evals:generar` contra Gemini
([decision-gemini-generarcv.md](decision-gemini-generarcv.md)), la primera
pasada salió 4/13 (30,77 %) — peor que la peor pasada de qwen3.6-27b. Antes de
concluir nada sobre Gemini, se revisó caso a caso el motivo exacto de cada
fallo (no solo el veredicto agregado), y de los 9 fallos, **3 no eran un
problema del modelo**:

- **B04**: el CV original decía *"prácticas de **tres** meses"*; Gemini
  escribió *"Duración: **3** meses"* — la misma cifra, en dígito en vez de en
  letra. `sinCifrasInventadas` solo busca dígitos con una expresión regular
  (`\d[\d.,]*`) en el texto original, así que no encontraba ningún "3" ahí y
  lo marcaba como cifra inventada.
- **B13**: el original decía *"migración de infraestructura a **AWS**"*;
  Gemini escribió *"la plataforma **Amazon Web Services (AWS)**"* — la misma
  sigla, expandida. `soloEntidadesConocidas` marcaba "Amazon" y "Services"
  como nombres propios ajenos al CV, porque compara palabra a palabra y no
  reconoce que son la expansión de una sigla que ya estaba permitida.
- **B01**: el original decía *"inglés B2"*; Gemini escribió *"Inglés (**Nivel**
  B2)"* — una etiqueta añadida por claridad, no un dato nuevo. "Nivel" no
  estaba en la lista de palabras inocentes (`MAYUSCULAS_INOCENTES`).

# Por qué no era solo un problema de los evals

`evals/promptfoo/helpers.cjs` lo dice en su propio comentario de
mantenimiento: `cifrasDe` y `entidadesSospechosas` son **copias
simplificadas** de `numerosDe`/`palabrasPropiasDe` en `lib/verificarCv.ts` —
el guardrail de verdad (T54-T55, Paso 14) que genera los avisos que **sí ve
una usuaria real** antes de enviar su CV. La misma limitación vive en los dos
sitios. Si solo se hubiera arreglado la copia de los evals, la pasada habría
salido limpia pero la app en producción habría seguido mostrando avisos
falsos ("revisa la cifra 3, no está en tu CV") a cualquier usuaria cuyo
documento generado reformulara una cifra escrita con letra o expandiera una
sigla — con cualquier proveedor de IA, no solo Gemini.

# El arreglo, en los dos sitios a la vez

Aplicado en `lib/verificarCv.ts` y reflejado en `evals/promptfoo/helpers.cjs`
(misma pareja que ya mantenía el fichero, ahora también en sincronía en esto):

1. **Números escritos con letra**: un diccionario pequeño (0-90 en español e
   inglés) que normaliza "tres" → "3" antes de comparar. Se excluyen a
   propósito `un/una/uno` (artículo indefinido casi siempre, no un número) y
   `cien/ciento` (colisiona con "por ciento"): admitirlos habría convertido
   "cualquier CV con un artículo" en un pase libre para inventar un "1", que
   es peor que el falso positivo que se arregla.
2. **Siglas expandidas**: si el CV generado escribe "Amazon Web Services
   (AWS)" y las iniciales de esa frase coinciden letra a letra con una sigla
   que ya aparecía en el CV/oferta original, esas palabras dejan de contar
   como invención.
3. **Lista de palabras inocentes ampliada** con etiquetas genéricas de CV
   ("nivel", "duración", "sector", "cargo"...) que un modelo puede añadir por
   claridad sin que sea un dato nuevo.

Verificado contra los 29 casos existentes de `tests/lib/verificarCv.test.ts`
— siguen en verde, incluida la cifra inventada de verdad ("30", "47") y el
nombre de empresa inventado de verdad ("Zumbatrónica Ibérica"): el arreglo
añade tolerancia, no la quita. 253/253 pruebas de Vitest en verde.

# Relacionado

- [decision-gemini-generarcv.md](decision-gemini-generarcv.md) — la
  evaluación que destapó esto.
- [paso-14-guardrails.md](paso-14-guardrails.md) — T54/T55, el guardrail
  original.
- [paso-13-evals.md](paso-13-evals.md) — el arnés de evals donde vive la
  copia simplificada.
