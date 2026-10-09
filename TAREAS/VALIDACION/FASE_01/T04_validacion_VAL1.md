# Validación T04 — Módulo carga-academica · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Ejecución de pruebas unitarias (`pnpm exec jest test/features/carga-academica`): Todas las pruebas pasan sin fallos (CP-RF008-06 a 10). | **PASA** | `test/features/carga-academica/carga-academica.service.spec.ts:1-356` | 1 suite pasada, 8 pruebas pasadas (5 escenarios Gherkin directos + 3 pruebas funcionales de borde y consulta), 0 fallidas. Cobertura completa de HU2. |
| 2 | Verificación estricta de tipos y estilo (`tsc` y `eslint`): Sin errores de tipo ni infracciones de linter en archivos de la tarea. | **PASA** | `src/features/carga-academica/**`<br>`test/features/carga-academica/**` | `pnpm exec tsc --noEmit` y `pnpm exec eslint src/features/carga-academica test/features/carga-academica` finalizan con código de salida 0. Tipado 100% estricto sin `any`. |
| 3 | Regresión completa del proyecto (`pnpm test`): Todas las suites de pruebas pasan. | **PASA** | `TAREAS/VALIDACION/verificar_T04.log:1-43` | 30 suites pasadas de 30, 298 pruebas pasadas de 298. Cero regresiones introducidas en el backend. |
| 4 | Inmutabilidad de pruebas (`cmp TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt test/features/carga-academica/carga-academica.service.spec.ts`): Pruebas idénticas a las rojas. | **PASA** | `test/features/carga-academica/carga-academica.service.spec.ts` | La comparación byte a byte contra la plantilla inmutable original de pruebas rojas arrojó 0 diferencias (código de salida 0). |
| 5 | Ausencia de patrones prohibidos: Cero `any`, `console.log`, `TODO`, `debugger`, `@ts-ignore` y `eslint-disable`. | **PASA** | `src/features/carga-academica/**`<br>`test/features/carga-academica/**` | Búsqueda exhaustiva por expresiones regulares arrojó 0 coincidencias. Se utilizan interfaces y DTOs fuertemente tipados. |
| 6 | Alcance delimitado de archivos: Solo archivos permitidos bajo `src/features/carga-academica/` y `test/features/carga-academica/`. | **PASA** | `git status --porcelain` | Ningún archivo no autorizado modificado o creado. `features.module.ts` no fue tocado (reservado para T08) ni se interfirió con `horarios/` (T05). |

---

## Matriz de Trazabilidad de Escenarios RF-008 HU2

| Escenario | Prueba (archivo:línea) | Resultado | Implementación en Código (archivo:línea) |
|---|---|:---:|---|
| **CP-RF008-06:** Asignar un docente al curso de la sección y reportar su nueva carga horaria | `test/features/carga-academica/carga-academica.service.spec.ts:195-224` | **PASA** | `src/features/carga-academica/carga-academica.service.ts:31-85`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:177-191` |
| **CP-RF008-07:** Bloquear asignación de docente cesado o inactivo (400 con mensaje exacto) | `test/features/carga-academica/carga-academica.service.spec.ts:226-238` | **PASA** | `src/features/carga-academica/carga-academica.service.ts:45-48`<br>`src/features/carga-academica/constants/carga-academica.constants.ts:5` |
| **CP-RF008-08:** Advertir exceso de jornada (409 con `requiereConfirmacion: true` y mensaje exacto); guardar con `confirmarExceso: true` | `test/features/carga-academica/carga-academica.service.spec.ts:240-270` | **PASA** | `src/features/carga-academica/carga-academica.service.ts:50-65`<br>`src/features/carga-academica/utils/carga-academica.util.ts:5-7` |
| **CP-RF008-09:** Cambiar el docente a mitad de año conservando las sesiones ya firmadas | `test/features/carga-academica/carga-academica.service.spec.ts:272-291` | **PASA** | `src/features/carga-academica/repositories/carga-academica.repository.ts:177-191` |
| **CP-RF008-10:** Listar cursos y secciones con horas y total frente a la jornada del docente | `test/features/carga-academica/carga-academica.service.spec.ts:312-338` | **PASA** | `src/features/carga-academica/carga-academica.service.ts:118-136`<br>`src/features/carga-academica/repositories/carga-academica.repository.ts:226-264` |

---

## Verificación de Reglas Críticas (Implementación Real vs Mocks)

Se auditó minuciosamente el código fuente real en las capas de repositorio (`carga-academica.repository.ts`), servicio (`carga-academica.service.ts`) y controlador (`carga-academica.controller.ts`), comprobando que la lógica de negocio opera directamente sobre la base de datos y modelos del sistema:

1. **Solo docentes activos:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.service.ts:45-48`.
   - **Evidencia:** Recupera el registro del docente con `this.docentesRepo.findById(dto.docenteId)` y evalúa taxativamente:
     ```typescript
     if (!docente || docente.estado !== "activo") {
       throw new BadRequestException(MENSAJES_CARGA_ACADEMICA.DOCENTE_INACTIVO);
     }
     ```
   - El mensaje lanzado es el constante `"Solo se pueden asignar docentes activos."`, bloqueando cualquier docente `cesado` o inexistente con HTTP 400.

2. **Carga horaria calculada a partir de las horas del plan de estudios en el año lectivo:**
   - **Ubicación:** `src/features/carga-academica/repositories/carga-academica.repository.ts:193-224` y `src/features/carga-academica/carga-academica.service.ts:50-56`.
   - **Evidencia:** El método `horasAsignadasDocente(anioId, docenteId, exceptoCursoSeccionId)` realiza un `SUM(planEstudios.horasSemanales)` mediante `INNER JOIN` entre `cursosSeccion`, `secciones` y `planEstudios` filtrando por `secciones.anioAcademicoId = anioId`, `cursosSeccion.docenteId = docenteId` y `planEstudios.activo = true`.
   - En el servicio, suma `horasTotales = horasActuales + cursoSeccion.horasPlan`, donde `horasPlan` proviene de `planEstudios.horasSemanales` en `findCursoSeccionById` (`carga-academica.repository.ts:30`). No se depende de horas tentativas ni se producen consultas N+1.

3. **HTTP 409 con `requiereConfirmacion: true` y mensaje exacto ante exceso de jornada:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.service.ts:58-63` y `src/features/carga-academica/utils/carga-academica.util.ts:5-7`.
   - **Evidencia:** Si `horasTotales > docente.jornadaHoras` y `!dto.confirmarExceso`, lanza:
     ```typescript
     throw new ConflictException({
       message: construirMensajeExcesoJornada(horasTotales, docente.jornadaHoras),
       requiereConfirmacion: true,
     });
     ```
   - La función pura `construirMensajeExcesoJornada` genera: `"El docente supera su jornada: tendrá 34 horas asignadas de 30."`, idéntico a la especificación funcional del RF-008 HU2.

4. **Persistencia con `confirmarExceso: true`:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.service.ts:58, 65-84`.
   - **Evidencia:** Cuando el cliente envía `confirmarExceso: true`, el condicional `if (excede && !dto.confirmarExceso)` se evalúa como falso, permitiendo la ejecución de `this.cargaRepo.updateDocente(cursoSeccionId, dto.docenteId)` y retornando la estructura con `excede: true`, `horasAsignadas` y `jornadaHoras`.

5. **Cambiar docente no altera `sesiones_clase`:**
   - **Ubicación:** `src/features/carga-academica/repositories/carga-academica.repository.ts:177-191`.
   - **Evidencia:** El método `updateDocente` efectúa un `UPDATE` exclusivo sobre la tabla `cursos_seccion`:
     ```typescript
     await this.db
       .update(cursosSeccion)
       .set({
         docenteId,
         actualizadoEn: sql`CURRENT_TIMESTAMP`,
       })
       .where(eq(cursosSeccion.id, id));
     ```
     En ningún momento se interactúa con la tabla `sesiones_clase`. Las sesiones ya firmadas preservan su `docente_id` histórico conforme a la regla del RF-008.

6. **Control de acceso con `@MenuAccess(MENU_SECCIONES)` en la asignación:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.controller.ts:54-56`.
   - **Evidencia:**
     - La mutación `PATCH carga-academica/:id/docente` cuenta con `@MenuAccess(MENU_SECCIONES)`.
     - Las rutas de lectura (`GET secciones/:seccionId/carga` y `GET carga-academica/docente/:docenteId`) permanecen sin restricción de menú para permitir consultas transversales desde fichas y vistas de horario, en estricto cumplimiento del contrato.

7. **Auditoría asíncrona inmutable:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.service.ts:67-75, 90-98`.
   - **Evidencia:** Se invoca `this.auditService.log` registrando `accion: "actualizar"`, `tabla: "cursos_seccion"`, `registroId: cursoSeccionId`, `valorAnterior: { docenteId: cursoSeccion.docenteId }`, `valorNuevo: { docenteId: dto.docenteId }` e IP del cliente.

8. **Protección de año escolar cerrado:**
   - **Ubicación:** `src/features/carga-academica/carga-academica.service.ts:138-145`.
   - **Evidencia:** Se resuelve el año con `AnioLectivoCls.id()` y, si `anio.estado === "cerrado"`, se bloquea la escritura con `BadRequestException("No se pueden realizar cambios en un año escolar cerrado.")`.

---

## Pruebas Ejecutadas

- **Pruebas unitarias de la tarea:** `pnpm exec jest test/features/carga-academica`
  - Suites: 1 pasada, 1 total (`carga-academica.service.spec.ts`).
  - Pruebas: 8 pasadas, 0 fallidas, 8 nuevas.
- **Suite completa del proyecto:** `pnpm test`
  - Suites: 30 pasadas de 30.
  - Pruebas: 298 pasadas de 298 (cero regresiones).
- **Verificación de linters y tipos:**
  - `pnpm exec eslint src/features/carga-academica test/features/carga-academica`: 0 errores.
  - `pnpm exec tsc --noEmit`: 0 errores de compilación.

---

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/features/carga-academica/repositories/carga-academica.repository.ts:62, 124` | En la subconsulta SQL de `findBySeccion` y `findCargaItemById` para calcular las `horasHorario` programadas, se utiliza el divisor literal `2700` segundos (`EXTRACT(EPOCH FROM ...) / 2700`). Si bien coincide exactamente con la duración estándar de 45 minutos pedagógicos (`45 * 60 = 2700`), se recomienda vincular este cálculo con la constante `MINUTOS_HORA_PEDAGOGICA_DEFAULT` o parametrizarla para evitar números mágicos en el SQL. |
| **baja** | `src/features/carga-academica/carga-academica.service.ts:103-105` | Al desasignar un docente (`docenteId: null`), el método retorna `cargaDocente: { horasAsignadas: 0, jornadaHoras: 0, excede: false }`. Es funcionalmente adecuado dado que ya no hay docente vinculado al curso; no obstante, para fines informativos en el frontend podría considerarse retornar las horas previas del docente saliente si fuera requerido. |

---

## Recomendación al DEV

La entrega de la tarea T04 cumple con total rigurosidad los criterios de aceptación funcionales, normativos, de arquitectura y de calidad del código. La lógica de negocio está sólidamente implementada en la capa de persistencia y servicio, respetando el control de acceso `@MenuAccess`, los mensajes exactos del RF-008 HU2 y la inmutabilidad de las sesiones históricas.

Se emite veredicto de **APROBADA** y se recomienda esperar la confirmación de Claude para proceder con el commit propuesto y dar paso a la integración con las siguientes tareas del RF-008.
