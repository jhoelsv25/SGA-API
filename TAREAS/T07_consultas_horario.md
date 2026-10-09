# T07 — Horarios: «Mi horario» (docente) y horario de la sección del estudiante/apoderado

Capa: backend. Depende de: T05 y T06 (commiteadas, `caf09b8` y `10e78f5`).

## Objetivo
Agregar a `src/features/horarios` las consultas de horario del RF-008 HU3 («Consultar mi horario»: el docente ve su semana; el estudiante y el apoderado ven el horario de su sección) y hacer pasar sus pruebas sin modificarlas.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Contrato (manda), con sus enmiendas (en la «Enmienda 2» están las firmas de `docentePorPersonaId`, `matriculaEstudiante`, `esApoderadoDeEstudiante` y la regla del color): /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md
- RF (HU3 «Consultar mi horario», «Quién gestiona»/consulta): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Pruebas (inmutables): `TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt`. Los nombres de método, dependencias y excepciones los fijan ellas.
- Código existente (aprobado): `src/features/horarios/**`. Extiéndelo de forma aditiva, con el mismo estilo.
- Lee `.agents/memory/errores_frecuentes.md`: nada de valores de negocio fijos (colores, nombres de curso, horas) ni `throw new Error` genérico.

## Primer paso obligatorio
`cp TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt test/features/horarios/horarios-consulta.service.spec.ts`. No edites esa copia.

## Archivos permitidos
- `src/features/horarios/**` (AGREGAR métodos y archivos a `horarios.service.ts`, `horarios.controller.ts`, `repositories/horarios.repository.ts`, `interfaces`, `dto`, `constants`; no cambies lo ya aprobado)
- `test/features/horarios/horarios-consulta.service.spec.ts` (copia, sin cambios)
Prohibido: `src/features/features.module.ts` (T08), `src/features/carga-academica/**`, `src/features/secciones/**`, esquema Drizzle, migraciones, `package.json`, las pruebas de T05/T06.

## Qué hacer
1. Repositorio: `docentePorPersonaId`, `matriculaEstudiante`, `esApoderadoDeEstudiante` (firmas exactas del contrato) y `findByDocente(anioId, docenteId)` tipado con el DTO de bloque con sección y grado (sin `unknown[]`), todos con Drizzle. `colorHex` viene de `cursos.color_hex` (null para receso). Sin N+1: una consulta con joins por método.
2. Servicio: `miHorario(personaId)` (docente → sus bloques del año con curso, sección, grado, aula y color) y `horarioDeEstudiante(estudianteId, usuario)` con las reglas del contrato: estudiante solo el propio, apoderado solo de sus hijos vinculados, rol administrativo/gestión cualquiera; 403 si no corresponde, 404 si no hay matrícula activa en el año o el docente no existe. El año sale de `AnioLectivoCls`/año en curso. Las excepciones y mensajes los fijan las pruebas.
3. Controlador: `GET horarios/mi-horario` (usa `personaId` del usuario autenticado) y `GET horarios/estudiante/:estudianteId` (`ParseUUIDPipe`), ambos SIN `@MenuAccess` (son consultas).
4. No agregues nada a `features.module.ts`.

## Criterios de aceptación (medibles)
- `pnpm exec jest test/features/horarios` pasa completo (CP-RF008-19 y las pruebas del estudiante/apoderado).
- `.agents/tools/verificar_tarea.sh T07 --suite-completa` → `OK`.
- `grep -rnE "\b(45|2700)\b|matem|throw new Error|#[0-9A-Fa-f]{6}" src/features/horarios` no devuelve literales de negocio (los ejemplos de Swagger no cuentan).
- `cmp` entre el `.txt` y su copia sin diferencias (salvo el formato de prettier del hook).
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
TAREAS/T07_informe.md según _comun_DEV.md (tabla de skills, verificación, `## Commit propuesto` `feat(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
