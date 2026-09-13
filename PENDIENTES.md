# Pendientes — Jobs App

_Última actualización: 2026-09-13_

Lista viva de lo que queda por hacer, ordenada por prioridad. Cada tarea
enlaza a su detalle en `knowledge/`. Al cerrar una tarea se mueve a
**[✅ Completadas](#-completadas)**, al final del documento.

> Cómo se mantiene: ver `CLAUDE.md` → sección "Documentación". Este fichero
> se actualiza junto con `knowledge/log.md` e `index.md` después de cada
> cambio relevante. La historia cronológica está en `knowledge/log.md`;
> aquí solo vive lo que mira hacia delante.

---

## 🔴 Prioridad alta

### P1 · Frente 2 — entrega a las 5 compañeras de clase
- **Qué:** entregar la app en clase **el lunes (14/09)**, no el 11/09 —
  aplazada por Mar el 11/09, sin prisa. Sin sesiones 1:1 agendadas ni CVs de
  muestra: se da acceso a las 5 y la prueban en/tras clase. El guion de 3
  tareas de `knowledge/prueba-usuarios-frente-2-prep.md` sigue valiendo como
  referencia de qué mirar.
- **Bloqueador RESUELTO (13/09, 16:13 UTC):** el push de `98ecd29` (solo
  documentación, el cierre del nombre "Llana") volvió a disparar la puerta
  de IA porque `fd90edc` seguía sin publicar (regla T115: se compara con lo
  publicado, no con el push anterior). Esta vez con cuota de Groq
  recuperada — **VEREDICTO VERDE** (`gh run 34766670480`): formato 100 %,
  calidad_palabras_clave 100 %, fidelidad 96 % (24/25, B03 es ruido nuevo,
  no B06/B08), idioma 100 %, resistencia_inyeccion 100 %. **"Publicar en
  Vercel" corrió solo y `fd90edc` ya está en producción** — no hizo falta
  esperar a mañana. Detalle del recorrido completo en
  `knowledge/arreglo-p0bis-b12-a10-11-09.md`.
- **Falta:**
  1. Que Mar traiga los 5 nombres/emails de sus compañeras.
  2. Darlas de alta en Supabase Auth (`shouldCreateUser: false`).
- **Estado:** desbloqueada. Solo quedan los emails y el alta — puede cerrarse
  en cuanto Mar los traiga, sin depender ya de ninguna cuota.

---

## 🟡 Prioridad media

### P11 · Registro formal del nombre "Llana"
- **Qué:** antes de usar el nombre en público (clase del 14/09 vale, es
  interno; lanzamiento más amplio no): comprobar dominio real en un
  registrador y marca en la OEPM. La sesión de naming (13/09) descartó
  colisión de producto por búsqueda web — no sustituye ese trámite.
- **Contexto:** `docs/marketing/05-identidad-verbal.md` §1.e,
  [[decision_nombre_llana_13_09]].
- **Estado:** no bloquea P1 (entrega a la clase); sí antes de propagar el
  nombre a copy público / README.

### P3 · Fechas en el CV
- **Qué:** reintentar añadir el periodo por entrada al CV generado, con una
  instrucción más fina y cuota fresca.
- **Contexto:** `knowledge/prueba-e2e-produccion-01-09.md`. Revertido dos
  veces (01/09 y antes): el modelo inventa años y acorta CVs, la puerta sale
  ROJO.
- **Estado:** no urgente, tarea aparte.

---

## ⚪ Prioridad baja

### P4 · Supervisión operativa de Mistral (respaldo de IA)
- **Qué:** (a) revisar el gasto real contra el tope de 10 € tras unos días
  de uso; (b) opcional: activar Zero Data Retention; (c) sonda de evals con
  `CLOUDFLARE_API_TOKEN` roto a propósito para medir la ruta de Mistral
  entera.
- **Contexto:** `knowledge/decision-mistral-pago.md`,
  [[decision_mistral_pago_respaldo_c1]].

### P5 · Mistral como proveedor principal (mejora futura)
- **Qué:** si algún día interesa — opción A (`mistral-medium` reajustando
  longitudes) u opción B (Claude Haiku 4.5).
- **Contexto:** `knowledge/decision-mistral-pago.md`. Sin prisa: hoy
  Cloudflare de principal funciona y tiene la puerta VERDE.

### P6 · 503 transitorio en la 1ª descarga de PDF
- **Qué:** la causa (cold start de la función de Vercel con
  `@react-pdf/renderer`) sigue ahí; solo está mitigada.
- **Contexto:** `knowledge/robustez-demo-frente-1.md`,
  `knowledge/prueba-e2e-produccion-01-09.md`. El frontend ya reintenta ante
  5xx, así que no bloquea a la usuaria.
- **Chequeo (2026-09-10):** revisado `app/api/descargar/[id]/route.ts` — ya
  tiene `maxDuration = 60` y `Font.register` a nivel de módulo (se reusa en
  instancias calientes). El único arreglo "de verdad" sería un cron de
  calentamiento, que añade una pieza móvil permanente y gasta cuota de cron
  para tapar un 503 raro y ya recuperado por el frontend. **Recomendación:
  dejarlo como está**, mitigado y documentado. Sin cambio de código.

### P7 · Página 2 del PDF medio vacía
- **Qué:** cuando el CV desborda por poco, la segunda página sale casi en
  blanco. Inherente a `<Page wrap>` en A4.
- **Contexto:** `knowledge/prueba-e2e-produccion-01-09.md`. No bloquea.
- **Chequeo (2026-09-10):** causa localizada — cada cabecera de entrada de
  experiencia es `<View wrap={false}>` (deliberado, T83, para no separar
  la empresa de su cargo/periodo); cuando una cae junto al borde de página
  salta entera a la siguiente y deja el hueco. Mitigación contenida posible
  (`minPresenceAhead` en los títulos de sección para que no queden
  huérfanos), pero la skill `diseno-cv-pdf` exige verificar a ojo cualquier
  cambio de layout contra un CV forzado a 3-4 páginas. **Recomendación:
  plegarlo en P3** (la otra pasada de PDF/prompt post-entrega) para que
  tenga un ciclo de prueba visual de verdad. Sin cambio de código ahora.

---
---
---

# ✅ Completadas

<details>
<summary><b>Ver histórico de tareas cerradas</b> (no editar salvo para añadir una nueva al principio)</summary>

<br>

### ~~P9 · Nombre del MVP e identidad verbal~~ — cerrada 2026-09-13
Sesión de naming con Corita (director-creativo + mkt-06): seis rondas de
brainstorming (fonética, objetos/velocidad, luz/tiempo, oficio/sonido,
sinónimos directos en castellano, auditoría de una lista traída por Mar desde
Gemini), con comprobación de colisión de marca en cada candidato. JobFit y
FitCV (finalistas de la 2ª ronda, 10/09) cayeron al comprobar dominio: ambos
tienen un competidor real casi homónimo haciendo lo mismo (`jobfit.cv`,
`fitcv.com.br`). **Elegido: Llana** — palabra española directa (la
herramienta de albañil que alisa una superficie, misma idea que la IA con el
CV), sin colisión de marca real, registro serio y cálido. Descriptor:
"Llana, tu guía personalizada para buscar trabajo" — se descartaron "agente"
y "asistente" por sobreprometer (la IA no es un agente autónomo, y "agente
de empleo" es figura regulada en España) y por chocar con el cliché ya
prohibido "asistente inteligente". `docs/marketing/05-identidad-verbal.md`
actualizado con el nombre en todo el documento. Pendiente de registro formal
→ **P11**. → `docs/marketing/05-identidad-verbal.md` §1.e

### ~~P0-bis · Publicar el ajuste de prompt de `extraerPerfil` (`fd90edc`)~~ — cerrada 2026-09-11
Arreglados **B12** (una instrucción incrustada inflaba el mínimo de
longitud exigido al CV, mismo patrón que `cvSinTextoAjeno` de T113 con una
forma nueva) y **A10** (`extraerPerfil` mezclaba dos personas pegadas — la
regla ya estaba en `prompts/system.md` pero nunca había llegado al prompt
real). **B05 era ruido** de una sola tanda, confirmado con sonda; no se
tocó ningún umbral. De paso, corregido el mismo hueco de replicación en
`evals/promptfoo/helpers.cjs`. Re-metido `fd90edc`. `npm run evals`
completo con cuota fresca: **VEREDICTO VERDE** (formato 100 %,
calidad_palabras_clave 100 %, fidelidad 96 % [24/25], idioma 100 %,
resistencia_inyeccion 100 %). Commit `1c4b92b`. Publicado con permiso de
Mar a la rama `arregla-p0bis-b12-a10-11-09` (push, no `master`); el robot
(`gh run 34612763230`) dio **NO CONCLUYENTE** por el juez (Groq sin cuota
tras dos tandas el mismo día) — las métricas calificadas salieron en
100 % o mejor. Relanzamiento y fusión a `master` pendientes → **P1**.
→ `knowledge/arreglo-p0bis-b12-a10-11-09.md`

### ~~P10 · Cuatro observaciones menores del `/code-review` de P2~~ — cerrada 2026-09-11
1. `app/api/ofertas/route.ts` — términos solapados del perfil ("Project
   Manager" + "Manager") ya no cuentan como dos coincidencias distintas.
2. `components/FormularioAcceso.tsx` — el sondeo de sesión se para a los
   10 minutos; los oyentes de foco/visibilidad se quedan.
3. `app/api/ofertas/route.ts` — tope explícito de 50 en la respuesta final.
4. `lib/perfil.ts` — `tienePerfilGuardado` propaga el error de lectura en
   vez de tragárselo.

`npm run lint` y `npm test` (360/360) en verde. Commit `98d5931`, solo en
local. → `knowledge/arreglo-p0bis-b12-a10-11-09.md`

### ~~P2 · Arreglos de usabilidad del 05/09 a producción~~ — cerrada 2026-09-10
Publicado por **Camino A**: se fusionó `mejora-usabilidad-onboarding-05-09` a
`master` **sin `fd90edc`** (el ajuste de prompt de `extraerPerfil`), así que el
robot no re-evaluó la IA y desplegó limpio. Robot `34499789601` VERDE
(puerta de IA **saltada**), producción sirve `04e96fc` en
`https://jobs-app-dun.vercel.app` (HTTP 200 comprobado). Incluye: guard de
sesión en `/`, guía de 3 pasos, formulario de perfil en secciones, autosync de
la pestaña del enlace mágico, umbral de coincidencias en ofertas. Antes de
fusionar, `/code-review` encontró 6 cosas: se arreglaron las 2 con impacto
(commit `eb0cfd0` — un acierto de puesto basta para no dejar sin ofertas a un
perfil de nicho; y quitada la guía de pasos de `/ofertas`, que salía siempre);
las 4 menores → **P10**. 360 pruebas en verde. `fd90edc` sigue pendiente →
**P0-bis**. → `knowledge/arreglo-tab-matching-05-09.md`

### ~~P8 · Estrategia de ingesta de ofertas (Apify vs. alternativa gratis)~~ — cerrada 2026-09-10
Investigación hecha el 10/09 (`knowledge/investigacion-apify-optimizacion.md`).
**Mar eligió la opción A: seguir con las 7 fuentes nativas gratuitas actuales**
(coste 0, ya probadas). No se implementa nada; JobSpy (opción B) y Apify muy
contenido (opción C) quedan documentados por si la prueba P1 revela que faltan
ofertas de algún sector. El crédito de Apify sigue a 0 y no se ha tocado ningún
workflow. → `knowledge/investigacion-apify-optimizacion.md`

### ~~P0 · Relanzar `npm run evals` (tanda local) — prompt de `extraerPerfil`~~ — cerrada 2026-09-08
Relanzado en local con cuota fresca y sin prueba en vivo a la vez (Mar dio
vía libre). **Puerta VERDE local**, las cinco métricas al 100 %
(`calidad_palabras_clave` 4/4); B05 y A06 —los fallos del 05/09— pasaron.
Comiteado `fd90edc` y subido (`e825773`) a
`mejora-usabilidad-onboarding-05-09`. **Ojo:** el robot volvió a dar ROJO en
la preview (2ª tanda del día, cuota agotada) → seguimiento en **P0-bis**.
→ `knowledge/arreglo-tab-matching-05-09.md`

### ~~T112 · Respaldo de IA — Mistral La Plateforme de pago (opción C1)~~ — cerrada 2026-09-02
Cloudflare sigue de principal; Mistral entra como 2.º de la cascada, solo si
Cloudflare falla. Commit `af45f3b` en `master`, robot `33641223572` con
puerta VERDE. → `knowledge/decision-mistral-pago.md`

### ~~Frente 1 · Robustez del frontend para la demo~~ — cerrada 2026-09-04
Barreras de error de Next 16, descarga de PDF con reintento ante 503,
limpieza de restos de create-next-app. Merge `36a6110` en `master`. →
`knowledge/robustez-demo-frente-1.md`

### ~~Marco Passe-Partout · Primera identidad visual~~ — cerrada 2026-09-04
Skill `/frontend`: coral `#F87C63` + ámbar `#F5B027`, elegidos por Mar.
Aplicado en `app/globals.css` + `app/layout.tsx`. Fusionado a `master`. →
`knowledge/marco-passe-partout-04-09.md`

### ~~Filtros de salario y cualificación de n8n movidos al perfil~~ — cerrada 2026-09-04
`Filtro cualificación` eliminado; `Filtro salario` pasa a enriquecer
(`salario_eur`) sin descartar; filtro por perfil (`salario_minimo`).
Verificado en producción real (ejecuciones 759 y 763). →
`knowledge/filtros-ingesta-a-perfil-04-09.md`

### ~~Rediseño del PDF (CV + carta)~~ — cerrada 2026-09-01
Empresa/centro en negrita, cargo y periodo en gris; 3 bugs de maquetación.
Merge `c24c45d` en `master`. → `knowledge/prueba-e2e-produccion-01-09.md`

### ~~T95 + T113 · CVs cortos / techo de tokens / mínimos mal calibrados~~ — cerradas 2026-08-31
`npm run evals` completo con cuota fresca → puerta VERDE. Ninguna señal de
CV corto o truncado volvió. → `knowledge/arreglo-t113-techo-tokens-y-minimos.md`

</details>
