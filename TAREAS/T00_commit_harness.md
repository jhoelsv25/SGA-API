Eres DEV-1. Lee primero /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md.

# T00 — Commitear el harness de SGA-API
Objetivo: commitear en la rama local actual (`feat/rf-008-secciones-carga-horarios`) los archivos del harness que Claude ya creó. No escribas código.
Archivos permitidos para `git add` (uno a uno): `AGENTS.md`, `.agents/system/*`, `.agents/memory/*`, `.agents/tools/*`, `.agents/rules/idioma_español.md`, `.agents/rules/restricciones_agy.md`, `.agents/skills/mapa_skills.md`, `.agents/skills/validar_entrega.md`.
Prohibido incluir: `.claude/`, `TAREAS/`, `.env*`, cualquier otro archivo.
Pasos: 1) `git branch --show-current` debe ser `feat/rf-008-secciones-carga-horarios`. 2) Revisa `git status` y `git diff --staged` buscando secretos. 3) `git add` de esos archivos. 4) Commit: `chore(harness): crear estructura .agents con system, memory y tools` con cuerpo breve y pie `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. 5) Responde el hash y `git show --stat HEAD`.
Esta tarea ya está confirmada por Claude: CONFIRMADO, commitea.
