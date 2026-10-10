# T04 — Módulo `carga-academica` (asignar docente, avisos de carga horaria)

Capa: backend. Depende de: T03 (commiteada).

## Objetivo
Implementar `src/features/carga-academica` (RF-008 HU2) y hacer pasar sus pruebas, sin modificarlas. Trabajas en paralelo con otro DEV que hace `src/features/horarios` (T05): no toques su carpeta.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Contrato (manda): /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md (sección `carga-academica`)
- RF (HU2): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Pruebas (inmutables): `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt`. Tu código se ajusta a ellas (nombres de métodos, dependencias, mensajes).
- Modelo ya hecho y aprobado: `src/features/secciones` (estructura, controlador, módulo, auditoría, año lectivo). Imítalo.
- Tablas: `cursosSeccion`, `secciones`, `planEstudios`, `cursos`, `docentes`, `personas`.

## Primer paso obligatorio
`mkdir -p test/features/carga-academica && cp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts`. No edites ese archivo.

## Archivos permitidos
- `src/features/carga-academica/**`
- `test/features/carga-academica/carga-academica.service.spec.ts` (el copiado, sin cambios)
Prohibido: `src/features/features.module.ts` (T08), `src/features/horarios/**`, `src/features/secciones/**` (solo se importan), esquema Drizzle, migraciones, `package.json`.

## Qué hacer
1. Servicio, repositorio Drizzle, DTO, controlador y módulo según el contrato. Rutas: `GET secciones/:seccionId/carga`, `PATCH carga-academica/:id/docente`, `GET carga-academica/docente/:docenteId`, con `ParseUUIDPipe`.
2. `asignarDocente` y su ruta llevan `@MenuAccess(MENU_SECCIONES)`; las consultas, sin restricción de menú. Solo docentes `activo`; el aviso de exceso devuelve 409 con `requiereConfirmacion: true` y el mensaje exacto del RF; con `confirmarExceso: true` guarda. La carga se suma con las horas del **plan de estudios** de los cursos asignados al docente en el año (sin N+1).
3. Auditoría en la asignación (`tabla: "cursos_seccion"`, valor anterior/nuevo). No modificar `sesiones_clase`.
4. `CargaAcademicaModule` exporta servicio y repositorio. NO lo registres en `features.module.ts`.

## Criterios de aceptación (medibles)
- `pnpm exec jest test/features/carga-academica` pasa completo (CP-RF008-06 a 10).
- `pnpm exec eslint src/features/carga-academica test/features/carga-academica` sin errores; `tsc` sin errores en tus archivos (si `pnpm typecheck` falla solo en `src/features/horarios` o sus pruebas, es del otro DEV: anótalo).
- `cmp` entre el `.txt` original y la copia en `test/` sin diferencias (salvo el formato que aplique prettier del hook).
- Sin `any`, `console.log`, `TODO`, `eslint-disable`.

## Skills obligatorias (leer COMPLETAS antes de escribir código)
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/clean-code-architecture.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/security-api-standards.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/anio-lectivo.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/testing-guidelines.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/nestjs-best-practices/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/nodejs-backend-patterns/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/typescript-advanced-types/SKILL.md
Si una instrucción contradice una skill, manda la skill: detente y repórtalo.

## Informe
TAREAS/T04_informe.md según _comun_DEV.md (tabla de skills, verificación, `## Commit propuesto` `feat(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
