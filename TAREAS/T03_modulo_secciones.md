# T03 — Módulo `secciones` (crear, editar, listar, cerrar; carga académica automática)

Capa: backend. Depende de: T01 (hecha), T02 (pruebas en `TAREAS/pruebas_rojo/secciones/`).

## Objetivo
Implementar el módulo `src/features/secciones` del RF-008 (HU1) y hacer pasar sus pruebas, sin modificarlas.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Contrato (manda): /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md (sección `secciones`)
- RF: /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md (HU1)
- Pruebas (inmutables): `TAREAS/pruebas_rojo/secciones/*.spec.ts`. Lee cómo mockean cada dependencia y qué nombres usan: tu código debe ajustarse a ellas, no al revés.
- Modelo de estructura: `src/features/plan-estudios` y `src/features/calendario` (servicio, repositorio Drizzle, `@MenuAccess`, `AuditService`, `AnioLectivoCls`). Tablas en `src/core/database/schema/tables.ts`: `secciones`, `cursosSeccion`, `planEstudios`, `docentes`, `personas`, `matriculas`, `grados`.

## Primer paso obligatorio
`mkdir -p test/features/secciones && cp TAREAS/pruebas_rojo/secciones/*.spec.ts test/features/secciones/`. No edites esos archivos (ni su formato).

## Archivos permitidos
- `src/features/secciones/**` (constants, dto, interfaces, repositories, utils si hace falta, controlador, servicio, módulo, `index.ts`)
- `test/features/secciones/*.spec.ts` (solo las copiadas, sin cambios)
Prohibido: `src/features/features.module.ts` (lo toca T08), cualquier otro archivo de `src/`, el esquema Drizzle y migraciones, `package.json`.

## Qué hacer
1. Servicio con las reglas del contrato y los mensajes EXACTOS del RF (crear, actualizar, cerrar, listar, detalle). El año sale de `AnioLectivoCls.id()` o del año en curso; si el año está `cerrado`, no se escribe.
2. Repositorio Drizzle. `createConCarga` crea la sección y copia a `cursos_seccion` todos los cursos del plan de estudios del grado (los `activo` del plan y cursos no eliminados) dentro de **una transacción**. El conteo de matriculados usa `matriculas.estado = 'matriculado'`. Evita N+1 en `findAll` (agregados por consulta).
3. Controlador delgado, ruta `secciones`, `ParseUUIDPipe`, DTO con `class-validator` y mensajes en español, Swagger. Escrituras con `@MenuAccess(MENU_SECCIONES)`; lecturas sin restricción de menú.
4. Auditoría en crear, actualizar y cerrar (`tabla: "secciones"`, valor anterior/nuevo).
5. Módulo `SeccionesModule` que importa lo que necesite (`GradosModule`, `DocentesModule`, `AnioEscolarModule`) y exporta `SeccionesService` y `SeccionesRepository`. NO lo registres en `features.module.ts`.

## Criterios de aceptación (medibles)
- `pnpm exec jest test/features/secciones` → todas pasan (CP-RF008-01 a 05 y el control de acceso del controlador).
- `pnpm typecheck` sin errores; `pnpm exec eslint src/features/secciones test/features/secciones` sin errores.
- `pnpm test` completo pasa (el hook de pre-commit lo exige).
- `diff -r TAREAS/pruebas_rojo/secciones test/features/secciones` no muestra diferencias.
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
Escribe TAREAS/T03_informe.md según _comun_DEV.md (tabla de skills, comandos de verificación, `## Commit propuesto` con `feat(rf-008): ...`; las pruebas copiadas entran en este commit). No commitees hasta recibir «CONFIRMADO».
