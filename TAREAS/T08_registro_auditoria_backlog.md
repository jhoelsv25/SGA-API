# T08 — Registrar los módulos, comprobar el cableado de inyección, auditoría y backlog

Capa: backend + documentación. Depende de: T03, T04, T05, T06, T07 (todas commiteadas).

## Objetivo
Dejar el RF-008 de SGA-API listo para arrancar y para el seguimiento: registrar `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule` en `features.module.ts`, asegurar que la inyección de dependencias real funciona (hasta ahora todo se probó con mocks), revisar la auditoría y actualizar backlog y pendientes.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Plan: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/00_plan_orden_desarrollo.md
- RF: /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Skill del backlog (seguir al pie de la letra, pasos 1 a 5): /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/actualizar-backlog-rf/SKILL.md
- Módulos ya hechos: `src/features/secciones`, `carga-academica`, `horarios`. Modelo de registro: `src/features/features.module.ts`.
- Casos de prueba: `docs/pruebas/casos/RF-008_Secciones_Carga_Academica_y_Horarios/casos-de-prueba.md` (CP-RF008-01..20).

## Archivos permitidos
- `src/features/features.module.ts`
- `src/features/secciones/secciones.module.ts`, `src/features/carga-academica/carga-academica.module.ts`, `src/features/horarios/horarios.module.ts` (SOLO para corregir `imports`/`providers`/`exports` de inyección; ningún otro cambio en esos módulos)
- `test/features/rf-008-cableado.spec.ts` (archivo nuevo)
- `docs/00-Plan-y-Backlog-RF.md`
- `docs/requerimientos/PENDIENTES.md` (SOLO agregar filas y una nota; no cambiar las existentes salvo la nota de P-03)
Prohibido: cualquier otro archivo de `src/`, esquema Drizzle, migraciones, `package.json`, las demás pruebas, `docs/requerimientos/RF-008*/` (el RF no se edita).

## Qué hacer
1. **Registro:** agrega los tres módulos a `imports` y `exports` de `FeaturesModule`, en el mismo estilo.
2. **Cableado real (hallazgo conocido):** `HorariosModule` NO declara `AuditService` en `providers` aunque `HorariosService` lo inyecta, y ningún módulo importado lo exporta: Nest no resolvería la dependencia al arrancar. Compáralo con `SeccionesModule` y `CargaAcademicaModule` (que sí lo declaran) y revisa que cada dependencia de cada servicio y repositorio de los tres módulos esté disponible (`VariablesSistemaModule`, `DocentesModule`, `GradosModule`, `AnioEscolarModule`, `DRIZZLE`, `AnioLectivoCls` global, etc.). Corrige lo que falte en los tres `*.module.ts`.
3. **Prueba de cableado:** crea `test/features/rf-008-cableado.spec.ts` que compile con `Test.createTestingModule` los tres módulos reales (`SeccionesModule`, `CargaAcademicaModule`, `HorariosModule`) sobrescribiendo SOLO lo externo (el proveedor `DRIZZLE`, las colas de BullMQ/Redis y lo que necesite red o BD) y compruebe que `SeccionesService`, `CargaAcademicaService`, `HorariosService` y sus tres controladores se resuelven. Si no es viable sin Redis o BD, déjalo lo más cerca posible y repórtalo en el informe como «no verificado» con el motivo exacto (no lo marques como verificado).
4. **Auditoría (RF-003):** revisa que cada mutación de los tres módulos llame a `auditService.log` (crear/actualizar de secciones, asignar docente, crear/actualizar/eliminar/copiar bloques). Si falta alguna, NO la implementes: anótala en el informe.
5. **Backlog:** sigue la skill: cuenta los escenarios del RF-008 que aplican al Back y cuáles están implementados y verificados (con las pruebas `CP-RF008-xx` de `test/features/{secciones,carga-academica,horarios}`), muestra la lista en tu informe, actualiza SOLO la columna **Back %** y el **Estado** de la fila RF-008, el resumen de avance, una fila arriba del *Registro de avance* y «Última actualización» (`2026-10-09`). Un escenario sin verificar no suma. No toques Front %.
6. **Pendientes:** en `PENDIENTES.md` agrega al final (sin tocar filas existentes) estas filas nuevas con el estado `Pendiente`: (a) `RF-008`: «¿Qué debe pasar al eliminar o mover un bloque del horario que ya tiene sesiones de clase generadas? Hoy se bloquea el borrado» (A quién: Subdirección; Supuesto: se bloquea con mensaje); (b) `RF-008`: «El rol `Subdirector` que el RF nombra como gestor de secciones y horarios no existe en los datos iniciales; hoy solo el Administrador ve los menús Secciones y Horarios. ¿Se crea el rol o lo gestiona otro rol?» (A quién: Dirección). Y en la fila de P-03 agrega al final de la columna «Supuesto actual (V1)» la nota: «El recreo (después de la 3.ª hora, 15 min) y la jornada son variables configurables `jornada.*`.». Numera las filas nuevas con los siguientes P-XX libres.

## Criterios de aceptación (medibles)
- `.agents/tools/verificar_tarea.sh T08 --suite-completa` → `OK`; `pnpm exec jest test/features/rf-008-cableado.spec.ts` pasa (o queda reportado como no verificado con el motivo).
- `git diff --stat` solo muestra los archivos permitidos.
- El backlog muestra RF-008 con Back % calculado por conteo y una fila nueva en el registro.

## Skills obligatorias (leer COMPLETAS antes de escribir)
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/actualizar-backlog-rf/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/clean-code-architecture.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/testing-guidelines.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/nestjs-best-practices/SKILL.md
Si una instrucción contradice una skill, manda la skill: detente y repórtalo.

## Informe
TAREAS/T08_informe.md según _comun_DEV.md (tabla de skills, verificación, lista de escenarios del backlog, resultado del cableado, auditoría revisada, `## Commit propuesto` `feat(rf-008): ...` o `docs(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
