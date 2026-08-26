#!/usr/bin/env bash
#
# Prueba el paso `decidir` de .github/workflows/publicar.yml sin publicar nada.
#
#   bash scripts/probar-paso-decidir.sh
#
# Ese paso decide si un cambio tiene que pasar por la puerta de calidad, y
# equivocarse sale caro en las dos direcciones: si dice que no cuando si,
# publica IA sin medir (el agujero de T115); si dice que si cuando no, se lleva
# media cuota diaria de Cloudflare en 25 minutos de evals.
#
# Es codigo que solo se ejecuta dentro de GitHub Actions, asi que hasta ahora
# la unica forma de comprobarlo era publicar de verdad y mirar. Este script lo
# saca del YAML y lo ejecuta aqui, contra repositorios de mentira montados al
# vuelo y con `curl` y `jq` sustituidos por dos guiones que devuelven lo que se
# les pide. No toca la red, ni Vercel, ni el repositorio de verdad.
#
# Si tocas ese paso, pasa esto antes. Verificado el 26/08/2026: 15 de 15.

set -uo pipefail

RAIZ=$(cd "$(dirname "$0")/.." && pwd)
TALLER=$(mktemp -d)
trap 'rm -rf "$TALLER"' EXIT

# ── El paso, sacado del YAML tal cual ──────────────────────────────────
node "$RAIZ/scripts/lib/extraer-paso-decidir.mjs" "$RAIZ" "$TALLER" || exit 1

# ── `curl` y `jq` de mentira ───────────────────────────────────────────
# El de verdad no puede llamar a Vercel desde aqui (no hay token en local), y
# jq no viene instalado en Windows. En el runner de GitHub son los de verdad.
mkdir -p "$TALLER/bin"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'if [ "${RESPUESTA_FALSA:-}" = "FALLO" ]; then echo "curl: error" >&2; exit 7; fi' \
  'printf "%s" "${RESPUESTA_FALSA:-}"' \
  > "$TALLER/bin/curl"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  '# Interpreta el filtro que le pasa el workflow; no trae uno propio.' \
  'filtro=""' \
  'for arg in "$@"; do case "$arg" in -*) ;; *) filtro="$arg" ;; esac; done' \
  'node "$TALLER_JQ/leer-sha.mjs" "$filtro" "$(cat)"' \
  > "$TALLER/bin/jq"

cp "$RAIZ/scripts/lib/leer-sha.mjs" "$TALLER/leer-sha.mjs"
export TALLER_JQ="$TALLER"
chmod +x "$TALLER/bin/curl" "$TALLER/bin/jq"
export PATH="$TALLER/bin:$PATH"

FALLOS=0

correr() {
  local nombre="$1" esperado="$2"
  export GITHUB_OUTPUT="$TALLER/salida.txt"
  : > "$GITHUB_OUTPUT"
  local salida obtenido motivo base
  salida=$(bash "$TALLER/paso.sh" 2>&1)
  obtenido=$(grep '^lanzar_evals=' "$GITHUB_OUTPUT" | cut -d= -f2)
  motivo=$(grep '^motivo=' "$GITHUB_OUTPUT" | cut -d= -f2-)
  base=$(grep '^base=' "$GITHUB_OUTPUT" | cut -d= -f2-)

  if [ "$obtenido" != "$esperado" ]; then
    printf '  MAL  %-46s -> esperaba %s, salio %s\n' "$nombre" "$esperado" "${obtenido:-vacio}"
    echo "$salida" | sed 's/^/       /'
    FALLOS=1
  elif [ -n "${BASE_ESPERADA:-}" ] && ! echo "$base" | grep -q "$BASE_ESPERADA"; then
    # Un acierto por el motivo equivocado no es un acierto: si la consulta a
    # Vercel se rompe, TODO sale "true" y los casos que esperan true pasarian
    # sin que nadie mire de verdad qué hay publicado.
    printf '  MAL  %-46s -> acierta, pero comparo contra lo que no debia\n' "$nombre"
    echo "       base: $base"
    FALLOS=1
  else
    printf '  OK   %-46s -> %-5s  %s\n' "$nombre" "$obtenido" "${motivo:-sin motivo}"
  fi
  unset BASE_ESPERADA
}

# ── Banco 1 · master, con el agujero de T115 reproducido ───────────────
# Tres commits: uno publicado, uno que toca la IA y que la puerta bloqueo, y
# encima una nota inocente en docs/. Antes de T115, ese ultimo commit
# arrastraba el de la IA a produccion sin evals.
git init -q "$TALLER/master"
cd "$TALLER/master" || exit 1
git config user.email prueba@local
git config user.name prueba
mkdir -p lib docs
echo v1 > lib/ia.ts
echo d1 > docs/n.md
git add -A && git commit -qm "lo que hay publicado"
PUBLICADO=$(git rev-parse HEAD)
echo v2 > lib/ia.ts
git add -A && git commit -qm "toca la IA; la puerta lo bloquea"
BLOQUEADO=$(git rev-parse HEAD)
echo d2 > docs/n.md
git add -A && git commit -qm "solo una nota en docs"
AHORA_MASTER=$(git rev-parse HEAD)

export GITHUB_REF="refs/heads/master" EVENTO="push" BASE_PR=""
export AHORA="$AHORA_MASTER"
export VERCEL_PROJECT_ID="prj_prueba" VERCEL_ORG_ID="team_prueba" VERCEL_TOKEN="tok"

echo ""
echo "master · el ultimo commit solo toca docs/, pero lib/ia.ts sigue sin publicar:"

RESPUESTA_FALSA="{\"targets\":{\"production\":{\"meta\":{\"sha\":\"$PUBLICADO\"}}}}"
export RESPUESTA_FALSA
BASE_ESPERADA="$PUBLICADO" correr "produccion atrasada: ve la IA pendiente (T115)" "true"

RESPUESTA_FALSA="{\"targets\":{\"production\":{\"meta\":{\"githubCommitSha\":\"$PUBLICADO\"}}}}"
export RESPUESTA_FALSA
BASE_ESPERADA="$PUBLICADO" correr "despliegue viejo, sin marca --meta sha" "true"

RESPUESTA_FALSA="{\"targets\":{\"production\":{\"meta\":{\"sha\":\"$AHORA_MASTER\"}}}}"
export RESPUESTA_FALSA
BASE_ESPERADA="$AHORA_MASTER" correr "produccion al dia: no gasta cuota" "false"

RESPUESTA_FALSA="{\"targets\":{\"production\":{\"meta\":{\"sha\":\"$BLOQUEADO\"}}}}"
export RESPUESTA_FALSA
BASE_ESPERADA="$BLOQUEADO" correr "el push anterior si se publico" "false"

echo ""
echo "master · cuando no se puede saber que hay publicado, se evalua:"

export VERCEL_TOKEN="" RESPUESTA_FALSA=""
BASE_ESPERADA="no dijo" correr "sin token de Vercel" "true"

export VERCEL_TOKEN="tok" RESPUESTA_FALSA="FALLO"
BASE_ESPERADA="no dijo" correr "la llamada a Vercel falla" "true"

export RESPUESTA_FALSA="<html>502 Bad Gateway</html>"
BASE_ESPERADA="no dijo" correr "Vercel no devuelve JSON" "true"

export RESPUESTA_FALSA='{"targets":{}}'
BASE_ESPERADA="no dijo" correr "el proyecto aun no tiene produccion" "true"

export RESPUESTA_FALSA='{"targets":{"production":{"meta":{"sha":"0000000000000000000000000000000000000000"}}}}'
BASE_ESPERADA="no dijo" correr "el sha publicado no existe en el repo" "true"

# ── Banco 2 · ramas, PR y el freno ─────────────────────────────────────
git init -q --bare "$TALLER/remoto"
git clone -q "$TALLER/remoto" "$TALLER/rama" 2>/dev/null
cd "$TALLER/rama" || exit 1
git config user.email prueba@local
git config user.name prueba
mkdir -p lib docs
echo v1 > lib/ia.ts
echo d1 > docs/n.md
git add -A && git commit -qm "base"
git branch -M master
git push -q origin master
git checkout -q -b una-rama
echo d2 > docs/n.md
git add -A && git commit -qm "solo docs en la rama"
SIN_IA=$(git rev-parse HEAD)
echo v2 > lib/ia.ts
git add -A && git commit -qm "toca la IA en la rama"
CON_IA=$(git rev-parse HEAD)
MASTER=$(git rev-parse master)
git commit -q --allow-empty -m "Un cambio cualquiera [sin evals]"
FRENO=$(git rev-parse HEAD)
git commit -q --allow-empty -m "Explica que el freno [sin evals] existe y ya"
MENCION=$(git rev-parse HEAD)

export VERCEL_TOKEN="" RESPUESTA_FALSA=""

echo ""
echo "ramas y PR · se comparan con master, no con Vercel:"
export GITHUB_REF="refs/heads/una-rama" EVENTO="push" BASE_PR=""
export AHORA="$SIN_IA"
git checkout -q "$SIN_IA"
correr "rama, solo docs desde master" "false"

export AHORA="$CON_IA"
git checkout -q "$CON_IA"
correr "rama, toca la IA desde master" "true"

export EVENTO="pull_request" BASE_PR="$MASTER"
correr "PR con cambio de IA" "true"

export AHORA="$SIN_IA"
git checkout -q "$SIN_IA"
correr "PR sin cambio de IA" "false"

echo ""
echo "el freno [sin evals] · trampa 3 de CLAUDE.md:"
export EVENTO="push" BASE_PR=""
export AHORA="$FRENO"
git checkout -q "$FRENO"
correr "marca al final del asunto: frena" "false"

export AHORA="$MENCION"
git checkout -q "$MENCION"
correr "marca a mitad de frase: NO frena" "true"

echo ""
if [ "$FALLOS" -eq 0 ]; then
  echo "Todo en verde: el paso decide lo que tiene que decidir."
else
  echo "HAY FALLOS. No toques publicar.yml hasta entenderlos."
fi
exit "$FALLOS"
