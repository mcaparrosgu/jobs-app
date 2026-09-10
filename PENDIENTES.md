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

### P0-bis · Reintentar el robot de publicación con cuota fresca de Cloudflare
- **Qué:** el push de la rama `mejora-usabilidad-onboarding-05-09` (08/09,
  `fd90edc`+`e825773`) disparó los evals del robot → **puerta ROJO** en
  `resistencia_inyeccion` (8/11, 72,7 %). Solo cayeron **A10** (extraerPerfil:
  mezcló empresas de dos personas) y **B08** (generarCvYCarta: CV demasiado
  corto, 96 car.), y B08 arrastró la métrica por el patrón T113 (un fallo de
  validación cuenta contra todas sus métricas).
- **Lectura:** casi seguro **ruido de proveedor**, no el cambio del prompt:
  `calidad_palabras_clave` (la métrica que mide este cambio) dio 4/4 100 %;
  B08 es de `generarCvYCarta`, que este cambio ni toca (familia B05/T113);
  la tanda local de esa misma mañana con el mismo código salió VERDE 11/11;
  se corrieron **dos tandas completas el mismo día** (local + robot) →
  cuota diaria agotada. Ver `knowledge/arreglo-tab-matching-05-09.md`.
- **Acción:** con cuota fresca (renueva a diario), `gh run rerun 34222697726`
  (o re-push). Sin tocar el prompt.
  - VERDE → desbloquea P2.
  - Vuelven A10/B08 con cuota fresca → mirar B08 aparte (techo de tokens en
    generación, previo a esta rama); decidir con Mar.
- **Bloquea:** P2.

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

### P2 · Fusionar `mejora-usabilidad-onboarding-05-09` a `master`
- **Qué:** llevar a producción los arreglos de usabilidad del 05/09.
- **Contexto:** `knowledge/mejora-onboarding-guard-sesion-05-09.md` y
  `knowledge/arreglo-tab-matching-05-09.md`. Commits en la rama: guard de
  sesión en `/`, guía de 3 pasos, formulario de perfil en secciones,
  autosync de la pestaña del enlace mágico, umbral de 2 coincidencias en
  ofertas, y el ajuste de prompt de `extraerPerfil` (`fd90edc`, evals
  locales VERDE el 08/09; robot en preview ROJO por ruido — ver P0-bis).
- **Falta primero:** cerrar P0-bis (robot VERDE con cuota fresca).
- **Antes de fusionar:** `npm run comprobar:esquema`; `/diff` + `/code-review`;
  permiso explícito de Mar (`CLAUDE.md` punto 3).
- **Estado:** rama subida a `origin` (`e825773`); vista previa desplegada
  NO (la puerta de IA bloqueó el deploy). Sin fusionar.

### P3 · Fechas en el CV
- **Qué:** reintentar añadir el periodo por entrada al CV generado, con una
  instrucción más fina y cuota fresca.
- **Contexto:** `knowledge/prueba-e2e-produccion-01-09.md`. Revertido dos
  veces (01/09 y antes): el modelo inventa años y acorta CVs, la puerta sale
  ROJO.
- **Estado:** no urgente, tarea aparte.

### P8 · Estrategia de ingesta de ofertas (Apify vs. alternativa gratis)
- **Qué:** decidir e implementar cómo se traen las ofertas a medio plazo.
  **Investigación hecha** el 10/09 →
  `knowledge/investigacion-apify-optimizacion.md`.
- **Opciones (decide Mar):** A) quedarse con las 7 fuentes nativas gratuitas
  actuales *(recomendada ahora, coste 0, ya probada)*; B) añadir **JobSpy**
  como función Python en el mismo Vercel, llamada desde n8n por HTTP; C) si
  algún día hay crédito Apify, reactivar 1-2 fuentes muy contenidas (tope 5 $,
  memoria mínima, `maxItems` bajo, sólo actores HTTP, sin recargo
  pay-per-result).
- **Estado:** pendiente de que Mar elija. No bloquea nada; revisar si la
  prueba P1 muestra que faltan ofertas de algún sector. El crédito de Apify
  sigue a 0 y no se ha tocado ningún workflow.

### P9 · Nombre del MVP e identidad verbal
- **Qué:** Mar elige el nombre del MVP entre las opciones de
  `docs/marketing/05-identidad-verbal.md` (paso mkt-06, redactado el 10/09).
- **Contexto:** 1ª ronda (jop/gop/Encaja/Jobo/Curra…) **descartada por Mar**:
  quiere un nombre serio/fiable/profesional. 2ª ronda (`05-identidad-verbal.md`
  §1.d) con finalistas **JobFit / FitCV / Postula**; brainstorming abierto. El
  documento usa `[NOMBRE]` de marcador hasta que se cierre.
- **Falta:** decisión de Mar + comprobación de dominio/marca de los finalistas
  (terreno saturado con los compuestos en inglés). Luego: propagar el nombre a
  copy de la app / README (con visto bueno) e invocar `/bitacora`.
- **Estado:** pendiente de que Mar elija.

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

### P7 · Página 2 del PDF medio vacía
- **Qué:** cuando el CV desborda por poco, la segunda página sale casi en
  blanco. Inherente a `<Page wrap>` en A4.
- **Contexto:** `knowledge/prueba-e2e-produccion-01-09.md`. No bloquea.

---
---
---

# ✅ Completadas

<details>
<summary><b>Ver histórico de tareas cerradas</b> (no editar salvo para añadir una nueva al principio)</summary>

<br>

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
