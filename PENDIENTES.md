# Pendientes — Jobs App

_Última actualización: 2026-09-10_

Lista viva de lo que queda por hacer, ordenada por prioridad. Cada tarea
enlaza a su detalle en `knowledge/`. Al cerrar una tarea se mueve a
**[✅ Completadas](#-completadas)**, al final del documento.

> Cómo se mantiene: ver `CLAUDE.md` → sección "Documentación". Este fichero
> se actualiza junto con `knowledge/log.md` e `index.md` después de cada
> cambio relevante. La historia cronológica está en `knowledge/log.md`;
> aquí solo vive lo que mira hacia delante.

---

## 🔴 Prioridad alta

### P0-bis · Publicar el ajuste de prompt de `extraerPerfil` (`fd90edc`) — bloqueado por fragilidad de CV corto
- **Qué:** `fd90edc` ("no colar como palabra clave una herramienta mencionada
  de pasada") sigue **sin publicar**. P2 se fusionó a `master` el 10/09 **sin
  él** (Camino A), así que ya no bloquea nada — pero el ajuste en sí sigue
  pendiente.
- **Historia del robot:** re-evaluado dos veces, ROJO las dos.
  - **08/09** (`34222697726`): `resistencia_inyeccion` 8/11 — 2ª tanda del día,
    cuota agotada, datos poco fiables.
  - **10/09** (mismo run, re-lanzado): **datos limpios** ("modelo respondiendo").
    `formato` 91,7 % (umbral 95) y `resistencia_inyeccion` 81,8 % (umbral 85).
    Caen **B05** (CV 394 car., mínimo 400 — al borde), **B12** (CV 88 car.,
    mínimo 164 — truncado de verdad, caso de inyección) y **A10** (`extraerPerfil`
    mezcla empresas de dos personas pegadas).
- **Lectura:** el cambio de `fd90edc` **no** causa ninguno: su métrica,
  `calidad_palabras_clave`, dio 100 % las dos veces. B05/B12 son la fragilidad
  de CV corto (familia P3 / T113 / T95) en `generarCvYCarta`, que `fd90edc` ni
  toca; A10 es un hueco conocido de `extraerPerfil`.
- **Acción:** (1) arreglar el suelo de longitud / techo de tokens de
  `generarCvYCarta` para B05/B12 (adelanta parte de P3); (2) instrucción para
  A10 ("si hay dos personas pegadas, usa solo la primera"); (3) re-meter
  `fd90edc` y relanzar `npm run evals` con cuota fresca; (4) push → robot VERDE.
- **Contexto:** `knowledge/arreglo-tab-matching-05-09.md`,
  `knowledge/arreglo-t113-techo-tokens-y-minimos.md`.

### P1 · Frente 2 — prueba de usabilidad con 5 personas
- **Qué:** ejecutar la prueba de usabilidad (skill `prueba-usuarios`),
  entre el Paso 16 y el Paso 17.
- **Contexto:** `knowledge/prueba-usuarios-frente-2-prep.md`. El guion de 3
  tareas, las reglas de sesión y el plan de datos ya están preparados.
- **Falta (bloquea el arranque):**
  1. Que Mar traiga los 5 nombres/emails (2 de la clase + 3 externas).
  2. Darlos de alta en Supabase Auth (`shouldCreateUser: false`).
  3. CVs de muestra, si hacen falta.
  4. Agendar las 5 sesiones.
- **Estado:** bloqueada, pendiente de Mar.

---

## 🟡 Prioridad media

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
- **Chequeo (2026-09-10):** la ruta ya tiene `maxDuration = 60` y
  `Font.register` a nivel de módulo. El único arreglo real (cron de
  calentamiento) añade una pieza móvil permanente para tapar un 503 raro y
  ya recuperado. **Recomendación: dejarlo mitigado**, sin cambio de código.

### P7 · Página 2 del PDF medio vacía
- **Qué:** cuando el CV desborda por poco, la segunda página sale casi en
  blanco. Inherente a `<Page wrap>` en A4.
- **Contexto:** `knowledge/prueba-e2e-produccion-01-09.md`. No bloquea.
- **Chequeo (2026-09-10):** causa localizada — cada cabecera de entrada de
  experiencia es `<View wrap={false}>` (deliberado, T83); cuando cae junto al
  borde salta entera y deja el hueco. Mitigación posible (`minPresenceAhead`
  en los títulos), pero la skill `diseno-cv-pdf` exige verla renderizada
  contra un CV de 3-4 páginas. **Recomendación: plegarlo en P3.**

### P10 · Cuatro observaciones menores del `/code-review` de P2
- **Qué:** pulido de baja prioridad que salió al revisar la rama de P2, sin
  impacto en el flujo principal (por eso P2 se publicó sin esperar a esto):
  1. `app/api/ofertas/route.ts` — términos solapados ("Project Manager" +
     "Manager") cuentan 2 sobre la misma frase y se saltan el umbral.
  2. `components/FormularioAcceso.tsx` — el sondeo de sesión hace
     `router.refresh()` cada 4 s **sin tope ni backoff** mientras se espera
     el enlace mágico; una pestaña abandonada lo repite indefinidamente.
  3. `app/api/ofertas/route.ts` — la respuesta de ofertas ya no tiene tope
     (límite 50→150 y el filtro JS no recorta); un `.slice(0, 50)` al final.
  4. `lib/perfil.ts` — `tienePerfilGuardado` traga el error de lectura y
     devuelve `false`, así que un fallo transitorio manda a `/perfil` a quien
     sí tiene perfil. Añadir comprobación de `error`.
- **Estado:** anotado, sin urgencia.

---
---
---

# ✅ Completadas

<details>
<summary><b>Ver histórico de tareas cerradas</b> (no editar salvo para añadir una nueva al principio)</summary>

<br>

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
