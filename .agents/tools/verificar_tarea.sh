#!/usr/bin/env bash
# Verificación objetiva. Uso: verificar_tarea.sh T0X [--rojo|--suite-completa|--fase]
# Imprime una sola línea: OK | FALLA: <motivo>. Exit 0 si OK.
# --rojo: solo tipos y lint (las pruebas escritas primero deben fallar).
set -u
cd "$(dirname "$0")/../.." || exit 2
tarea="${1:-?}"; modo="${2:-}"
log="TAREAS/VALIDACION/verificar_${tarea}.log"
mkdir -p TAREAS/VALIDACION
: > "$log"
paso() { if ! "$@" >>"$log" 2>&1; then echo "FALLA: $tarea · $* (ver $log)"; exit 1; fi; }
paso pnpm exec tsc -p .agents/tools/tsconfig.verificacion.json
paso pnpm exec eslint src test
if [ "$modo" != "--rojo" ]; then paso pnpm test; fi
if [ "$modo" = "--suite-completa" ] || [ "$modo" = "--fase" ]; then paso pnpm build; fi
nuevos=$( { git diff HEAD -U0 -- src test ':!TAREAS' | grep -E '^\+[^+]'; git ls-files --others --exclude-standard -z -- src test | xargs -0 -r cat; } 2>/dev/null \
  | grep -E 'console\.log|debugger|@ts-ignore|eslint-disable|: any\b|<any>|\bas any\b' | head -1)
if [ -n "$nuevos" ]; then echo "FALLA: $tarea · patrón prohibido nuevo: $nuevos"; exit 1; fi
echo "OK"
