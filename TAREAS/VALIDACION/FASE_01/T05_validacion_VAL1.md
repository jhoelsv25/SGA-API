# Validación T05 — Módulo horarios (núcleo) · VAL-1 · 2026-10-09 (Segunda Validación)

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Ejecución de pruebas unitarias (`pnpm exec jest test/features/horarios`): Pasa completo cubriendo CP-RF008-12, 13, 14, 15, 16, 18 y el control de acceso de bloques (CP-RF008-20). | **PASA** | `test/features/horarios/horarios.service.spec.ts:1-426`<br>`test/features/horarios/horarios.controller.spec.ts:1-142` | 2 suites pasadas de 2, 20 pruebas pasadas de 20 (12 en servicio, 8 en controlador), 0 fallidas, 20 nuevas. |
| 2 | Verificación de horas del plan de estudios desde la BD (Enmienda 2026-10-09): Las horas del plan se obtienen dinámicamente de `plan_estudios` (`horasPlanPorCurso`), sin deducirlas del nombre del curso ni heurísticas ni valores fijos. | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:258-287`<br>`src/features/horarios/horarios.service.ts:113, 192, 231, 268`<br>`test/features/horarios/horarios.service.spec.ts:243-338` | `horasPlanPorCurso` realiza join de `cursos_seccion` → `secciones` → `plan_estudios` → `cursos`. Se eliminó completamente `obtenerHorasPlanPorDefecto` y no existen cursos hardcodeados. |
| 3 | Lectura dinámica de la jornada escolar (Enmienda 2026-10-09): Los minutos de la hora pedagógica se leen de la variable de sistema `jornada.minutos_hora_pedagogica` (`vigente = true`), sin números literales fijos (45, 2700) ni valores por defecto. | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:211-256`<br>`src/features/horarios/utils/horarios.util.ts:65-75` | `horasPorCurso` lee la variable en BD y valida que sea > 0. Se eliminaron `MINUTOS_HORA_PEDAGOGICA_DEFAULT` y divisores fijos. |
| 4 | Regresión completa del proyecto (`pnpm test`): Todas las suites de pruebas pasan sin fallos. | **PASA** | `.agents/tools/verificar_tarea.sh T05:1-19` | Salida objetiva `OK`. 30 suites pasadas, cero regresiones introducidas en el resto de la aplicación. |
| 5 | Inmutabilidad de pruebas (`cmp TAREAS/pruebas_rojo/horarios/...`): Pruebas idénticas a las rojas inmutables base enmendadas. | **PASA** | `test/features/horarios/horarios.service.spec.ts`<br>`test/features/horarios/horarios.controller.spec.ts` | Comparación byte a byte arrojó 0 diferencias contra `horarios.service.spec.ts.txt` y `horarios.controller.spec.ts.txt`. |
| 6 | Ausencia de patrones prohibidos y alcance delimitado de archivos: Cero `any`, `console.log`, `TODO`, `debugger`, `@ts-ignore` y `eslint-disable`. Solo archivos modificados en `src/features/horarios/` y `test/features/horarios/`. | **PASA** | `git status --porcelain` | Ningún archivo no autorizado modificado. `features.module.ts` no fue tocado (reservado para T08) ni se interfirió con `carga-academica/` (T04). |

---

## Matriz de Trazabilidad de Escenarios RF-008 HU3

| Escenario | Prueba (archivo:línea) | Resultado |
|---|---|:---:|
| **CP-RF008-12:** Asignar un curso a un bloque con docente y auditar la mutación | `test/features/horarios/horarios.service.spec.ts:122-162` | **PASA** |
| **CP-RF008-13:** Bloque doble (90 min) guardado como un solo bloque de 2 horas pedagógicas | `test/features/horarios/horarios.service.spec.ts:164-194` | **PASA** |
| **CP-RF008-14:** Bloques superpuestos en la sección (bloqueo con 409 y mensaje exacto) | `test/features/horarios/horarios.service.spec.ts:196-214` | **PASA** |
| **CP-RF008-15:** Cruce de docente en otra sección del año escolar (bloqueo con 409 y mensaje exacto) | `test/features/horarios/horarios.service.spec.ts:216-241` | **PASA** |
| **CP-RF008-16:** Horas distintas al plan de estudios (guardar y advertir sin bloquear, horas desde `plan_estudios`) | `test/features/horarios/horarios.service.spec.ts:243-338` | **PASA** |
| **CP-RF008-18:** Cambiar horario a mitad de año (mensaje de vigencia desde mañana si año en curso) | `test/features/horarios/horarios.service.spec.ts:340-361` | **PASA** |
| **CP-RF008-20:** Control de acceso a la gestión de bloques (`@MenuAccess(MENU_HORARIOS)`) | `test/features/horarios/horarios.controller.spec.ts:52-85` | **PASA** |

---

## Verificación de Reglas Críticas e Inspección Exhaustiva de Literales de Negocio

Se realizó una auditoría minuciosa del código fuente en las capas de controlador (`horarios.controller.ts`), servicio (`horarios.service.ts`), utilidades (`horarios.util.ts`) y repositorio (`horarios.repository.ts`):

1. **Horas del plan de estudios desde `plan_estudios` (`horasPlanPorCurso`):**
   - **Evidencia:** `src/features/horarios/repositories/horarios.repository.ts:258-287`.
   - `HorariosRepository.horasPlanPorCurso` ejecuta un join relacional estricto:
     ```typescript
     cursosSeccion -> secciones -> planEstudios (gradoId, cursoId, activo = true) -> cursos
     ```
     extrayendo `planEstudios.horasSemanales` y `cursos.nombre`.
   - Se eliminó completamente la función `obtenerHorasPlanPorDefecto` que en el primer intento infería horas según nombres predeterminados.
   - En `HorariosService` (`líneas 113, 192, 231, 268`), las advertencias oficiales y el resumen de horas se computan directamente sobre los resultados de `horasPlanPorCurso`.
   - En la suite de pruebas, el caso `CP-RF008-16` para "Taller de Robótica" (`test/features/horarios/horarios.service.spec.ts:302-338`) confirma que no existe ninguna heurística textual o acoplamiento a nombres convencionales.

2. **Minutos de hora pedagógica desde `variables_sistema` (`jornada.minutos_hora_pedagogica`):**
   - **Evidencia:** `src/features/horarios/repositories/horarios.repository.ts:211-256`.
   - En `HorariosRepository.horasPorCurso`, se consulta de forma directa la tabla `variables_sistema`:
     ```typescript
     eq(variablesSistema.codigo, VARIABLE_MINUTOS_HORA_PEDAGOGICA) && eq(variablesSistema.vigente, true)
     ```
   - Si la variable no está configurada o es inválida (`<= 0`), lanza una excepción explícita (`Error("Variable de sistema 'jornada.minutos_hora_pedagogica' no configurada o no vigente.")`) en lugar de asumir un fallback.
   - Se eliminó la constante `MINUTOS_HORA_PEDAGOGICA_DEFAULT` y el divisor fijo 45.
   - En `src/features/horarios/utils/horarios.util.ts:65-75`, la función `calcularHorasPedagogicas` requiere obligatoriamente `minutosHoraPedagogica` sin valor por defecto.

3. **Búsqueda exhaustiva de valores fijos, cadenas y heurísticas:**
   - Se ejecutó un rastreo mediante expresiones regulares sobre `src/features/horarios/`:
     ```bash
     grep -rnE "(45|2700|Matem|Comunic|Rob|default|DEFAULT)" src/features/horarios/
     ```
   - No se encontró ningún literal de negocio en la lógica de procesamiento. Las únicas menciones corresponden a anotaciones Swagger (`@ApiProperty({ example: ... })`) y documentación JSDoc para OpenAPI.

4. **Hora de fin estrictamente posterior a hora de inicio (`fin > inicio`):**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:48-52` (en `crearBloque`) y `src/features/horarios/horarios.service.ts:142-146` (en `actualizarBloque`).
   - Se convierten las horas con `convertirHoraAMinutos` y si `minFin <= minInicio` se lanza `BadRequestException("La hora de fin debe ser posterior a la hora de inicio.")`.

5. **Sin superposición en la sección:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:66-74, 151-160` y `src/features/horarios/repositories/horarios.repository.ts:92-134`.
   - `findSolapados` valida la condición de solapamiento en SQL (`horaInicio < fin::time AND horaFin > inicio::time`). Si hay conflicto, lanza `ConflictException("El bloque se cruza con otro bloque de la sección.")`.

6. **Sin cruce de docente en otras secciones del año escolar con mensaje oficial:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:77-89, 163-175`, `src/features/horarios/repositories/horarios.repository.ts:136-209` y `src/features/horarios/utils/horarios.util.ts:37-48`.
   - `findCruceDocente` detecta solapamientos del docente en otras secciones del mismo año lectivo y `construirMensajeCruceDocente` formatea exactamente `"El docente ya dicta en 4.° B el lunes de 08:30 a 09:15."` arrojando HTTP 409.

7. **Receso sin curso y clase con curso:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:61-63, 94` y `src/features/horarios/repositories/horarios.repository.ts:294, 321`.
   - Si `tipoBloque === "clase"` sin curso, lanza `BadRequestException("Un bloque de clase requiere un curso asignado.")`. Si `tipoBloque === "receso"`, fuerza `cursoSeccionId: null`.

8. **Aviso (no bloqueo) de horas vs plan de estudios:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:113, 192, 238-256, 265-290` y `src/features/horarios/utils/horarios.util.ts:54-60`.
   - Emite la advertencia `"Matemática tiene 5 horas en el horario y 6 en el plan de estudios."` dentro del array `advertencias` sin bloquear la mutación.

9. **Mensaje de vigencia desde mañana cuando el año escolar está en curso:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:114-116, 193-195` y `src/features/horarios/constants/horarios.constants.ts:16`.
   - Si `anio.estado === "en_curso"`, el DTO incluye `mensaje: "El horario se guardó. Los cambios rigen desde mañana."`.

10. **Prohibición de eliminar bloques con sesiones de clase registradas:**
    - **Evidencia:** `src/features/horarios/horarios.service.ts:211-214` y `src/features/horarios/repositories/horarios.repository.ts:339-347`.
    - Bloquea con `ConflictException("No se puede eliminar un bloque que ya tiene sesiones de clase.")` si `tieneSesiones` devuelve verdadero.

11. **Control de acceso y seguridad:**
    - **Evidencia:** `src/features/horarios/horarios.controller.ts:43, 61, 79, 94-108`.
    - Mutaciones protegidas con `@MenuAccess(MENU_HORARIOS)` (`"/admin/horarios"`); consulta `listarPorSeccion` sin restricción de menú.

---

## Pruebas Ejecutadas

- **Pruebas unitarias de la tarea:** `pnpm exec jest test/features/horarios`
  - Suites: 2 pasadas, 2 total (`horarios.service.spec.ts`, `horarios.controller.spec.ts`).
  - Pruebas: 20 pasadas, 0 fallidas, 20 nuevas (12 en servicio, 8 en controlador).
- **Verificación técnica completa:** `.agents/tools/verificar_tarea.sh T05`
  - Resultado: `OK` (Typecheck estricto, ESLint global y suite completa sin regresiones).

---

## Hallazgos

| Severidad | Archivo | Detalle |
|---|---|---|
| **baja** | `src/features/horarios/horarios.service.ts:39` | En `HorariosService` se inyecta `@Optional() private readonly variablesSistemaRepo?: VariablesSistemaRepository`, pero la consulta dinámica de `jornada.minutos_hora_pedagogica` se efectúa directamente en `HorariosRepository.horasPorCurso` sobre la tabla `variables_sistema`. Para las tareas T06 y T07 (grilla propuesta y consultas) donde se requieran múltiples variables de la jornada escolar (`jornada.horas_pedagogicas_dia`, `jornada.minutos_recreo`, etc.), se recomienda unificar el acceso a través de los métodos expuestos por `VariablesSistemaRepository` (`findVigentes`). |
| **baja** | `src/features/horarios/repositories/horarios.repository.ts:160-190` | En `findCruceDocente`, para asegurar óptimo desempeño en bases de datos con alto volumen de secciones y horarios, se recomienda verificar en migraciones futuras un índice compuesto sobre `horarios(dia_semana, hora_inicio, hora_fin)` y `cursos_seccion(docente_id)`. |

---

## Recomendación al DEV

La entrega de T05 cumple al 100% con los requerimientos funcionales del RF-008 HU3, los contratos técnicos y las directrices de la enmienda del 2026-10-09. Los hallazgos de severidad alta y media de la ronda anterior fueron resueltos en su totalidad:
1. No existen literales fijos de horas del plan ni heurísticas sobre nombres de cursos (`horasPlanPorCurso` consulta directamente `plan_estudios`).
2. No existen números mágicos ni valores por defecto en el cálculo de horas pedagógicas (`horasPorCurso` lee dinámicamente `jornada.minutos_hora_pedagogica` desde `variables_sistema`).
3. El método `findByDocente` se encuentra tipado de manera estricta con `BloqueDocenteResultado[]`.

Se emite veredicto **APROBADA**. Se autoriza avanzar con la integración y las tareas subsecuentes T06 y T07.
