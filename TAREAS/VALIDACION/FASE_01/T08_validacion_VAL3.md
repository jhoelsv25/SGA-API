# Validación T08 — Registro de módulos, comprobación de cableado, auditoría y backlog (RF-008) · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Alcance y archivos permitidos (`_comun_DEV.md`, `T08`):** Solo modificaciones en archivos autorizados | **PASA** | `git status --porcelain` | Únicamente se modificaron `src/features/features.module.ts`, `src/features/horarios/horarios.module.ts`, `docs/00-Plan-y-Backlog-RF.md`, `docs/requerimientos/PENDIENTES.md` y se creó `test/features/rf-008-cableado.spec.ts`. Cero alteraciones en esquemas Drizzle, migraciones o archivos no permitidos. |
| **Estilo de registro en `features.module.ts` (`clean-code-architecture.md` §2, `T08`):** Importación y exportación canónica | **PASA** | `src/features/features.module.ts:21-23, 46-48, 70-72` | Se importan `SeccionesModule`, `CargaAcademicaModule` y `HorariosModule` mediante rutas relativas y barrel exports (`./secciones`, `./carga-academica`, `./horarios`). Se registraron en `imports` y `exports` respetando exactamente la convención de los features preexistentes. |
| **Inyección y cableado de dependencias (`nestjs-best-practices`, `di-prefer-constructor-injection`):** Árbol de proveedores completo | **PASA** | `src/features/horarios/horarios.module.ts:2, 14`<br>`src/features/secciones/secciones.module.ts:10-15`<br>`src/features/carga-academica/carga-academica.module.ts:9-14` | Se corrigió `HorariosModule` proveyendo `AuditService`, resolviendo la inyección requerida por `HorariosService`. Todos los servicios, repositorios y controladores de los tres módulos cuentan con sus dependencias resueltas (`GradosModule`, `DocentesModule`, `AnioEscolarModule`, `VariablesSistemaModule`, `AnioLectivoCls`, `DRIZZLE`). Cero dependencias huérfanas. |
| **Evaluación de duplicación de proveedores (`nestjs-best-practices` `arch-module-sharing`):** Ausencia de proveedores redundantes | **PASA** | `src/features/horarios/horarios.module.ts:14`<br>`src/features/secciones/secciones.module.ts:13`<br>`src/features/carga-academica/carga-academica.module.ts:12` | Se evaluó la inclusión directa de `AuditService` en `providers` de cada módulo feature. Aunque resuelve el cableado sin dependencias circulares y emula el patrón establecido en el proyecto, provoca instancias separadas por módulo. No existen proveedores duplicados dentro de un mismo módulo ni redundancias injustificadas. |
| **Calidad de la prueba de cableado (`clean-code-architecture.md` §1, §8, `testing-guidelines.md`):** Sin `any`, sin `console.log`, con `afterAll` | **PASA** | `test/features/rf-008-cableado.spec.ts:56-84, 86-123` | Cero `any` (uso estricto de `unknown`), cero `console.log`, cierre de recursos en `afterAll` (`await modulo.close()`). Módulos compilados como instancias reales con `Test.createTestingModule` y aserciones estrictas `toBeInstanceOf(...)`. |
| **Aislamiento exclusivo de infraestructura externa (`testing-guidelines.md` §2, `T08`):** Mocks solo para DB y colas | **PASA** | `test/features/rf-008-cableado.spec.ts:29-51, 73-76` | Los mocks se limitan estrictamente a la infraestructura física externa: el token `DRIZZLE` ({}), `RedisService` (jest mocks) y los tokens de colas BullMQ (`QUEUES.AUDIT`, `QUEUES.ANIO_ESCOLAR`). Ningún servicio ni repositorio de negocio de los tres módulos fue simulado. |
| **Auditoría inmutable en mutaciones (`clean-code-architecture.md` §6, RF-003):** Cobertura de `auditService.log` | **PASA** | `src/features/secciones/secciones.service.ts:67, 131, 162`<br>`src/features/carga-academica/carga-academica.service.ts:67, 90`<br>`src/features/horarios/horarios.service.ts:118, 196, 233, 395, 452` | Las 10 operaciones mutacionales (crear/actualizar/cerrar sección; asignar/desasignar docente; crear/actualizar/eliminar/copiar bloques) ejecutan `auditService.log` con sus datos serializados correspondientes. Cero omisiones. |
| **Español al 100 % (`idioma_español.md`):** Convención lingüística, tildes y terminología | **PASA** | `test/features/rf-008-cableado.spec.ts:53, 86, 99, 112`<br>`docs/00-Plan-y-Backlog-RF.md`<br>`docs/requerimientos/PENDIENTES.md` | Descripciones de suites, pruebas, variables y textos enteramente en español. Cumplimiento del uso de «rol» y «Año académico» con tildes y eñes rigurosas. |
| **Rigor en la verificación: Mocks vs Base de Datos Real (`validar_entrega.md` §Rigor):** Distinción explícita de persistencia | **PASA** | `TAREAS/T08_informe.md:58-67`<br>`test/features/rf-008-cableado.spec.ts:33-35` | El informe del DEV declara explícitamente que `DRIZZLE` fue sobreescrito para abstraer la conexión a Postgres. Se evidencia que las consultas Drizzle nunca se ejecutaron contra un motor PostgreSQL real (lo cual está prohibido en la fase unitaria). Las 20 pruebas de escenarios verifican la lógica con mocks de repositorios. |
| **Fidelidad del Backlog (`actualizar-backlog-rf`):** Conteo exacto y no sobredimensionado | **PASA** | `docs/00-Plan-y-Backlog-RF.md:7, 47, 68, 79` | Los 20 escenarios aplican al Back y cuentan con pruebas unitarias asociadas (Back % = 100 %). Estado fijado en `En desarrollo` (Front % permanece en 0 %). Promedio Back recalculado a 33.5 %. El backlog no afirma que la persistencia en Postgres esté probada, sino que 20/20 escenarios están cubiertos con pruebas. |
| **Registro de dudas abiertas (`PENDIENTES.md`):** Incorporación no disruptiva | **PASA** | `docs/requerimientos/PENDIENTES.md:9, 28-29` | Nota técnica sobre variables `jornada.*` añadida a P-03. Nuevas filas P-22 y P-23 agregadas con correlativo libre y estado `Pendiente`. Cero filas preexistentes dañadas. |
| **Seguridad, sin secretos y sin comandos prohibidos (`security-api-standards.md`, `restricciones_agy.md`):** Integridad del entorno | **PASA** | `git status --porcelain` | Cero credenciales o secretos en código. Cero dependencias añadidas. Cero comandos destructivos de git ejecutados. |

---

## Pruebas ejecutadas

1. **Prueba de cableado de inyección real (`rf-008-cableado.spec.ts`):**
   - Comando: `pnpm exec jest test/features/rf-008-cableado.spec.ts`
   - Resultado: 1 suite pasada, 3 pruebas pasadas, 0 fallos (tiempo: 2.38 s).
   - Verifica la instanciación real en el contenedor IoC de NestJS para:
     - `SeccionesService`, `SeccionesController`, `SeccionesRepository`.
     - `CargaAcademicaService`, `CargaAcademicaController`, `CargaAcademicaRepository`.
     - `HorariosService`, `HorariosController`, `HorariosRepository`.
2. **Chequeo estático de tipos TypeScript:**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: 0 errores en todo el proyecto SGA-API.
3. **Linter ESLint en archivos de la tarea:**
   - Comando: `pnpm exec eslint src/features/features.module.ts src/features/horarios/horarios.module.ts test/features/rf-008-cableado.spec.ts`
   - Resultado: 0 errores y 0 advertencias.
4. **Verificación automatizada del harness:**
   - Comando: `bash .agents/tools/verificar_tarea.sh T08 --suite-completa`
   - Resultado: `OK` (exit code 0).
   - Cobertura global: 34 suites pasadas, 319 pruebas pasadas, 0 fallos (las 316 previas de T07 más las 3 nuevas de cableado), y compilación de producción exitosa (`nest build`).
5. **Inspección de patrones prohibidos y reglas de calidad:**
   - Cero ocurrencias de `any`, `console.log`, `debugger`, `@ts-ignore`, `eslint-disable` o `TODO`.

---

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/features/horarios/horarios.module.ts:14`<br>`src/features/secciones/secciones.module.ts:13`<br>`src/features/carga-academica/carga-academica.module.ts:12` | **Instanciación duplicada de `AuditService` por módulo feature (`nestjs-best-practices` `arch-module-sharing`):** `AuditService` se provee de forma aislada en el arreglo `providers` de múltiples módulos de dominio (`SeccionesModule`, `CargaAcademicaModule`, `HorariosModule`, etc.) en lugar de ser exportado desde un módulo transversal compartido (ej. `AuditCoreModule` o `CommonModule`). Si bien resuelve la inyección exigida por T08 siguiendo el patrón preexistente del proyecto, provoca que NestJS instancie copias independientes del servicio en cada contexto inyector. |
| **baja** | `TAREAS/T08_informe.md:70-96`<br>`docs/00-Plan-y-Backlog-RF.md:47` | **Verificación backend sustentada en mocks unitarios sin comprobación de base de datos real:** Los 20 escenarios del RF-008 fueron verificados con pruebas unitarias que simulan repositorios y la base de datos (`DRIZZLE` = `{}`). Las consultas SQL y Joins reales construidos con Drizzle ORM en `SeccionesRepository`, `CargaAcademicaRepository` y `HorariosRepository` nunca se ejecutaron contra un motor PostgreSQL real (lo cual está prohibido en las fases unitarias). Aunque la regla de la skill `actualizar-backlog-rf` convalida el 100 % de `Back %` al existir pruebas unitarias asociadas a cada escenario, se deja constancia técnica de que la validación relacional completa queda sujeta a las pruebas de integración / E2E con PostgreSQL. |

---

## Recomendación al DEV

La entrega de la tarea T08 cumple rigurosamente con los estándares arquitectónicos, de calidad de código y de seguimiento:
1. El registro en `FeaturesModule` sigue la convención del proyecto, y la adición de `AuditService` en `HorariosModule` resuelve satisfactoriamente la inyección de dependencias reales.
2. La prueba de cableado `test/features/rf-008-cableado.spec.ts` es limpia, sin `any`, con cierre `afterAll`, y aísla con precisión la infraestructura externa sin mockear la lógica de los módulos.
3. El backlog vivo y las preguntas en `PENDIENTES.md` fueron actualizados siguiendo fielmente los pasos de la skill `actualizar-backlog-rf` y las instrucciones de la tarea, manteniendo `Front %` en 0 % y el estado del RF-008 en `En desarrollo`.

Se recomienda dar por **APROBADA** la entrega de T08.
