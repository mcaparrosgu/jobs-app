---
type: Decision
title: Respaldo en Groq para cuando OpenRouter agota su cupo diario
description: El error "servicio de IA saturado" en generar documentos no era saturacion por modelo, sino el cupo gratis de 50 peticiones/dia de OpenRouter, compartido por toda la cuenta entre los 5 modelos. Se anade Groq (qwen3.6-27b, cupo propio de 1000/dia) como respaldo tras agotar las dos rondas de OpenRouter.
tags: [jobs-app, okf, ia, decision, incidente]
timestamp: 2026-08-19T00:00:00Z
---

# El problema

Mar reporto que "Ver oferta" (global marketing operations manager) fallaba
al preparar el CV y la carta, dos veces seguidas, con el mensaje "puede que
el servicio de IA este saturado". [decision-modelo-ia.md](decision-modelo-ia.md)
ya documentaba que los modelos gratis de OpenRouter pueden devolver `429`,
y el diseno de `lib/ia.ts` asumia que ese `429` era **saturacion de ese
modelo en concreto** — de ahi la logica de probar otros modelos de la lista.

# Lo que se investigo (verificado en vivo, no solo leido)

Se probaron en directo, contra la API real de OpenRouter, los 5 modelos que
usa `lib/ia.ts` en este momento. Los 5 devolvieron el mismo error:

```
Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000
free model requests per day
X-RateLimit-Limit: 50   X-RateLimit-Remaining: 0
```

Es decir: **no es que cada modelo este saturado por separado**. OpenRouter
da 50 peticiones gratis al dia **por cuenta**, compartidas entre los 5
modelos de la lista. Agotadas, los 5 fallan a la vez, y el diseno de
"probar el siguiente modelo de la ronda" no ayuda porque comparten el
mismo cupo — en el caso de hoy, el cupo ya estaba a 0 antes de que Mar
llegara a esa oferta, probablemente por las pruebas en vivo de
[decision-modelo-ia.md](decision-modelo-ia.md) y el uso normal de las 5
compañeras de clase durante el dia.

Con solo 50 peticiones/dia repartidas entre 5 personas, y cada generacion
capaz de gastar hasta 5 peticiones (dos rondas completas si las dos
primeras fallan), el cupo se agota facilmente sin que nadie este haciendo
nada raro.

# Opciones consideradas

| Opcion | Resultado | Por que se descarta o se acepta |
| :-- | :-- | :-- |
| Anadir 10 € de credito a OpenRouter (desbloquea 1000/dia) | Funcionaria | Implica pagar — la restriccion de presupuesto 0 €/mes de `CLAUDE.md` la descarta salvo que Mar lo pida expresamente. No se le ha preguntado: queda anotada aqui como opcion disponible, no como decision tomada |
| Rotar entre mas cuentas gratis de OpenRouter | Tecnicamente posible | Descartado: complica el codigo y probablemente incumple los terminos de servicio de OpenRouter |
| Groq como respaldo, con `qwen/qwen3.6-27b` | Probado en vivo: 200 OK, cupo propio e independiente (1000 peticiones/dia, verificado con la cabecera `x-ratelimit-limit-requests`), clave ya guardada en `.env.local` desde T23 (antes de pasar a OpenRouter) | **Elegido** |

# Decision

`lib/ia.ts` prueba primero las dos rondas de OpenRouter de
[decision-modelo-ia.md](decision-modelo-ia.md) (sin cambios: siguen teniendo
sentido si el fallo es de un modelo concreto, no del cupo). Si las dos
rondas fallan, se prueba una vez **Groq**, con `qwen/qwen3.6-27b` — el mismo
modelo que esa decision descarto como *primario* por estar en "Preview",
pero aceptable como *ultimo recurso*, porque:

- Tiene su propio cupo, ajeno al de OpenRouter: agotar uno no afecta al otro.
- Es un modelo "razonador" (piensa antes de responder) — verificado en vivo,
  gasta cientos de tokens de mas por eso. Se apaga con
  `reasoning_effort: 'none'` (probado: de 1184 tokens de pensamiento para
  contestar "OK" pasa a 0). `reasoning_format: 'hidden'` evita ademas que
  ese razonamiento, si aparece, se cuele dentro del JSON de salida.
- Soporta `response_format: json_schema` en modo `strict`, igual que
  OpenRouter — probado en vivo con el mismo esquema de dos campos
  (`cv_texto`, `carta_texto`) que usa la generacion real.

**Efecto secundario corregido de paso**: `app/api/extraer-perfil/route.ts`
no tenia `maxDuration`, asi que corria con el limite por defecto de Vercel
(10 s) — muy por debajo de lo que necesitan dos rondas de OpenRouter mas el
respaldo. Se le anade `export const maxDuration = 60`, igual que ya tenia
`app/api/generar/route.ts`.

**Presupuesto de tiempo** (el limite duro es maxDuration=60 en el plan
gratuito de Vercel): se acortan los timeouts por ronda para dejar hueco al
respaldo — generar documentos pasa de 25 s/ronda a 15 s/ronda + 20 s de
respaldo (50 s en el peor caso); extraer perfil pasa de 20 s/ronda a
12 s/ronda + 15 s de respaldo (39 s en el peor caso).

**Segundo fallo encontrado al usar el respaldo de verdad (mismo dia)**: el
PDF de la primera generacion via Groq salio con las listas de la experiencia
rotas — todos los puntos de un puesto pegados en un unico parrafo en vez de
en su propia linea. Causa: qwen3.6-27b, pese a que el prompt pide un salto
de linea real por punto, los separa con el caracter "•" dentro de la misma
linea. `agruparLineas` (lib/pdf.tsx) solo reconoce una linea como punto de
lista si empieza por "- ": sin el salto de linea real, todo el bloque se
lee como un unico parrafo. Arreglado con una funcion `normalizarPuntos`
(lib/ia.ts) que reparte cada "•" en su propia linea con "- " delante, antes
de guardar el texto — defensa en codigo, no solo en el prompt, siguiendo el
mismo principio que ya usaba `docs/05-ia.md` §6.1. Verificado en vivo
regenerando la misma oferta: el CV volvio con cada punto en su propia linea
y sin ningun "•" suelto.

# Pendiente

- **Anadir `OPENROUTER_API_KEY` y `GROQ_API_KEY` a las Environment
  Variables de Vercel, en el Paso 16 (T74-T76 de `docs/06-tareas.md`)**.
  Comprobado el 19/08/2026: la app todavia no esta desplegada — no hay
  proyecto en Vercel ni repositorio remoto conectado (T73-T76 sin marcar).
  No es una tarea suelta, es parte de ese despliegue. Mar decidio seguir
  en local por ahora; queda anotado ahi para cuando llegue el Paso 16, con
  nota tambien en `docs/06-tareas.md` (justo despues de T76) porque la
  tabla de claves de `docs/04-plan-tecnico.md` §4 solo lista `GROQ_API_KEY`
  y quedo desactualizada tras el cambio de proveedor (T25) y este respaldo.
- Preguntarle a Mar si en algun momento quiere valorar los 10 € de credito
  de OpenRouter (opcion descartada arriba solo por no habersela preguntado,
  no por inviable).

# Relacionado

- [decision-modelo-ia.md](decision-modelo-ia.md) — la lista de modelos de
  OpenRouter y las dos rondas, que este cambio no sustituye, solo completa.
- [hito-6-generar-cv.md](hito-6-generar-cv.md) — el diseno original de cola
  y reintentos desde el navegador (T48-T57), que sigue igual.

---

> ⚠️ **Superado el 20/08/2026**: Groq ya no es el respaldo, es el **proveedor
> principal**, y por un motivo que aquí no se contempló — la privacidad. Ver
> [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md).
>
> Dos datos de esta ficha se quedaron cortos, y conviene no fiarse de ellos:
>
> - El cupo de Groq no son "1000 peticiones al día" a efectos prácticos. El
>   límite que se agota primero son **200.000 tokens diarios** (unos 30
>   documentos para las cinco usuarias), más **8.000 por minuto**, que en la
>   práctica dejan pasar una generación por minuto.
> - El esquema JSON con `strict: true` no se comporta igual en los dos
>   proveedores: **Groq lo valida de verdad** y devuelve un 400 si la
>   respuesta no encaja. Eso obligó a bajar el mínimo de `palabras_clave` de 8
>   a 1 y a recortar los topes de entrada.
