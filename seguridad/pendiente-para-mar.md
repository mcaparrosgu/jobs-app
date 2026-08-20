# Lo que queda en tus manos (Paso 15)

Todo lo demás del red team está arreglado, probado y aplicado. Esto son las
tres cosas que dependen de una decisión tuya o de un momento concreto.

---

## 1. Cerrar el registro, el día de la prueba

**Por qué**: hoy cualquiera que llegue a la URL de la web puede crearse una
cuenta con su email. No verá datos de nadie (eso lo impide RLS y está bien
puesto), pero sí verá el listado de ofertas y gastará cuota de IA de todas.

**Por qué no lo he cerrado ya**: en Supabase solo existe **una cuenta, la
tuya**. Si lo cierro ahora, tus cuatro compañeras no podrán entrar solas y
tendrías que invitarlas a mano, con invitaciones que caducan. Justo el día de
la prueba, con las cinco delante, es el peor momento para eso.

**Qué hacer, cuando las cinco hayáis entrado** (mismo día, no lo dejes para
después):

1. Entra en el panel de Supabase → proyecto **jobs-app**.
2. Menú de la izquierda: **Authentication**.
3. Dentro, en CONFIGURATION: **Sign In / Providers**.
4. Busca la opción **"Allow new users to sign up"** y **desactívala**.
5. Guarda.

Para comprobar que ya estáis las cinco: **Authentication → Users**. Debe
haber cinco filas, una por email.

---

## 2. Revisar que la app sigue funcionando con Groq

Hemos cambiado el proveedor de IA: ahora es **Groq** el que hace el trabajo y
OpenRouter solo es la red de seguridad. El motivo está en
`knowledge/decision-groq-principal-privacidad.md`: los modelos gratis de
OpenRouter podían quedarse con los CVs y entrenar con ellos.

Ya lo he probado y funciona (de hecho va más rápido: menos de dos segundos).
Pero conviene que **hagas una prueba completa tú misma** antes de enseñárselo
a nadie: pega tu CV, mira las ofertas, marca una y descarga el PDF. Es la
prueba de fuego que pide `docs/05-ia.md`, y ahora hay motivo nuevo para
repetirla.

**Señal de alarma a vigilar**: si algún día *todas* las generaciones empiezan
a fallar a la vez, lo más probable es que Groq haya retirado el modelo
`qwen/qwen3.6-27b` (está marcado "Preview"). La solución es cambiar el valor
de `MODELO_GROQ` en `lib/ia.ts` por otro de su lista gratuita.

---

## 3. Los evals, antes de publicar

`CLAUDE.md` pide relanzarlos siempre que cambie el prompt o el modelo. Han
cambiado los dos, así que **hay que pasarlos antes de publicar**:

```
npx promptfoo eval -c evals/promptfoo/extraer-perfil.yaml --env-file .env.local -j 1 --delay 15000
npx promptfoo eval -c evals/promptfoo/generar-cv-carta.yaml --env-file .env.local -j 1 --delay 20000
```

El `-j 1 --delay` es obligatorio ahora: Groq limita por **tokens por minuto**,
y si se lanzan los casos a la vez fallan por saturación — un fallo que parece
de calidad y no lo es. Con las pausas, cada tanda tarda unos cinco minutos.

**Estado al cerrar el 20/08**, con el juez ya arreglado y cuota disponible:
extracción **11 de 12**, generación **11 de 13**. Los tres fallos se
diagnosticaron uno a uno: dos eran reales y están arreglados (el esquema
exigía 8 palabras clave mínimo, imposible en un CV de una línea; y un CV
larguísimo desbordaba el presupuesto de tokens y devolvía JSON truncado), y
el tercero era el juez, no el sistema.

**Esos dos arreglos están sin confirmar todavía**: al ir a comprobarlos se
agotó el cupo diario de tokens de Groq (200.000, ver más abajo). Lo primero
que hay que hacer mañana es relanzar las dos tandas con la cuota fresca.

⚠️ **Una tanda de evals consume una parte grande del día.** Groq da 200.000
tokens diarios para todo — unos 30 documentos. Los evals del 20/08 dejaron la
cuenta a 136 tokens de su tope. **No los lances la misma mañana en que vayas a
enseñar la app**: te quedarías sin IA delante de tus compañeras.

Ver `knowledge/paso-13-evals.md` para los umbrales de aprobado y cómo leer el
resultado.

**Aviso para no perder una tarde**: si ves muchos casos fallidos a la vez,
mira **el motivo** antes de tocar el prompt. Hay dos fallos que parecen de
calidad y no lo son:

- `404 ... No endpoints available matching your guardrail restrictions` → es
  el **juez** (el modelo que puntúa), no la app. Pasó el 20/08 al apagar el
  permiso de entrenamiento en OpenRouter, porque el juez era un modelo `:free`
  de ahí. Ya está cambiado a Groq.
- `429 Rate limit` → los casos se están pisando. Falta el `-j 1 --delay`.

---

## Y una cosa que ya está hecha, para que la tengas localizada

- **Migración `0014`**: ejecutada en tu Supabase y verificada. Crea la tabla
  `extracciones` (para el límite diario de análisis de CV) y la función
  `crear_generacion_con_cupo` (para que el límite de 5 documentos no se pueda
  saltar abriendo varias pestañas).
- **OpenRouter**: apagada la opción que permitía entrenar con los CVs.
- Puedes cerrar las pestañas de Supabase que quedaron abiertas en tu Chrome.
