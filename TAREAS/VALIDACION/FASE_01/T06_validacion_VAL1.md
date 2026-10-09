# Validación T06 — Horarios: grilla propuesta y copiar horario · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Ejecución de pruebas unitarias (`pnpm exec jest test/features/horarios`): Pasa completo cubriendo T05 + T06 (CP-RF008-11, CP-RF008-17 y el control de acceso CP-RF008-20). | **PASA** | `test/features/horarios/horarios-grilla-copia.service.spec.ts:1-420`<br>`test/features/horarios/horarios-grilla-copia.controller.spec.ts:1-80`<br>`test/features/horarios/horarios.service.spec.ts:1-426`<br>`test/features/horarios/horarios.controller.spec.ts:1-142` | 4 suites pasadas de 4, 30 pruebas pasadas de 30 (10 nuevas de T06: 6 en servicio y 4 en controlador; 20 de T05). |
| 2 | Parámetros dinámicos sin literales de negocio (Enmienda 2): NINGÚN valor de negocio sale de literales (minutos, horas por día, hora del recreo, duración del recreo, hora de entrada); cada uno proviene de `obtenerParametrosJornada()` y `horaEntradaEstudiantes()`. | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:239-312`<br>`src/features/horarios/horarios.service.ts:274-320`<br>`test/features/horarios/horarios-grilla-copia.service.spec.ts:183-315` | Se leen las 4 variables vigentes de `variables_sistema` y el turno activo de `turnos`. Cero números mágicos (45, 7, 3, 15) en la lógica de negocio. |
| 3 | Reglas de copiado de horario (RF-008 HU3): Empareja por `cursoId`, usa el `cursoSeccionId` de destino, valida mismo grado (400) y destino sin bloques (409), no copia en año cerrado (409), omite cursos ausentes en destino y marca cruces de docente con el mensaje exacto del RF. | **PASA** | `src/features/horarios/horarios.service.ts:324-460`<br>`src/features/horarios/utils/horarios.util.ts:48-67`<br>`test/features/horarios/horarios-grilla-copia.service.spec.ts:318-418` | `cursosSeccionPorSeccion` empareja por `cursoId`; `findCruceDocente` evalúa al docente del destino; `resolverAnio(true)` bloquea año cerrado; auditoría asíncrona registrada. |
| 4 | Verificación técnica objetiva del proyecto (`.agents/tools/verificar_tarea.sh T06`): Ejecución limpia de Typecheck estricto, ESLint y suite global de pruebas sin regresiones. | **PASA** | `TAREAS/VALIDACION/verificar_T06.log:1-89` | Salida objetiva `OK`. 32 suites pasadas de 32, 310 pruebas pasadas de 310 en toda la aplicación. Cero regresiones. |
| 5 | Inmutabilidad de pruebas (`cmp TAREAS/pruebas_rojo/horarios/...`): Pruebas idénticas a las rojas inmutables base. | **PASA** | `test/features/horarios/horarios-grilla-copia.service.spec.ts`<br>`test/features/horarios/horarios-grilla-copia.controller.spec.ts` | Comparación byte a byte arrojó 0 diferencias contra `horarios-grilla-copia.service.spec.ts.txt` y `horarios-grilla-copia.controller.spec.ts.txt`. |
| 6 | Ausencia de patrones prohibidos y alcance delimitado de archivos: Cero `any`, `console.log`, `TODO`, `debugger`, `@ts-ignore` y `eslint-disable`. Modificaciones confinadas a `src/features/horarios/` y pruebas en `test/features/horarios/`. | **PASA** | `git status --porcelain` | Solo archivos de horarios modificados/creados. No se alteró `features.module.ts`, `secciones`, `carga-academica` ni migraciones de base de datos. |

---

## Matriz de Trazabilidad de Escenarios RF-008 HU3

| Escenario | Prueba (archivo:línea) | Resultado |
|---|---|:---:|
| **CP-RF008-11:** Proponer grilla semanal estándar (7 bloques pedagógicos al día, receso tras 3.ª hora, hora entrada 07:45) | `test/features/horarios/horarios-grilla-copia.service.spec.ts:183-243` | **PASA** |
| **CP-RF008-11:** Proponer grilla con parámetros de jornada dinámicos alternativos (40 min, 6 horas, receso tras 2.ª hora) | `test/features/horarios/horarios-grilla-copia.service.spec.ts:245-295` | **PASA** |
| **CP-RF008-11:** Proponer grilla usando por defecto hora de entrada de estudiantes del repositorio (`horaEntradaEstudiantes`) | `test/features/horarios/horarios-grilla-copia.service.spec.ts:297-315` | **PASA** |
| **CP-RF008-17:** Copiar horario a otra sección del mismo grado, emparejar por `cursoId`, usar `cursoSeccionId` destino y marcar cruces de docentes | `test/features/horarios/horarios-grilla-copia.service.spec.ts:318-399` | **PASA** |
| **CP-RF008-17:** Bloquear copia entre secciones de distinto grado con 400 (`BadRequestException`) | `test/features/horarios/horarios-grilla-copia.service.spec.ts:401-406` | **PASA** |
| **CP-RF008-17:** Bloquear copia si la sección destino ya tiene bloques registrados con 409 (`ConflictException`) | `test/features/horarios/horarios-grilla-copia.service.spec.ts:408-417` | **PASA** |
| **CP-RF008-20:** Control de acceso en copiado de horario con `@MenuAccess(MENU_HORARIOS)` (`/admin/horarios`) | `test/features/horarios/horarios-grilla-copia.controller.spec.ts:41-48` | **PASA** |
| **CP-RF008-20:** Consulta de grilla propuesta abierta sin restricción de `@MenuAccess` (`proponerGrilla`) | `test/features/horarios/horarios-grilla-copia.controller.spec.ts:50-56` | **PASA** |
| **Delegación HTTP:** Controlador delega `copiar()` al servicio con IDs de origen, destino y contexto de auditoría | `test/features/horarios/horarios-grilla-copia.controller.spec.ts:60-70` | **PASA** |
| **Delegación HTTP:** Controlador delega `proponerGrilla()` al servicio con sección y hora opcional | `test/features/horarios/horarios-grilla-copia.controller.spec.ts:72-78` | **PASA** |

---

## Verificación de Reglas Críticas e Inspección Exhaustiva de Literales de Negocio

Se realizó una revisión minuciosa del código fuente en `src/features/horarios/`:

1. **Parámetros de jornada dinámicos desde `variables_sistema` (`obtenerParametrosJornada`):**
   - **Evidencia:** `src/features/horarios/repositories/horarios.repository.ts:239-296`.
   - Consulta las 4 variables obligatorias (`jornada.minutos_hora_pedagogica`, `jornada.horas_pedagogicas_dia`, `jornada.recreo_despues_de_hora`, `jornada.minutos_recreo`) con filtro `vigente = true`.
   - Si falta alguna variable o sus valores numéricos son inválidos (`<= 0` o `NaN`), lanza `InternalServerErrorException` con mensaje claro.
   - Reutilización de `obtenerParametrosJornada()` en `HorariosRepository.horasPorCurso` (`líneas 211-213`), resolviendo el hallazgo pendiente de T05 sin duplicar queries.

2. **Hora de entrada de estudiantes desde `turnos` (`horaEntradaEstudiantes`):**
   - **Evidencia:** `src/features/horarios/repositories/horarios.repository.ts:298-312`.
   - Lee la columna `turnos.horaEntrada` donde `aplicaA = 'estudiantes'` y `activo = true`.
   - Si no existe turno activo, lanza `InternalServerErrorException`.

3. **Propuesta de grilla semanal (`proponerGrilla`):**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:266-322`.
   - Toma como hora inicial la indicada por parámetro o la provista por `horaEntradaEstudiantes()`.
   - Itera de lunes a viernes (`DIAS_SEMANA_CLASE` en `horarios.constants.ts:38`).
   - Itera hasta `horasPedagogicasDia` generando bloques de `minutosHoraPedagogica` y genera un bloque de `receso` de `minutosRecreo` exactamente cuando `horaPedagogica === recreoDespuesDeHora`.
   - **Ningún literal numérico (45, 7, 3, 15) ni cadenas de cursos hardcodeadas en la lógica**.

4. **Emparejamiento y copia de horarios entre secciones (`copiar`):**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:324-460`.
   - **Validación de año cerrado:** Invoca `resolverAnio(true)` (`línea 330`); si `anio.estado === "cerrado"`, lanza `ConflictException("No se pueden realizar cambios en un año lectivo cerrado.")`.
   - **Validación de grado y estado destino:** Valida existencia de ambas secciones (`NotFoundException`), coincidencia de grado (`seccionOrigen.gradoId !== seccionDestino.gradoId` → `BadRequestException("Solo se pueden copiar horarios entre secciones del mismo grado.")`) y que destino no tenga bloques previos (`ConflictException("La sección destino ya cuenta con bloques de horario registrados.")`).
   - **Emparejamiento por cursoId:** Mediante `cursosSeccionPorSeccion(origenId)` y `cursosSeccionPorSeccion(destinoId)`, indexa en Map por `cursoId` (`líneas 356-371`).
   - **Asignación del cursoSeccionId de destino:** Al persistir en destino, asigna `cursoDestino.cursoSeccionId` (`línea 437`).
   - **Omisión de cursos no existentes en destino:** Si un bloque de origen corresponde a un curso que no existe en destino, se omite silenciosamente sin interrumpir el proceso (`líneas 404-412`).
   - **Detección y marcado de cruces de docente:** Evalúa `findCruceDocente` para el docente asignado en destino. Si detecta solapamiento, crea el bloque de igual forma y registra el conflicto en la respuesta con el mensaje oficial construido por `construirMensajeCruceDocente(cruce, true)` (`líneas 414-433`).
   - **Auditoría asíncrona:** Registra cada bloque creado con `AuditService.log` (`tabla: "horarios"`, `accion: "crear"`).

5. **Mensajes de cruce de docente exactos del RF:**
   - **Evidencia:** `src/features/horarios/utils/horarios.util.ts:48-67`.
   - Formatea: `"El docente Docente B ya dicta en 5.° C el lunes de 08:00 a 08:40."` o `"El docente ya dicta en 4.° B el lunes de 08:30 a 09:15."`, manteniendo compatibilidad con las validaciones de T05 y el RF.

6. **Control de acceso y seguridad:**
   - **Evidencia:** `src/features/horarios/horarios.controller.ts:131-159`.
   - `proponerGrilla` (`GET /api/horarios/seccion/:seccionId/grilla`): Abierta sin restricción de `@MenuAccess`, valida formato `HH:mm` con regex (`REGEX_HORA_HH_MM`).
   - `copiar` (`POST /api/horarios/seccion/:destinoId/copiar-de/:origenId`): Protegida estrictamente con `@MenuAccess(MENU_HORARIOS)` (`"/admin/horarios"`). Parámetros validados con `ParseUUIDPipe`.

7. **Búsqueda exhaustiva de literales prohibidos:**
   - Rastreo regex ejecutado: `grep -rnE "\b(45|2700)\b|\"Matemática\"|matem" src/features/horarios`
   - Resultado: Solo ocurrencias en decoradores Swagger `@ApiProperty({ example: ... })` en DTOs de T05. Cero literales de negocio en la lógica.

8. **Análisis de atomicidad y riesgo de copia parcial en `HorariosService.copiar`:**
   - **Evidencia:** `src/features/horarios/horarios.service.ts:376-454`.
   - **Diagnóstico:** El método itera sobre `bloquesOrigen` ejecutando llamadas individuales asíncronas a `this.horariosRepo.create(...)` y `this.auditService.log(...)` sin envolver la operación en una transacción de base de datos (`db.transaction(...)`).
   - **Riesgo:** Si ocurre una falla de red, error de base de datos o caída del proceso en el bloque *N*, los bloques previamente insertados (*1* a *N-1*) quedan persistidos en la base de datos. Como el método valida al inicio que el destino no contenga bloques (`findBySeccion(destinoId).length > 0`), cualquier reintento posterior será rechazado con HTTP 409 (`COPIA_DESTINO_CON_BLOQUES`), requiriendo limpieza manual de la sección.
   - **Clasificación:** Severidad **media**. No incumple los criterios de aceptación medibles de la tarea T06 ni el contrato técnico (el cual no requería método transaccional específico para copia y las pruebas rojas inmutables mockean llamadas individuales a `this.horariosRepo.create`), pero constituye una oportunidad de mejora para robustez operacional en producción.

---

## Pruebas Ejecutadas

- **Pruebas unitarias del módulo Horarios:** `pnpm exec jest test/features/horarios`
  - Suites: 4 pasadas, 4 total (`horarios-grilla-copia.service.spec.ts`, `horarios-grilla-copia.controller.spec.ts`, `horarios.service.spec.ts`, `horarios.controller.spec.ts`).
  - Pruebas: 30 pasadas, 0 fallidas, 10 nuevas (6 en servicio de grilla/copia, 4 en controlador de grilla/copia).
- **Verificación técnica integral:** `.agents/tools/verificar_tarea.sh T06`
  - Resultado: `OK` (Typecheck global limpio, ESLint limpio y suite completa de 32 suites / 310 pruebas pasando).
- **Verificación de inmutabilidad de pruebas (`cmp`):**
  - `cmp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt test/features/horarios/horarios-grilla-copia.service.spec.ts` → 0 diferencias.
  - `cmp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.controller.spec.ts.txt test/features/horarios/horarios-grilla-copia.controller.spec.ts` → 0 diferencias.

---

## Hallazgos

| Severidad | Archivo | Detalle |
|---|---|---|
| **media** | `src/features/horarios/horarios.service.ts:376-454` | **Ausencia de atomicidad transaccional en copiado de horarios:** El método `copiar` persiste bloques de manera secuencial mediante llamadas independientes a `horariosRepo.create` dentro de un bucle `for`. Si se produce una interrupción o error transitorio en una inserción intermedia, la sección destino quedará con un horario parcialmente cargado. Al existir la regla que impide copiar en secciones con bloques existentes (409 `COPIA_DESTINO_CON_BLOQUES`), el sistema no permitirá reintentar la copia sin una eliminación manual previa de los bloques huérfanos. Se recomienda evaluar para etapas posteriores un método transaccional de inserción en lote (`createMany` o `db.transaction`). |
| **baja** | `src/features/horarios/horarios.service.ts:389-396, 446-453` | **Auditoría individual por bloque durante el copiado:** Al replicar un horario completo (~35 bloques), se emiten ~35 llamadas individuales a `auditService.log`. Si bien BullMQ procesa los eventos de forma asíncrona en memoria redis (< 1 ms), en escenarios de inserción masiva se sugiere considerar un registro agrupado o consolidado para reducir el volumen de mensajes encolados. |

---

## Recomendación al DEV

La entrega de T06 cumple satisfactoriamente con todos los requerimientos funcionales del RF-008 HU3 (grilla propuesta y copiado de horario), las enmiendas del contrato y los criterios de aceptación medibles:
1. No se utilizan literales de negocio para jornada ni horas de entrada (`obtenerParametrosJornada` y `horaEntradaEstudiantes` consultan dinámicamente la base de datos).
2. El copiado empareja adecuadamente por `cursoId`, respeta la no escritura en años cerrados, previene inconsistencias de grado y marca cruces docentes con el formato exacto del RF.
3. El control de acceso protege la copia con `@MenuAccess(MENU_HORARIOS)` y mantiene la grilla abierta.
4. Las pruebas unitarias inmutables pasan al 100% sin regresiones en el proyecto.

Se emite veredicto **APROBADA**. Se autoriza proceder con la siguiente fase (T07 — consultas de horarios).
