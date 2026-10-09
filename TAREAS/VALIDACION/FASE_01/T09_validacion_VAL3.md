# Validación T09 — Backlog: Avance del Front % del RF-008 y Pendiente de Apoderados · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de aceptación

| Criterio / Regla de Calidad | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Alcance y archivos permitidos (`T09`, `_comun_DEV.md`):** Modificaciones restringidas exclusivamente a los 2 archivos autorizados | **PASA** | `git status --porcelain`<br>`git diff --stat` | Se modificaron únicamente `docs/00-Plan-y-Backlog-RF.md` y `docs/requerimientos/PENDIENTES.md`. Cero alteraciones en código fuente de SGA-API o SGA-WEB, esquemas Drizzle o archivos ajenos. |
| **Cómputo estricto del porcentaje por escenarios (`actualizar-backlog-rf` §Paso 2, regla 1):** Porcentaje derivado del conteo de escenarios Gherkin | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47`<br>`TAREAS/T09_informe.md:33-64` | Los 20 escenarios de RF-008 aplican a la capa Front (interfaces, validaciones, avisos, modales y navegación). Se implementaron y verificaron 19 escenarios (CP-RF008-01 a CP-RF008-18 y CP-RF008-20). Cálculo exacto: 19 ÷ 20 × 100 = 95 %. Cero estimaciones subjetivas. |
| **Escenario no cubierto no suma (`actualizar-backlog-rf` regla 2, `T09`):** Escenarios parciales o sin verificar no suman | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47, 79`<br>`TAREAS/T09_informe.md:60` | El escenario CP-RF008-19 (consulta de horario por apoderado) no está completamente cubierto en la pantalla al carecer la API de un endpoint para listar los estudiantes del apoderado en sesión. En estricto apego a la regla, no suma y se contabiliza como no cubierto. |
| **Exclusividad de la capa Front (`actualizar-backlog-rf` §Paso 3, regla 4):** Modificación únicamente de la columna propia | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47` | En la fila RF-008 se modificó exclusivamente `Front %` de 0 % a 95 %. `Back %` permaneció inalterado en 100 %. Cero cambios en columnas correspondientes al backend. |
| **Estado coherente del RF (`actualizar-backlog-rf` §Paso 3):** Asignación de estado según matriz de avance | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47` | Al estar Back en 100 % y Front en 95 %, el estado se mantiene correctamente en `En desarrollo` (ambas capas deben estar en 100 % para pasar a `Completado`). |
| **Recálculo matemático del promedio Front (`actualizar-backlog-rf` §Paso 3, `T09`):** Recálculo aritmético de las 20 filas | **PASA** | `docs/00-Plan-y-Backlog-RF.md:69`<br>`TAREAS/T09_informe.md:67-96` | La suma exacta de los 20 porcentajes de la columna Front es 617 % (81 + 74 + 100 + 100 + 67 + 100 + 0 + 95 + 0...). Dividido entre 20 arroja exactamente 30.85 %, reemplazando el 21.4 % anterior. |
| **Ubicación y formato del Registro de avance (`actualizar-backlog-rf` §Paso 3, reglas 5 y 6):** Fila arriba con formato `AAAA-MM-DD` | **PASA** | `docs/00-Plan-y-Backlog-RF.md:79` | La nueva fila se insertó en la primera posición disponible (ARRIBA) de la tabla de la sección 2.1 con fecha `2026-10-09` en formato canónico ISO `AAAA-MM-DD`. |
| **Veracidad de la nota de verificación y rigor (`T09`, `validar_entrega.md` §Rigor):** Declaración transparente de los métodos de comprobación | **PASA** | `docs/00-Plan-y-Backlog-RF.md:79`<br>`TAREAS/T09_informe.md:18` | La nota explicativa indica con fidelidad técnica: «Verificación: typecheck, lint y build limpios y comprobado en código por validadores (SGA-WEB no tiene ejecutor de pruebas automáticas)». El backlog no afirma que se hayan ejecutado pruebas en navegador real ni contra una base de datos real. |
| **Registro íntegro del pendiente P-24 (`PENDIENTES.md`, `T09`):** Nueva entrada correlativa sin alterar filas previas | **PASA** | `docs/requerimientos/PENDIENTES.md:30` | Se añadió al final la fila `P-24`, asociada a `RF-008`, con la formulación exacta exigida, destinatario `Dirección / equipo de desarrollo`, supuesto actual y estado `Pendiente`. Ninguna fila existente fue alterada. |
| **Idioma español y terminología (`idioma_español.md`):** Redacción completa en español normativo | **PASA** | `docs/00-Plan-y-Backlog-RF.md:79`<br>`docs/requerimientos/PENDIENTES.md:30` | Redacción íntegra en español con correcta acentuación gráfica (tildes en `académica`, `sección`, `dinámica`, `automáticas`, `inició`, `sesión`, `aún`, `está`) y uso adecuado de términos del dominio (`apoderado`, `rol`). |
| **Seguridad y restricciones operativas (`restricciones_agy.md`):** Integridad del entorno y sin acciones prohibidas | **PASA** | `git status --porcelain` | Sin dependencias agregadas, sin exposición de secretos ni credenciales, y sin comandos destructivos o prematuros de git (`git commit` en espera de confirmación). |

---

## Pruebas ejecutadas

1. **Chequeo de tipos estáticos TypeScript (`pnpm typecheck`):**
   - Comando: `pnpm typecheck` (`tsc --noEmit`)
   - Resultado: Salida limpia, 0 errores en SGA-API.
2. **Control de archivos en diff (`git diff --stat`):**
   - Comando: `git diff --stat`
   - Salida:
     ```text
     docs/00-Plan-y-Backlog-RF.md      | 5 +++--
     docs/requerimientos/PENDIENTES.md | 1 +
     2 files changed, 4 insertions(+), 2 deletions(-)
     ```
   - Resultado: Estrictamente los 2 archivos permitidos.
3. **Verificación automatizada del harness (`verificar_tarea.sh T09`):**
   - Archivo de registro: `TAREAS/VALIDACION/verificar_T09.log`
   - Resultado: OK (34 suites pasadas, 319 pruebas unitarias Jest pasadas, 0 fallos).
4. **Verificación manual del recálculo aritmético:**
   - Suma Front: 81 + 74 + 100 + 100 + 67 + 100 + 0 + 95 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 = 617 %.
   - Promedio: 617 ÷ 20 = 30.85 %.
   - Verificado contra la tabla y el resumen del backlog.

---

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `docs/00-Plan-y-Backlog-RF.md:79`<br>`TAREAS/T09_informe.md:18` | **Transparencia de la verificación en frontend sin ejecución contra entorno real:** La nota de verificación en el registro de avance señala correctamente que SGA-WEB no cuenta con ejecutor de pruebas automáticas (la verificación se limitó a typecheck, lint, build estático y revisión de código por validadores W01–W05). Se deja constancia técnica de que ninguna pantalla ni consulta fue ejecutada contra una base de datos PostgreSQL real ni probada en un navegador real automatizado (ej. Playwright/Cypress), quedando la validación funcional E2E sujeta a la posterior etapa de pruebas integradas de la aplicación. |
| **baja** | `docs/00-Plan-y-Backlog-RF.md:47`<br>`docs/requerimientos/PENDIENTES.md:30` | **Dependencia de consulta en API para completar el 100 % de Front en RF-008 (P-24):** El escenario CP-RF008-19 no alcanza el 100 % debido a que la API actual carece de un endpoint para consultar los estudiantes asociados a un apoderado autenticado. El registro riguroso de P-24 en PENDIENTES.md y la deducción del 5 % en Front % (dejándolo en 95 %) reflejan con exactitud el principio de que un escenario no cubierto no suma, protegiendo la veracidad del avance. |

---

## Recomendación al DEV

La entrega de la tarea T09 cumple de forma impecable con todas las reglas de calidad, rigor y seguimiento del backlog:
1. El avance de la capa Front del RF-008 se calculó a partir de los 20 escenarios Gherkin aplicables (19 cubiertos / 20 = 95 %), deduciendo honestamente el escenario que no cuenta con soporte completo de backend.
2. El promedio Front fue recalculado matemáticamente a 30.85 % sobre las 20 filas del backlog.
3. El registro de avance fue insertado en la parte superior con fecha ISO `2026-10-09` y una nota transparente sobre el alcance de la verificación en SGA-WEB.
4. El pendiente P-24 quedó formulado con precisión técnica y sin distorsionar el catálogo de pendientes preexistentes.

Se recomienda dar por **APROBADA** la entrega de T09.
