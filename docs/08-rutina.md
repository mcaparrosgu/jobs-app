# 08 · Vigilancia en producción y ciclo de mejora

> Paso 17 del método. Se apoya en `docs/03-spec.md` (qué hace el producto),
> `docs/05-ia.md` (qué partes usan IA y cómo pueden fallar) y
> `docs/07-emergencia.md` (qué hacer cuando algo va mal **ahora mismo**).
> Este documento es el complementario: qué se mira **habitualmente**, para
> que lo de `07-emergencia.md` haga falta lo menos posible.

## 0. Probar antes de publicar, vigilar después: por qué hacen falta las dos

Son dos cosas distintas y ninguna sustituye a la otra.

**Probar antes de publicar** (Paso 12: pruebas; Paso 13: evals) es como la
**ITV del coche**: antes de sacarlo a la carretera, se comprueba con una
lista fija de pruebas conocidas que frena, que arranca, que las luces
funcionan. Los 25 casos de `evals/golden.yaml` son exactamente eso — una
lista de comprobaciones escritas de antemano.

**Vigilar en producción** (este documento) es el **testigo del salpicadero**
mientras conduces de verdad. La ITV no puede prever cada bache real de cada
carretera real; el testigo sí te avisa cuando, en la conducción real, algo
empieza a fallar — un ruido nuevo, la luz del aceite. Aquí "la carretera
real" son los CVs de verdad de las 5 compañeras, que nunca son exactamente
iguales a los 25 casos escritos a mano, por buenos que sean.

Sin la ITV, sacarías a la calle un coche que ni siquiera arranca. Sin el
testigo del salpicadero, no te enterarías de que se está quedando sin
aceite hasta que el motor se rompe del todo. Hacen falta las dos, y se
retroalimentan: la sección 5 de este documento es exactamente el mecanismo
por el que lo que descubre el testigo (un fallo real, en producción)
termina metido dentro de la ITV (un caso nuevo del golden dataset), para
que ese fallo concreto no vuelva a pasar la revisión sin que nadie se
entere.

## 1. Qué se mide desde el primer día

Jobs App solo llama a la IA en dos sitios (`docs/05-ia.md` §2):
`extraerPerfil` (al pegar el CV) y `generarCvYCarta` (al marcar "me
interesa"). Cada una de esas llamadas, salga bien o mal, deja una fila en
la tabla `metricas_ia` de Supabase (migración
`supabase/migrations/0015_metricas_ia.sql`, escrita por `lib/metricas.ts`
desde `app/api/extraer-perfil/route.ts` y `app/api/generar/route.ts`).
Nunca la ve ninguna usuaria — no hay panel de administración
(`docs/03-spec.md` §2) — y registrar una fila **nunca puede impedir que se
genere un documento**: si el registro falla, se avisa por consola y se
sigue.

| Señal que pide el Paso 17 | Cómo se mide aquí | Columna en `metricas_ia` |
| :---- | :---- | :---- |
| **Coste por interacción** | Jobs App no paga por token — Groq y OpenRouter son gratis (`docs/05-ia.md` §5) — así que "coste" no es dinero. Lo que sí aprieta de verdad es el **cupo de tokens por minuto de Groq** (8.000, `docs/04-plan-tecnico.md` §6.2): se guardan los tokens de entrada/salida que informa el proveedor, como proxy de ese cupo. | `tokens_entrada`, `tokens_salida`, `proveedor` |
| **Tiempo de respuesta** | Milisegundos entre que llega la petición al endpoint y se responde, IA incluida. | `duracion_ms` |
| **Tasa de éxito** | Si la interacción terminó en un documento/perfil válido o no, y por qué no cuando no. | `exito`, `motivo_fallo` |
| **Guardrail saltado** | Qué capa de `docs/14-guardrails.md` (`lib/guardrails.ts`) se disparó, si alguna: ámbito, inyección, contenido inapropiado, titular inseguro, marcador de relleno. | `guardrail_saltado` |
| **Escalado a humano** | El disparador de "intervención humana" que ya definió el Paso 14 (`app/api/generar/route.ts`, `UMBRAL_FALLOS_HUMANO`): tres fallos **seguidos** en la misma oferta. | `escalado_humano` |

`motivo_fallo` distingue el tipo de fallo, porque cada uno pide una lectura
distinta (sección 6):

| `motivo_fallo` | Qué significa | ¿Es un fallo del sistema? |
| :---- | :---- | :---- |
| `limite_diario` | Se cortó **antes** de llamar a la IA: la usuaria ya había gastado su cupo del día (regla de negocio 5). | No — el sistema funcionando como está diseñado. |
| `error_contenido` | La IA respondió, pero el resultado no pasó `validarGeneracion`/`validarPerfil` (texto corto, marcador sin resolver, contenido inapropiado…). | A veces — ver Fallo 1 y 5 de `docs/05-ia.md` §6: parte de esto es esperable. |
| `error_proveedor` | Ni Groq ni el respaldo de OpenRouter respondieron a tiempo o con éxito. | Depende del volumen — ver sección 6. |
| `sin_perfil_o_oferta` | Faltaba el CV de la usuaria o la oferta ya no existía. | Casi siempre un caso límite legítimo (oferta borrada, perfil incompleto), no una avería. |

## 2. Alertas

No hay presupuesto para un servicio de alertas de pago, y añadir uno nuevo
de pago cero (tipo Sentry) metería un tercero más al que habría que
comprobarle la política de datos (`CLAUDE.md`) sin que aporte nada que la
infraestructura ya usada no resuelva igual de bien para 5 usuarias. La
solución reutiliza lo que ya existe: el workflow `Jobs App · ingesta` de
n8n, que ya corre **todos los días a las 13:00** y ya envía correo por
Gmail (Hito 8).

Se añadió una rama nueva e independiente a ese workflow — en paralelo a la
ingesta de ofertas, sin tocar ni un nodo ni una conexión de los que ya
existían —:

```
Schedule Trigger (13:00)
  └─► Consultar métricas IA 24h  (Supabase, tabla metricas_ia, últimas 24h)
        └─► Calcular alertas de IA  (código: compara contra los umbrales)
              └─► If alerta IA
                    ├─ sí ─► Enviar alerta de vigilancia  (Gmail, a Mar)
                    └─ no ─► Sin alertas de IA  (no hace nada)
```

Un fallo en esta rama (por ejemplo, mientras la migración `0015` todavía no
se ha aplicado en Supabase) no puede marcar como fallida la ejecución
diaria completa ni tapar un fallo real de la ingesta — igual que ya hacía
`Ping Healthchecks Jobs App` antes, y por el mismo motivo.

**Umbrales**, sobre las últimas 24 horas (el código vive dentro del nodo
"Calcular alertas de IA"):

| Umbral | Se dispara cuando | Por qué este número |
| :---- | :---- | :---- |
| Caída de disponibilidad | ≥ 3 intentos de generación y menos de la mitad terminan bien (excluyendo `limite_diario`) | Con este volumen (~2 generaciones/día por usuaria activa), exigir un solo fallo dispararía ruido con cualquier 429 puntual; menos del 50 % con al menos 3 intentos ya no es una mala racha |
| Escalada a humano | ≥ 1 fila con `escalado_humano = true` | Son 3 fallos **seguidos** en la misma oferta (Paso 14) — ya es raro por diseño, así que ni una sola merece esperar a la revisión semanal |
| Proveedor caído | ≥ 3 fallos con `motivo_fallo = 'error_proveedor'` | Un 429 aislado lo absorben los reintentos de `lib/cola.ts`; tres en el mismo día sugiere que Groq y el respaldo de OpenRouter están fallando a la vez |
| Guardrails en racha | ≥ 5 filas con `guardrail_saltado` distinto de vacío | Un intento de inyección suelto ya se registra y no bloquea (`docs/05-ia.md` §6.2); varios en el mismo día es la señal de abuso o ataque de `seguridad/red-team-opus.md` |

Si se cumple cualquiera, llega un email a Mar con el motivo y el recuento.
Si no se cumple ninguno, no llega nada — el mismo principio que ya aplica
el aviso de ofertas nuevas (regla de negocio 8): avisar solo cuando hay
algo que decir.

> ⚠️ **Pendiente antes de que esta rama sirva de algo**: aplicar
> `supabase/migrations/0015_metricas_ia.sql` en el SQL Editor de Supabase
> (pegado en una sola línea, como el resto de migraciones — ver el truco ya
> conocido). Hasta entonces la tabla `metricas_ia` no existe y el nodo
> "Consultar métricas IA 24h" fallará en silencio cada día (a propósito, ver
> arriba) sin mandar ninguna alerta real.

## 3. Herramienta de observabilidad, y por qué esta y no otra

Para 5 usuarias y del orden de 60-750 interacciones al mes
(`docs/05-ia.md` §5), un servicio de observabilidad dedicado (Sentry,
Datadog, Grafana Cloud…) sería maquinaria sin función: coste añadido cuando
no cuesta 0 €, un tercero nuevo al que comprobarle la política de datos
antes de mandarle nada (`CLAUDE.md`), y una curva de aprendizaje que no
aporta nada que estas tres piezas —ya usadas, ya de coste 0 €— no resuelvan:

| Capa | Qué es | Para qué |
| :---- | :---- | :---- |
| **`metricas_ia` en Supabase** | Una tabla más, igual que `extracciones` o `generaciones` | La fuente de verdad histórica: éxito/fallo, duración, guardrails, escaladas. Se consulta desde el SQL Editor de Supabase (rol de servicio, salta RLS) |
| **Logs de Vercel** | Ya existen, sin configurar nada | Depurar un fallo **en caliente** ahora mismo (`docs/07-emergencia.md`): los `console.error`/`console.warn` de `lib/ia.ts`, `lib/guardrails.ts` y las rutas de la API. Retención corta en el plan gratuito — sirven para lo inmediato, no para la foto de la semana |
| **Healthchecks.io** (ya configurado, T38) | Un vigilante tipo "avísame si NO recibes una señal" | Confirma que `Jobs App · ingesta` corrió hoy a las 13:00 — un problema distinto (¿llegaron ofertas nuevas?), no de calidad de la IA |

Las consultas SQL de la rutina semanal (sección 4) son el "cuadro de mando"
de facto: no hace falta montar ningún dashboard nuevo para un grupo de 5
personas.

## 4. Rutina semanal (15 minutos, en este orden)

Se hace desde el SQL Editor de Supabase y el panel de GitHub/Vercel, sin
instalar nada. Pensada para hacerse un solo día fijo a la semana (por
ejemplo, todos los lunes).

1. **(2 min) Healthchecks.io** — ¿`Jobs App · ingesta` ha corrido los 7
   días? Si falta alguna señal, ver `docs/07-emergencia.md` §4.4.
2. **(3 min) Resumen de la semana en `metricas_ia`**:

   ```sql
   select
     tipo,
     count(*) filter (where exito) as exitos,
     count(*) filter (where not exito and motivo_fallo != 'limite_diario') as fallos,
     count(*) filter (where motivo_fallo = 'limite_diario') as por_limite,
     round(avg(duracion_ms) filter (where exito)) as duracion_media_ms,
     count(*) filter (where escalado_humano) as escaladas
   from metricas_ia
   where creado_en >= now() - interval '7 days'
   group by tipo;
   ```

   Una fila por `generacion` y otra por `perfil`. Compara `fallos` contra
   `exitos`: si la proporción cambió mucho respecto a la semana anterior,
   ver la sección 6.
3. **(2 min) Guardrails saltados**:

   ```sql
   select guardrail_saltado, count(*)
   from metricas_ia
   where creado_en >= now() - interval '7 days' and guardrail_saltado is not null
   group by guardrail_saltado
   order by 2 desc;
   ```

   Alguno suelto es normal (`docs/05-ia.md` §6.2); una racha nueva de
   `inyeccion` en pocos días merece mirar quién lo está probando.
4. **(3 min) Bandeja de entrada** — ¿llegó algún email de "alerta de
   vigilancia" de la sección 2 esta semana? Si sí, ya tiene el motivo
   escrito dentro; ir directo a la sección 6 para decidir si actuar.
5. **(3 min) GitHub Actions** (`.github/workflows/publicar.yml`) — ¿algún
   push de la semana quedó bloqueado por la puerta de calidad? Revisar el
   veredicto (`docs/07-emergencia.md` §3): un ROJO real necesita la
   sección 5 de este documento; un NO CONCLUYENTE solo necesita
   relanzarse.
6. **(2 min) Groq y Supabase** — un vistazo a que ninguno de los dos
   paneles muestre nada raro (cupo agotado de forma sostenida, proyecto
   pausado). El detalle de cada aviso está en `docs/07-emergencia.md` §4.

## 5. Ciclo de mejora: de un fallo real a un caso nuevo del golden dataset

Este es el procedimiento que **no debe romperse**: un fallo que ve una
usuaria real en producción tiene que acabar convertido en un caso nuevo de
`evals/golden.yaml`, para que la evaluación automática garantice que ese
fallo concreto no vuelve a pasar la puerta de calidad sin que nadie se
entere.

1. **Detectar el fallo.** Llega por alguna de estas vías: un email de
   "alerta de vigilancia" (sección 2), algo raro en la revisión semanal
   (sección 4), o —la más valiosa de todas— una usuaria dice "esto que me
   ha generado no está bien". Nada de esto lo detecta ningún test
   automático: por eso hace falta este documento.
2. **Reproducirlo y guardarlo tal cual.** Localizar en `metricas_ia` la
   fila de esa interacción (`user_id`, `oferta_id`, hora) y, si el dato
   sigue disponible, el CV original y la oferta que la generaron. **No se
   parafrasea**: el caso nuevo del golden dataset tiene que partir del
   texto real que hizo fallar al sistema, con los nombres propios
   cambiados si hace falta por privacidad (son CVs de personas reales).
3. **Clasificarlo** contra el catálogo de `docs/05-ia.md` §6 (¿inventó una
   cifra? ¿palabras clave inservibles? ¿estructura rota? ¿idioma
   equivocado? ¿texto vacío? ¿el proveedor no respondió?) y decidir la
   categoría del caso nuevo: `facil` (no debería haber fallado nunca),
   `limite` (una entrada rara pero legítima que no se había probado) o
   `rechazo` (un intento de sacar a la IA de su tarea).
4. **Añadirlo a `evals/golden.yaml`**, con el siguiente id libre de su
   tarea (`A13`, `B14`…), siguiendo el mismo formato que los 25 casos ya
   existentes: `id`, `tarea`, `categoria`, `descripcion`, `entrada` y
   `criterios` en lenguaje llano — este fichero es la fuente de verdad
   legible, pensada para que Mar pueda editarla sin tocar YAML de
   Promptfoo.
5. **Traducirlo a una aserción ejecutable** en
   `evals/promptfoo/extraer-perfil.yaml` o `generar-cv-carta.yaml` (el que
   corresponda), como una entrada nueva de `tests:` con su `vars` (la
   misma entrada) y su `assert` (los mismos criterios, pero en código:
   `type: javascript` contra `evals/promptfoo/helpers.cjs`, o
   `metric: <la que corresponda de las 5 de docs/13>`). Esto es manual —
   no hay generación automática entre los dos ficheros — y es a propósito:
   `evals/golden.yaml` sigue siendo legible sin saber programar.
6. **Lanzar `npm run evals:perfil` o `npm run evals:generar`** contra el
   caso nuevo y confirmar que, **antes de arreglar nada**, sale en rojo —
   si no reproduce el fallo, el caso está mal escrito, no el prompt.
7. **Arreglar el prompt, el esquema o la validación** en `lib/ia.ts` (o
   `lib/guardrails.ts`/`lib/verificarCv.ts` si el fallo es de esa capa),
   igual que se ha hecho en cada paso anterior: cambiar el encargo,
   encajonar la salida, verificar con código, y solo en último lugar
   reforzar el prompt (`docs/05-ia.md` §6.1).
8. **Relanzar `npm run evals`** (los dos, con la puerta) y confirmar dos
   cosas: que el caso nuevo ya sale en verde, y que **ninguno de los 25+
   anteriores se ha roto** — un arreglo que soluciona un caso y rompe otro
   es justo lo que este ciclo existe para cazar.
9. **Commit y publicar en una rama**, con el caso nuevo y el arreglo en el
   mismo cambio (`docs/16-publicar.md`): la puerta de calidad vuelve a
   correr sola porque el cambio toca `lib/ia.ts` y `evals/`, y a partir de
   ahí ese fallo concreto queda protegido para siempre — cualquier cambio
   futuro que lo reintroduzca hará bajar el porcentaje de esa métrica por
   debajo del umbral de `evals/umbrales.json`, y la puerta lo bloqueará
   antes de llegar a producción.

**Ejemplo concreto** (hipotético, para fijar el procedimiento): una usuaria
avisa de que su CV generado dice "Ingeniera Senior" cuando su CV original
nunca usa la palabra "Senior". Es el Fallo 1 de `docs/05-ia.md` §6.2
(invención), categoría `rechazo` porque hay una tentación real de
exagerar. Se añade como `B14` en `evals/golden.yaml` con ese CV real
(anonimizado) y el criterio "el CV generado no debe incluir 'Senior' si el
original no lo menciona"; se traduce a una aserción `fidelidad` en
`generar-cv-carta.yaml`; se confirma que falla hoy; se refuerza la
instrucción del prompt ("no añadas niveles de seniority que el CV no
mencione explícitamente") y, si hiciera falta, se amplía
`lib/verificarCv.ts` para cazar palabras de nivel ("senior", "junior",
"lead") igual que ya caza cifras y nombres propios; se relanzan los evals
completos; se publica.

## 6. Fallo puntual vs. degradación real

No todo lo que sale en rojo en `metricas_ia` merece una acción. La
diferencia:

| Es un **fallo puntual** (vigilar, no actuar) | Es una **degradación real** (actuar) |
| :---- | :---- |
| Un solo `error_proveedor` aislado, sin patrón | ≥ 3 `error_proveedor` en 24h (umbral de la sección 2), o una tendencia sostenida varias semanas seguidas en la revisión semanal |
| `error_contenido` disperso, distinto motivo cada vez (a veces un CV corto, otras un marcador de relleno) | El **mismo** `motivo_fallo` repitiéndose para la **misma** oferta o el **mismo** tipo de entrada — es la señal de `escalado_humano`, ya automática |
| Un aviso de guardrail suelto en la semana | Una racha de guardrails el mismo día (umbral de la sección 2) — probablemente alguien probando los límites a propósito |
| `limite_diario` que aparece a diario cerca del máximo de 5 | `limite_diario` que aparece **constantemente muy por debajo** de lo esperado — indicaría que el contador está mal, no que hay mucho uso |
| Duración algo por encima de la media un día concreto | Duración media al alza **semana tras semana** en la consulta de la sección 4 — señal de que Groq o el respaldo se están degradando de verdad, no un pico de tráfico |

La regla corta: **un dato suelto es ruido; un patrón que se repite —misma
causa, mismos síntomas, o una tendencia que persiste de una semana a la
siguiente— es señal.** Los cuatro umbrales de la sección 2 ya están
calibrados para no disparar con ruido (exigen varias filas, no una), así
que si llega un email de alerta, por definición ya no es un caso puntual:
toca mirarlo, y si el motivo encaja en el catálogo de `docs/05-ia.md` §6,
seguir el ciclo de la sección 5.

## Relacionado

- [`docs/03-spec.md`](03-spec.md) — qué hace el producto.
- [`docs/05-ia.md`](05-ia.md) §6 — el catálogo de fallos que esta vigilancia
  detecta.
- [`docs/07-emergencia.md`](07-emergencia.md) — qué hacer cuando algo va mal
  **ahora mismo**; este documento es su complementario para lo habitual.
- [`knowledge/paso-13-evals.md`](../knowledge/paso-13-evals.md) — el golden
  dataset y las 5 métricas al que alimenta el ciclo de mejora (sección 5).
- [`knowledge/paso-17-vigilancia.md`](../knowledge/paso-17-vigilancia.md) —
  esta decisión en formato OKF: por qué esta herramienta y no otra.
