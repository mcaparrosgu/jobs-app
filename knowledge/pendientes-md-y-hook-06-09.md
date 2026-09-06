---
type: Decision
title: "PENDIENTES.md como lista viva de tareas + hook SessionStart que la vuelca (06/09/2026)"
description: "Mar pidió un mecanismo para tener siempre delante lo que falta por hacer, ordenado por prioridad, con las tareas hechas apartadas al final. Se descartó atarlo a 'activar una skill' (disparador arbitrario, y un hook no puede re-priorizar, solo recordar). Solución: un fichero PENDIENTES.md en la raíz que se mantiene a mano junto con log.md/index.md (regla nueva en CLAUDE.md), más un hook SessionStart en .claude/settings.json que hace cat del fichero en contexto al arrancar cada sesión. PENDIENTES.md es el único documento que mira hacia delante; log.md sigue siendo la historia cronológica y manda si se contradicen. Comiteado y publicado en la rama mejora-usabilidad-onboarding-05-09 (fb71740)."
tags: [jobs-app, decision, proceso, documentacion, claude-code, hooks]
okf_version: "0.2"
timestamp: 2026-09-06T00:00:00Z
---

# Por qué

Antes de esto, para saber "qué queda por hacer" había que reconstruirlo de
tres sitios: la memoria automática "dónde retomar", `knowledge/log.md` (más
de 2.700 líneas) y `knowledge/index.md`. `docs/06-tareas.md` es salida
congelada del método y está todo `[x]` — no sirve como lista viva.

Mar pidió un único `.md` fácil de seguir: cada tarea con una explicación
**breve**, su contexto y su nivel de prioridad; y al completarla, que pase
al final del documento, muy diferenciada visualmente de lo que queda.

# Qué se descartó

**Atar la actualización a "activar una skill".** Era la idea inicial de
Mar, pero:

- Un hook puede *disparar*, no *pensar*. Decidir qué se ha completado,
  re-priorizar y redactar el resumen es trabajo del modelo leyendo el
  bundle. Un hook solo ejecuta un comando: enseña el fichero o corre un
  script mecánico.
- "Al activar una skill" es un disparador arbitrario: la mayoría de skills
  del proyecto (`paso-01`, `frontend`, `diseno-cv-pdf`, `bitacora`…) no
  tienen relación con el seguimiento de tareas. El hook saltaría casi
  siempre sin motivo.
- Lo que mantiene un fichero así al día son dos momentos concretos —
  cerrar una tarea y descubrir una nueva— que **ya tienen ritual** en este
  proyecto: actualizar `log.md` + `index.md` tras cada cambio relevante.

También se creó y se borró una skill `/hola` que devolvía la lista a
demanda: se prefirió el hook (automático de verdad, sin ruido) más la
regla de mantenimiento.

# Qué se hizo

1. **`PENDIENTES.md`** en la raíz del repo. Tareas abiertas agrupadas en
   🔴 alta / 🟡 media / ⚪ baja, cada una con **Qué**, **Contexto**
   (enlace a su `knowledge/*.md`), prioridad y qué la bloquea. Sección
   **`✅ Completadas`** al final, tras triple regla horizontal, dentro de un
   `<details>` colapsable, con cada tarea tachada, fechada y enlazada.
   Sembrada con 6 tareas ya cerradas para fijar el formato.

2. **Hook `SessionStart`** en `.claude/settings.json` (fichero nuevo,
   ámbito proyecto — antes solo existía `settings.local.json`, personal):

   ```json
   {
     "hooks": {
       "SessionStart": [
         { "hooks": [ { "type": "command",
           "command": "if [ -f \"${CLAUDE_PROJECT_DIR:-.}/PENDIENTES.md\" ]; then echo '=== PENDIENTES.md ...'; cat \"${CLAUDE_PROJECT_DIR:-.}/PENDIENTES.md\"; fi",
           "timeout": 10 } ] }
       ]
     }
   }
   ```

   Vuelca el fichero en contexto al arrancar cada sesión. Probado en Git
   Bash antes de comitear; JSON validado con `node`.

3. **Regla en `CLAUDE.md`** → sección "Documentación": mantener
   `PENDIENTES.md` en la misma tanda que `log.md`/`index.md`; mover lo
   cerrado a "✅ Completadas" con fecha absoluta y enlace; `log.md` manda si
   los dos se contradicen.

# Riesgos asumidos

- **Un sitio más que sincronizar** (ya eran `log.md` + `index.md`). Lo
  mitiga que `PENDIENTES.md` es corto y el único que mira al futuro; si
  deriva, la verdad está en `log.md`.
- **El hook no escribe, solo enseña.** El mantenimiento sigue dependiendo
  de la disciplina del ritual de documentación, ahora obligada por
  `CLAUDE.md`.
- El hook `SessionStart` no se puede probar en la sesión en que se crea
  (solo dispara al arrancar); se verifica con `/hooks` o abriendo una
  sesión nueva.

# Estado

Comiteado en `mejora-usabilidad-onboarding-05-09` (`fb71740`) y publicado
a esa rama. No toca código de la app. La rama sigue sin fusionar a
`master` (ver `PENDIENTES.md` P2).
