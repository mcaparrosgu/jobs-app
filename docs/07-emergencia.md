# 07 · Emergencia

> Este documento se lee con prisa y con nervios. Por eso lo urgente está
> arriba y las explicaciones abajo. Si algo va mal **ahora mismo**, ve
> directo a la sección 1.
>
> Escrito en el Paso 16. Complementa a [`04-plan-tecnico.md`](04-plan-tecnico.md)
> (cómo está montado todo) y precede a `08-rutina.md` (Paso 17: la vigilancia
> del día a día).

---

## 1. La web está rota. Deshaz la publicación.

**Tiempo: 30 segundos. No hace falta tocar código ni saber qué se rompió.**

Vercel guarda todas las versiones que has publicado. Volver a la anterior no
es "arreglar", es **cambiar el cartel de cuál es la buena**. Como tener las
llaves del piso de antes: no reconstruyes nada, vuelves a entrar en el que ya
funcionaba.

### Por el panel (lo normal)

1. Entra en **https://vercel.com/mcaparrosgu-4812s-projects/jobs-app**
2. Pestaña **Deployments**. Verás la lista de todas las publicaciones, la más
   reciente arriba, con la etiqueta `Production` en la que está en vivo.
3. Busca **la anterior a la que rompió** — una que sepas que funcionaba.
4. Pulsa el botón **⋯** (tres puntos) a su derecha.
5. Elige **Instant Rollback** (en algunas vistas aparece como
   *Promote to Production*).
6. Confirma. **Verás la etiqueta `Production` saltar a esa versión** y la web
   pública vuelve a ser la de antes en unos segundos.

Lo que deberías ver al terminar: la lista con `Production` en la versión
antigua, y la rota marcada solo con el nombre de su rama.

### Por la terminal (si el panel no carga)

```bash
npx vercel rollback --token=TU_TOKEN
```

Sin más argumentos, vuelve a la publicación de producción inmediatamente
anterior. Para elegir una concreta, pásale su dirección:

```bash
npx vercel rollback jobs-l9p077lbt-mcaparrosgu-4812s-projects.vercel.app --token=TU_TOKEN
```

### ⚠️ Lo que el rollback NO deshace

Esto es lo que más disgustos da, así que léelo **antes** de necesitarlo:

| Sí lo deshace | **NO** lo deshace |
| :--- | :--- |
| El código de la web | Los cambios en la **base de datos** (migraciones ya aplicadas) |
| El diseño, los textos, los prompts | Las **variables de entorno** que hayas cambiado en Vercel |
| Las rutas y las pantallas | La configuración de **Supabase Auth** (Site URL, Redirect URLs) |
| | Los datos que las usuarias hayan creado mientras estaba roto |

Regla mental: **el rollback devuelve el programa, no el mundo.** Si el
problema venía de una migración o de una clave mal puesta, volver atrás en
Vercel no lo arregla — hay que deshacer eso donde se hizo.

### Y después, deshaz también el código

El rollback deja la web bien, pero `master` en GitHub **sigue teniendo el
cambio malo**. Si haces otro push sin más, se volverá a publicar. Para
deshacerlo de verdad:

```bash
git revert HEAD        # crea un commit nuevo que deshace el último
git push
```

> **Lo que sí hace el robot por ti desde el 26/08/2026 (T115).** Al publicar,
> le pregunta a Vercel qué commit está **servido** en producción, y después de
> un rollback ese es el viejo. Así que el siguiente push ve como pendiente
> **todo lo que el rollback dejó fuera** y, si algo de eso toca la IA, vuelve a
> pasar por la puerta de calidad. Antes no: la comparación era con el push
> anterior, y un rollback quedaba invisible para el robot. No te ahorra el
> `git revert` — el código malo sigue en `master` —, pero sí evita que se
> vuelva a publicar sin medirlo. Ver
> `knowledge/arreglo-agujero-robot-t115.md`.

`git revert` no borra historia: **añade** un commit que hace lo contrario del
anterior. Como un asiento de rectificación en contabilidad — el error sigue
escrito, pero la cuenta vuelve a cuadrar. Esto vuelve a pasar por la puerta de
calidad, así que tarda unos 3 minutos en estar publicado.

---

## 2. ¿Qué clase de "está roto" es?

Antes de tocar nada, mira **dónde** falla. Ahorra media hora.

| Lo que ves | Dónde está el problema | Qué hacer |
| :--- | :--- | :--- |
| La web no carga, error 404 o 500 en todas las pantallas | El **código** publicado | Rollback (sección 1) |
| La web carga pero al entrar dice error | **Supabase** (pausado o Auth mal) | Sección 4.1 y 4.4 |
| Todo va bien pero "Preparar CV" falla siempre | **Cloudflare** sin cuota | Sección 4.2 |
| **"No se pudo leer tu perfil"**, o una pantalla que falla para **todas** | El código y la **base de datos** no cuadran | Sección 4.3 — `npm run comprobar:esquema` |
| El enlace del email lleva a "no se puede acceder a este sitio" | **URL de Supabase Auth** | Sección 4.4 |
| No llegan ofertas nuevas | **n8n** (`Jobs App · ingesta`) | Sección 4.5 |
| Una sola usuaria tiene problemas, las demás no | Su navegador o su sesión | Que cierre sesión y vuelva a pedir enlace |

---

## 3. La puerta de calidad ha bloqueado mi cambio

No es una emergencia, pero da la misma sensación. Ve a GitHub → pestaña
**Actions** → la ejecución en rojo, y mira el **veredicto**:

| Veredicto | Significa | Qué hacer |
| :--- | :--- | :--- |
| **ROJO** | El modelo respondió y la calidad bajó del umbral | Es un problema real. Mira el detalle: dice qué caso y por qué |
| **NO CONCLUYENTE** | No hubo cuota, el juez no contestó, se agotó el tiempo, o la clave no vale | **No es culpa del prompt.** Mira el motivo en el detalle (ver abajo) |
| Fallan las **pruebas** | Algo determinista se ha roto | `npm test` en local te dice exactamente qué |
| Falla el **lint** | Código mal escrito según las normas | `npm run lint` en local te lo muestra |

**Antes de tocar un prompt por un eval en rojo, mira el motivo del fallo.**
Ninguno de los motivos vistos hasta hoy era del prompt:

| Lo que dice el detalle | Qué pasa de verdad | Solución |
| :--- | :--- | :--- |
| `401` · `Invalid API Key` | La clave que recibió el proceso no vale | Revisa `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (evals de las dos llamadas) o `GROQ_API_KEY` (el juez de las aserciones) en GitHub → *Settings → Secrets and variables → Actions* |
| `429` · `rate limit` | Sin cuota | El cupo de Cloudflare se renueva cada día; el de Groq (el juez) también. Relanza mañana |
| `no endpoints available` | El modelo juez no está disponible | Mirar `evals/promptfoo/*.yaml`, sección `provider` |
| `timeout` · `fetch failed` | Red o proveedor sin responder | Relanzar sin más |

Para relanzar sin inventarte un commit: GitHub → **Actions** → *Publicar* →
botón **Run workflow**.

### El freno manual

Si necesitas publicar sin gastar cuota de IA (por ejemplo, vas a enseñar la
app dentro de un rato y necesitas la cuota entera), escribe **`[sin evals]`**
en el mensaje del commit:

```bash
git commit -m "Cambia el color del botón [sin evals]"
```

El robot se salta los evals pero **sigue corriendo lint y las pruebas**. Queda
escrito en el historial, así que dentro de un mes sabrás por qué ese cambio no
pasó por la ITV.

---

## 4. Otras emergencias, por orden de probabilidad

### 4.1 "Project paused" en Supabase

Es lo más probable que te pase, y **no has perdido nada**. El plan gratuito
apaga la base de datos tras 7 días sin actividad.

1. Entra en **https://supabase.com/dashboard**
2. El proyecto aparece con el cartel **Paused**.
3. Pulsa **Restore project** y espera 1-3 minutos.
4. Deberías ver el estado pasar a **Active Healthy**.

En teoría no debería ocurrir: `Jobs App · ingesta` escribe ofertas todos los
días a las 13:00. Si pasa, **comprueba también que ese workflow de n8n sigue
activo** — probablemente la causa es esa.

### 4.2 Cloudflare sin cuota ("el servicio está saturado")

> ⚠️ Hasta el 23/08/2026 esta sección hablaba de Groq (**200.000 tokens al
> día**, **8.000 por minuto**). Groq se retiró del todo del proyecto — el
> principal ahora es Cloudflare, que limita distinto: **10.000 "neuronas" al
> día**, renovables cada día, sin tope por minuto. La app intenta pasarle el
> turno a OpenRouter (el respaldo) si Cloudflare falla o se agota.
>
> 🔴 **Corrección importante (27/08/2026, T112): ese respaldo no funciona.** Se
> midieron los 17 modelos gratuitos de OpenRouter con el prompt real y
> **ninguno genera el documento**; los dos que están configurados contestan
> `429`. Así que, en la práctica, **si Cloudflare se cae o agota su cupo, la
> app no genera nada** — no hay red debajo. Ver
> [`knowledge/medicion-t112-respaldo-openrouter.md`](../knowledge/medicion-t112-respaldo-openrouter.md).

- **Cupo diario agotado**: se agotaron las 10.000 "neuronas" del día
  (~133 por generación, ~70 desde T119). **No se arregla esperando un rato ni
  lo cubre el respaldo**: hay que esperar a la renovación, que es a
  **medianoche UTC — las 02:00 en España**.
- Si ves el error también en los **evals** (no en la app en vivo), puede ser
  el juez de las aserciones llm-rubric, que sigue usando Groq — su cupo
  (200.000/día, 8.000/minuto) es aparte del de Cloudflare.

Si estás enseñando la app a la clase y esto pasa, lo honesto es decirlo: es el
techo del plan gratuito, no un fallo. La única salida técnica es pagar, y eso
es una decisión tuya (presupuesto de 0 €).

**Prevención**: no lances los evals el día que vayas a enseñar la app. Una
pasada se lleva más o menos la mitad de la cuota diaria de Groq (el juez).

> ⚠️ **Pasó de verdad el 24/08/2026**, la mañana del primer día con usuarias
> reales: una tanda de evals + una investigación en vivo del mismo problema
> dejaron `generarCvYCarta` fallando el 100% de las veces por timeout de
> Cloudflare, Y ADEMÁS agotaron el cupo compartido de OpenRouter (50/día) —
> los dos a la vez, no solo Cloudflare. El aviso de arriba ("no lances los
> evals el día de enseñar la app") no bastaba: tampoco conviene investigar un
> fallo con llamadas sueltas repetidas ese mismo día, porque cada intento
> gasta el mismo cupo escaso de OpenRouter que necesitan las usuarias reales.
> Detalle completo en
> [`knowledge/arreglo-puerta-motivo-real.md`](../knowledge/arreglo-puerta-motivo-real.md).

### 4.3 "No se pudo leer tu perfil" — el código y la base de datos no cuadran

**Es la emergencia que más veces ha pasado: dos en dos días** (24 y 25/08/2026),
y las dos dejaron la app rota para **todas** las usuarias a la vez.

**Cómo se reconoce**: un mensaje del tipo *"No se pudo leer tu perfil."*, o una
pantalla que falla siempre, para todo el mundo, en cualquier dispositivo — no
para una sola usuaria. Falla en el servidor, así que no se arregla recargando.

**La causa, siempre la misma**: las migraciones se aplican **a mano** en el SQL
Editor de Supabase, así que la base de datos cambia en el momento en que pegas
el SQL. El código publicado va por otro camino. Cuando uno de los dos se
adelanta, el código le pide a Supabase una columna que ya no existe (o todavía
no existe) y todo revienta.

**Qué hacer, por orden:**

1. **Diagnosticar en 10 segundos**, sin adivinar:

   ```
   npm run comprobar:esquema
   ```

   Te dice exactamente qué columna falta y en qué fichero y línea se pide. Si
   sale limpio, el problema es otro y esta sección no es la tuya.

2. **Comprobar qué versión hay publicada de verdad**, que es lo que estuvo
   fallando el 24/08: el código de tu ordenador puede estar bien y el
   **publicado** no.

   ```
   COMMIT=<sha publicado> npm run comprobar:esquema
   ```

3. **Arreglar en la dirección correcta.** Si falta aplicar una migración,
   aplícala en el SQL Editor (ojo con el truco de pegarla en una sola línea).
   Si la migración ya está y lo que falta es publicar el código que la
   acompaña, **publica** — normalmente eso es lo que pasa.

> ⚠️ **Lo que hace esto peligroso es que el robot NO lo comprueba.** Se decidió
> a propósito no darle a GitHub la clave `SUPABASE_SERVICE_ROLE_KEY`, que se
> salta todos los permisos. Así que esta comprobación **depende de que la
> lances tú** antes de publicar. Detalle en
> [`knowledge/arreglo-guardia-esquema.md`](../knowledge/arreglo-guardia-esquema.md)
> y el incidente original en
> [`knowledge/incidente-esquema-desajuste-24-08.md`](../knowledge/incidente-esquema-desajuste-24-08.md).

### 4.4 El enlace del email no lleva a ningún sitio

Ya pasó una vez (T76). La causa nunca está en el código: está en
**Supabase → Authentication → URL Configuration**.

1. **Site URL** debe ser `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app`
2. **Redirect URLs** debe contener:
   - `https://jobs-app-mcaparrosgu-4812s-projects.vercel.app/**`
   - `http://localhost:3000/**` (para seguir programando en local)

⚠️ **Un enlace ya enviado lleva la URL vieja grabada dentro.** Después de
arreglarlo hay que pedir un enlace **nuevo**; el del correo antiguo seguirá sin
funcionar.

### 4.5 No llegan ofertas nuevas

El workflow `Jobs App · ingesta` de n8n corre a las 13:00. Entra en n8n →
Executions y mira si esa ejecución falló.

> 🚫 **Nunca toques los workflows `Jobs ·` (sin "App")**. Son la búsqueda de
> empleo real, en producción. El de Jobs App es `Jobs App · ingesta`.

### 4.6 Se me ha escapado una clave

Si una clave acaba en GitHub, en una captura o en un chat, **darla por
comprometida y cambiarla**. No sirve borrar el mensaje: lo que se publicó una
vez, se queda.

| Clave | Dónde se revoca y se genera otra |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → tu perfil → API Tokens → borrar el viejo, crear otro |
| `GROQ_API_KEY` | console.groq.com → API Keys → borrar la vieja, crear una nueva (ya no la usa la app; solo el juez de los evals) |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → *Reset* |
| `VERCEL_TOKEN` (el del robot) | vercel.com/account/tokens → borrar y crear otro |

Después de cambiar una: actualízala en **Vercel → Settings → Environment
Variables** y en tu `.env.local`, y **vuelve a publicar** para que la nueva
entre en vigor.

### 4.7 Alguien que no debería está usando la app

La entrada está cerrada: solo entran las personas invitadas desde el panel de
Supabase. Si aun así ves usuarias que no reconoces:

1. Supabase → **Authentication → Users**.
2. Localiza la usuaria y bórrala (⋯ → *Delete user*).
3. Comprueba que **Authentication → Sign In / Providers → Allow new users to
   sign up** sigue **apagado**.

Sus datos se van con ella: las filas de `perfiles`, `intereses` y
`generaciones` están atadas a su `user_id`.

---

## 5. Topes de gasto: por qué no te puede llegar una factura

**El presupuesto es 0 €/mes y es una restricción dura.** La buena noticia es
que el riesgo real de este montaje **no es una factura sorpresa: es quedarte
sin servicio**. Ninguno de estos servicios tiene una tarjeta tuya, así que al
llegar al límite **se paran, no cobran**.

Pero "se paran" también duele, así que estos son los frenos que hay puestos.

### Los frenos que están dentro de la app

Estos los controlas tú desde el código y son los que de verdad limitan el
consumo:

| Freno | Valor | Dónde se cambia |
| :--- | :--- | :--- |
| Documentos por usuaria y día | 5 | `LIMITE_DIARIO` en `lib/generaciones.ts` |
| Análisis de CV por usuaria y día | 10 | `LIMITE_EXTRACCIONES_DIARIAS` en `lib/extracciones.ts` |
| Tamaño máximo de un CV pegado | 20.000 caracteres | `LIMITE_CARACTERES_CV_ENTRADA` en `lib/guardrails.ts` |
| Tokens reservados por documento | 3.000 | `MAX_TOKENS_GROQ_GENERACION` en `lib/ia.ts` |
| **Quién puede entrar** | **solo las invitadas** | Supabase → Authentication |

El último es el más importante de todos. Los topes por usuaria se aplican
**por persona**: sin una lista cerrada de invitadas, cien desconocidos son
quinientos documentos al día. Con la entrada cerrada, el techo lo pones tú
invitando.

### Lo que hay que verificar una vez, en cada servicio

Yo no puedo comprobar la facturación de tus cuentas desde aquí, así que esto
lo miras tú **una sola vez** y ya te quedas tranquila:

- [ ] **Vercel** → *Settings → Billing*: que el plan sea **Hobby** y que **no
      haya ningún método de pago guardado**. Sin tarjeta, no hay factura
      posible. (La gestión de límites de gasto de Vercel, *Spend Management*,
      es de los planes de pago — en Hobby el freno es que simplemente no puede
      cobrarte.)
- [ ] **Cloudflare** → *dash.cloudflare.com → Billing*: plan gratuito, sin
      tarjeta.
- [ ] **Groq** → *console.groq.com → Billing*: plan gratuito, sin tarjeta
      (ya no lo usa la app, solo el juez de los evals).
- [ ] **Supabase** → *Organization → Billing*: plan **Free**. En Free el tope
      de gasto viene puesto de fábrica y no se puede quitar.
- [ ] **OpenRouter** → *openrouter.ai/credits*: sin créditos comprados y sin
      recarga automática activada.
- [ ] **GitHub** → *Settings → Billing*: el robot consume minutos de Actions
      (2.000 gratis al mes en repos privados). Jobs App usa una fracción.
      Verifica que **no hay límite de gasto activado por encima de 0 $**.
- [ ] **Apify**: la cuenta está sin crédito. Si `Jobs App · ingesta` usa una
      fuente de Apify, esa fuente no traerá nada — Adzuna y Jooble sí.

### Las señales de alarma, en orden

1. **Cloudflare sin cuota diaria** — lo más probable. Sección 4.2.
2. **Supabase pausado** por inactividad. Sección 4.1.
3. **Minutos de GitHub Actions agotados** — solo si haces muchísimos pushes con
   evals. Se ve en Settings → Billing.
4. Ninguna de estas te cuesta dinero. Todas te cuestan servicio.

---

## 6. Dar acceso a una compañera (y quitárselo)

Jobs App **no admite registros**: solo entra quien tú invitas desde el panel de
Supabase. Esta es la rutina completa, pensada para hacerla sin acordarse de
nada.

> ## ⏳ PENDIENTE — hacer el lunes 24/08/2026
>
> **El apartado 6.1 de aquí abajo está sin hacer.** El código ya está
> preparado (`shouldCreateUser: false` en `app/page.tsx`), pero **el
> interruptor de Supabase sigue encendido**, así que a día de hoy cualquiera
> con la URL puede entrar y consumir cuota de IA.
>
> Estado de las tareas del Paso 16:
>
> - [x] Crear el `VERCEL_TOKEN` en Vercel — hecho el 20/08/2026.
> - [x] Guardarlo como secreto en GitHub — hecho el 20/08/2026.
> - [x] **Añadir dos secretos más en GitHub**: `GROQ_API_KEY` y
>       `OPENROUTER_API_KEY` — hecho el 21/08/2026.
> - [ ] **Cerrar el registro en Supabase (§6.1) e invitar a las 4 compañeras
>       (§6.2)** — aplazado a la vuelta de vacaciones, el **lunes 24/08/2026**.
>
> Hasta entonces no hay riesgo real (nadie conoce la URL todavía), pero
> **hazlo antes de pasarle el enlace a nadie**, no después.

### 6.1 Cerrar el registro (esto se hace UNA sola vez)

Si ya está hecho, sáltate este apartado. Para comprobarlo, entra y mira que el
interruptor esté apagado.

1. Entra en **https://supabase.com/dashboard** y abre el proyecto de Jobs App.
2. Menú lateral izquierdo: **Authentication** (el icono de las personas).
3. Dentro, en el submenú: **Sign In / Providers**.
4. Arriba del todo verás un bloque **User Signups** con el interruptor
   **Allow new users to sign up**.
5. **Apágalo** y pulsa **Save**.
6. **Lo que deberías ver**: el interruptor en gris y un aviso de guardado
   correcto.

⚠️ **Hazlo antes de invitar a nadie, no después.** Y comprueba que **tu propio
email ya está** en Authentication → Users (debería, de las pruebas del Hito 9):
con el registro cerrado y sin estar en la lista, te quedas fuera de tu propia
app.

### 6.2 Invitar a alguien

Para cada persona:

1. **Authentication → Users**.
2. Botón **Add user** (arriba a la derecha) → **Send invitation**.
3. Escribe su email y pulsa **Send invitation**.
4. **Lo que deberías ver**: una fila nueva en la lista con ese email. La
   columna de estado dirá que la invitación está pendiente hasta que entre.

La persona recibe un correo. A partir de ahí entra como todo el mundo: va a la
web, escribe su email y pide el enlace de acceso.

**Lo que hay que decirle** cuando le pases la dirección de la app:

- La web es **https://jobs-app-mcaparrosgu-4812s-projects.vercel.app**
- Se entra **sin contraseña**: escribe tu email y te llega un enlace.
- El enlace **hay que abrirlo desde ese mismo correo** y sirve una sola vez.
- Puede tardar un minuto en llegar. **Mirar la carpeta de spam.**
- **El CV y la carta generados hay que revisarlos antes de enviarlos a una
  empresa.** La IA puede colar algo que suene bien y no sea cierto.
- Como máximo **5 documentos al día** por persona.

### 6.3 Si alguien dice que no puede entrar

Por orden, de la causa más frecuente a la menos:

| Lo que cuenta | Causa probable | Solución |
| :--- | :--- | :--- |
| "No me llega el correo" | Está en spam | Que mire spam y promociones |
| "Dice que no estoy invitada" | No está en Users | Invítala (§6.2) |
| "El enlace no abre nada" | Enlace caducado o ya usado | Que pida uno nuevo |
| "El enlace lleva a una página de error" | Site URL mal en Supabase | Sección 4.3 |
| "No me llega y no está en spam" | Tope de envíos de Gmail | Espera un rato e inténtalo |

### 6.4 Quitarle el acceso a alguien

1. **Authentication → Users**, localiza su fila.
2. Botón **⋯** a la derecha → **Delete user**.
3. Confirma.

Sus datos se van con ella: las filas de `perfiles`, `intereses` y
`generaciones` están atadas a su `user_id`. Además, todo se borra solo al mes
(regla 10 de la spec).

---

## 7. Lista de comprobación previa al lanzamiento

Repásala **el día que vayas a enseñar la app a alguien**. Marca cada casilla de
verdad; el objetivo es no descubrir nada en directo.

### Antes de publicar el cambio

- [ ] `npm test` en verde en local (`npm run lint` también).
- [ ] **`npm run comprobar:esquema` en verde.** El robot NO lo hace; si el
      código y Supabase no cuadran, producción se rompe para todas. Ya pasó
      dos veces (§4.3).
- [ ] Si toqué la IA: `npm run evals` lanzado y con veredicto **VERDE**.
- [ ] Lo he probado en una **vista previa** antes de mandarlo a producción
      (rama nueva → push → abrir la URL de preview).
- [ ] Ningún archivo con claves entre lo que voy a subir: `git status` no
      menciona `.env` ni `.env.local`.
- [ ] Ninguna clave secreta lleva el prefijo `NEXT_PUBLIC_`.

### La víspera

- [ ] **Supabase activo**, no pausado (entra al panel y míralo).
- [ ] Las **5 usuarias están invitadas** en Supabase → Authentication → Users.
- [ ] `Jobs App · ingesta` en n8n **activo**, y su última ejecución en verde.
- [ ] Hay **ofertas recientes** en la tabla `ofertas` (si no, no habrá nada que
      enseñar).
- [ ] **No he lanzado los evals hoy** — necesito la cuota de Groq entera.

### El recorrido completo, hecho de verdad

Hazlo entero, desde el móvil, con una cuenta real:

- [ ] Pedir acceso con el email → llega el correo en menos de un minuto.
- [ ] El enlace del correo **abre la app**, no un error.
- [ ] Pegar un CV → propone puesto y palabras clave que tienen sentido.
- [ ] La lista de ofertas carga y se puede filtrar.
- [ ] "Me interesa" → el indicador de espera aparece → el documento se genera.
- [ ] **Descargar el PDF y abrirlo**: el CV y la carta están completos, la
      carta empieza en página nueva, y no hay ninguna empresa ni titulación
      que no esté en el CV original.
- [ ] Probar con un email **no invitado**: debe decir que no está en la lista,
      con claridad, sin un error feo.

### Lo que tengo que saber decir sin buscarlo

- [ ] Sé hacer un **rollback** (sección 1) sin leer este documento entero.
- [ ] Sé que si sale "el servicio está saturado" es el límite del plan
      gratuito, y sé explicarlo sin que parezca que la app está rota.
- [ ] He avisado de que **el CV generado hay que revisarlo antes de enviarlo a
      una empresa**. La IA puede colar algo que suene bien y no sea cierto.

---

## 8. Los datos, para no buscarlos con prisa

| Qué | Dónde |
| :--- | :--- |
| Web pública | https://jobs-app-mcaparrosgu-4812s-projects.vercel.app |
| Panel de Vercel | https://vercel.com/mcaparrosgu-4812s-projects/jobs-app |
| Repositorio | https://github.com/mcaparrosgu/jobs-app (privado) |
| El robot de la puerta | GitHub → pestaña **Actions** → *Publicar* |
| Panel de Supabase | https://supabase.com/dashboard |
| Cuota de Cloudflare | https://dash.cloudflare.com |
| Cuota de Groq (solo el juez de los evals) | https://console.groq.com |
| n8n | El workflow es `Jobs App · ingesta`, **nunca** los `Jobs ·` |

**Identificadores del proyecto en Vercel** (no son secretos, solo lo
identifican):

- Equipo: `team_re1pN0Cr5HU7wbuaIKJ5NMPR`
- Proyecto: `prj_2W8yk0mwvGZZ3uyBwwVxuI1DNL38`

---

## Relacionado

- [`04-plan-tecnico.md`](04-plan-tecnico.md) — cómo está montado todo y qué
  puede doler (§6).
- [`03-spec.md`](03-spec.md) — la verdad funcional: qué debe hacer la app.
- [`../knowledge/paso-16-publicar.md`](../knowledge/paso-16-publicar.md) — las
  decisiones de este paso y su porqué.
- [`../knowledge/paso-13-evals.md`](../knowledge/paso-13-evals.md) — los
  umbrales de la puerta y cómo leer un eval en rojo.
- [`../knowledge/hito-9-publicar.md`](../knowledge/hito-9-publicar.md) — la
  primera publicación, y el bloqueador del enlace a `localhost`.
