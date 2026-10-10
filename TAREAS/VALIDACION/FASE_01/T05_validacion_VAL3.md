# Validación T05 — Módulo `horarios` (núcleo: bloques, reglas y avisos) · VAL-3 (Segunda Validación) · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Estructura de carpetas modular (`clean-code-architecture.md` §2):** Separación en constants, dto, interfaces, repositories, utils | **PASA** | `src/features/horarios/` | Estructura modular canónica completa con subdirectorios `constants`, `dto`, `interfaces`, `repositories`, `utils` y barrel exports (`index.ts`) en cada subcarpeta y en la raíz del feature. |
| **Controlador delgado (`clean-code-architecture.md` §3):** Cero lógica de negocio en controller | **PASA** | `src/features/horarios/horarios.controller.ts:39-109` | El controlador solo inyecta `HorariosService`, valida parámetros con DTOs y `ParseUUIDPipe`, y delega inmediatamente sin queries ni lógica de negocio. |
| **DTOs tipados y validados con class-validator (`clean-code-architecture.md` §1, `nodejs-backend-patterns`):** HH:mm, dia 1-5, tipoBloque y OpenAPI | **PASA** | `src/features/horarios/dto/create-bloque-horario.dto.ts:14-74`, `src/features/horarios/dto/update-bloque-horario.dto.ts:4-43` | Validación de horas con regex 24h `HH:mm` (`@Matches`), `diaSemana` entre 1 y 5 (`@IsInt`, `@Min(1)`, `@Max(5)`), `tipoBloque` (`@IsIn(['clase', 'receso'])`) y `cursoSeccionId` UUID v4 opcional. Decoradores OpenAPI `@ApiProperty` y `@ApiPropertyOptional` exhaustivos. |
| **ParseUUIDPipe (`security-api-standards.md`, `nestjs-best-practices`):** Validación estricta de parámetros de ruta | **PASA** | `src/features/horarios/horarios.controller.ts:52, 70, 87, 105` | Se aplica `ParseUUIDPipe` a los parámetros de ruta `:seccionId` e `:id` en todos los endpoints del controlador. |
| **Zero `any` y tipado estricto (`clean-code-architecture.md` §1, `typescript-advanced-types`):** Sin tipos laxos ni assertions no controladas | **PASA** | `src/features/horarios/**` | Cero ocurrencias de `any`, `@ts-ignore` o `@ts-nocheck`. Retorno de `findByDocente` tipado estrictamente con `BloqueDocenteResultado[]`. |
| **Auditoría en crear, actualizar y eliminar (`clean-code-architecture.md` §6):** Bitácora asíncrona inmutable con BullMQ | **PASA** | `src/features/horarios/horarios.service.ts:103-110, 181-189, 218-225` | Auditoría despachada mediante `AuditService.log` con tabla `"horarios"` en acciones `"crear"`, `"actualizar"` y `"eliminar"`, guardando valores serializados, IP y usuario. |
| **Control de acceso con `@MenuAccess(MENU_HORARIOS)` solo en escrituras (`security-api-standards.md`):** Protección exclusiva en mutaciones | **PASA** | `src/features/horarios/horarios.controller.ts:43, 61, 79, 94-108` | `@MenuAccess(MENU_HORARIOS)` aplicado exclusivamente a las rutas mutantes `POST seccion/:seccionId/bloques`, `PATCH bloques/:id` y `DELETE bloques/:id`. La ruta de consulta `GET seccion/:seccionId` permanece abierta para lectura general. |
| **Año lectivo vía `AnioLectivoCls` (`anio-lectivo.md`):** Lectura contextual y validaciones de estado | **PASA** | `src/features/horarios/horarios.service.ts:37, 114-115, 193-194, 292-299` | Lectura contextual con `AnioLectivoCls.id()` y fallback a `findEnCurso()`; rechazo con `BadRequestException` en año cerrado; mensaje oficial «El horario se guardó. Los cambios rigen desde mañana.» en año en curso. |
| **Consultas sin N+1 y agregación eficiente (`clean-code-architecture.md` §5):** Relaciones y sumas resueltas en SQL | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:32-58, 136-209, 211-256, 258-287` | `findBySeccion` resuelve relaciones con `leftJoin` en una sola consulta; `horasPlanPorCurso` ejecuta un solo JOIN múltiple; `horasPorCurso` y `findCruceDocente` no realizan consultas iterativas en bucle. |
| **SQL seguro sin concatenación directa (`security-api-standards.md`):** Consultas parametrizadas con Drizzle | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:99-105, 160-167, 216-220, 267-276` | Operaciones construidas con operadores tipados de Drizzle (`eq`, `and`, `ne`, `asc`) y fragmentos `sql` parametrizados con casting `::time` seguro. Cero interpolación directa de cadenas. |
| **Manejo de excepciones HTTP de Nest (`clean-code-architecture.md` §7, `nodejs-backend-patterns`):** Excepciones HTTP nativas en la capa de negocio | **PASA** | `src/features/horarios/horarios.service.ts:51, 58, 62, 73, 87, 132, 145, 159, 173, 208, 213, 296` | La capa de servicio utiliza consistentemente `BadRequestException`, `NotFoundException` y `ConflictException`. Se detectan instancias genéricas `throw new Error` en el repositorio/utilidades reportadas en hallazgos. |
| **Valores de negocio dinámicos (`validar_entrega.md` §Valores de negocio fijos):** Cero heurísticas o literales que sustituyan datos de BD | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:211-287`, `src/features/horarios/horarios.service.ts:228-290` | Verificado: horas del plan se obtienen de `plan_estudios.horasSemanales` (eliminada heurística por nombre); minutos de hora pedagógica se obtienen de `variables_sistema` (`jornada.minutos_hora_pedagogica`, eliminado divisor 45 hardcodeado). Cero valores fijos de negocio. |
| **Diseño extensible para T06 y T07 (`T05`, `nestjs-best-practices`):** Modularidad sin reescritura futura | **PASA** | `src/features/horarios/horarios.module.ts:19`, `src/features/horarios/utils/horarios.util.ts:6-75`, `src/features/horarios/interfaces/horarios.repository.interface.ts:48-73` | `HorariosModule` exporta `HorariosService` y `HorariosRepository`; utilidades de hora desacopladas en `utils/` e interfaces listas para extensión por grilla (T06) y consultas por docente (T07). |
| **Español al 100 % (`idioma_español.md`):** Nomenclatura, mensajes y reglas de negocio | **PASA** | `src/features/horarios/**` | Nomenclatura en español, mensajes con tildes y eñes exactos del RF-008 HU3 (`"La hora de fin debe ser posterior a la hora de inicio."`, `"El bloque se cruza con otro bloque de la sección."`, `"El docente ya dicta en..."`, `"El horario se guardó. Los cambios rigen desde mañana."`) y uso de «Año académico». |
| **Seguridad, sin secretos y alcance estricto (`restricciones_agy.md`, `security-api-standards.md`):** Sin credenciales ni modificaciones indebidas | **PASA** | `git status --porcelain src/features/features.module.ts`, `src/features/horarios/**` | Cero secretos en código; `src/features/features.module.ts` no fue modificado; no se tocaron esquemas de BD, migraciones ni otros módulos. |

## Pruebas ejecutadas

1. **Pruebas unitarias del módulo `horarios`:**
   - Comando: `pnpm exec jest test/features/horarios`
   - Resultado: 2 suites pasadas (`horarios.service.spec.ts` con 12 pruebas, `horarios.controller.spec.ts` con 8 pruebas), 20 pruebas pasadas, 0 fallidas (exit code 0).
2. **Linter y reglas de formato:**
   - Comando: `pnpm exec eslint src/features/horarios test/features/horarios`
   - Resultado: 0 errores y 0 advertencias (exit code 0).
3. **Chequeo de tipos estático:**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: 0 errores de compilación TypeScript en todo el proyecto (exit code 0).
4. **Build de producción:**
   - Comando: `pnpm build` (`nest build`)
   - Resultado: Compilación exitosa (exit code 0).
5. **Suite completa de regresión:**
   - Comando: `pnpm test` (`jest`)
   - Resultado: 30 suites pasadas, 300 pruebas pasadas, 0 fallidas (exit code 0).
6. **Verificación automatizada del harness:**
   - Comando: `bash .agents/tools/verificar_tarea.sh T05`
   - Resultado: Salida `OK` (exit code 0).
7. **Inspección de patrones prohibidos:**
   - Búsqueda con grep sobre `src/features/horarios/` y `test/features/horarios/`: cero usos de `any`, `console.log`, `TODO`, `@ts-ignore` y `eslint-disable`.
8. **Integridad de pruebas rojas copiadas:**
   - Comandos:
     - `cmp TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt test/features/horarios/horarios.service.spec.ts`
     - `cmp TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts.txt test/features/horarios/horarios.controller.spec.ts`
   - Resultado: Idénticos byte a byte (exit code 0).

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **media** | `src/features/horarios/repositories/horarios.repository.ts:224, 231, 305, 329` | En el repositorio se lanzan instancias genéricas de `throw new Error(...)` (al validar la presencia/vigencia de la variable de sistema `jornada.minutos_hora_pedagogica`, al comprobar valor numérico válido, y al recuperar el bloque registrado o actualizado tras `findById`). Según la regla §7 de `clean-code-architecture.md`, se deben utilizar excepciones de NestJS tipadas como `InternalServerErrorException` para evitar errores no controlados. |
| **baja** | `src/features/horarios/utils/horarios.util.ts:71` | La función utilitaria pura `calcularHorasPedagogicas` lanza un `throw new Error("Los minutos por hora pedagógica deben ser mayores a cero.")` genérico. Si bien es una función pura, se sugiere manejar el caso de error mediante excepciones específicas o validación previa en el servicio invocador. |

## Recomendación al DEV

La segunda validación de la tarea T05 confirma que el desarrollador resolvió satisfactoriamente los hallazgos de valores de negocio fijos: las horas del plan de estudios ahora provienen de la entidad `plan_estudios` vía SQL y los minutos de jornada provienen de la tabla `variables_sistema`, sin literales ni heurísticas en el código. Asimismo, el método `findByDocente` fue debidamente tipado con la interfaz `BloqueDocenteResultado[]`.
Para futuras iteraciones o refactorizaciones, se sugiere reemplazar los `throw new Error(...)` genéricos en el repositorio por excepciones tipadas de NestJS (`InternalServerErrorException`).
Se recomienda dar por **APROBADA** la entrega de T05.
