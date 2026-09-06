# Pendientes — Jobs App

_Última actualización: 2026-09-06_

Lista viva de lo que queda por hacer, ordenada por prioridad. Cada tarea
enlaza a su detalle en `knowledge/`. Al cerrar una tarea se mueve a
**[✅ Completadas](#-completadas)**, al final del documento.

> Cómo se mantiene: ver `CLAUDE.md` → sección "Documentación". Este fichero
> se actualiza junto con `knowledge/log.md` e `index.md` después de cada
> cambio relevante. La historia cronológica está en `knowledge/log.md`;
> aquí solo vive lo que mira hacia delante.

---

## 🔴 Prioridad alta

### P0 · Relanzar `npm run evals` con cuota fresca de Cloudflare
- **Qué:** confirmar en verde el ajuste de prompt de `extraerPerfil` (regla
  nueva: no colar una herramienta mencionada de pasada), que está
  **modificado sin comitear** en `lib/ia.ts` y `prompts/system.md`.
- **Contexto:** `knowledge/arreglo-tab-matching-05-09.md`. Los evals del
  05/09 salieron ROJO solo por **B05** y **A06** (fallos conocidos, ajenos a
  este cambio) en una tanda que compitió por cuota con una prueba en vivo.
  `calidad_palabras_clave` —la métrica que sí mide este cambio— dio 100 %.
- **Antes de lanzar:** no gastar cuota en diagnóstico; confirmar que nadie
  prueba la app en vivo a la vez ([[feedback_no_evals_junto_prueba_en_vivo]]).
- **Ramas de decisión:**
  - VERDE → `git add lib/ia.ts prompts/system.md`, commit y push a
    `mejora-usabilidad-onboarding-05-09`.
  - Vuelve B05/A06 → no es este cambio: decidir con Mar.
  - Algo nuevo (p. ej. `calidad_palabras_clave` bajo umbral) → sí es el
    prompt: revisar antes de tocar nada más.
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
  ofertas.
- **Depende de:** P0 (para que entre también el ajuste de prompt).
- **Antes de fusionar:** `npm run comprobar:esquema`; permiso explícito de
  Mar (`CLAUDE.md` punto 3).
- **Estado:** publicado en rama (vista previa), sin fusionar.

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
