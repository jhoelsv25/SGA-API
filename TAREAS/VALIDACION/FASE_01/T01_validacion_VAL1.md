# Validación T01 — Variables de jornada y menús "Secciones" y "Horarios" (seed) · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Constantes de ruta para RF-008 en `menu-rutas.constants.ts` (`MENU_SECCIONES = "/admin/secciones"`, `MENU_HORARIOS = "/admin/horarios"` y comentario descriptivo). | **PASA** | `src/common/constants/menu-rutas.constants.ts:7-11` | Rutas correctas, documentadas indicando que las escrituras del servidor exigen este menú vía `@MenuAccess`. |
| 2 | Inserción de variables de jornada en `seed.ts` (`jornada.recreo_despues_de_hora` = 3 h, `jornada.minutos_recreo` = 15 min, unidad, mínimos y máximos). | **PASA** | `src/core/database/seed.ts:248-266` | Variables añadidas a `VARIABLES_SEED` dentro del módulo `organizacion`. Idempotencia garantizada por el ciclo de inserción (`seed.ts:430-452`). |
| 3 | Menú contenedor «Organización escolar» e hijos «Secciones» y «Horarios» en el módulo `academico` con iconos de la aplicación y orden adecuado. | **PASA** | `src/core/database/seed.ts:774-798` | Inserción idempotente con `NOT EXISTS`. Iconos consistentes con la convención del proyecto (`UserGroupIcon`, `Clock01Icon`). |
| 4 | Asignación de ambos menús en `rol_menus` para `Administrador` y `Subdirector` (`ON CONFLICT DO NOTHING`) e inspección de existencia del rol `Subdirector`. | **PASA** | `src/core/database/seed.ts:800-806` | El rol `Subdirector` no existe en `ROLES_SEED` (`seed.ts:474-510`). Cumplió con no inventarlo y reportarlo en `TAREAS/T01_informe.md:34-37`. La consulta SQL enlaza `Administrador` y queda lista para `Subdirector`. |
| 5 | Manejo de salida `console.log` conforme a reglas normativas del proyecto. | **PASA** | `TAREAS/T01_informe.md:38-41` | El DEV omitió el `console.log` nuevo debido a la restricción obligatoria del harness (`verificar_tarea.sh` y `.agents/rules/restricciones_agy.md`). Correcta aplicación de la precedencia de reglas. |
| 6 | Integridad de tipado y linter (`pnpm typecheck` y `pnpm exec eslint ...`). | **PASA** | `TAREAS/VALIDACION/verificar_T01.log:2-8` | `tsc --noEmit` y `eslint .` finalizados con exit code 0 sin errores ni advertencias. |
| 7 | Pruebas de regresión (`pnpm test` >= 253 pruebas pasadas). | **PASA** | `TAREAS/VALIDACION/verificar_T01.log:10-45` | 25 de 25 suites pasadas, 253 de 253 pruebas pasadas (cero fallos). |
| 8 | Control de alcance de archivos modificados (`git status --porcelain`). | **PASA** | `git status --porcelain` | Únicamente los 2 archivos permitidos modificados en `src/`: `src/common/constants/menu-rutas.constants.ts` y `src/core/database/seed.ts`. |

---

## Matriz de Trazabilidad con RF-008 (Gherkin / Casos de Prueba)

La tarea T01 pertenece a la capa de base de datos / infraestructura de datos base (seed). Prepara los datos requeridos para los escenarios Gherkin del RF-008:

| Escenario Gherkin / ID Caso | Relación con T01 | Estado en T01 |
|---|---|:---:|
| `CP-RF008-11` (HU3 - Proponer la grilla del día) | Requiere la parametrización de jornada escolar y duración/posición del recreo. Provisto por `jornada.recreo_despues_de_hora` (3) y `jornada.minutos_recreo` (15) en `seed.ts:248-266`. | **Soportado (Datos Base)** |
| `CP-RF008-20` (HU3 - Usuario sin permiso / accesos) | Valida que perfiles sin permiso no puedan acceder ni mutar secciones u horarios. Provisto por `MENU_SECCIONES` y `MENU_HORARIOS` en `menu-rutas.constants.ts:10-11` y la asignación en `rol_menus` en `seed.ts:800-806`. | **Soportado (Rutas y Menús)** |
| `CP-RF008-01` a `CP-RF008-10`, `CP-RF008-12` a `CP-RF008-19` | Casos de negocio (secciones, carga académica, horarios, cruces, cierres). | **Diferido a T02–T07** (T02 implementará las pruebas en rojo). |

---

## Pruebas Ejecutadas

- **Verificación automatizada con script del harness:** `.agents/tools/verificar_tarea.sh T01` → Salida `OK` (Exit code 0).
- **Verificación de tipos:** `pnpm typecheck` (`tsc --noEmit`) → 0 errores.
- **Verificación de estilo y calidad:** `pnpm lint` (`eslint .`) → 0 errores.
- **Suite completa de pruebas unitarias/integración:** `pnpm test` (`jest`) → 25 suites pasadas, 253 pruebas pasadas, 0 fallidas.
- **Verificación de patrones prohibidos:** Sin `console.log` nuevos en el código de producción, sin `any`, sin `@ts-ignore`, sin `debugger`.

---

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/core/database/seed.ts:474-510` | El rol `Subdirector` no existe en `ROLES_SEED`. El DEV cumplió con la instrucción de no inventar el rol y reportarlo. La query `WHERE r.nombre IN ('Administrador', 'Subdirector')` asocia al rol `Administrador` y queda preparada para cuando se cree `Subdirector`. |
| **baja** | `src/core/database/seed.ts:784-798` | La condición de idempotencia para la inserción de las opciones hijas («Secciones» y «Horarios») comprueba `NOT EXISTS (SELECT 1 FROM menus x WHERE x.ruta = $1::varchar)`. En el modelo actual las rutas son globales y únicas, por lo que es seguro, pero se aconseja considerar la tupla `(modulo_id, ruta)` si a futuro existieran rutas duplicadas entre distintos módulos. |

---

## Recomendación al DEV

La tarea T01 cumple de manera precisa con todos los criterios de aceptación funcionales, normativos y de calidad. Se aprueba la entrega y se recomienda esperar la confirmación de Claude para proceder con el commit propuesto y dar inicio a la tarea T02 (`test/features/secciones/**`, `test/features/carga-academica/**`, `test/features/horarios/**`).
