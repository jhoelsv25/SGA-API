# Validación T03 — Módulo secciones · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Ejecución de pruebas unitarias (`pnpm exec jest test/features/secciones`): Todas las pruebas pasan sin fallos. | **PASA** | `test/features/secciones/secciones.service.spec.ts:1-394`<br>`test/features/secciones/secciones.controller.spec.ts:1-157` | 2 suites pasadas, 19 pruebas pasadas (10 en servicio, 9 en controlador), 0 fallidas. Cobertura completa de HU1 y seguridad. |
| 2 | Verificación estricta de tipos y estilo (`tsc` y `eslint`): Sin errores de tipo ni infracciones de linter en archivos de la tarea. | **PASA** | `src/features/secciones/**`<br>`test/features/secciones/**` | `pnpm exec tsc -p .agents/tools/tsconfig.verificacion.json` finaliza con exit code 0. `pnpm exec eslint src test` finaliza con exit code 0. |
| 3 | Regresión completa del proyecto (`pnpm test`): Todas las suites de pruebas pasan. | **PASA** | `TAREAS/VALIDACION/verificar_T03.log:13-39` | 27 suites pasadas de 27, 272 pruebas pasadas de 272. Cero regresiones introducidas. |
| 4 | Inmutabilidad de pruebas (`diff -r TAREAS/pruebas_rojo/secciones test/features/secciones`): Pruebas idénticas a las rojas. | **PASA** | `test/features/secciones/secciones.service.spec.ts`<br>`test/features/secciones/secciones.controller.spec.ts` | Diff contra las plantillas originales de `TAREAS/pruebas_rojo/secciones/*.txt` arrojó 0 diferencias de contenido y formato. |
| 5 | Ausencia de patrones prohibidos: Cero `any`, `console.log`, `TODO`, `debugger`, `@ts-ignore` y `eslint-disable`. | **PASA** | `src/features/secciones/**` | Verificación con regex automatizada en harness arrojó 0 coincidencias. Tipado estricto con interfaces y DTOs. |
| 6 | Alcance delimitado de archivos: Solo archivos permitidos bajo `src/features/secciones/` y `test/features/secciones/`. | **PASA** | `git status --porcelain` | Ningún archivo no autorizado fue creado o modificado. `features.module.ts` no fue tocado (reservado para T08). |

---

## Matriz de Trazabilidad de Escenarios RF-008 HU1 y Seguridad

| Escenario | Prueba (archivo:línea) | Resultado | Implementación en Código (archivo:línea) |
|---|---|:---:|---|
| **CP-RF008-01:** Crear una sección activa con carga académica automática del plan sin docente | `test/features/secciones/secciones.service.spec.ts:193-236` | **PASA** | `src/features/secciones/secciones.service.ts:28-81`<br>`src/features/secciones/repositories/secciones.repository.ts:217-270` |
| **CP-RF008-02:** Sección repetida por grado y año (bloqueo 409 con mensaje exacto) | `test/features/secciones/secciones.service.spec.ts:238-254` | **PASA** | `src/features/secciones/secciones.service.ts:41-48`<br>`src/features/secciones/utils/secciones.util.ts:5-7`<br>`src/features/secciones/repositories/secciones.repository.ts:148-175` |
| **CP-RF008-03:** Vacantes inválidas menor o igual a 0 (bloqueo 400 con mensaje exacto) | `test/features/secciones/secciones.service.spec.ts:256-281` | **PASA** | `src/features/secciones/secciones.service.ts:33-35`<br>`src/features/secciones/dto/create-seccion.dto.ts:37`<br>`src/features/secciones/constants/secciones.constants.ts:5` |
| **CP-RF008-04:** Tutor de dos secciones (bloqueo 409) y tutor inactivo (bloqueo 400) | `test/features/secciones/secciones.service.spec.ts:283-300`<br>`test/features/secciones/secciones.service.spec.ts:302-317` | **PASA** | `src/features/secciones/secciones.service.ts:50-60, 117-132`<br>`src/features/secciones/constants/secciones.constants.ts:6-7`<br>`src/features/secciones/repositories/secciones.repository.ts:177-199` |
| **CP-RF008-05:** Cierre de sección con matriculados vigentes (bloqueo 409) y cierre exitoso sin estudiantes | `test/features/secciones/secciones.service.spec.ts:321-331`<br>`test/features/secciones/secciones.service.spec.ts:333-354` | **PASA** | `src/features/secciones/secciones.service.ts:163-166`<br>`src/features/secciones/constants/secciones.constants.ts:8`<br>`src/features/secciones/repositories/secciones.repository.ts:201-215, 302-316` |
| **CP-RF008-20:** Control de acceso a la gestión de secciones (`@MenuAccess('/admin/secciones')`) en mutaciones y consultas abiertas | `test/features/secciones/secciones.controller.spec.ts:67-106` | **PASA** | `src/features/secciones/secciones.controller.ts:43, 59, 77` |

---

## Verificación de Reglas Críticas (Implementación Real vs Mocks)

Se verificó en el código fuente de persistencia y servicio que las reglas no están simplemente satisfechas mediante mocks en los tests, sino implementadas de forma concreta y robusta en el backend:

1. **Transacción atómica de la carga académica (`createConCarga`):**
   - **Ubicación:** `src/features/secciones/repositories/secciones.repository.ts:217-270`.
   - **Evidencia:** Utiliza el método nativo `this.db.transaction(async (tx) => { ... })` de Drizzle ORM.
   - **Operaciones agrupadas:**
     - Inserción de la nueva sección en `secciones` con estado `activa` (`tx.insert(secciones)...`).
     - Consulta de cursos activos del plan de estudios del grado correspondiente donde `planEstudios.activo = true` y `cursos.eliminadoEn IS NULL` (`tx.select().from(planEstudios)...`).
     - Inserción en lote en `cursosSeccion` vinculando `seccionId`, `cursoId` y `docenteId: null` (`tx.insert(cursosSeccion)...`).
     - Consulta y mapeo del registro final poblado dentro de la misma transacción (`tx.select()...`).
     - Si ocurre un fallo en cualquier paso, se produce rollback total, impidiendo secciones huérfanas sin carga académica.

2. **Validación de Tutor Activo y Único por Año:**
   - **Ubicación:** `src/features/secciones/secciones.service.ts:50-60` (creación), `117-132` (actualización) y `src/features/secciones/repositories/secciones.repository.ts:177-199`.
   - **Evidencia:** 
     - Verifica en base de datos la existencia del docente y que `docente.estado === "activo"`. Si no, lanza `BadRequestException("Solo se pueden asignar docentes activos.")`.
     - Ejecuta consulta SQL `tutorOcupado(anioId, docenteId, exceptoSeccionId)` evaluando `anio_academico_id = anioId AND tutor_id = docenteId AND estado = 'activa'`. Si existe otra sección activa, lanza `ConflictException("Este docente ya es tutor de otra sección en este año.")`.
     - Permite desasignar tutor enviando `tutorId: null` en actualizaciones sin disparar validaciones erróneas.

3. **Cierre de Sección Condicionado a Cero Matriculados Vigentes:**
   - **Ubicación:** `src/features/secciones/secciones.service.ts:163-166` y `src/features/secciones/repositories/secciones.repository.ts:201-215`.
   - **Evidencia:**
     - Ejecuta conteo en base de datos con `contarMatriculadosVigentes(seccionId)`: `SELECT COUNT(*)::int FROM matriculas WHERE seccion_id = $1 AND estado = 'matriculado'`.
     - Si el conteo es mayor que 0, bloquea la acción con `ConflictException("No se puede cerrar una sección con estudiantes matriculados.")`.
     - Si el conteo es 0, actualiza el estado a `cerrada` y audita el cambio.

4. **Exactitud Textual de Mensajes del RF-008:**
   - Todos los mensajes coinciden carácter por carácter con la especificación funcional:
     - Sección repetida: `"Ya existe la sección " + nombre + " de " + gradoNumero + ".° en este año."` (`src/features/secciones/utils/secciones.util.ts:6`).
     - Vacantes inválidas: `"Las vacantes deben ser mayores que 0."` (`src/features/secciones/constants/secciones.constants.ts:5`).
     - Tutor ocupado: `"Este docente ya es tutor de otra sección en este año."` (`src/features/secciones/constants/secciones.constants.ts:7`).
     - Docente inactivo: `"Solo se pueden asignar docentes activos."` (`src/features/secciones/constants/secciones.constants.ts:6`).
     - Sección con matriculados: `"No se puede cerrar una sección con estudiantes matriculados."` (`src/features/secciones/constants/secciones.constants.ts:8`).

5. **Auditoría Asíncrona Inmutable:**
   - Registrada en `create`, `update` y `cerrar` invocando `AuditService.log` con `usuarioId`, `accion`, `tabla: "secciones"`, `registroId`, valores anterior/nuevo e IP.

---

## Pruebas Ejecutadas

- **Pruebas unitarias de la tarea:** `pnpm exec jest test/features/secciones`
  - Suites: 2 pasadas, 2 total (`secciones.service.spec.ts`, `secciones.controller.spec.ts`).
  - Pruebas: 19 pasadas, 0 fallidas, 19 nuevas.
- **Suite completa del proyecto:** `pnpm test`
  - Suites: 27 pasadas de 27.
  - Pruebas: 272 pasadas de 272 (cero regresiones).
- **Verificación automatizada del harness:** `./.agents/tools/verificar_tarea.sh T03`
  - Resultado: `OK` (Exit code 0).

---

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/features/secciones/repositories/secciones.repository.ts:42-59` | Las subconsultas escalares para `matriculados`, `totalCursos` y `cursosSinDocente` en `getSeccionesSelect()` evitan de forma efectiva el problema de N+1 consultas en `findAll`. A medida que crezca el volumen de datos en `matriculas` y `cursos_seccion`, se aconseja considerar índices compuestos sobre `matriculas(seccion_id, estado)` y `cursos_seccion(seccion_id, docente_id)` para optimizar los agregados. |
| **baja** | `src/features/secciones/secciones.service.ts:103-114` | En la actualización de sección (`update`), la validación de nombre duplicado valida contra `findPorNombre` excluyendo el propio ID, lo cual es correcto. Se recomienda asegurar en la base de datos un constraint de unicidad compuesto `uq_secciones_anio_grado_nombre(anio_academico_id, grado_id, nombre)` para blindar la concurrencia a nivel de base de datos relacional. |

---

## Recomendación al DEV

La entrega de la tarea T03 satisface rigurosamente todos los criterios de aceptación funcionales, normativos, de arquitectura y de calidad del código. La lógica de negocio está completamente implementada en las capas de repositorio y servicio, respetando las transacciones de base de datos, el control de acceso `@MenuAccess` y los mensajes exactos del RF-008.

Se emite veredicto de **APROBADA** y se recomienda esperar la confirmación de Claude para proceder con el commit propuesto y dar paso a la tarea T04 (`carga-academica`).
