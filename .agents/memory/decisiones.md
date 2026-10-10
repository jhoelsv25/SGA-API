# Decisiones del harness — SGA-API

## [2026-10-09] T02 — Pruebas en rojo fuera de `test/`
**Contexto:** el hook pre-commit (`.husky/pre-commit`) corre `pnpm test` sobre todo el árbol y R13 prohíbe saltarlo; unas pruebas en rojo dentro de `test/` bloquean cualquier commit.
**Decisión:** las pruebas escritas primero viven en `TAREAS/pruebas_rojo/<modulo>/` (sin versionar). Cada tarea de módulo las copia a `test/features/<modulo>/` sin modificarlas y las hace pasar; se commitean junto con su implementación. Los `.d.ts` con tipos inventados quedan prohibidos.
**Alternativas descartadas:** `--no-verify` (R13); `it.skip` (R7); commit de pruebas rojas (el hook lo rechaza).
**Corrección:** Jest (`rootDir: "."`, `testRegex: .spec.ts`) y `tsc` también recorren `TAREAS/`; por eso los archivos guardados llevan extensión `.spec.ts.txt` y cada DEV los copia quitando `.txt`. `verificar_tarea.sh` usa `.agents/tools/tsconfig.verificacion.json` y `eslint src test`.
**Impacto:** T02 no tiene commit propio (desvío del plan, informado en el informe final); T03–T07 empiezan copiando sus pruebas.

## [2026-10-09] T00 — Harness alineado con el de SGA-WEB
**Contexto:** SGA-API solo tenía skills y rules.
**Decisión:** replicar system/memory/tools de SGA-WEB adaptados a pnpm y Jest.
**Alternativas descartadas:** estructura propia distinta (rompería la coherencia entre proyectos).
**Impacto:** `.agents/system`, `.agents/memory`, `.agents/tools`, `mapa_skills.md`, `validar_entrega.md`.
