# Validación T04 — Módulo carga-academica (asignar docente, avisos de carga horaria) · VAL-2 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| `pnpm exec jest test/features/carga-academica` pasa 100% (CP-RF008-06 a 10) | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:13-33` (1 suite pasada, 8 pruebas pasadas, 0 fallos) |
| `pnpm typecheck` (`tsc -p ...`) sin errores de compilación ni tipado | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:1-6` (exit code 0, 0 errores de tipado) |
| `pnpm exec eslint` en archivos de carga académica sin errores ni advertencias | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:8-11` (exit code 0 sobre `src/features/carga-academica` y `test/features/carga-academica`) |
| `pnpm test` suite completa del proyecto pasa sin regresiones | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:35-77` (30 suites pasadas, 298 pruebas pasadas, 0 fallos) |
| Inmutabilidad de pruebas (`cmp` idéntico contra `TAREAS/pruebas_rojo/carga-academica/`) | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:79-82` (comparación byte a byte idéntica, exit code 0) |
| Cero patrones prohibidos (`any`, `console.log`, `TODO`, `eslint-disable`, `@ts-ignore`) | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:84-87` (0 ocurrencias en `src/features/carga-academica/` y `test/features/carga-academica/`) |
| Alcance estricto de archivos (`git status --porcelain` y `git diff`) | PASA | Solo archivos bajo `src/features/carga-academica/**` y `test/features/carga-academica/**`; no se modificó `features.module.ts`, esquema ni archivos externos |
| Verificación objetiva `.agents/tools/verificar_tarea.sh T04 --suite-completa` | PASA | `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt:89-92` (salida `OK`, build y suites exitosas, exit code 0) |

## Pruebas ejecutadas

1. **Chequeo estático de tipos:** `pnpm exec tsc -p .agents/tools/tsconfig.verificacion.json` (0 errores de compilación).
2. **Linter estricto:** `pnpm exec eslint src/features/carga-academica test/features/carga-academica` (0 errores, 0 advertencias).
3. **Pruebas unitarias del módulo `carga-academica`:** `pnpm exec jest test/features/carga-academica --verbose` (8 pruebas en 1 suite).
4. **Suite completa del proyecto:** `pnpm test` (298 pruebas en 30 suites).
5. **Comparación binaria de pruebas rojas:** `cmp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts`.
6. **Búsqueda de patrones prohibidos:** `grep -rnE 'console\.log|debugger|@ts-ignore|eslint-disable|: any\b|<any>|\bas any\b|TODO' src/features/carga-academica test/features/carga-academica`.
7. **Verificación integral con build:** `.agents/tools/verificar_tarea.sh T04 --suite-completa`.

Salida cruda completa almacenada en `TAREAS/VALIDACION/FASE_01/T04_pruebas.txt`.

## Matriz de trazabilidad Gherkin (RF-008 HU2)

| Escenario Gherkin / CP | Caso de Prueba Jest | Archivo y Línea de Implementación |
|---|---|---|
| Asignación de docente al curso y cálculo de nueva carga horaria | CP-RF008-06 (`carga-academica.service.spec.ts:195-224`) | `src/features/carga-academica/carga-academica.service.ts:31-85`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:177-191` |
| Bloqueo de asignación si docente está cesado o inactivo (400) | CP-RF008-07 (`carga-academica.service.spec.ts:226-239`) | `src/features/carga-academica/carga-academica.service.ts:46-48` |
| Advertencia de sobrecarga (409 con `requiereConfirmacion`) y guardado con confirmación | CP-RF008-08 (`carga-academica.service.spec.ts:240-270`) | `src/features/carga-academica/carga-academica.service.ts:50-63` |
| Cambio de docente a mitad de año conservando sesiones firmadas | CP-RF008-09 (`carga-academica.service.spec.ts:272-291`) | `src/features/carga-academica/carga-academica.service.ts:65-75`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:177-185` |
| Desasignación de docente (`docenteId: null`) con auditoría | Desasignación (`carga-academica.service.spec.ts:293-308`) | `src/features/carga-academica/carga-academica.service.ts:87-108` |
| Listado de cursos y secciones con total frente a la jornada docente | CP-RF008-10 (`carga-academica.service.spec.ts:312-339`) | `src/features/carga-academica/carga-academica.service.ts:118-136`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:226-264` |
| Consulta de carga académica por sección sin N+1 | Carga sección (`carga-academica.service.spec.ts:340-346`) | `src/features/carga-academica/carga-academica.service.ts:110-116`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:51-111` |
| Validación de existencia de curso-sección (404) | CursoSeccion inexistente (`carga-academica.service.spec.ts:348-354`) | `src/features/carga-academica/carga-academica.service.ts:37-40` |

## Hallazgos

No se detectaron hallazgos de severidad alta, media ni baja.
- Se verificó que las consultas de agregación y cálculo de horas en `CargaAcademicaRepository` utilizan agregaciones SQL directas (`COALESCE(SUM(...), 0)`) y subconsultas correlacionadas sobre `horarios`, previniendo problemas de rendimiento N+1 (`src/features/carga-academica/repositories/carga-academica.repository.ts:59-68, 207-223`).
- Se verificó que la asignación y cambio de docentes actualiza exclusivamente la tabla `cursos_seccion`, preservando la consistencia histórica sin alterar `sesiones_clase` (`src/features/carga-academica/repositories/carga-academica.repository.ts:177-185`).
- Se verificó que las mutaciones registran auditoría asíncrona mediante `AuditService.log` detallando `valorAnterior` y `valorNuevo` (`src/features/carga-academica/carga-academica.service.ts:67-75, 90-98`).
- Se verificó que el endpoint `PATCH carga-academica/:id/docente` cuenta con la protección `@MenuAccess(MENU_SECCIONES)` y validación estricta de UUID con `ParseUUIDPipe` (`src/features/carga-academica/carga-academica.controller.ts:54-78`).
- Se verificó que el año lectivo se resuelve mediante `AnioLectivoCls.id()` con fallback a `findEnCurso()` y validación contra modificaciones en años escolares cerrados (`src/features/carga-academica/carga-academica.service.ts:138-145`).

## Recomendación al DEV

La entrega de T04 cumple con todos los requisitos funcionales, arquitecturales y de verificación técnica sin observaciones. Se recomienda proceder a la consolidación una vez completadas las validaciones VAL-1 y VAL-3 de la fase.
