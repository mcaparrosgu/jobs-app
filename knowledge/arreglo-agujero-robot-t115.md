---
type: Decisión
title: "El robot compara con lo que hay publicado, no con el push anterior (T115)"
description: "Arreglo del agujero de agujero-robot-cambio-ia-arrastrado.md. El paso `decidir` de publicar.yml le pregunta a Vercel qué commit está servido en producción y lo usa como base del git diff, en vez del push anterior. El despliegue graba el sha con --meta sha=. Verificado con 15 escenarios en scripts/probar-paso-decidir.sh; la consulta real a Vercel sigue sin verse en vivo."
tags: [jobs-app, decision, publicacion, evals, puerta-calidad, github-actions, vercel, t115]
okf_version: "0.2"
timestamp: 2026-08-26T16:45:00Z
---

# Qué se arregla

El agujero está contado en
[agujero-robot-cambio-ia-arrastrado.md](agujero-robot-cambio-ia-arrastrado.md):
el paso `decidir` decidía si hacían falta los evals mirando qué archivos
cambiaron **desde el push anterior**. Eso da por supuesto que el push anterior
se publicó, y no siempre es verdad: si la puerta lo bloqueó, el código se
quedó en `master` sin desplegar, y el siguiente commit inocuo —una nota en
`docs/`, un script de diagnóstico— ya no lo veía como "cambiado" y lo
arrastraba a producción **sin evals**, diciendo con toda honestidad "El cambio
no toca la IA".

La puerta no protegía a producción: solo **retrasaba** el cambio malo hasta el
commit siguiente.

# Cómo se arregla

Dos mitades, y las dos hacen falta:

1. **Al decidir**, en `master`, la base del `git diff` ya no es
   `github.event.before` sino el commit que Vercel dice tener servido en
   producción:

   ```
   GET https://api.vercel.com/v9/projects/{proyecto}?teamId={equipo}
   → .targets.production.meta.sha
   ```

   Se mira `targets.production` del proyecto y **no el despliegue más
   reciente**, porque no son lo mismo: después de un rollback
   (`docs/07-emergencia.md` §1) el más reciente no es el que está servido, y
   usarlo dejaría fuera del diff justo el cambio que se acaba de deshacer.

2. **Al publicar**, `vercel deploy` lleva ahora `--meta sha="$GITHUB_SHA"`.
   Hace falta ponerlo a mano porque el repositorio se desconectó del proyecto
   en Vercel el 21/08/2026: Vercel ya **no sabe** de qué commit viene un
   despliegue si no se lo decimos nosotros. Así el dato es nuestro y no
   depende de que nadie lo adivine. `meta.githubCommitSha` se lee como
   respaldo, para los despliegues anteriores a este cambio.

En **ramas y PR no cambia nada**: se siguen comparando contra `master`, que ya
era lo correcto desde la lección de la ejecución #4 del 20/08/2026.

## Cuando no se puede saber qué hay publicado, se evalúa

Si falta el token, si la llamada falla, si Vercel no devuelve JSON, si el
proyecto aún no tiene producción o si el sha que devuelve no existe en el
repositorio, la decisión es **lanzar los evals**.

Cuesta cuota —25 minutos y media asignación diaria— y aun así es lo correcto:
la alternativa es publicar a ciegas, que es exactamente el agujero que esto
viene a tapar. Si en ese momento se sabe que el cambio no toca la IA, para eso
está el freno `[sin evals]`, que sigue funcionando igual.

Pasa, y es normal, en la **primera publicación después de este cambio**: el
despliegue que hay en producción todavía no lleva la marca `--meta sha=`. A
partir de la siguiente, ya la lleva.

El resumen del robot dice ahora **contra qué se comparó**, así que se ve de un
vistazo si la consulta funcionó o si se evaluó por precaución.

# Cómo se ha comprobado

Este paso solo se ejecuta dentro de GitHub Actions, así que hasta ahora la
única forma de comprobarlo era publicar de verdad y mirar — que es justo lo
que dejó pasar el agujero durante días.

Ahora hay un banco de pruebas, `scripts/probar-paso-decidir.sh`
(`npm run probar:decidir`). **Saca el guion del propio YAML** —no una copia,
que se quedaría vieja sin que nadie se entere— y lo ejecuta contra
repositorios de mentira montados al vuelo, con `curl` y `jq` sustituidos por
dos guiones que devuelven lo que se les pide. No toca la red, ni Vercel, ni el
repositorio de verdad.

Son **15 escenarios, los 15 en verde** el 26/08/2026:

* master con el agujero reproducido (producción atrasada → sí evalúa), con
  `githubCommitSha` de respaldo, con producción al día (→ no gasta cuota) y
  con el push anterior sí publicado.
* Los cinco fallos de la consulta, que tienen que caer todos del lado seguro.
* Ramas y PR, con y sin cambio de IA.
* El freno `[sin evals]` y su trampa 3: al final del asunto frena, a mitad de
  frase no.

## La prueba que no probaba nada

El primer banco daba 15 de 15 **y no servía**. Se rompió el filtro del
workflow a propósito, apuntando a una clave inexistente, y las 15 seguían en
verde: el `jq` de mentira traía el camino escrito dentro en vez de interpretar
el que le pasaban, así que probaba su propia copia y no el workflow.

Corregido, esa misma rotura da 3 fallos y salida 1. Dos comprobaciones más lo
sostienen: cada escenario declara **contra qué base** esperaba comparar, así
que un acierto por el motivo equivocado se marca como fallo, y el ayudante
lee el filtro real del YAML.

Lección, que es la misma de esta semana en otra ropa: una prueba que no se
ha visto fallar no se sabe si prueba algo.

# Lo que sigue sin estar verificado

**La consulta real a Vercel no se ha visto funcionar.** No hay token de Vercel
en local y la cuenta que ve el MCP de Vercel desde aquí no alcanza este
proyecto (`404`), así que la forma exacta de la respuesta —que
`targets.production.meta.sha` sea de verdad donde aterriza el `--meta sha=`—
está deducida de la documentación, no comprobada en vivo.

La primera publicación a `master` lo dirá: si la consulta no funcionara, el
resumen del robot pondrá *"nada (Vercel no dijo qué hay publicado): se evalúa
todo"* y se habrán gastado unos evals de más, pero **nada se publica sin
medir** — el fallo cae del lado seguro por diseño.

Relacionado: [[agujero-robot-cambio-ia-arrastrado]], [[paso-16-publicar]].
