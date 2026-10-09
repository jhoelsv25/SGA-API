# T05 — Módulo `horarios` (núcleo: bloques, reglas y avisos)

Capa: backend. Depende de: T03 (commiteada).

## Objetivo
Implementar el núcleo de `src/features/horarios` (RF-008 HU3: bloques CRUD y reglas) y hacer pasar sus pruebas, sin modificarlas. Trabajas en paralelo con otro DEV que hace `src/features/carga-academica` (T04): no toques su carpeta. Las partes de grilla propuesta, copiar horario y consultas (T06, T07) NO van aquí.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Contrato (manda): /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md (sección `horarios`; implementa solo crearBloque, actualizarBloque, eliminarBloque, listarPorSeccion)
- RF (HU3): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Pruebas (inmutables): `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt` y `TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts.txt`. Tu código se ajusta a ellas (nombres de métodos del servicio y del repositorio, dependencias como `SeccionesRepository`, mensajes).
- Modelo ya hecho y aprobado: `src/features/secciones`. Imítalo.
- Tablas: `horarios`, `cursosSeccion`, `secciones`, `planEstudios`, `cursos`, `docentes`, `sesionesClase`, `variablesSistema` (`jornada.minutos_hora_pedagogica`; léela con el repositorio/servicio de variables existente en `src/features/variables-sistema`, sin duplicar su lógica).

## Primer paso obligatorio
`mkdir -p test/features/horarios && cp TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt test/features/horarios/horarios.service.spec.ts && cp TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts.txt test/features/horarios/horarios.controller.spec.ts`. No edites esos archivos. NO copies los demás (`horarios-grilla-copia*`, `horarios-consulta*`): son de T06 y T07.

## Archivos permitidos
- `src/features/horarios/**`
- `test/features/horarios/horarios.service.spec.ts`, `test/features/horarios/horarios.controller.spec.ts` (copiados, sin cambios)
Prohibido: `src/features/features.module.ts` (T08), `src/features/carga-academica/**`, `src/features/secciones/**` (solo se importan), esquema Drizzle, migraciones, `package.json`.

## Qué hacer
1. Servicio, repositorio Drizzle, DTO (HH:mm validado, `diaSemana` 1–5, `tipoBloque`), controlador (`ParseUUIDPipe`) y módulo. Rutas: `POST horarios/seccion/:seccionId/bloques`, `PATCH horarios/bloques/:id`, `DELETE horarios/bloques/:id`, `GET horarios/seccion/:seccionId`.
2. Reglas del contrato con los mensajes EXACTOS del RF: fin > inicio; sin superposición en la sección; sin cruce de docente en otra sección del mismo año (el mensaje nombra grado, sección, día y hora); un `clase` exige curso de la sección, un `receso` no lleva curso; aviso (no bloqueo) de horas vs plan; `mensaje` «El horario se guardó. Los cambios rigen desde mañana.» cuando el año está en curso; no eliminar un bloque con sesiones. Las horas pedagógicas = minutos del bloque / `jornada.minutos_hora_pedagogica`.
3. Escrituras con `@MenuAccess(MENU_HORARIOS)`; `listarPorSeccion` sin restricción de menú. Auditoría en crear, actualizar y eliminar (`tabla: "horarios"`).
4. Deja `HorariosService`, `HorariosRepository` y el controlador organizados para que T06 y T07 AGREGUEN archivos y métodos sin reescribir los tuyos (por ejemplo, utilidades de hora en `utils/`). `HorariosModule` exporta servicio y repositorio. NO lo registres en `features.module.ts`.

## Criterios de aceptación (medibles)
- `pnpm exec jest test/features/horarios` pasa completo (CP-RF008-12, 13, 14, 15, 16, 18 y el control de acceso de bloques).
- `pnpm exec eslint src/features/horarios test/features/horarios` sin errores; `tsc` sin errores en tus archivos (si `pnpm typecheck` falla solo en `src/features/carga-academica` o sus pruebas, es del otro DEV: anótalo).
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
TAREAS/T05_informe.md según _comun_DEV.md (tabla de skills, verificación, `## Commit propuesto` `feat(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
