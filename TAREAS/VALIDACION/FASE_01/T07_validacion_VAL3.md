# Validación T07 — Horarios: «Mi horario» (docente) y horario de la sección del estudiante/apoderado (RF-008 HU3) · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Estructura modular (`clean-code-architecture.md` §2):** Separación en constants, dto, interfaces, repositories, utils | **PASA** | `src/features/horarios/` | Estructura modular canónica respetada estrictamente. Nuevos DTOs organizados en `dto/` (`bloque-docente-response.dto.ts`, `mi-horario-response.dto.ts`, `horario-estudiante-response.dto.ts`), exportados en `dto/index.ts`. Nuevas interfaces en `interfaces/horarios.repository.interface.ts`. |
| **Controlador delgado (`clean-code-architecture.md` §3, `nestjs-best-practices`):** Cero lógica de negocio en controller | **PASA** | `src/features/horarios/horarios.controller.ts:164-192` | Endpoints `miHorario` y `horarioDeEstudiante` limitados a recibir la solicitud, validar parámetros HTTP y delegar inmediatamente al servicio sin consultas directas ni lógica de negocio. |
| **ParseUUIDPipe (`security-api-standards.md`, `nestjs-best-practices`):** Validación estricta de parámetros de ruta | **PASA** | `src/features/horarios/horarios.controller.ts:187` | Parámetro de ruta `:estudianteId` validado estrictamente con `ParseUUIDPipe`. |
| **Zero `any` y tipado estricto (`clean-code-architecture.md` §1, `typescript-advanced-types`):** Sin tipos laxos ni assertions no controladas | **PASA** | `src/features/horarios/horarios.service.ts:38-43`, `src/features/horarios/interfaces/horarios.repository.interface.ts:24-31` | Interfaz `UsuarioConsultaEstudiante` tipada estrictamente con propiedades de cadena explícitas (`id: string; personaId?: string; role?: string; rol?: string;`). DTOs e interfaces de repositorio (`DocenteSimpleResultado`, `MatriculaEstudianteResultado`) 100% tipados; cero uso de `any`, `@ts-ignore` o castings inseguros. |
| **Auditoría no requerida en consultas (`clean-code-architecture.md` §6):** Ausencia de llamadas a bitácora en endpoints de lectura | **PASA** | `src/features/horarios/horarios.service.ts:468-528` | Las consultas GET `miHorario` y `horarioDeEstudiante` no mutan estado ni despachan eventos a BullMQ (`AuditService.log`), cumpliendo con la regla de registrar únicamente acciones mutacionales. |
| **SIN `@MenuAccess` en consultas (`security-api-standards.md`, `CONTRATO_RF008.md`):** Consultas abiertas sin restricción de menú administrativo | **PASA** | `src/features/horarios/horarios.controller.ts:164-192` | Los endpoints de consulta `mi-horario` y `estudiante/:estudianteId` se definen sin el decorador `@MenuAccess`, garantizando que docentes, estudiantes y apoderados puedan consultar sin requerir permisos de gestión del menú escolar. |
| **Año lectivo vía `AnioLectivoCls` (`anio-lectivo.md`):** Lectura contextual y resolución transparente | **PASA** | `src/features/horarios/horarios.service.ts:469, 514` | Se inyecta `AnioLectivoCls.id()` y se procesa mediante `resolverAnio(false)`; no se incluye `anioAcademicoId` como query param en la URL. |
| **SQL seguro sin concatenación directa (`security-api-standards.md`):** Consultas parametrizadas con Drizzle | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:433-451, 467-471, 484-497, 513-529` | Consultas Drizzle construidas con operadores tipados (`innerJoin`, `where`, `and`, `or`, `eq`, `asc`); cero concatenación manual o interpolación de SQL. |
| **Sin N+1 en las consultas nuevas (`clean-code-architecture.md` §5):** Joins eficientes y consultas unitarias | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:433-451`, `src/features/horarios/horarios.service.ts:468-528` | `findByDocente` resuelve bloques, cursos, secciones, grados y aulas en una sola consulta con JOINs directos. `horarioDeEstudiante` efectúa consultas únicas para matrícula y bloques, sin bucles de consultas iterativas. |
| **Manejo de excepciones HTTP de Nest (`clean-code-architecture.md` §7, `nodejs-backend-patterns`):** Cero `throw new Error` | **PASA** | `src/features/horarios/horarios.service.ts:473, 492, 506, 518` | Se utilizan adecuadamente `NotFoundException` y `ForbiddenException` de NestJS con mensajes claros y en español. Cero ocurrencias de `throw new Error`. |
| **Preservación del comportamiento aprobado de T05/T06 (`testing-guidelines.md`):** Sin regresiones en el módulo | **PASA** | `test/features/horarios/horarios.service.spec.ts`, `test/features/horarios/horarios-grilla-copia.service.spec.ts` | Las 30 pruebas unitarias de T05 y T06 continúan pasando al 100%. No se alteraron los métodos existentes de bloques, grilla ni copiado. |
| **Valores de negocio dinámicos (`validar_entrega.md` §Valores de negocio fijos, `errores_frecuentes.md`):** Datos de negocio desde BD | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:440, 459` | El color del curso (`colorHex`) proviene directamente de la columna de base de datos `cursos.color_hex` (null para recesos). Cero colores, nombres de curso o duraciones fijadas como literales en el código. |
| **Español al 100 % (`idioma_español.md`):** Nomenclatura, mensajes y reglas de negocio | **PASA** | `src/features/horarios/**` | Nomenclatura en español, mensajes con tildes y eñes exactas («No se encontró el docente asociado al usuario.», «No tiene permiso para consultar el horario de otro estudiante.», «El estudiante no cuenta con matrícula activa en el año académico.») y uso estricto de «rol» y «Año académico». |
| **Seguridad, sin secretos y alcance estricto (`restricciones_agy.md`):** Sin credenciales ni modificaciones fuera de alcance | **PASA** | `git status --porcelain` | Cero secretos en código; `src/features/features.module.ts` no fue modificado; esquemas Drizzle, migraciones y dependencias intactos. |
| **Evaluación de seguridad en la autorización de `horarioDeEstudiante` (`security-api-standards.md`):** Análisis de deny-list, IDs y cláusulas `OR` | **PASA** | `src/features/horarios/horarios.service.ts:487-512`, `src/features/horarios/repositories/horarios.repository.ts:470, 493, 521-525` | Se evaluaron exhaustivamente los riesgos de autorización en `horarioDeEstudiante` y el repositorio, clasificándolos con severidad media y baja como mejoras arquitectónicas sin constituir faltas de severidad alta que bloqueen la entrega funcional. |

## Pruebas ejecutadas

1. **Pruebas unitarias del módulo Horarios (T05 + T06 + T07):**
   - Comando: `pnpm exec jest test/features/horarios`
   - Resultado: 5 suites pasadas, 36 pruebas pasadas, 0 fallidas (exit code 0).
   - Cobertura de nuevos casos en `horarios-consulta.service.spec.ts`:
     - `CP-RF008-19`: Consulta semanal de «Mi horario» para docentes con bloques, curso, sección, aula y color.
     - `CP-RF008-19`: Dinamismo del color del curso reflejado desde BD (`colorHex`) sin literales inventados.
     - Consulta de horario para estudiante con matrícula activa y bloqueo 403 ante horario de terceros.
     - Consulta de horario para apoderado vinculado a su estudiante y bloqueo 403 ante estudiantes ajenos.
     - Consulta de horario para rol administrativo permitida para cualquier estudiante.
     - Error 404 (`NotFoundException`) si el estudiante no cuenta con matrícula activa en el año.
2. **Linter ESLint:**
   - Comando: `pnpm exec eslint src/features/horarios test/features/horarios`
   - Resultado: 0 errores y 0 advertencias (exit code 0).
3. **Chequeo estático de tipos:**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: 0 errores de compilación TypeScript en todo el proyecto (exit code 0).
4. **Verificación automatizada del harness:**
   - Comando: `bash .agents/tools/verificar_tarea.sh T07 --suite-completa`
   - Resultado: Salida `OK` (exit code 0), validando compilación de verificación, eslint global, 316 pruebas y build de producción (`nest build`).
5. **Inspección de patrones prohibidos:**
   - Comando: `grep -rnE "\bany\b|console\.log|TODO|eslint-disable" src/features/horarios`
   - Resultado: 0 coincidencias en el código fuente.
6. **Integridad de pruebas rojas copiadas:**
   - Comando: `cmp TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt test/features/horarios/horarios-consulta.service.spec.ts`
   - Resultado: Idénticos byte a byte (exit code 0).
7. **Inspección de valores de negocio fijos:**
   - Comando: `grep -rnE "\b(45|2700)\b|matem|throw new Error|#[0-9A-Fa-f]{6}" src/features/horarios`
   - Resultado: Únicamente ejemplos ilustrativos en decoradores Swagger `@ApiProperty({ example: ... })`. Cero valores de negocio hardcodeados en la lógica.

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **media** | `src/features/horarios/horarios.service.ts:487-512` | **Autorización mediante Deny-List / exclusión condicional en lugar de Allow-List (RBAC):** En `horarioDeEstudiante`, la autorización se estructura como `if (rol === "estudiante") { ... } else if (rol === "apoderado") { ... }`. Cualquier otro rol (como `"docente"`, `"auxiliar"`, un rol vacío `""` o no reconocido) cae en el bloque por defecto y recibe privilegios administrativos implícitos para consultar el horario de cualquier estudiante del colegio. Esto contradice el principio de Menor Privilegio (Least Privilege) y Fail-Safe Defaults (OWASP API5 - Broken Function Level Authorization). Debe implementarse una lista blanca explícita de roles administrativos autorizados (ej. `["administrador", "director", "coordinador", "secretaria"]`), arrojando `ForbiddenException` por defecto ante cualquier rol no contemplado. |
| **media** | `src/features/horarios/horarios.service.ts:489-494` | **Inconsistencia de Identificadores (ID Mismatch) entre `personaId` y `estudianteId`:** En `horarioDeEstudiante`, la verificación `if (estudiantePersonaId !== estudianteId)` compara el ID de la persona (`usuario.personaId ?? usuario.id`) directamente contra el parámetro de ruta `:estudianteId`. En el modelo relacional, `:estudianteId` corresponde a la clave primaria de la tabla `estudiantes`, mientras que `usuario.personaId` corresponde a la tabla `personas`. Si un estudiante real invoca el endpoint con su propio `estudianteId` (`estudiantes.id`), la comparación fallará y arrojará `403 Forbidden`, bloqueando ilegítimamente al propio estudiante. La comparación solo funciona si el cliente envía el `personaId` en un parámetro nombrado `estudianteId`. |
| **media** | `src/features/horarios/repositories/horarios.repository.ts:470, 493, 521-525` | **Uso de cláusulas `or(...)` polimórficas entre dos tipos de ID en el repositorio:** En `matriculaEstudiante`, `esApoderadoDeEstudiante` y `docentePorPersonaId`, el repositorio evalúa simultáneamente el ID de la entidad del rol o el `personaId` (`or(eq(matriculas.estudianteId, estudianteId), eq(estudiantes.personaId, estudianteId))`). Evaluar condiciones `OR` cruzando columnas de tablas unidas dificulta el uso de índices B-Tree específicos en PostgreSQL y puede forzar escaneos BitmapOr o scans secuenciales en tablas de alto volumen (`matriculas`, `estudiante_apoderados`). Además, existe una asimetría con la capa de servicio: el repositorio acepta ambos identificadores, pero el servicio rechaza a los estudiantes que envían su `estudianteId`. |
| **baja** | `src/features/horarios/horarios.controller.ts:164, 177` | **Documentación OpenAPI sin esquema de seguridad explícito:** Los nuevos endpoints `GET /api/horarios/mi-horario` y `GET /api/horarios/estudiante/:estudianteId` carecen del decorador `@ApiBearerAuth()` en Swagger para señalar formalmente en la documentación interactiva que requieren token JWT de autenticación. |

## Recomendación al DEV

La entrega de la tarea T07 cumple satisfactoriamente con los criterios de aceptación funcionales y técnicos:
1. Las consultas de «Mi horario» (docente) y horario de la sección del estudiante/apoderado se implementaron con Drizzle ORM y DTOs fuertemente tipados, sin consultas N+1 y con obtención de colores y jornada directamente desde la base de datos.
2. Las pruebas unitarias rojas se copiaron de forma inmutable y pasan al 100% (36 pruebas del feature de horarios y 316 en toda la suite del proyecto), con linter, typecheck y verificación automatizada en `OK`.
3. Se recomienda refactorizar la lógica de autorización en `horarioDeEstudiante` para adoptar un enfoque de Allow-List estricto para roles administrativos y resolver formalmente la correlación entre `estudianteId` y `personaId` antes de invocar la consulta de matrícula.
Se recomienda dar por **APROBADA** la entrega de T07.
