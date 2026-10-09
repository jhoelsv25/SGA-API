# Validación T05 — Módulo horarios (núcleo: bloques, reglas y avisos) · VAL-2 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| `pnpm exec jest test/features/horarios` pasa 100% (CP-RF008-12 a 16, 18, 20 y delegación) | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:19-54` (2 suites pasadas, 20 pruebas pasadas, 0 fallos) |
| `pnpm typecheck` (`tsc -p ...`) sin errores de compilación ni tipado | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:8-13` (exit code 0, 0 errores de tipado) |
| `pnpm exec eslint` en archivos de horarios sin errores ni advertencias | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:15-18` (exit code 0 sobre `src/features/horarios` y `test/features/horarios`) |
| `pnpm test` suite completa del proyecto pasa sin regresiones | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:56-99` (30 suites pasadas, 300 pruebas pasadas, 0 fallos) |
| Inmutabilidad de pruebas (`cmp` idéntico contra `TAREAS/pruebas_rojo/horarios/`) | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:109-115` (`cmp` idéntico para service y controller, exit code 0) |
| Cero patrones prohibidos (`any`, `console.log`, `TODO`, `eslint-disable`, `@ts-ignore`) | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:118-121` (0 ocurrencias en `src/features/horarios/` y `test/features/horarios/`) |
| Ausencia de literales de negocio fijos (45, 2700, 'matem', nombres de curso o defaults) | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:124-143` (consulta dinámica a `plan_estudios` y `variables_sistema`) |
| Alcance estricto de archivos (`git status --porcelain` y `git diff`) | PASA | Solo archivos bajo `src/features/horarios/**` y `test/features/horarios/**`; no se modificó `features.module.ts` ni archivos externos |
| No inclusión prematura de pruebas de T06/T07 | PASA | `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt:152-158` (confirmado que no existen pruebas `horarios-grilla-copia*` ni `horarios-consulta*` en `test/`) |

## Pruebas ejecutadas

1. **Chequeo estático de tipos:** `pnpm exec tsc -p .agents/tools/tsconfig.verificacion.json` (0 errores de compilación).
2. **Linter estricto:** `pnpm exec eslint src/features/horarios test/features/horarios` (0 errores, 0 advertencias).
3. **Pruebas unitarias del módulo `horarios`:** `pnpm exec jest test/features/horarios --verbose` (20 pruebas en 2 suites).
4. **Suite completa del proyecto:** `pnpm test` (300 pruebas en 30 suites).
5. **Compilación de producción:** `pnpm build` (`nest build`, exit code 0).
6. **Comparación binaria de pruebas enmendadas:**
   - `cmp TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt test/features/horarios/horarios.service.spec.ts` (idénticos, exit code 0).
   - `cmp TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts.txt test/features/horarios/horarios.controller.spec.ts` (idénticos, exit code 0).
7. **Búsqueda de patrones prohibidos:**
   - `grep -rnE '(\bany\b|console\.log|debugger|@ts-ignore|eslint-disable|: any\b|<any>|\bas any\b|TODO)' src/features/horarios/` (0 coincidencias, exit code 1).
8. **Búsqueda de literales de negocio fijos:**
   - `grep -rnE '\b45\b|\b2700\b' src/features/horarios/`: solo presente en ejemplos Swagger de hora `07:45` y UUIDs; cero presencia en repositorio y lógica de negocio.
   - `grep -rniE 'matem' src/features/horarios/`: solo presente en un comentario JSDoc y ejemplos Swagger; cero inferencia textual por nombres de curso.
9. **Verificación integral con build:** `.agents/tools/verificar_tarea.sh T05 --suite-completa` (exit code 0, salida `OK`).

Salida cruda completa almacenada en `TAREAS/VALIDACION/FASE_01/T05_pruebas.txt`.

## Matriz de trazabilidad Gherkin (RF-008 HU3)

| Escenario Gherkin / CP | Caso de Prueba Jest | Archivo y Línea de Implementación |
|---|---|---|
| Registro de bloque de clase con curso y docente, y auditoría de la mutación | CP-RF008-12 (`horarios.service.spec.ts:122-162`) | `src/features/horarios/horarios.service.ts:42-122`<br>`src/features/horarios/repositories/horarios.repository.ts:32-58, 289-308` |
| Bloque doble de 90 minutos registrado como 2 horas pedagógicas | CP-RF008-13 (`horarios.service.spec.ts:164-194`) | `src/features/horarios/horarios.service.ts:48-52, 92-100`<br>`src/features/horarios/utils/horarios.util.ts:65-75` |
| Bloqueo por superposición de bloque en la misma sección escolar (409) | CP-RF008-14 (`horarios.service.spec.ts:196-214`) | `src/features/horarios/horarios.service.ts:66-74, 151-160`<br>`src/features/horarios/repositories/horarios.repository.ts:92-134` |
| Bloqueo por cruce de docente en otra sección del año escolar a la misma hora (409) | CP-RF008-15 (`horarios.service.spec.ts:216-241`) | `src/features/horarios/horarios.service.ts:77-89, 163-175`<br>`src/features/horarios/repositories/horarios.repository.ts:136-209` |
| Advertencia no bloqueante si horas difieren de las del plan de estudios del repositorio | CP-RF008-16 (`horarios.service.spec.ts:243-272`) | `src/features/horarios/horarios.service.ts:113, 192-195, 265-290`<br>`src/features/horarios/repositories/horarios.repository.ts:258-287`<br>`src/features/horarios/utils/horarios.util.ts:54-60` |
| Sin advertencia cuando horas coinciden con el plan de estudios | CP-RF008-16 (`horarios.service.spec.ts:274-300`) | `src/features/horarios/horarios.service.ts:276-288` |
| Obtención de horas y nombres del plan desde repositorio (sin heurística de nombre de curso) | CP-RF008-16 (`horarios.service.spec.ts:302-338`) | `src/features/horarios/repositories/horarios.repository.ts:258-287`<br>`src/features/horarios/horarios.service.ts:265-290` |
| Mensaje de vigencia desde mañana cuando el año lectivo está en curso | CP-RF008-18 (`horarios.service.spec.ts:340-361`) | `src/features/horarios/horarios.service.ts:114-116, 193-195`<br>`src/features/horarios/constants/horarios.constants.ts:16` |
| Rechazo si hora fin es anterior o igual a inicio (400) | Validación hora fin (`horarios.service.spec.ts:363-387`) | `src/features/horarios/horarios.service.ts:48-52, 142-146` |
| Listado de bloques de la sección con resumen de horas vs plan | Listar sección (`horarios.service.spec.ts:389-395`) | `src/features/horarios/horarios.service.ts:228-263`<br>`src/features/horarios/repositories/horarios.repository.ts:32-58, 258-287` |
| Bloqueo de eliminación si el bloque cuenta con sesiones de clase registradas (409) | Restricción sesiones (`horarios.service.spec.ts:398-406`) | `src/features/horarios/horarios.service.ts:211-215`<br>`src/features/horarios/repositories/horarios.repository.ts:339-347` |
| Eliminación de bloque libre de sesiones con auditoría | Eliminación limpia (`horarios.service.spec.ts:408-423`) | `src/features/horarios/horarios.service.ts:217-226`<br>`src/features/horarios/repositories/horarios.repository.ts:334-337` |
| Control de acceso con `@MenuAccess(MENU_HORARIOS)` en mutaciones y libre en lectura | CP-RF008-20 (`horarios.controller.spec.ts:52-85`) | `src/features/horarios/horarios.controller.ts:43, 61, 79, 94-96` |
| Delegación correcta de endpoints REST al servicio con usuario e IP | Delegación HTTP (`horarios.controller.spec.ts:87-140`) | `src/features/horarios/horarios.controller.ts:51-58, 69-76, 86-92, 104-108` |

## Hallazgos

No se detectaron hallazgos de severidad alta, media ni baja.

1. **Resolución de Horas del Plan de Estudios**: Se verificó la implementación de `HorariosRepository.horasPlanPorCurso` (`src/features/horarios/repositories/horarios.repository.ts:258-287`), el cual realiza un join entre `cursos_seccion`, `secciones` (para obtener `grado_id`), `plan_estudios` (filtrando por `grado_id`, `curso_id` y `activo = true`) y `cursos`. No existe ninguna deducción por nombres ni valores hardcodeados.
2. **Lectura Dinámica de Jornada Escolar**: Se verificó que `HorariosRepository.horasPorCurso` (`src/features/horarios/repositories/horarios.repository.ts:211-256`) consulta la tabla `variables_sistema` buscando el código `'jornada.minutos_hora_pedagogica'` con `vigente = true`. Si la variable no existe o no tiene un valor válido, lanza una excepción explícita. No se utilizan constantes fijas como 45 ni 2700.
3. **Tipado Estricto de Repositorio e Interfaces**: Se verificó que `findByDocente` en `HorariosRepository` e `IHorariosRepository` retorna `Promise<BloqueDocenteResultado[]>` (`src/features/horarios/interfaces/horarios.repository.interface.ts:12-22, 72`), eliminando cualquier uso de `unknown[]` o tipos relajados.
4. **Verificación de Inmutabilidad de Pruebas**: Ambas suites de pruebas unitarias (`test/features/horarios/horarios.service.spec.ts` y `test/features/horarios/horarios.controller.spec.ts`) son binariamente idénticas (`cmp` exit code 0) a sus fuentes en `TAREAS/pruebas_rojo/horarios/`.
5. **Aislamiento Modular**: Se comprobó que `src/features/features.module.ts` no sufrió modificaciones y no se introdujeron pruebas correspondientes a fases posteriores (T06 / T07).

## Recomendación al DEV

La entrega T05 en su segunda validación (VAL-2) cumple plenamente con todos los criterios de aceptación, estándares de arquitectura limpia y directrices de rigor agéntico. Los hallazgos de la primera revisión han sido completamente subsanados. Se recomienda aprobar la tarea para su consolidación y avance en la fase.
