---
type: Investigación
title: No fundir el crédito de Apify en menos de un mes — palancas y alternativas gratis
description: 10/09/2026 — investigación preventiva (la cuenta de Apify sigue a 0). Cómo cobra Apify (CU = RAM × tiempo), qué palancas hacen que 5 $/mes duren, y qué scrapers libres en GitHub (JobSpy) quitarían la dependencia. Termina con 3 opciones y una recomendación; la decisión es de Mar.
tags: [jobs-app, n8n, ingesta, apify, coste, investigacion, okf]
okf_version: "0.2"
timestamp: 2026-09-10T12:00:00Z
---

# Por qué esta nota

`docs/04-plan-tecnico.md` §5 marca Apify como **la primera señal de alarma** de
coste de todo el proyecto: capa gratuita de **5 $/mes** que **no se acumula**
(lo que no gastas ese mes, se pierde), y Apify cobra por **tiempo de cómputo**,
no por resultados. Hoy las **6 fuentes que dependen de Apify** (Indeed, LinkedIn,
InfoJobs, Wellfound, FlexJobs, All Jobs Scraper) están **desactivadas** en
`Jobs App · ingesta` porque la cuenta de Mar está a 0 — ver
[`hito-4-n8n-supabase.md`](hito-4-n8n-supabase.md). La ingesta funciona con las
**7 fuentes nativas gratuitas**: Adzuna, Himalayas, Jooble, Get on Board, We Work
Remotely, RemotoJob y Jobicy.

Esto es una investigación **preventiva**: no se reactiva ninguna fuente ni se
toca ningún workflow (el crédito sigue a 0, y los workflows `Jobs*` no se tocan —
`CLAUDE.md` punto 4). Sirve para decidir con datos **si** y **cómo** volver a
usar Apify el día que haya crédito, o **si** una herramienta libre lo sustituye.

> **Analogía.** Apify es como alquilar una furgoneta que se paga **por minutos de
> motor encendido**, no por cajas transportadas. Da igual que traigas 3 ofertas o
> 300: lo que cuesta es cuánto rato está el motor (la RAM) girando. Una furgoneta
> grande (mucha RAM) gasta más por minuto que una pequeña.

# Cómo cobra Apify (verificado el 10/09/2026)

- **Unidad de cómputo (Compute Unit, CU)** = **1 GB de RAM durante 1 hora**.
  Fórmula: `CU = memoria_asignada (GB) × duración (horas)`. Memoria mínima por
  ejecución: 128 MB. (Doc oficial: *Usage and resources*.)
- **Precio por CU en el plan Free**: las fuentes de terceros **no coinciden**
  (van de **0,20 $/CU** a **0,40 $/CU** para Free/Starter). Hasta confirmarlo en
  la consola con una cuenta real, **planificar con 0,40 $/CU** (el peor caso).
- **Se factura por separado** (cuatro contadores independientes): cómputo (CU),
  transferencia de datos, **uso de proxy**, y operaciones de almacenamiento.
- **Recargo por resultado / por evento**: **muchos actores de la Store añaden una
  tarifa "pay-per-result" o "pay-per-event" ENCIMA de las CU** (p. ej. X $ por
  cada 1.000 ofertas). Este recargo, no las CU, es lo que funde un presupuesto
  pequeño sin avisar. Hay que mirar la página de precios **de cada actor**.
- **Plan Free, otros límites**: 16 GB de RAM por ejecución y 16 GB entre todas a
  la vez; **5 IPs de proxy datacenter** incluidas; proxy **residential a 8 $/GB**
  (carísimo para este presupuesto); SERP a 2,50 $/1.000. Retención: las 10
  ejecuciones más recientes durante 4 meses.
- **Corte duro**: al agotar los 5 $, Apify **bloquea nuevas ejecuciones** el
  resto del mes. No hay factura sorpresa — pero esa fuente deja de traer nada.
- **Ancla útil**: un actor **HTTP/Cheerio** (sin navegador) con **512 MB** que
  corre **30 s** ≈ **6.000 ejecuciones dentro de los 5 $**. Un actor con
  **navegador** (Playwright/Puppeteer) a 2–4 GB que corre varios minutos cuesta
  **decenas de veces más** por ejecución.

# Qué gastaría la ingesta de Jobs App (aritmética)

La ingesta corre **1 vez al día** (cron 13:00). ~30 ejecuciones/mes.

- Presupuesto por día = 5 $ / 30 ≈ **0,166 $/día** para **todas** las fuentes
  Apify juntas.
- A 0,40 $/CU → **0,42 CU/día** = 0,42 GB·h. Repartido entre 6 fuentes son
  **~0,07 CU por fuente y día**: con 512 MB de RAM, **~8 minutos** de ejecución
  por fuente; con 2 GB, **~2 minutos**; con navegador a 4 GB no llega ni a
  1 minuto — **inviable**.
- A 0,20 $/CU se dobla el margen (0,83 CU/día), pero la conclusión no cambia:
  **con actores ligeros HTTP y pocos resultados, entra; con actores de navegador
  o con recargo pay-per-result, no.**

# Palancas para que 5 $ duren el mes (de menos a más esfuerzo)

1. **Límite de gasto en la consola de Apify a 5 $ + alertas de consumo.** Es la
   red de seguridad y hoy no está puesta. Que el corte lo decida un tope
   explícito, no la sorpresa de fin de mes.
2. **Una sola ejecución al día** (ya es el diseño) y **sobre pocas fuentes**. No
   reintentar en bucle ante un fallo de fuente (la rama de aviso de error del
   workflow ya avisa sin reintentar).
3. **Tope de resultados por ejecución** (`maxItems` / `maxResults` en el input
   del actor). No necesitamos 500 ofertas nuevas al día por fuente; con 20–50
   sobra para 5 usuarias.
4. **Bajar la memoria asignada al actor** (128–512 MB) y comprobar que aún
   termina. Es el multiplicador directo del coste.
5. **Proxy datacenter, nunca residential** (8 $/GB se comería el mes en un día).
6. **Elegir actores HTTP/Cheerio, no de navegador.** Y **descartar los actores
   con recargo pay-per-result**, por baratos que parezcan "desde X $".
7. **Actor propio mínimo** (palanca real, ya anotada en `docs/04` §5): hace solo
   lo que necesitamos y consume menos que uno genérico. No lo vuelve gratis —
   sigue pagando CU — pero baja el tiempo de ejecución. Trabajo para después del
   MVP.
8. **Deduplicación**: ya resuelta aguas abajo por `unique(fuente, id_externo)` en
   Supabase; no ahorra CU (el scraping ya ocurrió) pero evita trabajo repetido en
   n8n. Nada que cambiar.

# Alternativas gratis y auto-alojadas en GitHub

**JobSpy** — `speedyapply/JobSpy` (PyPI: `python-jobspy`).
- **Cubre**: LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter, Bayt, Naukri,
  BDJobs. Se solapa con 3 de las 6 fuentes Apify desactivadas (Indeed, LinkedIn,
  Glassdoor vía "All Jobs Scraper").
- **Licencia MIT**, mantenimiento activo (repo con cientos de commits, releases
  recientes), **Python 3.10+**.
- **Puro HTTP, sin navegador** — ligero, sin Chromium que instalar.
- **Riesgo de bloqueo (429)**: Indeed sin rate-limit reportado; LinkedIn bloquea
  ~página 10 por IP; el resto, variable. Acepta lista de `proxies`. Desde una IP
  de datacenter (GitHub Actions, Vercel) el bloqueo es más probable — empezar por
  Indeed + Google y tratar LinkedIn/Glassdoor como experimento.
- Puerto TypeScript: `alpharomercoma/ts-jobspy`.

**JobFunnel** — `PaulMcInnis/JobFunnel`: **descartado**. El propio repo está
**archivado** como pieza histórica/educativa: se hizo cuando los portales servían
HTML estático y hoy tienen anti-bot agresivo.

**Dónde correría JobSpy sin coste** (0 €/mes):

| Sitio | Cómo | A favor | En contra |
|---|---|---|---|
| **Función Python en el mismo proyecto Vercel** de Jobs App (`/api/ingesta-scrape`), llamada por n8n con HTTP Request igual que hoy llama a Apify | Vercel soporta Python; ya desplegamos ahí | 0 €, **aislado de la infra n8n**, sin secreto nuevo de Supabase (escribe n8n, no la función), cambio mínimo en el workflow (misma forma de llamada) | Límite de duración de la función; IP de datacenter (más 429) |
| **Cron de GitHub Actions** en el repo privado (2.000 min/mes gratis, `docs/07`), escribe en `ofertas` vía REST de Supabase | Aislado, sin host siempre encendido | No toca n8n en absoluto | Necesita una credencial de escritura a Supabase como *secret* — usar **anon key + una policy de INSERT en `ofertas`**, **nunca** la `SERVICE_ROLE_KEY` (salta la RLS — `CLAUDE.md`); IP de datacenter |
| **Contenedor n8n** (`Docker n8n`) con imagen con Python + nodo Execute Command | Todo en un sitio | **Cambia la imagen base del n8n de Mar** → afecta también a `Jobs · ingesta` de producción; rebuild y riesgo. Demasiado invasivo para esto |

# Nota de privacidad

Las **ofertas son datos públicos** — riesgo mucho menor que el texto de los CVs,
que es lo que gobierna la cascada de proveedores de IA. Aun así, cualquier
scraper nuevo:
- **nunca** lee `perfiles` ni el texto de ningún CV; sólo produce filas de
  `ofertas` (título, empresa, enlace, descripción, fuente);
- debe quedar **documentado dónde se ejecuta** y con qué credencial escribe;
- si escribe directo a Supabase (opción GitHub Actions), va con anon key + policy
  de INSERT acotada, no con la service role key.

# Opciones (decide Mar)

**A — No reactivar Apify. Quedarse con las 7 fuentes nativas gratuitas.**
Coste 0, riesgo 0, ya probado en producción real. La ingesta ya llena `ofertas`
a diario y el MVP funciona. Revisar sólo si la prueba con la clase muestra que a
alguna usuaria le faltan ofertas de su sector. *(Recomendada para ahora.)*

**B — Sin Apify, pero con más cobertura: JobSpy como función Python en Vercel.**
`/api/ingesta-scrape` en el mismo proyecto, llamada desde n8n por HTTP igual que
hoy se llama a Apify. 0 €, aislado de la infra n8n, sin secreto nuevo. Empezar
por Indeed + Google; LinkedIn/Glassdoor como experimento. Es la vía si hacen
falta más ofertas y el presupuesto sigue a 0.

**C — Con crédito Apify algún día: reactivar 1–2 fuentes, muy contenidas.**
Tope de gasto de 5 $ en consola + alertas; memoria 256–512 MB; `maxItems` bajo
(20–50); proxy datacenter; **sólo actores HTTP/Cheerio**, nunca de navegador;
**descartar actores con recargo pay-per-result**; vigilar el consumo real los 3
primeros días (`docs/04` §5 ya lo pide). Aporta Indeed/LinkedIn "de verdad" a
cambio de gestión y vigilancia continuas.

Ninguna de las tres está elegida. B y C son mutuamente compatibles a futuro
(JobSpy para lo que tolera IP de datacenter, Apify para lo que no).

# Relacionado

- [`hito-4-n8n-supabase.md`](hito-4-n8n-supabase.md) — las 6 fuentes Apify
  desactivadas y las 7 gratuitas activas.
- `docs/04-plan-tecnico.md` §5 — Apify como el margen de coste más ajustado;
  vigilar el consumo los primeros días.
- `docs/07-emergencia.md` — "Apify: la cuenta está sin crédito" en la checklist.
- Fuentes consultadas (10/09/2026):
  [Apify — Usage and resources](https://docs.apify.com/platform/actors/running/usage-and-resources),
  [Apify — What is a compute unit](https://help.apify.com/en/articles/3490384-what-is-a-compute-unit),
  [Apify free plan 2026 (resumen de terceros)](https://use-apify.com/docs/what-is-apify/apify-free-plan),
  [Apify compute units 2026 (resumen de terceros)](https://use-apify.com/docs/what-is-apify/apify-compute-units),
  [JobSpy (GitHub)](https://github.com/speedyapply/JobSpy),
  [python-jobspy (PyPI)](https://pypi.org/project/python-jobspy/),
  [JobFunnel (GitHub, archivado)](https://github.com/PaulMcInnis/JobFunnel).
