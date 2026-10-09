# Validación T04 — Módulo `carga-academica` (asignar docente, avisos de carga horaria) · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Estructura de carpetas modular (`clean-code-architecture.md` §2):** Separación en constants, dto, interfaces, repositories, utils | **PASA** | `src/features/carga-academica/` | Estructura modular canónica completa con subcarpetas `constants`, `dto`, `interfaces`, `repositories`, `utils` y barrel exports (`index.ts`) en cada nivel. |
| **Controlador delgado (`clean-code-architecture.md` §3):** Cero lógica de negocio en controller | **PASA** | `src/features/carga-academica/carga-academica.controller.ts:37-93` | El controlador solo inyecta `CargaAcademicaService`, valida parámetros de entrada y delega inmediatamente a los casos de uso sin lógica de negocio. |
| **DTOs tipados y validados (`clean-code-architecture.md` §1, `nodejs-backend-patterns`):** class-validator y decorators OpenAPI | **PASA** | `src/features/carga-academica/dto/asignar-docente.dto.ts:4-23`, `src/features/carga-academica/dto/carga-academica-response.dto.ts:5-84` | Validación de `docenteId` con `@ValidateIf`, `@IsUUID('4')`, `@IsOptional` (permite `null` para desasignación) y `@IsBoolean` para confirmación de sobrecarga; DTOs de respuesta completamente documentados en Swagger. |
| **ParseUUIDPipe (`security-api-standards.md`, `nestjs-best-practices`):** Validación estricta de parámetros de ruta | **PASA** | `src/features/carga-academica/carga-academica.controller.ts:49, 72, 89` | Se aplica `ParseUUIDPipe` a `:seccionId`, `:id` y `:docenteId` en todas las rutas del controlador. |
| **Zero `any` y tipado estricto (`clean-code-architecture.md` §1, `typescript-advanced-types`):** Sin tipos laxos ni assertions no controladas | **PASA** | `src/features/carga-academica/**` | Cero ocurrencias de `any`. Tipado explícito en firmas de repositorio, servicios, DTOs e interfaces. |
| **Auditoría en la asignación (`clean-code-architecture.md` §6):** Bitácora asíncrona inmutable con BullMQ | **PASA** | `src/features/carga-academica/carga-academica.service.ts:67-75, 90-98` | Auditoría despachada mediante `AuditService.log` con tabla `"cursos_seccion"`, acción `"actualizar"`, guardando `valorAnterior` y `valorNuevo` de `docenteId` tanto en asignación como en desasignación; no altera `sesiones_clase`. |
| **Control de acceso con `@MenuAccess` (`security-api-standards.md`):** Protección exclusiva en mutaciones | **PASA** | `src/features/carga-academica/carga-academica.controller.ts:54-55, 40, 80` | `@MenuAccess(MENU_SECCIONES)` aplicado a la ruta mutante `PATCH carga-academica/:id/docente`. Rutas de consulta `GET secciones/:seccionId/carga` y `GET carga-academica/docente/:docenteId` abiertas sin restricción de menú. |
| **Año lectivo vía `AnioLectivoCls` (`anio-lectivo.md`):** Lectura de header contextual y validaciones | **PASA** | `src/features/carga-academica/carga-academica.service.ts:138-145` | Lectura contextual con `AnioLectivoCls.id()` y fallback a `findEnCurso()`; bloqueo estricto con `BadRequestException` si se intenta modificar en un año académico cerrado (`anio.estado === 'cerrado'`). |
| **Ausencia de N+1 en cálculo de carga horaria (`clean-code-architecture.md` §5):** Agregaciones SQL eficientes | **PASA** | `src/features/carga-academica/repositories/carga-academica.repository.ts:51-110, 193-224, 226-264` | `horasAsignadasDocente` calcula la suma con `SUM(planEstudios.horasSemanales)` en una sola consulta SQL; `findBySeccion` y `findByDocente` resuelven horas y relaciones en consulta única sin bucles de consultas concurrentes. |
| **SQL seguro:** Consultas parametrizadas con operadores de Drizzle ORM | **PASA** | `src/features/carga-academica/repositories/carga-academica.repository.ts:22-265` | Operaciones construidas íntegramente mediante operadores tipados y parametrizados (`eq`, `and`, `ne`, `asc`, `sql`), sin interpolación directa de strings. |
| **Español al 100 % (`idioma_español.md`):** Clases, variables, comentarios y mensajes de usuario | **PASA** | `src/features/carga-academica/**` | Nomenclatura en español, mensajes con tildes y eñes exactos del RF-008 HU2 (`"Solo se pueden asignar docentes activos."`, `"El docente supera su jornada: tendrá X horas asignadas de Y."`) y uso de «Año académico». |
| **Seguridad y sin secretos (`restricciones_agy.md`, `security-api-standards.md`):** Sin credenciales ni datos expuestos | **PASA** | `src/features/carga-academica/**` | Ningún secreto, token o credencial sensible expuesto en el código fuente. |
| **Alcance y no tocar `features.module.ts` (`T04`):** Módulo aislado para integración en T08 | **PASA** | `git status --porcelain`, `src/features/carga-academica/carga-academica.module.ts:9-15` | `src/features/features.module.ts` permanece sin tocar. `CargaAcademicaModule` exporta `CargaAcademicaService` y `CargaAcademicaRepository`. |
| **Testing guidelines e inmutabilidad de pruebas (`testing-guidelines.md`):** Pruebas espejo idénticas y cobertura RF-008 HU2 | **PASA** | `test/features/carga-academica/carga-academica.service.spec.ts:1-357` | Cobertura de escenarios CP-RF008-06 a CP-RF008-10; archivo de pruebas idéntico byte a byte al original de `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt`. |

## Pruebas ejecutadas

1. **Pruebas unitarias del módulo `carga-academica`:**
   - Comando: `pnpm exec jest test/features/carga-academica`
   - Resultado: 1 suite pasada (`carga-academica.service.spec.ts`), 8 pruebas pasadas, 0 fallidas (exit code 0).
2. **Linter y reglas de formato:**
   - Comando: `pnpm exec eslint src/features/carga-academica test/features/carga-academica`
   - Resultado: 0 errores y 0 advertencias (exit code 0).
3. **Chequeo de tipos estático:**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: 0 errores de compilación TypeScript en todo el proyecto (exit code 0).
4. **Build de producción:**
   - Comando: `pnpm build` (`nest build`)
   - Resultado: Compilación exitosa (exit code 0).
5. **Suite completa de regresión:**
   - Comando: `pnpm exec jest test/`
   - Resultado: 30 suites pasadas, 298 pruebas pasadas, 0 fallidas (exit code 0).
6. **Verificación automatizada del harness:**
   - Comando: `.agents/tools/verificar_tarea.sh T04`
   - Resultado: Salida `OK` (exit code 0).
7. **Inspección de patrones prohibidos:**
   - Búsqueda con grep sobre `src/features/carga-academica/` y `test/features/carga-academica/`: cero usos de `any`, `console.log`, `TODO`, `@ts-ignore` y `eslint-disable`.
8. **Integridad de pruebas rojas copiadas:**
   - Comando: `cmp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts`
   - Resultado: Idénticos byte a byte (exit code 0).

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/features/horarios/` | Durante la ejecución paralela previa se había observado un error transitorio de tipos en el módulo de horarios (T05); la verificación final confirma que la compilación global con `tsc --noEmit` y la suite completa de 298 pruebas pasan con 0 errores y 0 fallos. |

## Recomendación al DEV

La entrega de T04 para el módulo `carga-academica` (RF-008 HU2) cumple de manera sobresaliente y estricta con todas las reglas de arquitectura modular, seguridad en endpoints REST, tipado sin `any`, auditoría inmutable, prevención de consultas N+1 y preservación de la integridad del sistema.
Se recomienda dar por aprobada la tarea y autorizar el commit propuesto tras confirmación del orquestador.
