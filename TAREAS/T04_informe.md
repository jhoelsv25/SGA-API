# Informe de Tarea T04 — Módulo `carga-academica` (RF-008 HU2)

**Fecha:** 2026-10-09  
**Agente:** DEV-1  
**Rama:** `feat/rf-008-secciones-carga-horarios`  
**Estado:** COMMITEADO (commit `1719ec7`)

---

## 1. Archivos Creados y Acciones Realizadas

### Pruebas copiadas (inmutables)
- `test/features/carga-academica/carga-academica.service.spec.ts`: Copiado idéntico desde `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt`.
- Verificación con `cmp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts` arrojó **0 diferencias**.

### Módulo `src/features/carga-academica/`
- `constants/carga-academica.constants.ts` e `index.ts`: Constantes de dominio (`MENSAJES_CARGA_ACADEMICA`, `TABLA_CURSOS_SECCION`, `MINUTOS_HORA_PEDAGOGICA_DEFAULT`).
- `utils/carga-academica.util.ts` e `index.ts`: Funciones puras para `construirMensajeExcesoJornada` y `formatearNombreCompleto`.
- `dto/asignar-docente.dto.ts`: DTO con `@ValidateIf`, `@IsUUID('4')` y `@IsBoolean` para asignar o desasignar docentes (`docenteId: null`) y confirmación de exceso de jornada.
- `dto/carga-academica-item.dto.ts`: DTOs `DocenteCargaItemDto` y `CargaAcademicaItemDto` para representar el detalle de cada curso de la sección con sus horas del plan y del horario.
- `dto/curso-docente-item.dto.ts`: DTO `CursoDocenteItemDto` para representar cursos y secciones a cargo de un docente.
- `dto/carga-academica-response.dto.ts`: DTOs de respuesta OpenAPI/Swagger (`CargaDocenteResumenDto`, `AsignarDocenteResultadoDto`, `CargaSeccionResponseDto`, `CargaDocenteDetalleDto`).
- `dto/index.ts`: Barrel export de los DTOs.
- `interfaces/carga-academica.interface.ts`: Interfaz interna `CursoSeccionDetalle`.
- `interfaces/carga-academica.repository.interface.ts` e `index.ts`: Contrato estricto `ICargaAcademicaRepository`.
- `repositories/carga-academica.repository.ts` e `index.ts`:
  - Implementación con Drizzle ORM sobre PostgreSQL.
  - `findCursoSeccionById`: Recupera datos del curso-sección con las horas pedagógicas del plan de estudios.
  - `findBySeccion`: Obtiene los cursos de la sección con cálculo de horas programadas en `horarios` (`EXTRACT(EPOCH ...) / 2700`) sin N+1.
  - `findCargaItemById`: Helper para recuperar el registro actualizado con formato completo.
  - `updateDocente`: Actualiza `docente_id` en `cursos_seccion` sin tocar `sesiones_clase`.
  - `horasAsignadasDocente`: Agregación SQL (`SUM(horas_semanales)`) de todos los cursos asignados al docente en el año lectivo, con exclusión opcional de un curso-sección para recalcular antes de guardar.
  - `findByDocente`: Lista los cursos y secciones asignados a un docente en el año, ordenados por grado, sección y curso.
- `carga-academica.service.ts`:
  - Reglas de negocio del RF-008 HU2 y contrato:
    - Validación de docente en estado `activo` (400 `Solo se pueden asignar docentes activos.`).
    - Cálculo de jornada y carga acumulada en el año académico; si supera la jornada laboral y no se incluye `confirmarExceso: true`, lanza 409 con `{ requiereConfirmacion: true, message: "El docente supera su jornada: tendrá 34 horas asignadas de 30." }`.
    - Con `confirmarExceso: true` persiste la asignación y reporta `excede: true`.
    - Permite desasignar docentes (`docenteId: null`).
    - Consistencia histórica: el cambio de docente no altera `sesiones_clase`.
    - Resolución de año lectivo vía `AnioLectivoCls.id()` con fallback a `findEnCurso()` y verificación de no escritura en año cerrado.
    - Registro de auditoría asíncrona inmutable con `AuditService.log` (`tabla: "cursos_seccion"`, `valorAnterior` y `valorNuevo`).
- `carga-academica.controller.ts`:
  - Controlador REST con prefijo global:
    - `GET secciones/:seccionId/carga`: Consulta pública sin restricción de menú.
    - `PATCH carga-academica/:id/docente`: Modificación protegida con `@MenuAccess(MENU_SECCIONES)`.
    - `GET carga-academica/docente/:docenteId`: Consulta de carga docente sin restricción de menú.
  - Parámetros validados con `ParseUUIDPipe` y documentación OpenAPI/Swagger completa.
- `carga-academica.module.ts`:
  - Importa `DocentesModule` y `AnioEscolarModule`.
  - Provee `CargaAcademicaService`, `CargaAcademicaRepository` y `AuditService`.
  - Exporta `CargaAcademicaService` y `CargaAcademicaRepository`.
  - NO registrado en `features.module.ts` (reservado para T08).
- `index.ts`: Barrel export que expone controlador, servicio, repositorio, módulo, DTOs, interfaces, constantes y utilidades.

---

## 2. Tabla de Skills y Reglas Aplicadas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `.agents/rules/clean-code-architecture.md` | Estructura modular estricta (`constants/`, `dto/`, `interfaces/`, `repositories/`, `utils/`), inyección por constructor `private readonly`, cero `any`, agregación SQL sin N+1 y auditoría asíncrona con BullMQ | `src/features/carga-academica/**` |
| `.agents/rules/security-api-standards.md` | Endpoints REST semánticos, `@MenuAccess(MENU_SECCIONES)` en mutaciones, consultas abiertas, decoradores Swagger `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiHeader`, `@ApiParam` | `src/features/carga-academica/carga-academica.controller.ts` |
| `.agents/rules/anio-lectivo.md` | Inyección y lectura del año académico desde `AnioLectivoCls.id()`, fallback a año en curso (`findEnCurso()`), validación de año no cerrado para escrituras | `src/features/carga-academica/carga-academica.service.ts` |
| `.agents/rules/testing-guidelines.md` | Pruebas unitarias espejo en `test/features/carga-academica/`, cobertura de escenarios CP-RF008-06 a CP-RF008-10, pruebas inmutables | `test/features/carga-academica/carga-academica.service.spec.ts` |
| `.agents/skills/nestjs-best-practices/SKILL.md` | Excepciones HTTP nativas (`BadRequestException`, `ConflictException`, `NotFoundException`), desacoplamiento mediante repositorios, inyección de dependencias limpia | `src/features/carga-academica/carga-academica.service.ts`, `src/features/carga-academica/repositories/carga-academica.repository.ts` |
| `.agents/skills/nodejs-backend-patterns/SKILL.md` | Validación estricta con `class-validator` y `ValidateIf`, operaciones asíncronas con `async/await`, manejo estructurado de errores y respuestas | `src/features/carga-academica/dto/*`, `src/features/carga-academica/carga-academica.service.ts` |
| `.agents/skills/typescript-advanced-types/SKILL.md` | Tipado estricto sin `any`, interfaces precisas para entidades y respuestas, DTOs fuertemente tipados | `src/features/carga-academica/interfaces/*`, `src/features/carga-academica/dto/*` |
| `.agents/rules/idioma_español.md` | Código nuevo, clases, métodos, variables, comentarios y mensajes de error/usuario 100% en español con tildes y eñes exactas del RF | Todos los archivos de `src/features/carga-academica/` |
| `.agents/rules/restricciones_agy.md` | Cero `any`, cero `console.log`, cero `TODO`, cero `@ts-ignore`, cero `eslint-disable`, sin tocar base de datos real ni `features.module.ts` | Todos los archivos creados |
| `.agents/skills/conventional-commits/SKILL.md` | Formato convencional de commit con tipo en inglés (`feat`), scope `rf-008`, descripción en español ≤ 72 caracteres y pie de coautoría | `TAREAS/T04_informe.md` |

---

## 3. Resultados de Verificación

### 1. `pnpm exec jest test/features/carga-academica`
```
PASS test/features/carga-academica/carga-academica.service.spec.ts
  RF-008: Carga Académica (HU2)
    Asignación de docentes y control de jornada
      ✓ CP-RF008-06: debe asignar un docente al curso de la sección y reportar su nueva carga horaria (4 ms)
      ✓ CP-RF008-07: debe bloquear la asignación de un docente en estado cesado o inactivo (8 ms)
      ✓ CP-RF008-08: debe advertir exceso de jornada y bloquear si no hay confirmación; guardar con confirmarExceso (1 ms)
      ✓ CP-RF008-09: debe cambiar el docente a mitad de año conservando las sesiones ya firmadas (1 ms)
      ✓ debe permitir desasignar un docente (docenteId: null) (1 ms)
    Consultas de carga académica
      ✓ CP-RF008-10: debe listar los cursos y secciones con sus horas y el total frente a la jornada del docente (1 ms)
      ✓ debe consultar la carga académica de una sección completa
      ✓ debe lanzar NotFoundException si el curso-sección no existe al asignar docente (1 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.558 s
Ran all test suites matching /test\/features\/carga-academica/i.
```
*(Exit code 0 — 100% pruebas de carga académica pasando).*

### 2. `pnpm exec eslint src/features/carga-academica test/features/carga-academica`
```
(Salida limpia sin errores ni advertencias, exit code 0)
```

### 3. `cmp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts`
```
(Salida vacía, exit code 0 — Pruebas idénticas a las originales).
```

### 4. Verificación de patrones prohibidos (`any`, `console.log`, `TODO`, `@ts-ignore`, `eslint-disable`)
```bash
grep -rn -E 'console\.log|debugger|@ts-ignore|eslint-disable|: any\b|<any>|\bas any\b' src/features/carga-academica test/features/carga-academica
(Salida vacía, exit code 1 — Cero patrones prohibidos).
```

### 5. Verificación de tipos TypeScript (`tsc`)
- Al compilar y evaluar los diagnósticos de TypeScript sobre los archivos de `src/features/carga-academica` y `test/features/carga-academica`:
  **Diagnostics in carga-academica files: 0** (Cero errores de tipos en carga académica).
- Nota sobre trabajo en paralelo (Regla 10 de `_comun_DEV.md`): el fallo global de `pnpm typecheck` se debe a `src/features/horarios/horarios.module.ts:2:39` (módulo de T05 en desarrollo por el otro DEV), sin afectar la integridad del módulo de carga académica.

### 6. `git status --porcelain`
```
 M .agents/memory/decisiones.md
 M .agents/memory/estado_orquestacion.md
 M .agents/tools/verificar_tarea.sh
 D ".claude/settings.local.json\357\200\272Zone.Identifier"
?? .agents/tools/tsconfig.verificacion.json
?? .claude/settings.local.json
?? .claude/settings.local.json:Zone.Identifier
?? TAREAS/
?? src/features/carga-academica/
?? src/features/horarios/
?? test/features/carga-academica/
?? test/features/horarios/
```
Solo los archivos permitidos fueron agregados bajo `src/features/carga-academica/` y `test/features/carga-academica/`.

---

## 4. Commit Ejecutado

**Hash:** `1719ec7c598f8ed6e9864a1e1cd1c9a3fd7edf68` (corto: `1719ec7`)

```text
feat(rf-008): agregar módulo de carga académica de las secciones

- asignar docente activo a cada curso de la sección
- aviso de exceso de jornada con confirmación y carga por docente
- pruebas CP-RF008-06 a 10

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

