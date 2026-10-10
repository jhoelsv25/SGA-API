# Validación T06 — Horarios: grilla propuesta y copiar horario (RF-008 HU3) · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Estructura modular (`clean-code-architecture.md` §2):** Separación en constants, dto, interfaces, repositories, utils | **PASA** | `src/features/horarios/` | Estructura modular canónica respetada estrictamente. DTOs de respuesta organizados en `dto/` (`copiar-horario-response.dto.ts`, `grilla-propuesta-response.dto.ts`), interfaces en `interfaces/` y exportaciones centralizadas vía barrels (`index.ts`). |
| **Controlador delgado (`clean-code-architecture.md` §3, `nestjs-best-practices`):** Cero lógica de negocio en controller | **PASA** | `src/features/horarios/horarios.controller.ts:116-161` | Endpoints `proponerGrilla` y `copiar` limitados a la recepción de parámetros, validación de formato HTTP y delegación inmediata al servicio sin consultas directas ni lógica de negocio. |
| **Validación del query `horaEntrada` (HH:mm) (`clean-code-architecture.md` §1, `security-api-standards.md`):** Formato 24h obligatorio | **PASA** | `src/features/horarios/horarios.controller.ts:135-137`, `src/features/horarios/constants/horarios.constants.ts:40` | Se valida mediante `REGEX_HORA_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/`. Si se provee un formato inválido, arroja `BadRequestException(MENSAJES_HORARIOS.FORMATO_HORA_INVALIDO)`. |
| **ParseUUIDPipe (`security-api-standards.md`, `nestjs-best-practices`):** Validación estricta de parámetros de ruta | **PASA** | `src/features/horarios/horarios.controller.ts:132, 154, 155` | Parámetros de ruta `:seccionId`, `:origenId` y `:destinoId` validados estrictamente con `ParseUUIDPipe`. |
| **Zero `any` y tipado estricto (`clean-code-architecture.md` §1, `typescript-advanced-types`):** Sin tipos laxos ni assertions no controladas | **PASA** | `src/features/horarios/interfaces/horarios.repository.interface.ts:29-40`, `src/features/horarios/dto/**` | Interfaces de dominio `ParametrosJornadaResultado` y `CursoSeccionDetalle` fuertemente tipadas. Retornos de repositorio y DTOs 100% tipados; cero uso de `any`, `@ts-ignore` o casting no seguro. |
| **Auditoría en copiar (`clean-code-architecture.md` §6):** Bitácora asíncrona con BullMQ | **PASA** | `src/features/horarios/horarios.service.ts:391-398, 444-453` | Para cada bloque replicado (receso o clase), se registra la mutación mediante `AuditService.log` con `tabla: TABLA_HORARIOS` ("horarios"), `accion: "crear"`, `usuarioId: actorId`, `registroId: bloqueCreado.id`, IP y valores serializados. |
| **Control de acceso con `@MenuAccess(MENU_HORARIOS)` solo en copiar (`security-api-standards.md`):** Protección en mutación | **PASA** | `src/features/horarios/horarios.controller.ts:142`, `test/features/horarios/horarios-grilla-copia.controller.spec.ts:41-56` | `@MenuAccess(MENU_HORARIOS)` aplicado exclusivamente al endpoint mutante `POST seccion/:destinoId/copiar-de/:origenId`. El endpoint de consulta `GET seccion/:seccionId/grilla` permanece abierto para consulta general sin restricción de menú. |
| **Año lectivo vía `AnioLectivoCls` (`anio-lectivo.md`):** Lectura contextual y bloqueo en año cerrado | **PASA** | `src/features/horarios/horarios.service.ts:327, 485-492` | Se inyecta `AnioLectivoCls.id()` y se valida con `resolverAnio(true)`; ante un año académico con estado `cerrado`, la copia es rechazada con `BadRequestException(MENSAJES_HORARIOS.ANIO_CERRADO)`. |
| **SQL seguro sin concatenación directa (`security-api-standards.md`):** Consultas parametrizadas con Drizzle | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:247-254, 299-303, 314-328` | Consultas construidas con operadores tipados de Drizzle (`inArray`, `eq`, `and`, `asc`, `innerJoin`). Fragmentos `sql` en `findCruceDocente` parametrizados con casting `::time`. Cero concatenación directa de cadenas SQL. |
| **Sin N+1 relevante en bucle de copiar (`clean-code-architecture.md` §5):** Precarga de cursos y asignaciones en memoria | **PASA** | `src/features/horarios/horarios.service.ts:347-372, 408-428` | Cursos de la sección origen y destino se obtienen previamente con `cursosSeccionPorSeccion` e indexan en memoria (`Map`). Dentro del bucle no se realizan consultas de metadatos redundantes, únicamente la verificación puntual de cruce por bloque con docente (`findCruceDocente`) y la persistencia requerida. |
| **Manejo de excepciones HTTP nativas de Nest (`clean-code-architecture.md` §7, `nodejs-backend-patterns`):** Reemplazo de `throw new Error` | **PASA** | `src/features/horarios/horarios.service.ts:271, 336, 340, 345`, `src/features/horarios/repositories/horarios.repository.ts:264, 285, 306, 377, 402`, `src/features/horarios/utils/horarios.util.ts:90` | Se corrigieron los hallazgos heredados de T05 sustituyendo los `throw new Error` del repositorio y utilidades por `InternalServerErrorException`. En el servicio se utilizan adecuadamente `NotFoundException`, `BadRequestException` y `ConflictException`. |
| **Preservación del comportamiento aprobado de T05 (`T06`, `testing-guidelines.md`):** Sin regresiones | **PASA** | `test/features/horarios/horarios.service.spec.ts`, `test/features/horarios/horarios.controller.spec.ts` | Las 20 pruebas unitarias de T05 continúan pasando al 100%. `horasPorCurso` fue refactorizado exitosamente para reutilizar `obtenerParametrosJornada()`. |
| **Valores de negocio dinámicos (`validar_entrega.md` §Valores de negocio fijos, `errores_frecuentes.md`):** Cero números mágicos en negocio | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:239-296, 298-312`, `src/features/horarios/horarios.service.ts:275-285` | `minutosHoraPedagogica`, `horasPedagogicasDia`, `recreoDespuesDeHora` y `minutosRecreo` se consultan dinámicamente desde `variables_sistema` (`obtenerParametrosJornada`). Hora de entrada escolar proviene de la tabla `turnos` (`horaEntradaEstudiantes`). Cero literales 45, 7, 3 o 15 hardcodeados en la lógica de negocio. |
| **Español al 100 % (`idioma_español.md`):** Nomenclatura, mensajes y reglas de negocio | **PASA** | `src/features/horarios/**` | Código 100% en español con tildes y eñes exactas del RF-008 HU3 (`"Solo se pueden copiar horarios entre secciones del mismo grado."`, `"La sección destino ya cuenta con bloques de horario registrados."`, `"El docente ya dicta en..."`). Uso estricto de «rol» y «Año académico». |
| **Seguridad, sin secretos y alcance estricto (`restricciones_agy.md`):** Sin credenciales ni cambios no permitidos | **PASA** | `git status --porcelain src/features/features.module.ts`, `src/features/horarios/**` | Cero secretos en código; `src/features/features.module.ts` no fue modificado; no se modificaron esquemas ni migraciones Drizzle ni módulos fuera de alcance (`carga-academica`, `secciones`). |

## Pruebas ejecutadas

1. **Pruebas unitarias de Horarios (T05 + T06):**
   - Comando: `pnpm exec jest test/features/horarios`
   - Resultado: 4 suites pasadas, 30 pruebas pasadas, 0 fallidas (exit code 0).
   - Cobertura de nuevos casos: CP-RF008-11 (grilla dinámica y parámetros del repositorio), CP-RF008-17 (copia de horarios y detección de cruces) y CP-RF008-20 (control de acceso `@MenuAccess` vs consulta abierta).
2. **Linter ESLint:**
   - Comando: `pnpm exec eslint src/features/horarios test/features/horarios`
   - Resultado: 0 errores y 0 advertencias (exit code 0).
3. **Chequeo de tipos estático:**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: Compilación limpia sin errores en todo el proyecto (exit code 0).
4. **Verificación automatizada del harness:**
   - Comando: `bash .agents/tools/verificar_tarea.sh T06 --suite-completa`
   - Resultado: Salida `OK` (exit code 0), validando `tsc` con `tsconfig.verificacion.json`, eslint global, suite completa de 310 pruebas y build de producción (`nest build`).
5. **Inspección de patrones prohibidos:**
   - Búsqueda en diff y archivos nuevos de `console.log`, `debugger`, `@ts-ignore`, `eslint-disable`, `: any`, `<any>`, `as any` y `TODO`: 0 ocurrencias.
6. **Integridad de pruebas rojas copiadas:**
   - Comandos:
     - `cmp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt test/features/horarios/horarios-grilla-copia.service.spec.ts`
     - `cmp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.controller.spec.ts.txt test/features/horarios/horarios-grilla-copia.controller.spec.ts`
   - Resultado: Idénticos byte a byte (exit code 0).
7. **Inspección de valores de negocio fijos:**
   - Búsqueda con regex `grep -rnE "\b(45|2700)\b|\"Matemática\"|matem" src/features/horarios`: solo aparecen en ejemplos OpenAPI de Swagger heredados de T05; cero literales en código de negocio.

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/features/horarios/horarios.service.ts:374-454` | En el método `copiar`, la inserción de los bloques se ejecuta secuencialmente bloque a bloque fuera de una transacción explícita de base de datos (`db.transaction`). Aunque cumple con el contrato y las pruebas unitarias, envolver la replicación de bloques en una transacción garantizaría atomicidad (todo o nada) en caso de interrupción en la conexión durante el proceso. |
| **baja** | `src/features/horarios/horarios.controller.ts:135` | La validación del query param `horaEntrada` se efectúa imperativamente en el método del controlador mediante `REGEX_HORA_HH_MM` en lugar de aislarse en un DTO decorado con `class-validator` (`@Matches`), si bien es totalmente funcional y responde con el `BadRequestException` esperado. |

## Recomendación al DEV

La entrega de la tarea T06 cumple satisfactoriamente con todos los requerimientos funcionales y no funcionales:
1. Se resolvieron de forma completa los hallazgos de T05 (`throw new Error` reemplazados por `InternalServerErrorException` y reutilización de `obtenerParametrosJornada` en `horasPorCurso`).
2. La propuesta de grilla semanal se calcula de forma 100% dinámica a partir de `variables_sistema` y `turnos`, sin literales ni suposiciones en el código.
3. El copiado de horarios empareja correctamente cursos por `cursoId`, respeta la auditoría en BullMQ, detecta cruces de docentes y valida pertenencia al mismo grado y ausencia de bloques previos.
4. Las pruebas unitarias rojas se mantuvieron inmutables y pasan junto con toda la suite del proyecto.
Se recomienda dar por **APROBADA** la entrega de T06.
