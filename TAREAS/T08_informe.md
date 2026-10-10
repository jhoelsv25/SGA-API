# Informe T08 — Registrar los módulos, comprobar el cableado de inyección, auditoría y backlog

**Tarea:** T08 — Registro de módulos, comprobación de cableado, auditoría y backlog (RF-008)  
**Fecha:** 2026-10-09  
**Responsable:** DEV-1  
**Estado:** Listo para revisión (pendiente de CONFIRMADO para commit)

---

## 1. Archivos Modificados y Creados

| Archivo | Acción | Descripción |
|---|---|---|
| `src/features/features.module.ts` | Modificado | Se registraron `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule` en `imports` y `exports`. |
| `src/features/horarios/horarios.module.ts` | Modificado | Se agregó `AuditService` a los `providers` del módulo para resolver la inyección de dependencias requerida por `HorariosService`. |
| `test/features/rf-008-cableado.spec.ts` | Creado | Prueba de compilación con `Test.createTestingModule` de los tres módulos reales, verificando la resolución de servicios, controladores y repositorios. |
| `docs/00-Plan-y-Backlog-RF.md` | Modificado | Se actualizó la fila de `RF-008` (Back %: 100 %, Estado: `En desarrollo`), el promedio de Back (33.5 %) y se añadió la fila correspondiente en el Registro de avance. |
| `docs/requerimientos/PENDIENTES.md` | Modificado | Se agregó la nota de variables configurables en P-03 y se agregaron las dudas de negocio P-22 y P-23. |

---

## 2. Skills y Reglas Aplicadas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `actualizar-backlog-rf` | Conteo estricto de escenarios Gherkin verificados (20 de 20 = 100 %), cálculo de avance promedio de la capa Back, registro cronológico en la cabecera de la tabla y conservación del Front % intacto. | `docs/00-Plan-y-Backlog-RF.md` |
| `clean-code-architecture` | Modularidad limpia, inyección de dependencias estricta sin dependencias faltantes, prohibición absoluta de `any` (uso de `unknown` y tipos fuertes), y arquitectura limpia de módulos. | `src/features/features.module.ts`, `src/features/horarios/horarios.module.ts`, `test/features/rf-008-cableado.spec.ts` |
| `testing-guidelines` | Estructura de pruebas unitarias/integración bajo `test/features/`, resolución de dependencias con mocks limpios para infraestructura externa (DB y colas Redis/BullMQ), patrón AAA. | `test/features/rf-008-cableado.spec.ts` |
| `nestjs-best-practices` | `arch-module-sharing`, `di-prefer-constructor-injection`, resolución completa del árbol de providers sin service locators. | `src/features/features.module.ts`, `src/features/horarios/horarios.module.ts` |

---

## 3. Revisión de Auditoría (RF-003)

Se revisaron minuciosamente todas las operaciones mutacionales de negocio en los tres módulos para asegurar la trazabilidad inmutable mediante `auditService.log`:

1. **`SeccionesService`:**
   - `create`: Registra evento `accion: "crear"` en tabla `secciones` con datos serializados de la nueva sección.
   - `update`: Registra evento `accion: "actualizar"` en tabla `secciones` con `valorAnterior` y `valorNuevo`.
   - `cerrar`: Registra evento `accion: "actualizar"` en tabla `secciones` auditando el cambio de estado.

2. **`CargaAcademicaService`:**
   - `asignarDocente` (asignación): Registra evento `accion: "actualizar"` en tabla `cursos_seccion` con `docenteId` anterior y nuevo.
   - `asignarDocente` (desasignación con `docenteId: null`): Registra evento `accion: "actualizar"` en tabla `cursos_seccion`.

3. **`HorariosService`:**
   - `crearBloque`: Registra evento `accion: "crear"` en tabla `horarios`.
   - `actualizarBloque`: Registra evento `accion: "actualizar"` en tabla `horarios`.
   - `eliminarBloque`: Registra evento `accion: "eliminar"` en tabla `horarios`.
   - `copiarHorario`: Registra evento `accion: "crear"` en tabla `horarios` para cada bloque de clase o receso replicado en la sección destino.

**Resultado:** Cero omisiones detectadas. Todas las mutaciones invocan `auditService.log` adecuadamente.

---

## 4. Resultado de la Prueba de Cableado Real

Se implementó `test/features/rf-008-cableado.spec.ts` compilando los módulos reales `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule`.
- Infraestructura externa sobreescrita:
  - `DRIZZLE`: Mapeado a un mock global exportado para abstraer la conexión física a PostgreSQL.
  - `RedisService`: Mapeado a un mock global exportado para evitar conexión TCP real a Redis requerida por el caché de roles.
  - Colas BullMQ (`QUEUES.AUDIT`, `QUEUES.ANIO_ESCOLAR`): Sobreescritas con `.overrideProvider` para aislar los listeners de BullMQ.
- Verificaciones exitosas:
  - `SeccionesService`, `SeccionesController` y `SeccionesRepository` resueltos e instanciados correctamente.
  - `CargaAcademicaService`, `CargaAcademicaController` y `CargaAcademicaRepository` resueltos e instanciados correctamente.
  - `HorariosService`, `HorariosController` y `HorariosRepository` resueltos e instanciados correctamente.

---

## 5. Medición de Avance del Backlog (RF-008)

Lista de escenarios Gherkin de `RF-008` (todos aplican a la capa Back por contener reglas de negocio, persistencia, validaciones de servidor o permisos) y su cobertura comprobada:

```
RF-008 — capa Back (20 de 20 escenarios = 100 %)
✅ CP-RF008-01: Crear una sección                               (test: test/features/secciones/secciones.service.spec.ts)
✅ CP-RF008-02: Sección repetida                                (test: test/features/secciones/secciones.service.spec.ts)
✅ CP-RF008-03: Vacantes inválidas                              (test: test/features/secciones/secciones.service.spec.ts)
✅ CP-RF008-04: Tutor de dos secciones                          (test: test/features/secciones/secciones.service.spec.ts)
✅ CP-RF008-05: Cerrar una sección con matriculados             (test: test/features/secciones/secciones.service.spec.ts)
✅ CP-RF008-06: Asignar un docente                              (test: test/features/carga-academica/carga-academica.service.spec.ts)
✅ CP-RF008-07: Docente inactivo                                (test: test/features/carga-academica/carga-academica.service.spec.ts)
✅ CP-RF008-08: Exceso de carga horaria                         (test: test/features/carga-academica/carga-academica.service.spec.ts)
✅ CP-RF008-09: Cambiar el docente a mitad de año               (test: test/features/carga-academica/carga-academica.service.spec.ts)
✅ CP-RF008-10: Ver la carga de un docente                      (test: test/features/carga-academica/carga-academica.service.spec.ts)
✅ CP-RF008-11: Proponer la grilla del día                      (test: test/features/horarios/horarios-grilla-copia.service.spec.ts)
✅ CP-RF008-12: Asignar un curso a un bloque                    (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-13: Bloque doble                                    (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-14: Bloques superpuestos                            (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-15: Cruce de docente                                (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-16: Horas distintas al plan                         (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-17: Copiar el horario a otra sección                (test: test/features/horarios/horarios-grilla-copia.service.spec.ts)
✅ CP-RF008-18: Cambiar el horario a mitad de año               (test: test/features/horarios/horarios.service.spec.ts)
✅ CP-RF008-19: Consultar mi horario                            (test: test/features/horarios/horarios-consulta.service.spec.ts)
✅ CP-RF008-20: Usuario sin permiso (@MenuAccess)               (test: test/features/secciones/secciones.controller.spec.ts, test/features/horarios/horarios.controller.spec.ts)
```

**Cálculo:**
- Escenarios verificados: 20
- Escenarios aplicables al backend: 20
- Porcentaje Back: **100 %**
- Front %: 0 % (se mantiene intacto)
- Estado de la fila: **`En desarrollo`**
- Avance promedio Back general: **33.5 %** (suma de 670 % / 20 RFs)

---

## 6. Dudas Abiertas en PENDIENTES.md

1. **P-03:** Se incorporó en «Supuesto actual (V1)» la precisión técnica: `El recreo (después de la 3.ª hora, 15 min) y la jornada son variables configurables jornada.*.`
2. **P-22 (Nueva):** «¿Qué debe pasar al eliminar o mover un bloque del horario que ya tiene sesiones de clase generadas? Hoy se bloquea el borrado» (A quién: Subdirección; Supuesto: Se bloquea con mensaje).
3. **P-23 (Nueva):** «El rol `Subdirector` que el RF nombra como gestor de secciones y horarios no existe en los datos iniciales; hoy solo el Administrador ve los menús Secciones y Horarios. ¿Se crea el rol o lo gestiona otro rol?» (A quién: Dirección; Supuesto: Solo el Administrador gestiona Secciones y Horarios hasta definir el rol Subdirector).

---

## 7. Salida de Comandos de Verificación

### 7.1 `.agents/tools/verificar_tarea.sh T08 --suite-completa`
```
OK
```
*(Incluye chequeo de tipos con `tsconfig.verificacion.json`, `eslint src test`, suite completa de `jest` [34 suites, 319 tests pasados], `nest build` y comprobación de cero patrones prohibidos).*

### 7.2 `pnpm exec jest test/features/rf-008-cableado.spec.ts`
```
PASS test/features/rf-008-cableado.spec.ts
  Cableado de dependencias RF-008
    ✓ debe resolver SeccionesService, SeccionesController y SeccionesRepository (2 ms)
    ✓ debe resolver CargaAcademicaService, CargaAcademicaController y CargaAcademicaRepository (1 ms)
    ✓ debe resolver HorariosService, HorariosController y HorariosRepository

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        3.483 s
```

### 7.3 `pnpm typecheck`
```
> sga-api@0.0.1 typecheck /home/heverlima/DEV_LINUX/Tesis/SGA-API
> tsc --noEmit
(0 errores)
```

### 7.4 `git diff --stat`
```
 docs/00-Plan-y-Backlog-RF.md             |  5 +++--
 docs/requerimientos/PENDIENTES.md        |  5 ++++-
 src/features/features.module.ts          |  6 ++++++
 src/features/horarios/horarios.module.ts |  3 ++-
 4 files changed, 15 insertions(+), 4 deletions(-)
```
*(Además del nuevo archivo `test/features/rf-008-cableado.spec.ts`)*.

---

## Commit propuesto

```
feat(rf-008): registrar modulos, verificar cableado y actualizar backlog

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```
