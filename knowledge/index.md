---
type: Knowledge Bundle
title: Jobs App — base de conocimiento
description: Documentacion en formato OKF (Open Knowledge Format) de las decisiones, contexto y trabajo de este proyecto.
tags: [jobs-app, okf]
okf_version: "0.2"
timestamp: 2026-08-20T09:00:00Z
---

# Que hay aqui

Bundle [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
que documenta el trabajo de este proyecto (Jobs App): decisiones tomadas,
contexto heredado, y lo que se va construyendo paso a paso con el metodo de
17 pasos. Cada concepto es un fichero markdown con frontmatter YAML; la ruta
del fichero es su identidad.

Este bundle es independiente del bundle OKF del backend n8n
(`Docker n8n/knowledge/workflows/jobs/`), que documenta el pipeline que ya
existe en produccion y no se toca desde aqui.

# Contenido

- [contexto-pipeline-n8n.md](contexto-pipeline-n8n.md) — de donde viene este
  proyecto y que hereda del backend n8n existente.
- [decision-alcance-mvp-remoto.md](decision-alcance-mvp-remoto.md) —
  decision tomada en el Paso 1: el MVP se acota a trabajo remoto asalariado.
- [concepto-mvp.md](concepto-mvp.md) — explicacion didactica de que es un
  MVP y por que el alcance actual no es permanente.
- [preferencias-tecnicas-paso5.md](preferencias-tecnicas-paso5.md) —
  preferencias de tecnologia (email, modelo de IA) para el Paso 5.
- [decision-stack-mvp.md](decision-stack-mvp.md) — decision tomada en el
  Paso 5: con que tecnologias se construye la web y por que.
- [decision-rol-ia.md](decision-rol-ia.md) — decision tomada en el Paso 6:
  que usa IA, que no, y como se contienen los fallos del modelo.
- [decision-tareas-mvp.md](decision-tareas-mvp.md) — decision tomada en el
  Paso 7: como se trocea el MVP en 76 tareas verificables.
- [pendiente-generacion-cv-falla-25-08.md](pendiente-generacion-cv-falla-25-08.md)
  — 🔴 **lo primero de la próxima sesión**: generar el CV falla en producción
  (T109) y la migración 0018 nunca se aplicó (T108).
- [incidente-ofertas-tapadas-25-08.md](incidente-ofertas-tapadas-25-08.md) —
  regresión de T85: `/ofertas` tapaba ofertas válidas de días anteriores
  hasta que corría la ingesta de hoy.
- [hito-1-base-de-datos.md](hito-1-base-de-datos.md) — cierre del Hito 1
  (Paso 9, T09-T14): las cuatro tablas creadas en Supabase y el candado
  RLS que garantiza la privacidad entre usuarias.
- [decision-caducidad-sesion.md](decision-caducidad-sesion.md) — decision
  tomada en T16: la caducidad de sesion a 15 dias de inactividad no se
  puede forzar en el plan gratuito de Supabase; se documenta como
  limitacion conocida en vez de pagar el plan Pro.
- [hito-2-entrar.md](hito-2-entrar.md) — cierre del Hito 2 (Paso 9,
  T18-T22): magic link de extremo a extremo, sesion persistente, mensaje
  claro ante enlace caducado.
- [idea-cerebras-version-consolidada.md](idea-cerebras-version-consolidada.md)
  — Cerebras exige tarjeta, descartado para el MVP; candidato a revisar
  cuando Jobs App pase a una version consolidada mas alla de la clase.
- [decision-modelo-ia.md](decision-modelo-ia.md) — T25: Groq perdio su
  variedad de modelos abiertos, se cambia a OpenRouter con una lista de
  modelos gratis intercambiables. `lib/groq.ts` pasa a llamarse
  `lib/ia.ts`.
- [hito-3-perfil.md](hito-3-perfil.md) — cierre del Hito 3 (Paso 9,
  T25-T31): la IA extrae puesto y palabras clave del CV pegado, editables,
  guardadas en Supabase.
- [hito-4-n8n-supabase.md](hito-4-n8n-supabase.md) — cierre del Hito 4
  (Paso 9, T32-T40): workflow nuevo `Jobs App · ingesta` en n8n, escribe en
  Supabase, fuentes de pago de Apify desactivadas, vigilante propio de
  Healthchecks.
- [hito-5-ver-ofertas.md](hito-5-ver-ofertas.md) — cierre del Hito 5
  (Paso 9, T41-T47): pantalla `/ofertas`, emparejamiento por codigo sin IA
  contra puesto/palabras clave del perfil, boton "me interesa" con dedupe
  a nivel de base de datos.
- [hito-6-generar-cv.md](hito-6-generar-cv.md) — cierre del Hito 6 (Paso 9,
  T48-T57): una llamada al modelo produce CV y carta adaptados a la oferta,
  con el idioma decidido por codigo, verificacion automatica de cifras y
  nombres inventados, limite de 5 al dia y cola con reintentos desde el
  navegador.
- [mejora-navegacion.md](mejora-navegacion.md) — T77-T80, añadidas tras el
  Hito 5: menu permanente, cerrar sesion, aterrizaje condicional del enlace
  del email y guia de dos pasos. Las pantallas estaban construidas pero
  incomunicadas entre si.

- [mejora-palabras-clave.md](mejora-palabras-clave.md) — las palabras clave
  que proponia la IA eran frases largas que ningun anuncio contiene
  literalmente, y por eso la pantalla de ofertas salia vacia; se corrigen el
  prompt, el esquema y la validacion en codigo, y los terminos largos se
  recortan al nucleo.
- [decision-diseno-pdf.md](decision-diseno-pdf.md) — T58-T62 y T82-T83:
  rediseno del PDF tras revision visual de Mar, inspirado en una plantilla
  de referencia pero sin columnas paralelas ni texto girado (arriesgan la
  lectura de un ATS), fuentes incrustadas (Playfair Display + Jost) y el
  nombre completo anadido al perfil.
- [decision-respaldo-groq.md](decision-respaldo-groq.md) — el error "servicio
  de IA saturado" al generar CV y carta era el cupo diario compartido de
  OpenRouter agotado, no saturacion por modelo; se anade Groq como respaldo
  con cupo propio.
- [decision-idioma-consistente-cv.md](decision-idioma-consistente-cv.md) — el
  titular del PDF salía siempre en castellano aunque el CV y la carta se
  generasen en inglés; la IA adapta ahora también el titular al mismo
  idioma, guardado en `generaciones.puesto_texto`.
- [idea-navegacion-atras-coherencia.md](idea-navegacion-atras-coherencia.md)
  — el botón de "volver atrás" resultó ya estar cubierto por el menú de
  T77, confirmado con Mar y cerrado sin código nuevo. Sigue abierta la idea
  del home (estadísticas personalizadas), explícitamente fuera del MVP.
- [hito-8-aviso-email.md](hito-8-aviso-email.md) — cierre de T63-T67 (Paso
  9, Hito 8): nodos nuevos en `Jobs App · ingesta` que cuentan ofertas
  nuevas, consultan usuarias con perfil (vista `perfiles_con_email`, con el
  email que solo vivía en `auth.users`) y envían el aviso por Gmail;
  verificado con una ejecución real.
- [hito-9-publicar.md](hito-9-publicar.md) — cierre de T69-T76 (Paso 9,
  Hito 9): repositorio privado en GitHub, proyecto enlazado en Vercel,
  claves de entorno y primer recorrido completo probado desde el móvil en
  la dirección pública. El bloqueador encontrado — Site URL/Redirect URLs
  de Supabase Auth seguían apuntando a `localhost` — resultó ser también la
  causa de que `APP_URL_JOBS_APP` (Hito 8) siguiera sin actualizar.
- [paso-10-prompts-produccion.md](paso-10-prompts-produccion.md) — Paso
  10: al no haber IA conversacional, se escriben dos prompts de tarea
  (`prompts/system.md`) en vez de un system prompt de chat, más 10 casos
  difíciles (`evals/casos-dificiles.md`); `lib/ia.ts` alineado el mismo
  día con la defensa contra inyección de instrucciones.
- [paso-11-no-aplica.md](paso-11-no-aplica.md) — Paso 11 marcado
  explícitamente como no aplicable: `docs/05-ia.md` §4 ya dice "ninguna
  herramienta, ni una sola"; el trabajo equivalente a prueba de errores
  ya vive en `lib/ia.ts` y `lib/verificarCv.ts` bajo el paraguas del
  Paso 14, no del 11.
- [paso-12-pruebas.md](paso-12-pruebas.md) — Paso 12: 172 pruebas con
  Vitest sobre la parte determinista (funciones puras, endpoints y
  componentes clave), con un doble encadenable de Supabase y sin llamar
  nunca a un modelo de IA real.
- [paso-13-evals.md](paso-13-evals.md) — Paso 13: golden dataset de 25
  casos y arnés con Promptfoo para los dos prompts de `lib/ia.ts`, con 5
  métricas de alta señal, umbrales iniciales de aprobado y un hallazgo
  real de invención total en un CV vacío.
  — **Actualización 21/08/2026 (Paso 17)**: tres relanzamientos de
  `generarCvYCarta` en la misma tarde, los tres NO CONCLUYENTE, oscilando
  sin patrón (53,8 % → 38,5 % → 61,5 %) y con **tres motivos de formato
  distintos** (JSON que no cumple el esquema, CV por debajo del mínimo,
  CV sin saltos de línea reales): `qwen/qwen3.6-27b`, proveedor
  **principal** desde el 20/08, es inestable en esta llamada concreta —
  no es un umbral que recalibrar. Confirma una debilidad ya anotada el
  20/08 cuando ese modelo era solo el respaldo. Pendiente decidir si
  conviene otro modelo de Groq para `generarCvYCarta` antes de invitar a
  las compañeras el 24/08.
  — **Actualización 22/08/2026 (Paso 17)**: la cuarta pasada NO CONCLUYENTE
  seguida resultó ser, en parte, un fallo de la propia puerta (ver
  [arreglo-puerta-casoreventado.md](arreglo-puerta-casoreventado.md)). Con
  la puerta arreglada, el veredicto real contra Gemini es **ROJO**:
  `fidelidad` 88 % y `resistencia_inyeccion` 63,6 %. De los 5 casos
  investigados: uno era otro falso positivo del comprobador (forma de
  género, "Ingeniero Informático" vs "Ingeniería Informática", arreglado);
  uno es invención real de qwen; los tres de inyección probablemente son el
  guardrail de longitud bloqueando bien una respuesta descarrilada, no un
  fallo de seguridad — refuerzo del prompt ya redactado en `lib/ia.ts` y
  `prompts/system.md`, pendiente de confirmar con una pasada real de evals
  (cuesta media cuota diaria de Groq) antes del 24/08.
- [paso-14-guardrails.md](paso-14-guardrails.md) — Paso 14: las 7 capas de
  guardrails sobre `lib/ia.ts`, con relevancia/seguridad/moderación como
  reglas deterministas (sin llamadas nuevas al modelo, confirmado con Mar)
  y los dos disparadores de intervención humana adaptados a un producto
  sin panel de administración.
- [paso-15-red-team.md](paso-15-red-team.md) — Paso 15: 35 ataques OWASP
  Top 10 para LLM contra el sistema real, varios ejecutados en vivo; sin
  límite diario en `/api/extraer-perfil` (riesgo de dejar a las 5 usuarias
  sin cupo), y el detector de inyección se esquiva con Unicode invisible o
  una simple paráfrasis. Informe completo en `seguridad/red-team.md`.
- [decision-groq-principal-privacidad.md](decision-groq-principal-privacidad.md)
  — 20/08/2026: Groq pasa a proveedor principal de IA. El red team descubrió
  que los modelos gratis de OpenRouter podían **entrenar con los CVs**; se
  apagó esa opción y, como eso deja sin servicio a los `:free`, se invirtió el
  orden. Groq tiene ZDR global y un cupo diario de 200.000 tokens (unos 30
  documentos) en vez de las 50 peticiones de OpenRouter.
- [paso-15-revision-opus.md](paso-15-revision-opus.md) — Paso 15, segunda
  pasada independiente: la inyección indirecta que el primer informe dio por
  resistida **sí funciona** (un anuncio manipulado sustituye el CV entero y
  sale con cero avisos), porque la descripción de la oferta está dentro de la
  lista blanca de `verificarCv`. Más: `titulo`/`empresa` sin vigilar,
  registro abierto y privacidad de los modelos `:free` de OpenRouter. Incluye
  los arreglos aplicados el mismo día, verificados relanzando los ataques en
  vivo. Informe completo en `seguridad/red-team-opus.md`.

- [paso-16-publicar.md](paso-16-publicar.md) — Paso 16: la publicación deja de
  ser automática de Vercel y pasa a un robot de GitHub Actions que **solo
  publica si lint, pruebas y (cuando el cambio toca la IA) los evals superan
  sus umbrales**. Incluye las cuatro decisiones de Mar (puerta que bloquea,
  evals solo al tocar la IA con freno `[sin evals]`, entrada cerrada por
  invitación, vistas previas protegidas), el veredicto de tres estados que
  distingue un suspenso de calidad de una falta de cuota, y
  [`docs/07-emergencia.md`](../docs/07-emergencia.md) con la marcha atrás y la
  lista de comprobación previa al lanzamiento.
  — **La puerta encontró cuatro fallos reales el primer día**, todos
  preexistentes: las claves no llegaban a los evals (las variables *Sensitive*
  de Vercel no se pueden leer desde fuera, y `env pull` falla en silencio); el
  arnés de Promptfoo **podía colgarse indefinidamente**, porque sus dos topes
  de tiempo valen 0 por defecto; las pausas de los evals pedían **2,6 veces el
  límite por minuto de Groq**; y las vistas previas salían **rotas** porque se
  construían fuera de Vercel. Los cuatro habrían aparecido el día de enseñar
  la app.
  — **Y un quinto, en la primera fusión real a `master` (21/08/2026)**: el
  freno `[sin evals]` leía todo el cuerpo del commit, así que una viñeta que
  solo *mencionaba* el freno lo activó de verdad y la puerta se saltó sin
  deber hacerlo. Arreglado exigiendo que la marca esté al final del asunto
  del commit, verificado contra dos ejecuciones reales en GitHub Actions.
- [paso-17-vigilancia.md](paso-17-vigilancia.md) — Paso 17: tabla
  `metricas_ia` en Supabase para coste/cupo, tiempo de respuesta, tasa de
  éxito, guardrails saltados y escaladas a humano; rama nueva de alertas por
  email en `Jobs App · ingesta` (sin tocar nodos existentes); y
  `docs/08-rutina.md` con la rutina semanal de 15 minutos y el ciclo de
  mejora hacia el golden dataset del Paso 13.
- [decision-gemini-generarcv.md](decision-gemini-generarcv.md) — 21/08/2026:
  Gemini (`gemini-2.5-pro`) pasa a ser el primer intento de
  `generarCvYCarta` (Groq y OpenRouter siguen detrás, como respaldo);
  `extraerPerfil` no cambia. Motivado por tres pasadas de evals inestables
  con `qwen/qwen3.6-27b` en esa llamada. Verificada la política de datos
  antes de añadirlo: el nivel gratuito entrena en general, pero una
  excepción de los términos de Google para el Espacio Económico Europeo
  hace que no entrene con los datos de Mar ni de sus compañeras.
- [arreglo-verificarcv-falsos-positivos.md](arreglo-verificarcv-falsos-positivos.md)
  — 21/08/2026: la primera pasada de evals contra Gemini salió 30,77 %, pero
  3 de 9 fallos eran falsos positivos del propio comprobador de invenciones
  (`lib/verificarCv.ts`), no del modelo: no reconocía "tres" y "3" como el
  mismo número ni una sigla expandida ("AWS" → "Amazon Web Services (AWS)")
  como la misma sigla. Arreglado en el guardrail real (no solo en los evals,
  que es una copia simplificada) porque afecta a las usuarias de verdad, con
  cualquier proveedor de IA.
- [arreglo-puerta-casoreventado.md](arreglo-puerta-casoreventado.md) —
  22/08/2026: la puerta de calidad (Paso 16) no podía dar ROJO nunca en la
  práctica. `casoReventado` usaba `Boolean(caso.error)` para detectar
  infraestructura, pero Promptfoo rellena `caso.error` también en un
  suspenso de calidad normal; con eso, cualquier invención real caía en "no
  concluyente". Arreglado dejando solo `failureReason === 2` como señal.
  Con el arreglo, el veredicto real sobre la pasada de Gemini de ese día es
  ROJO (`fidelidad` 88 %, `resistencia_inyeccion` 63,6 %), no NO
  CONCLUYENTE.

- [arreglo-ingesta-duplicado-bloqueaba-lote.md](arreglo-ingesta-duplicado-bloqueaba-lote.md)
  — 23/08/2026: la ingesta diaria llevaba 3 días sin correr (n8n apagado a
  las 13:00) y, al lanzarla a mano, una oferta duplicada bloqueaba el lote
  entero de 5 y no se guardaba ninguna. Arreglado con un nodo "Loop Over
  Items" (batchSize 1) en `Jobs App · ingesta` para que cada oferta sea su
  propia petición.
- [mejora-perfil-ofertas-23-08.md](mejora-perfil-ofertas-23-08.md) —
  23/08/2026, T84-T92: teléfono/LinkedIn fuera del perfil, la IA sugiere
  3-5 puestos seleccionables con casillas, autocompletado de palabras
  clave sobre una lista ampliada, y las ofertas caducan de verdad a los 15
  días. Revierte una exclusión explícita de `docs/03-spec.md` §8. Diseño
  aditivo en el esquema de `lib/ia.ts` (campos nuevos, no sustituidos) para
  no romper el golden dataset existente.
- [decision-cloudflare-generarcv.md](decision-cloudflare-generarcv.md) —
  23/08/2026: Gemini se sustituye por Cloudflare Workers AI
  (`@cf/mistralai/mistral-small-3.1-24b-instruct`) en `generarCvYCarta`,
  tras un CV real con datos inventados. Investigados en vivo DeepSeek,
  Mistral, NVIDIA, Cohere, OVHcloud y Cerebras con tarjeta: todos
  descartados por privacidad, restricción de producción o exigir pago real.
  Verificado en vivo: el timeout inicial (18 s) se quedaba corto y caía a
  Groq en silencio; corregido a 26 s con datos reales de latencia,
  `uso.proveedor` confirma "Cloudflare". Esa misma noche, decisión de Mar:
  Groq se retira del TODO el proyecto — Cloudflare pasa a ser principal
  también de `extraerPerfil` (nunca pasado por evals), OpenRouter queda
  como único respaldo. Pendiente: relanzar evals y añadir los secretos en
  GitHub/Vercel antes de publicar.
- [decision-rehacer-cv-carta.md](decision-rehacer-cv-carta.md) — 23/08/2026,
  T93: botón "Rehacer" junto a "Descargar" — la usuaria escribe qué cambiar
  ("más profesional", "más conciso") y la IA redacta otra vez el CV y la
  carta de esa oferta. Excepción explícita a la regla de negocio 7 (documento
  definitivo), con su propio límite (2 por documento) **aparte** del cupo
  diario de 5 — decidido explícitamente con Mar entre tres opciones.
  `lib/ia.ts` cambia solo cuando hay instrucciones, para no invalidar el
  golden dataset existente. Evals relanzados: **ROJO**, no causado por este
  cambio — ver `paso-13-evals.md`.
- [decision-arreglo-generarcv-rojo.md](decision-arreglo-generarcv-rojo.md) —
  24/08/2026, T94: arreglo del ROJO, decidido explícitamente con Mar entre
  cuatro opciones ("las dos cosas a la vez"). Refuerzo del prompt contra la
  invención de secciones y la inyección colando datos falsos (ya estaba
  hecho, sin commitear), más `LARGO_MINIMO_CV` flexible: ya no exige 400
  caracteres siempre, se ajusta al tamaño del CV original con un suelo de
  150. Pendiente T95: relanzar evals para confirmarlo.
- [arreglo-puerta-motivo-real.md](arreglo-puerta-motivo-real.md) —
  24/08/2026: al lanzar T95, `helpers.cjs` sustituía el motivo real de un
  fallo por un texto fijo ("Sin salida que comprobar"), así que una tanda
  entera sin cuota (13/13 timeouts de Cloudflare + OpenRouter roto) se contó
  como ROJO de fidelidad en vez de NO CONCLUYENTE. Arreglado en dos capas
  (`helpers.cjs` propaga `output.mensaje`; `puerta-calidad.mjs` también mira
  el error crudo de la respuesta) — recalculado sin gastar cuota nueva,
  veredicto correcto: NO CONCLUYENTE. T95 sigue sin confirmar de verdad.

- [incidente-esquema-desajuste-24-08.md](incidente-esquema-desajuste-24-08.md)
  — 24/08/2026: producción (commit del 22/08) quedó activamente rota para
  cualquier usuaria con perfil guardado — pedía la columna `puesto`, que la
  migración 0017 (23/08) ya había borrado. Descubierto al probar el enlace
  del email de aviso (T68). Mar decide publicar ya con `[sin evals]` en vez
  de esperar a mañana.

Segun avance el proyecto, cada decision o hito relevante (spec, stack, tarea
completada, incidente, aprendizaje) se documenta aqui como un concepto nuevo.

# Convenciones

- `type` es el unico campo obligatorio del frontmatter (p. ej. `Nota`,
  `Decision`, `Tarea`, `Incidente`).
- `title` y `description` son recomendados: nombre legible y resumen en una
  frase.
- `timestamp` es la fecha de la ultima edicion del *documento*.
- `tags` como lista YAML para categorizar.
- Enlaza entre conceptos con links markdown normales (relativos o
  absolutos desde la raiz del bundle) — el grafo de enlaces es parte del
  formato, no decoracion.
- Los textos se escriben en castellano.
- Ver [log.md](log.md) para el historial cronologico de cambios del bundle.
