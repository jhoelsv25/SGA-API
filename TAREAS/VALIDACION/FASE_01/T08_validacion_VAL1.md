# Validación T08 — Registro de módulos, comprobación de cableado, auditoría y backlog (RF-008) · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | **Registro de módulos:** Agregar `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule` a `imports` y `exports` de `FeaturesModule`. | **PASA** | `src/features/features.module.ts:21-23`<br>`src/features/features.module.ts:46-48`<br>`src/features/features.module.ts:70-72` | Los tres módulos quedaron importados y exportados siguiendo el mismo estándar y convención de los features precedentes. |
| 2 | **Cableado real (AuditService):** Resolver la dependencia faltante de `AuditService` en `HorariosModule`. | **PASA** | `src/features/horarios/horarios.module.ts:2`<br>`src/features/horarios/horarios.module.ts:14` | Se importó `AuditService` y se declaró en los `providers` del módulo (`providers: [HorariosRepository, HorariosService, AuditService]`). |
| 3 | **Prueba de cableado real:** Crear `test/features/rf-008-cableado.spec.ts` que compile módulos reales con `Test.createTestingModule` sobrescribiendo únicamente infraestructura externa (DB/Redis). | **PASA** | `test/features/rf-008-cableado.spec.ts:63-78` | Compila módulos reales (`SeccionesModule`, `CargaAcademicaModule`, `HorariosModule`) sin mockear los módulos. Resuelve servicios, controladores y repositorios. 3 pruebas pasadas. |
| 4 | **Auditoría inmutable (RF-003):** Comprobar que cada mutación en secciones, carga académica y horarios llama a `auditService.log`. | **PASA** | `src/features/secciones/secciones.service.ts:67,131,162`<br>`src/features/carga-academica/carga-academica.service.ts:67,90`<br>`src/features/horarios/horarios.service.ts:118,196,233,395,452` | 10 de 10 flujos de mutación invocan `auditService.log` con sus tablas, acciones y valores serializados correspondientes. Cero omisiones. |
| 5 | **Actualización del Backlog:** Contar escenarios Gherkin del RF-008, actualizar `Back %` a 100 %, recalcular promedio Back a 33.5 %, agregar fila al registro y mantener `Front %` intacto. | **PASA** | `docs/00-Plan-y-Backlog-RF.md:7`<br>`docs/00-Plan-y-Backlog-RF.md:47`<br>`docs/00-Plan-y-Backlog-RF.md:68`<br>`docs/00-Plan-y-Backlog-RF.md:79` | 20 de 20 escenarios aplican al Back y están probados (100 %). Estado pasa a `En desarrollo`. Promedio Back general recalculado exactamente a 33.5 %. Front % intacto en 0 %. Fila agregada en registro. |
| 6 | **Pendientes del colegio:** Agregar P-22 y P-23 al final de `PENDIENTES.md` y agregar nota en P-03 sin alterar filas existentes ni repetir identificadores. | **PASA** | `docs/requerimientos/PENDIENTES.md:9`<br>`docs/requerimientos/PENDIENTES.md:28-29` | Nota incorporada en «Supuesto actual (V1)» de P-03. Nuevas filas P-22 y P-23 agregadas con estado `Pendiente`. Cero colisiones de IDs y resto de filas intactas. |

---

## 1. Comprobación del Conteo del Backlog (RF-008)

### 1.1 Matriz de Escenarios Gherkin de RF-008 y Cobertura de Pruebas

Se revisó la especificación oficial `docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md` y los casos de prueba en `docs/pruebas/casos/RF-008_Secciones_Carga_Academica_y_Horarios/casos-de-prueba.md`. Todos los 20 escenarios aplican a la capa backend de acuerdo con la regla de la skill `actualizar-backlog-rf` (involucran lógica de negocio, validaciones de servidor, estados, persistencia, cálculo algorítmico o control de acceso):

| # | Escenario Gherkin | Aplica al Back | Justificación / Regla Backend | Prueba `CP-RF008-xx` (`archivo:línea`) | Resultado |
|---|---|:---:|---|---|:---:|
| 1 | **Crear una sección** | **Sí** | Persistencia en `secciones`, creación automática de cursos en `cursos_seccion`, validación de año en curso y plan de estudios. | `test/features/secciones/secciones.service.spec.ts:193` | **PASA** |
| 2 | **Sección repetida** | **Sí** | Validación de unicidad de nombre de sección por grado y año escolar en BD (409 Conflict). | `test/features/secciones/secciones.service.spec.ts:238` | **PASA** |
| 3 | **Vacantes inválidas** | **Sí** | Validación DTO `@Min(1)` y comprobación en servicio (`vacantes <= 0`) con 400 BadRequest. | `test/features/secciones/secciones.service.spec.ts:256` | **PASA** |
| 4 | **Tutor de dos secciones** | **Sí** | Validación en BD de exclusividad de tutoría docente por año escolar (409 Conflict). | `test/features/secciones/secciones.service.spec.ts:283` | **PASA** |
| 5 | **Cerrar una sección con matriculados** | **Sí** | Verificación de integridad con matrículas vigentes (`contarMatriculadosVigentes > 0`) bloqueando cierre (409 Conflict). | `test/features/secciones/secciones.service.spec.ts:321` | **PASA** |
| 6 | **Asignar un docente** | **Sí** | Mutación en `cursos_seccion`, sumatoria de horas y cálculo de nueva carga horaria. | `test/features/carga-academica/carga-academica.service.spec.ts:195` | **PASA** |
| 7 | **Docente inactivo** | **Sí** | Validación del estado del docente (`estado !== 'activo'`), rechazo con 400 BadRequest. | `test/features/carga-academica/carga-academica.service.spec.ts:231` | **PASA** |
| 8 | **Exceso de carga horaria** | **Sí** | Comparación `horasTotales > jornadaHoras`, retorno de aviso y exigencia de confirmación explícita. | `test/features/carga-academica/carga-academica.service.spec.ts:245` | **PASA** |
| 9 | **Cambiar el docente a mitad de año** | **Sí** | Actualización de `docenteId` en `cursos_seccion` preservando sesiones firmadas preexistentes. | `test/features/carga-academica/carga-academica.service.spec.ts:277` | **PASA** |
| 10 | **Ver la carga de un docente** | **Sí** | Consulta relacional en BD de asignaciones, cálculo de total de horas lectivas y jornada. | `test/features/carga-academica/carga-academica.service.spec.ts:317` | **PASA** |
| 11 | **Proponer la grilla del día** | **Sí** | Algoritmo de generación de bloques según hora de entrada y variables `jornada.*` con receso tras 3.ª hora. | `test/features/horarios/horarios-grilla-copia.service.spec.ts:179` | **PASA** |
| 12 | **Asignar un curso a un bloque** | **Sí** | Persistencia en `horarios`, asociación con `cursos_seccion` y registro de auditoría. | `test/features/horarios/horarios.service.spec.ts:122` | **PASA** |
| 13 | **Bloque doble** | **Sí** | Soporte de bloque de 90 minutos computado como 2 horas pedagógicas. | `test/features/horarios/horarios.service.spec.ts:164` | **PASA** |
| 14 | **Bloques superpuestos** | **Sí** | Detección de solapamiento horario en la sección mediante intervalos de tiempo (409 Conflict). | `test/features/horarios/horarios.service.spec.ts:196` | **PASA** |
| 15 | **Cruce de docente** | **Sí** | Detección de incompatibilidad horaria del docente entre secciones concurrentes del colegio (409 Conflict). | `test/features/horarios/horarios.service.spec.ts:216` | **PASA** |
| 16 | **Horas distintas al plan** | **Sí** | Comparación de horas programadas en el horario contra horas semanales del plan de estudios. | `test/features/horarios/horarios.service.spec.ts:243` | **PASA** |
| 17 | **Copiar el horario a otra sección** | **Sí** | Replicación masiva de bloques entre secciones del mismo grado con validación de cruces docentes. | `test/features/horarios/horarios-grilla-copia.service.spec.ts:314` | **PASA** |
| 18 | **Cambiar el horario a mitad de año** | **Sí** | Retorno de aviso oficial de vigencia a partir del día siguiente y preservación de sesiones de la fecha. | `test/features/horarios/horarios.service.spec.ts:336` | **PASA** |
| 19 | **Consultar mi horario** | **Sí** | Endpoints de consulta para docente (`mi-horario`) y estudiante/apoderado (`estudiante/:id`) con colores y metadata. | `test/features/horarios/horarios-consulta.service.spec.ts:176` | **PASA** |
| 20 | **Usuario sin permiso** | **Sí** | Protección de endpoints de gestión mediante guardias `@MenuAccess`, rechazando accesos no autorizados (403 Forbidden). | `test/features/secciones/secciones.controller.spec.ts:67`<br>`test/features/horarios/horarios.controller.spec.ts:54`<br>`test/features/horarios/horarios-grilla-copia.controller.spec.ts:37` | **PASA** |

- **Total escenarios que aplican al backend:** 20
- **Total escenarios implementados y probados:** 20
- **Porcentaje Back calculado:** $20 / 20 \times 100 = 100\,\%$

### 1.2 Verificación de la Tabla y Recálculo del Promedio General

Se verificaron las 20 filas de la tabla general en `docs/00-Plan-y-Backlog-RF.md`:

| RF | Requerimiento | Back % | Front % | Estado |
|---|---|:---:|:---:|---|
| RF-001 | Acceso al sistema | 100 % | 81 % | Pendiente (V3) |
| RF-002 | Usuarios, roles y menú | 70 % | 74 % | Pendiente (V3) |
| RF-003 | Bitácora de auditoría | 100 % | 100 % | Completado |
| RF-004 | Institución, turnos y equipos autorizados | 100 % | 100 % | Completado |
| RF-005 | Año escolar y calendario | 100 % | 67 % | En desarrollo |
| RF-006 | Grados, cursos y plan de estudios | 100 % | 100 % | Completado |
| RF-007 | Personas: docentes, estudiantes y apoderados | 0 % | 0 % | Por desarrollar |
| **RF-008** | **Secciones, carga académica y horarios** | **100 %** | **0 %** | **En desarrollo** |
| RF-009 | Matrícula, retiro y traslado | 0 % | 0 % | Por desarrollar |
| RF-010 | Marcación y asistencia de estudiantes | 0 % | 0 % | Por desarrollar |
| RF-011 | Registro de sesión de clase | 0 % | 0 % | Por desarrollar |
| RF-012 | Supervisión y ausencias del docente | 0 % | 0 % | Por desarrollar |
| RF-013 | Consolidado y ficha de seguimiento docente | 0 % | 0 % | Por desarrollar |
| RF-014 | Libretas del SIAGIE | 0 % | 0 % | Por desarrollar |
| RF-015 | Unidades y materiales de reforzamiento | 0 % | 0 % | Por desarrollar |
| RF-016 | Tareas, entregas y calificación | 0 % | 0 % | Por desarrollar |
| RF-017 | Interacción y actividad del curso | 0 % | 0 % | Por desarrollar |
| RF-018 | Conducta y observaciones del estudiante | 0 % | 0 % | Por desarrollar |
| RF-019 | Comunicados y notificaciones | 0 % | 0 % | Por desarrollar |
| RF-020 | Indicadores de la tesis y panel | 0 % | 0 % | Por desarrollar |

**Recálculo de la suma y promedio de la capa Back:**
$$\sum \text{Back \%} = 100 + 70 + 100 + 100 + 100 + 100 + 0 + 100 + 0 \times 12 = 670\,\%$$
$$\text{Promedio Back} = \frac{670\,\%}{20} = 33.5\,\%$$

- El resumen de avance en `docs/00-Plan-y-Backlog-RF.md:68` indica exactamente `33.5 %`.
- Solo se modificó la columna `Back %` de la fila RF-008 (pasó de 0 % a 100 %) y su `Estado` (pasó de `Por desarrollar` a `En desarrollo`).
- La columna `Front %` de RF-008 permaneció intacta en `0 %`.
- El registro de avance (`docs/00-Plan-y-Backlog-RF.md:79`) contiene la fila fechada `2026-10-09` con el detalle de la tarea.
- La cabecera indica `Última actualización: 2026-10-09`.

---

## 2. Comprobación de la Prueba de Cableado Real

Se evaluó exhaustivamente `test/features/rf-008-cableado.spec.ts`:

1. **Compilación de módulos REALES:**
   - La prueba importa e incluye directamente en `Test.createTestingModule`:
     ```typescript
     imports: [
       ConfigModule.forRoot({ isGlobal: true }),
       ModuloSimulacionGlobal,
       AnioLectivoModule,
       SeccionesModule,
       CargaAcademicaModule,
       HorariosModule,
     ]
     ```
   - **No existen mocks de los módulos:** Se cargan las clases reales `@Module` `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule`.
   - Únicamente se abstrae la infraestructura externa física mediante `ModuloSimulacionGlobal` (token `DRIZZLE` para BD y `RedisService` para Redis) y `.overrideProvider` para los tokens de BullMQ (`QUEUES.AUDIT` y `QUEUES.ANIO_ESCOLAR`).

2. **Validez técnica respecto al hallazgo de AuditService en HorariosModule:**
   - `HorariosService` inyecta en su constructor `private readonly auditService: AuditService` (`src/features/horarios/horarios.service.ts:53`).
   - Previo a T08, `HorariosModule` no declaraba `AuditService` en sus `providers` ni lo importaba de ningún módulo compartido.
   - Si se compila el módulo real `HorariosModule` en NestJS sin declarar `AuditService`, el inyector falla con una excepción de resolución de árbol:
     `Nest can't resolve dependencies of the HorariosService (...). Please make sure that the argument AuditService at index [5] is available in the HorariosModule context.`
   - La prueba en `rf-008-cableado.spec.ts` invoca `modulo.get(HorariosService)`, lo que fuerza a Nest a resolver la cadena completa de proveedores. Por ende, la prueba es 100 % válida y sensible: detectaría inmediatamente la ausencia de `AuditService`.
   - Al haberse añadido `AuditService` a `HorariosModule.providers`, la prueba compila satisfactoriamente y valida la resolución de:
     - `SeccionesService`, `SeccionesController`, `SeccionesRepository`.
     - `CargaAcademicaService`, `CargaAcademicaController`, `CargaAcademicaRepository`.
     - `HorariosService`, `HorariosController`, `HorariosRepository`.

---

## 3. Comprobación de PENDIENTES.md

Se analizó el archivo `docs/requerimientos/PENDIENTES.md`:

1. **Nota en P-03:**
   - En la columna «Supuesto actual (V1)» de P-03 (`linea 9`), se incorporó textualmente:
     > `JER: 45 min, 7 horas al día, de lunes a viernes. El recreo (después de la 3.ª hora, 15 min) y la jornada son variables configurables jornada.*.`
   - El resto de campos de la fila P-03 no sufrió alteraciones.

2. **Nuevos pendientes registrados al final del documento:**
   - **P-22 (`RF-008`):**
     - *Pregunta:* `¿Qué debe pasar al eliminar o mover un bloque del horario que ya tiene sesiones de clase generadas? Hoy se bloquea el borrado`
     - *A quién:* `Subdirección`
     - *Supuesto actual (V1):* `Se bloquea con mensaje.`
     - *Estado:* `Pendiente`
   - **P-23 (`RF-008`):**
     - *Pregunta:* `El rol Subdirector que el RF nombra como gestor de secciones y horarios no existe en los datos iniciales; hoy solo el Administrador ve los menús Secciones y Horarios. ¿Se crea el rol o lo gestiona otro rol?`
     - *A quién:* `Dirección`
     - *Supuesto actual (V1):* `Solo el Administrador gestiona Secciones y Horarios hasta definir el rol Subdirector.`
     - *Estado:* `Pendiente`

3. **Integridad de filas y numeración:**
   - Ninguna fila previa (P-01 a P-21, excepto la precisión textual de P-03) fue alterada ni eliminada.
   - Los identificadores P-XX son únicos, correlativos (del P-01 al P-23) y sin colisiones de números.

---

## 4. Comprobación de Auditoría en Mutaciones (RF-003)

Se revisaron minuciosamente todos los métodos mutacionales en los servicios de los tres módulos:

| Servicio | Método | Mutación | Llamada a `auditService.log` (`archivo:línea`) | Tabla Auditada | Acción |
|---|---|---|---|---|---|
| `SeccionesService` | `create` | Crear sección con carga | `src/features/secciones/secciones.service.ts:67-74` | `secciones` | `crear` |
| `SeccionesService` | `update` | Modificar datos de sección | `src/features/secciones/secciones.service.ts:131-139` | `secciones` | `actualizar` |
| `SeccionesService` | `cerrar` | Cierre lógico de sección | `src/features/secciones/secciones.service.ts:162-170` | `secciones` | `actualizar` |
| `CargaAcademicaService` | `asignarDocente` | Asignación de docente a curso | `src/features/carga-academica/carga-academica.service.ts:67-75` | `cursos_seccion` | `actualizar` |
| `CargaAcademicaService` | `asignarDocente` | Desasignación (`docenteId: null`) | `src/features/carga-academica/carga-academica.service.ts:90-98` | `cursos_seccion` | `actualizar` |
| `HorariosService` | `crearBloque` | Creación de bloque horario | `src/features/horarios/horarios.service.ts:118-125` | `horarios` | `crear` |
| `HorariosService` | `actualizarBloque` | Modificación de bloque | `src/features/horarios/horarios.service.ts:196-204` | `horarios` | `actualizar` |
| `HorariosService` | `eliminarBloque` | Eliminación de bloque | `src/features/horarios/horarios.service.ts:233-240` | `horarios` | `eliminar` |
| `HorariosService` | `copiarHorario` | Replicación de receso | `src/features/horarios/horarios.service.ts:395-402` | `horarios` | `crear` |
| `HorariosService` | `copiarHorario` | Replicación de clase | `src/features/horarios/horarios.service.ts:452-459` | `horarios` | `crear` |

**Resultado:** Cero omisiones detectadas. Todas las mutaciones registran eventos estructurados con usuario, dirección IP, tabla, identificador y valores serializados.

---

## Pruebas Ejecutadas

1. **Prueba de cableado de la tarea:**
   - Comando: `pnpm exec jest test/features/rf-008-cableado.spec.ts`
   - Resultado: 1 suite pasada, 3 pruebas pasadas, 0 fallos (3.14 s).
2. **Suite completa del proyecto (`verificar_tarea.sh T08 --suite-completa`):**
   - Typecheck (`tsc --noEmit`): 0 errores.
   - ESLint (`eslint src test`): 0 advertencias, 0 errores.
   - Jest global: 34 suites pasadas, 319 pruebas pasadas, 0 fallos.
   - Build (`nest build`): exitoso.

---

## Hallazgos

### Hallazgos de severidad baja (no bloqueantes)

1. **Instanciación duplicada de `AuditService` por módulo:**
   - **Archivo:** `src/features/horarios/horarios.module.ts:14` (y módulos hermanos `SeccionesModule`, `CargaAcademicaModule`).
   - **Detalle:** `AuditService` se provee de forma aislada en `providers: [...]` de cada módulo feature en vez de importarse desde un módulo transversal (ej. `AuditModule` o `CoreModule`). Aunque resuelve de forma limpia la inyección y cumple con la arquitectura modular actual sin generar dependencias circulares, provoca que NestJS instancie copias independientes del servicio en cada contexto de inyección.
   - **Severidad:** baja.

2. **Simulación en memoria de Queue en prueba de cableado:**
   - **Archivo:** `test/features/rf-008-cableado.spec.ts:57-61`
   - **Detalle:** La prueba sobreescribe las colas de BullMQ con un objeto simulado `colaSimulada` tipado como `Queue<unknown>`. Esto permite compilar e instanciar los módulos en menos de 4 segundos sin requerir Redis activo, cumpliendo exactamente la directriz de la tarea de aislar infraestructura externa.
   - **Severidad:** baja.

---

## Recomendación al DEV

La entrega de T08 es impecable. El registro en `FeaturesModule`, la resolución de inyección en `HorariosModule`, la prueba de cableado real `rf-008-cableado.spec.ts`, la auditoría inmutable en las mutaciones, y la actualización matemática del backlog con sus pendientes cumplen al 100 % con todas las especificaciones y lineamientos. Se recomienda emitir el commit propuesto:
`feat(rf-008): registrar modulos, verificar cableado y actualizar backlog`.
