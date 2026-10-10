# Informe de Tarea T05 — Núcleo de Horarios (RF-008 HU3) — Reintento 1

## 1. Archivos cambiados y qué se hizo

### Corrección de Hallazgos de Auditoría (Enmienda 2026-10-09):
1. **Horas del Plan desde `plan_estudios`**: Se eliminó `obtenerHorasPlanPorDefecto` y cualquier valor por defecto hardcodeado ('Matemática', 6). Se implementó `horasPlanPorCurso(seccionId)` en `HorariosRepository` uniendo `cursos_seccion` → `secciones.grado_id` → `plan_estudios` (y `cursos` para el nombre). En `HorariosService` las advertencias y el resumen de horas se obtienen estrictamente de `horasPlanPorCurso`, sin inventar datos si un curso no tiene plan.
2. **Lectura dinámica de la jornada escolar**: Se eliminó el divisor fijo 45 y la constante `MINUTOS_HORA_PEDAGOGICA_DEFAULT`. `HorariosRepository.horasPorCurso` consulta la variable `jornada.minutos_hora_pedagogica` desde la tabla `variables_sistema` (`vigente = true`). Si no está configurada, lanza una excepción clara indicando que la variable no existe o no está vigente.
3. **Tipado estricto**: Se tipó `findByDocente` en `HorariosRepository` e `IHorariosRepository` con `BloqueDocenteResultado[]` en lugar de `unknown[]`.

### Archivos de Pruebas:
- `test/features/horarios/horarios.service.spec.ts`: Copiado desde `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt` con las pruebas enmendadas (validación estricta de llamadas a `horasPlanPorCurso` y cursos no convencionales como "Taller de Robótica").
- `test/features/horarios/horarios.controller.spec.ts`: Pruebas de seguridad `@MenuAccess` y delegación (sin cambios).

### Archivos de Implementación (`src/features/horarios/**`):
- `src/features/horarios/constants/horarios.constants.ts`: Constantes de dominio, clave de variable `VARIABLE_MINUTOS_HORA_PEDAGOGICA` y mensajes oficiales del RF-008. Sin constantes fijas de minutos de jornada.
- `src/features/horarios/constants/index.ts`: Barrel export de constantes.
- `src/features/horarios/utils/horarios.util.ts`: Utilidades puras para normalización de horas, cálculo de horas pedagógicas con minutos pasados obligatoriamente por parámetro (sin default), y generación de mensajes de cruce y advertencias.
- `src/features/horarios/utils/index.ts`: Barrel export de utilidades.
- `src/features/horarios/dto/create-bloque-horario.dto.ts`: DTO con validaciones estrictas (HH:mm, día 1..5, tipoBloque clase/receso).
- `src/features/horarios/dto/update-bloque-horario.dto.ts`: DTO para actualización parcial de bloques.
- `src/features/horarios/dto/bloque-horario-response.dto.ts`: DTO de respuesta de bloque individual.
- `src/features/horarios/dto/resumen-horas-curso.dto.ts`: DTO de comparativa de horas vs plan.
- `src/features/horarios/dto/bloque-mutacion-response.dto.ts`: DTO de respuesta para mutaciones (bloque, advertencias y mensaje).
- `src/features/horarios/dto/listar-por-seccion-response.dto.ts`: DTO de respuesta para listar por sección.
- `src/features/horarios/dto/index.ts`: Barrel export de DTOs.
- `src/features/horarios/interfaces/horarios.repository.interface.ts`: Contrato `IHorariosRepository` ampliado con `horasPlanPorCurso(seccionId)` y `findByDocente` tipado con `BloqueDocenteResultado[]`.
- `src/features/horarios/interfaces/index.ts`: Barrel export de interfaces.
- `src/features/horarios/repositories/horarios.repository.ts`: Repositorio Drizzle ORM con `horasPlanPorCurso` (join `cursosSeccion` → `secciones` → `planEstudios` → `cursos`) y `horasPorCurso` leyendo `variablesSistema`.
- `src/features/horarios/repositories/index.ts`: Barrel export de repositorios.
- `src/features/horarios/horarios.service.ts`: Servicio con reglas de negocio del RF-008 HU3 alimentado con `horasPlanPorCurso`, validaciones de superposición, cruce de docente, vigencia al día siguiente y auditoría inmutable.
- `src/features/horarios/horarios.controller.ts`: Controlador REST con `@MenuAccess(MENU_HORARIOS)` y OpenAPI.
- `src/features/horarios/horarios.module.ts`: Módulo NestJS exportando servicio y repositorio.
- `src/features/horarios/index.ts`: Barrel export del módulo.

---

## 2. Cumplimiento de Skills y Reglas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `clean-code-architecture.md` | Estructura modular estricta; inyección por constructor; cero `any` y tipado estricto; auditoría asíncrona de mutaciones (`AuditService.log`); horas del plan extraídas de `plan_estudios` sin inventar datos de negocio; minutos de jornada leídos de `variables_sistema`. | `src/features/horarios/**` |
| `security-api-standards.md` | Decorador `@MenuAccess(MENU_HORARIOS)` en mutaciones y ruta libre en consulta; documentación OpenAPI completa (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiHeader`); validación de entrada con DTOs y `ParseUUIDPipe`. | `src/features/horarios/horarios.controller.ts`, `src/features/horarios/dto/**` |
| `anio-lectivo.md` | Inyección y lectura del año académico mediante `AnioLectivoCls.id()`, bloqueo de mutaciones en año cerrado, y mensaje oficial de vigencia desde mañana cuando el año está en curso. | `src/features/horarios/horarios.service.ts` |
| `testing-guidelines.md` | Pruebas unitarias de aislamiento en `test/features/horarios/` sin modificaciones sobre las pruebas base enmendadas; verificación de que `horasPlanPorCurso` es consultado; cobertura de todos los escenarios BDD de HU3. | `test/features/horarios/horarios.service.spec.ts`, `test/features/horarios/horarios.controller.spec.ts` |
| `nestjs-best-practices` | Responsabilidad única (SRP), abstracción de la persistencia mediante `IHorariosRepository` implementado en `HorariosRepository`; modularidad limpia y exportación para futuras fases (T06, T07). | `src/features/horarios/horarios.service.ts`, `src/features/horarios/repositories/horarios.repository.ts`, `src/features/horarios/horarios.module.ts` |
| `nodejs-backend-patterns` | Excepciones HTTP nativas de NestJS (`BadRequestException`, `ConflictException`, `NotFoundException`); funciones puras para parsing y validación de horas. | `src/features/horarios/horarios.service.ts`, `src/features/horarios/utils/horarios.util.ts` |
| `typescript-advanced-types` | Tipado estricto sin `any` ni `@ts-ignore`; tipos unión para bloques (`tipoBloque: 'clase' \| 'receso'`); `findByDocente` tipado con interfaz `BloqueDocenteResultado[]`. | `src/features/horarios/interfaces/horarios.repository.interface.ts`, `src/features/horarios/repositories/horarios.repository.ts` |
| `conventional-commits` | Formato convencional `tipo(scope): descripción` en español, scope `rf-008`, longitud ≤ 72 caracteres, y atribución de coautoría. | `TAREAS/T05_informe.md` |

---

## 3. Salida de Comandos de Verificación

### 3.1. Pruebas Unitarias del Módulo Horarios (`pnpm exec jest test/features/horarios`)
```text
PASS test/features/horarios/horarios.controller.spec.ts
PASS test/features/horarios/horarios.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        4.172 s
Ran all test suites matching /test\/features\/horarios/i.
```

### 3.2. Linter ESLint (`pnpm exec eslint src/features/horarios test/features/horarios`)
```text
(0 errores, 0 warnings)
```

### 3.3. Typecheck (`pnpm typecheck`)
```text
> sga-api@0.0.1 typecheck /home/heverlima/DEV_LINUX/Tesis/SGA-API
> tsc --noEmit
(0 errores)
```

### 3.4. Script de Verificación Objetiva (`.agents/tools/verificar_tarea.sh T05 --suite-completa`)
```text
OK
```
(Pasó `tsc` de verificación, `eslint src test`, `pnpm test` de toda la suite del proyecto, `pnpm build` de producción y validación de patrones prohibidos).

---

## 4. Estado de Git y Reglas de Entrega

- No se ejecutó `git commit` ni `git push` (a la espera del mensaje «CONFIRMADO» de Claude).
- No se modificó `src/features/carga-academica/` ni `src/features/features.module.ts`.
- No se modificaron las pruebas base en `test/features/horarios/`.
- Cero `any`, cero `console.log`, cero `TODO`, cero `eslint-disable`.

---

## Commit propuesto

```text
feat(rf-008): implementar nucleo de bloques y reglas de horarios

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```
