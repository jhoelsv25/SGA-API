# Informe de Tarea T07 — Horarios: «Mi horario» (docente) y horario de la sección del estudiante/apoderado (RF-008 HU3)

**Fecha:** 2026-10-09  
**Agente:** DEV-1  
**Rama:** `feat/rf-008-secciones-carga-horarios`  
**Estado:** COMPLETADO (a la espera del mensaje «CONFIRMADO» para commit)

---

## 1. Archivos Modificados / Creados y Acciones Realizadas

### Pruebas Copiadas (Inmutables)
- `test/features/horarios/horarios-consulta.service.spec.ts`: Copiado idéntico desde `TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt`.
- Verificación con `cmp` contra el `.txt` arrojó 0 diferencias.

### Módulo `src/features/horarios/`

1. **`dto/bloque-docente-response.dto.ts`**:
   - Creado `BloqueDocenteResponseDto` con tipado estricto y decoradores OpenAPI/Swagger (`id`, `diaSemana`, `horaInicio`, `horaFin`, `cursoNombre`, `colorHex`, `seccionNombre`, `gradoNumero`, `aula`).
   - Cero literales de negocio hardcodeados.

2. **`dto/mi-horario-response.dto.ts`**:
   - Creado `MiHorarioResponseDto` (`docenteId`, `bloques: BloqueDocenteResponseDto[]`) para la respuesta estructurada de la consulta semanal del docente.

3. **`dto/horario-estudiante-response.dto.ts`**:
   - Creado `HorarioEstudianteResponseDto` (`seccionId`, `bloques: BloqueHorarioResponseDto[]`) para la consulta de la sección escolar del estudiante o apoderado vinculado.

4. **`dto/index.ts`**:
   - Exportados los 3 nuevos DTOs (`BloqueDocenteResponseDto`, `MiHorarioResponseDto`, `HorarioEstudianteResponseDto`).

5. **`interfaces/horarios.repository.interface.ts`**:
   - Agregadas interfaces de resultado de repositorio: `DocenteSimpleResultado` y `MatriculaEstudianteResultado`.
   - Incorporados al contrato `IHorariosRepository`:
     - `docentePorPersonaId(personaId: string): Promise<DocenteSimpleResultado | null>`
     - `matriculaEstudiante(anioId: string, estudianteId: string): Promise<MatriculaEstudianteResultado | null>`
     - `esApoderadoDeEstudiante(apoderadoPersonaId: string, estudianteId: string): Promise<boolean>`
     - `findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResponseDto[]>`

6. **`repositories/horarios.repository.ts`**:
   - Actualizado `findByDocente(anioId, docenteId)`: une `horarios`, `cursos_seccion`, `secciones`, `grados` y `cursos`, obteniendo `colorHex` directamente de la columna de base de datos `cursos.color_hex` (`null` para recesos). Sin consultas N+1.
   - Implementado `docentePorPersonaId(personaId)`: consulta en la tabla `docentes` por `personaId` (o `id`) del usuario autenticado.
   - Implementado `matriculaEstudiante(anioId, estudianteId)`: consulta en `matriculas` uniendo `estudiantes` en el año académico filtrando por `anioAcademicoId` y `estudianteId` (o `personaId`), retornando `seccionId` y `estado`.
   - Implementado `esApoderadoDeEstudiante(apoderadoPersonaId, estudianteId)`: verifica la vinculación en `estudiante_apoderados` uniendo con `apoderados` y `estudiantes`, retornando booleano.

7. **`horarios.service.ts`**:
   - Implementado `miHorario(personaId: string)`:
     - Resuelve el año lectivo mediante `AnioLectivoCls`/año en curso.
     - Resuelve el `docenteId` con `docentePorPersonaId(personaId)`; lanza `NotFoundException` si no existe.
     - Consulta los bloques semanales con `findByDocente(anio.id, docente.id)` reflejando el color y detalles del curso y sección.
   - Implementado `horarioDeEstudiante(estudianteId: string, usuario: UsuarioConsultaEstudiante)`:
     - Reglas de control de acceso:
       - Rol `Estudiante`: solo puede consultar su propio horario (`personaId` / `id` coincidente); si intenta consultar a otro, lanza `ForbiddenException`.
       - Rol `Apoderado`: solo puede consultar a estudiantes vinculados verificados mediante `esApoderadoDeEstudiante(usuario.personaId, estudianteId)`; si no tiene vínculo, lanza `ForbiddenException`.
       - Rol administrativo / gestión: consulta habilitada para cualquier estudiante.
     - Resuelve el año lectivo de trabajo con `resolverAnio(false)`.
     - Consulta la matrícula del estudiante con `matriculaEstudiante(anio.id, estudianteId)`; valida que exista y su estado sea `matriculado`; lanza `NotFoundException` si no tiene matrícula activa en el año.
     - Obtiene los bloques de la sección asignada con `findBySeccion(matricula.seccionId)`.

8. **`horarios.controller.ts`**:
   - Implementado `GET /api/horarios/mi-horario`: endpoint de consulta sin `@MenuAccess`, inyectando `@CurrentUser() usuario: AuthenticatedUser` y delegando `miHorario(usuario.personaId)`.
   - Implementado `GET /api/horarios/estudiante/:estudianteId`: endpoint de consulta sin `@MenuAccess`, validando con `ParseUUIDPipe` y delegando `horarioDeEstudiante(estudianteId, usuario)`.
   - Documentación Swagger exhaustiva (`@ApiOperation`, `@ApiResponse`, `@ApiParam`).

---

## 2. Cumplimiento de Skills y Reglas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `.agents/rules/clean-code-architecture.md` | Estructura modular estricta; inyección por constructor; cero `any` y tipado estricto; sin consultas N+1 en repositorio con joins de Drizzle; ningún valor de negocio hardcodeado. | `src/features/horarios/**` |
| `.agents/rules/security-api-standards.md` | Consultas abiertas sin `@MenuAccess` para horarios propios; protección por rol en servicio (ForbiddenException); decoradores OpenAPI completos (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`); validación de UUIDs con `ParseUUIDPipe`. | `src/features/horarios/horarios.controller.ts`, `src/features/horarios/dto/**` |
| `.agents/rules/anio-lectivo.md` | Contexto CLS mediante `AnioLectivoCls.id()`, sin inyectar `anioAcademicoId` por query param, fallback transparente a año en curso. | `src/features/horarios/horarios.service.ts` |
| `.agents/rules/testing-guidelines.md` | Pruebas unitarias en `test/features/horarios/horarios-consulta.service.spec.ts` idénticas a las pruebas rojas base (`cmp` sin diferencias); cobertura de CP-RF008-19 y escenarios de estudiante/apoderado. | `test/features/horarios/horarios-consulta.service.spec.ts` |
| `.agents/skills/nestjs-best-practices/SKILL.md` | Principio de Responsabilidad Única (SRP); controladores delgados delegando al servicio; excepciones nativas de NestJS (`NotFoundException`, `ForbiddenException`). | `src/features/horarios/**` |
| `.agents/skills/nodejs-backend-patterns/SKILL.md` | Manejo de excepciones tipadas de NestJS; consultas optimizadas mediante Drizzle ORM con inner joins directos. | `src/features/horarios/repositories/horarios.repository.ts`, `src/features/horarios/horarios.service.ts` |
| `.agents/skills/typescript-advanced-types/SKILL.md` | Cero `any`, cero `@ts-ignore`; contratos e interfaces fuertemente tipados para repositorios, servicios y DTOs. | `src/features/horarios/interfaces/**`, `src/features/horarios/dto/**` |
| `.agents/rules/idioma_español.md` | Código nuevo, clases, variables, funciones, constantes, comentarios y mensajes 100% en español con tildes y eñes exactas del RF. | Todos los archivos modificados y creados |
| `.agents/rules/restricciones_agy.md` | Cero `any`, cero `console.log`, cero `TODO`, cero `@ts-ignore`, cero `eslint-disable`; no se tocó BD real ni módulos fuera de alcance (`features.module.ts`, `carga-academica`, `secciones`). | Todos los archivos modificados y creados |
| `.agents/skills/conventional-commits/SKILL.md` | Formato convencional `tipo(scope): descripción` en español, scope `rf-008`, longitud ≤ 72 caracteres y footer de coautoría. | `TAREAS/T07_informe.md` |

---

## 3. Resultados de Verificación

### 3.1. Pruebas Unitarias del Módulo Horarios (`pnpm exec jest test/features/horarios`)
```text
PASS test/features/horarios/horarios-grilla-copia.service.spec.ts
PASS test/features/horarios/horarios.controller.spec.ts
PASS test/features/horarios/horarios-grilla-copia.controller.spec.ts
PASS test/features/horarios/horarios-consulta.service.spec.ts
PASS test/features/horarios/horarios.service.spec.ts

Test Suites: 5 passed, 5 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        8.752 s
Ran all test suites matching /test\/features\/horarios/i.
```
*(Exit code 0 — 100% pruebas de horarios T05, T06 y T07 pasando).*

### 3.2. Script Oficial de Verificación (`.agents/tools/verificar_tarea.sh T07 --suite-completa`)
```text
OK
```
*(Exit code 0 — Superó validaciones de tipado, linter y tests).*

### 3.3. Typecheck Global (`pnpm typecheck`)
```text
> sga-api@0.0.1 typecheck /home/heverlima/DEV_LINUX/Tesis/SGA-API
> tsc --noEmit

(Salida limpia sin errores, exit code 0)
```

### 3.4. Linter ESLint sobre Archivos del Feature (`pnpm exec eslint src/features/horarios test/features/horarios`)
```text
(Salida limpia sin errores ni advertencias, exit code 0)
```

### 3.5. Formateo Prettier (`pnpm exec prettier --check src/features/horarios/`)
```text
Checking formatting...
All matched files use Prettier code style!
```

### 3.6. Suite Completa del Proyecto (`pnpm test`)
```text
Test Suites: 33 passed, 33 total
Tests:       316 passed, 316 total
Snapshots:   0 total
Time:        18.429 s
Ran all test suites.
```
*(Exit code 0 — Cero regresiones en todo el repositorio).*

### 3.7. Inmutabilidad de Pruebas Copiadas (`cmp`)
```bash
cmp TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt test/features/horarios/horarios-consulta.service.spec.ts
(Salida limpia, exit code 0 — 0 diferencias).
```

### 3.8. Verificación de Literales de Negocio Prohibidos
```bash
grep -rnE "\b(45|2700)\b|matem|throw new Error|#[0-9A-Fa-f]{6}" src/features/horarios
```
Resultado: Únicamente ejemplos ilustrativos de Swagger en DTOs (los ejemplos de Swagger no cuentan). Cero literales de negocio o `throw new Error` en el código fuente.

### 3.9. Verificación de Patrones Prohibidos
```bash
grep -rnE "\bany\b|console\.log|TODO|eslint-disable" src/features/horarios
```
Resultado: Salida vacía (cero `any`, cero `console.log`, cero `TODO`, cero `eslint-disable`).

### 3.10. Estado de Git (`git status --porcelain`)
Solo archivos permitidos de la tarea:
```text
 M src/features/horarios/dto/index.ts
 M src/features/horarios/horarios.controller.ts
 M src/features/horarios/horarios.service.ts
 M src/features/horarios/interfaces/horarios.repository.interface.ts
 M src/features/horarios/repositories/horarios.repository.ts
?? src/features/horarios/dto/bloque-docente-response.dto.ts
?? src/features/horarios/dto/horario-estudiante-response.dto.ts
?? src/features/horarios/dto/mi-horario-response.dto.ts
?? test/features/horarios/horarios-consulta.service.spec.ts
```

---

## Commit propuesto

```text
feat(rf-008): consultas de horario de docente y estudiante

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```
