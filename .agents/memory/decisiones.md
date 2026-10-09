# Decisiones del harness — SGA-API

## [2026-10-09] T00 — Harness alineado con el de SGA-WEB
**Contexto:** SGA-API solo tenía skills y rules.
**Decisión:** replicar system/memory/tools de SGA-WEB adaptados a pnpm y Jest.
**Alternativas descartadas:** estructura propia distinta (rompería la coherencia entre proyectos).
**Impacto:** `.agents/system`, `.agents/memory`, `.agents/tools`, `mapa_skills.md`, `validar_entrega.md`.
