# Validación T09 — Backlog: Avance del Front % del RF-008 y Pendiente de Apoderados · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | **Verificación en código real de SGA-WEB:** Comprobar que los 19 escenarios marcados como implementados lo están efectivamente en las rutas y archivos citados en el informe. | **PASA** | `SGA-WEB/features/{secciones,carga-academica,horarios,mi-horario}`<br>`SGA-WEB/app/admin/{secciones,horarios,mi-horario,docentes}` | Los 19 escenarios de interfaz e interacción cuentan con componentes, hooks de mutación/query, diálogos, validaciones Zod y gestión de errores HTTP 400/409 reales en SGA-WEB. |
| 2 | **Exclusión justificada de CP-RF008-19:** Comprobar que el escenario de consulta por apoderado está bien excluido de la suma de avance por no existir mecanismo para listar sus estudiantes. | **PASA** | `SGA-WEB/features/mi-horario/mi-horario-page.tsx:87-93`<br>`SGA-WEB/features/mi-horario/consts/mi-horario.constants.ts:21-23` | Se comprobó que el rol `apoderado` muestra un estado explicativo (`EmptyState` con `APODERADO_SIN_LISTADO_TITULO/DESCRIPCION`) informando que no dispone del selector de estudiantes. Siguiendo la regla de la tarea, no suma. |
| 3 | **Recálculo de Front % y promedio general:** Verificar que Front % = 19 ÷ 20 = 95 % y que el promedio Front de las 20 filas es exactamente 30.85 %. | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47`<br>`docs/00-Plan-y-Backlog-RF.md:69` | Suma manual de las 20 filas: $81 + 74 + 100 + 100 + 67 + 100 + 0 + 95 + (0 \times 12) = 617\,\%$. Promedio: $617 / 20 = 30.85\,\%$. Cómputo exacto. |
| 4 | **Integridad de capas (Back % intacto):** Asegurar que la columna Back % de RF-008 no haya sido modificada y permanezca en 100 %. | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47`<br>`git diff docs/00-Plan-y-Backlog-RF.md` | La columna Back % se mantuvo estrictamente en `100 %`. Solo mutó Front % de `0 %` a `95 %`. |
| 5 | **Coherencia del Estado según la skill:** Comprobar que el estado de la fila RF-008 sea `En desarrollo` (Back 100 % y Front 95 % no es Completado). | **PASA** | `docs/00-Plan-y-Backlog-RF.md:47` | La regla de la skill `actualizar-backlog-rf` estipula que `Completado` exige Back 100 % y Front 100 %; al estar Front en 95 %, el estado reglamentario es `En desarrollo`. |
| 6 | **Alcance estricto y registro de pendientes:** Verificar que solo se tocaron los 2 archivos permitidos (`git diff --stat`), P-24 agregado al final de `PENDIENTES.md` y registro en el backlog. | **PASA** | `docs/00-Plan-y-Backlog-RF.md:79`<br>`docs/requerimientos/PENDIENTES.md:30`<br>`git diff --stat` | `git diff --stat` muestra únicamente 2 archivos modificados. P-24 se añadió al final sin tocar filas preexistentes. Fila agregada arriba del registro de avance con fecha `2026-10-09`. |

---

## 1. Comprobación de Escenarios contra el Código Real de SGA-WEB

Se inspeccionó de manera directa el código fuente de los módulos frontend en `/home/heverlima/DEV_LINUX/Tesis/SGA-WEB` (modo solo lectura), constatando los commits `8324d15` (W01), `89ea26c` (W02), `a4d249a` (W03), `e001c33` (W04) y `fa225b5` (W05):

### Historia de Usuario 1: Secciones (W01)

| Escenario Gherkin | Código CP | Archivo verificado en SGA-WEB | Evidencia técnica encontrada | Estado |
|---|---|---|---|:---:|
| **Crear una sección** | CP-RF008-01 | `features/secciones/components/forms/seccion-form.tsx`<br>`features/secciones/components/modals/create-seccion-modal.tsx` | Formulario completo con `useForm`, validaciones Zod, selectores de grado y tutor, y mutación `useCreateSeccionMutation`. | **PASA** |
| **Sección repetida** | CP-RF008-02 | `features/secciones/components/forms/seccion-form.tsx:111-112` | Captura de error 409 de `ApiClientError` asignando el error al campo `nombre` con el mensaje exacto (*"Ya existe la sección A de 5.° en este año."*). | **PASA** |
| **Vacantes inválidas** | CP-RF008-03 | `features/secciones/schemas/seccion.schema.ts:3-8` | Regla Zod `vacantesNumberSchema` con `.min(1, "Las vacantes deben ser mayores que 0.")` y bloqueo previo al submit. | **PASA** |
| **Tutor de dos secciones** | CP-RF008-04 | `features/secciones/components/forms/seccion-form.tsx:115-116` | Captura de conflicto 409 mapeando el mensaje de tutor al campo `tutorId` (*"Este docente ya es tutor de otra sección en este año."*). | **PASA** |
| **Cerrar una sección con matriculados** | CP-RF008-05 | `features/secciones/views/columns/seccion-actions.tsx:48-60`<br>`features/secciones/hooks/use-secciones-query.ts:84-96` | Diálogo de confirmación en `TableRowActions` y `useCerrarSeccionMutation` con captura 409 mostrando *"No se puede cerrar una sección con estudiantes matriculados."* vía toast. | **PASA** |

### Historia de Usuario 2: Carga académica (W02, W05)

| Escenario Gherkin | Código CP | Archivo verificado en SGA-WEB | Evidencia técnica encontrada | Estado |
|---|---|---|---|:---:|
| **Asignar un docente** | CP-RF008-06 | `features/carga-academica/views/seccion-carga-view.tsx:103-106`<br>`features/carga-academica/views/columns/seccion-carga-actions.tsx` | Toast de éxito mostrando *"Docente asignado. Carga horaria: X de Y horas."* derivado de la respuesta de la mutación. | **PASA** |
| **Docente inactivo** | CP-RF008-07 | `features/carga-academica/views/seccion-carga-view.tsx:51-54,67` | Query de docentes con `estado: "activo"` y filtrado defensivo adicional `.filter(d => d.estado === 'activo')`, impidiendo seleccionar docentes inactivos. | **PASA** |
| **Exceso de carga horaria** | CP-RF008-08 | `features/carga-academica/components/confirmacion-exceso-dialog.tsx`<br>`features/carga-academica/views/seccion-carga-view.tsx:111-120` | Captura de 409 con advertencia de jornada superada, modal de confirmación con mensaje de la API y reintento con `confirmarExceso: true`. | **PASA** |
| **Cambiar el docente a mitad de año** | CP-RF008-09 | `features/carga-academica/views/seccion-carga-view.tsx:85-110` | Reasignación en caliente en la tabla de carga con guardado individual por curso y actualización de la vista sin alterar sesiones históricas. | **PASA** |
| **Ver la carga de un docente** | CP-RF008-10 | `app/admin/docentes/[id]/carga/page.tsx`<br>`features/carga-academica/views/docente-carga-view.tsx`<br>`features/docentes/views/columns/docente-actions.tsx:21-27` | Vista completa de asignaciones lectivas y totales de jornada por docente, enlazada desde las acciones de la tabla de docentes. | **PASA** |

### Historia de Usuario 3: Horario semanal (W03, W04, W05)

| Escenario Gherkin | Código CP | Archivo verificado en SGA-WEB | Evidencia técnica encontrada | Estado |
|---|---|---|---|:---:|
| **Proponer la grilla del día** | CP-RF008-11 | `features/horarios/components/modals/proponer-grilla-modal.tsx`<br>`features/horarios/views/grilla/grilla-semanal.tsx` | Modal interactivo para configurar hora de inicio y generar la grilla propuesta con receso intermedio consumiendo el endpoint correspondiente. | **PASA** |
| **Asignar un curso a un bloque** | CP-RF008-12 | `features/horarios/views/grilla/celda-vacia.tsx`<br>`features/horarios/views/grilla/celda-bloque.tsx` | Asignación interactiva por clic (con curso seleccionado) o arrastre nativo Drag & Drop, renderizando el bloque asignado con color de curso. | **PASA** |
| **Bloque doble** | CP-RF008-13 | `features/horarios/components/forms/bloque-form.tsx`<br>`features/horarios/views/grilla/grilla-semanal.tsx` | Campo para definir bloque pedagógico de 90 min (2 horas) y renderizado con `rowSpan` continuo en la matriz horaria semanal. | **PASA** |
| **Bloques superpuestos** | CP-RF008-14 | `features/horarios/hooks/use-horarios-query.ts:116-118` | Función `extraerMensajeError` captura el 409 de la API y emite el mensaje *"El bloque se cruza con otro bloque de la sección."* vía toast. | **PASA** |
| **Cruce de docente** | CP-RF008-15 | `features/horarios/hooks/use-horarios-query.ts:116-118`<br>`features/horarios/components/modals/copiar-horario-modal.tsx:50-52` | Captura de 409 y despliegue del aviso de incompatibilidad horaria del docente entre secciones; reporte detallado en copia. | **PASA** |
| **Horas distintas al plan** | CP-RF008-16 | `features/horarios/components/avisos-y-advertencias.tsx:37-53`<br>`features/horarios/components/resumen-horas-panel.tsx` | Banner informativo no bloqueante con advertencias de consistencia horaria devueltas por el servidor y panel comparativo de horas vs plan. | **PASA** |
| **Copiar el horario a otra sección** | CP-RF008-17 | `features/horarios/components/modals/copiar-horario-modal.tsx` | Modal de copia entre secciones del mismo grado con panel de conflictos detectados (docentes con cruce) y reporte de bloques replicados. | **PASA** |
| **Cambiar el horario a mitad de año** | CP-RF008-18 | `features/horarios/components/avisos-y-advertencias.tsx:22-34` | Mensaje de estatus con `role="status"` y estilo de información (*"El horario se guardó. Los cambios rigen desde mañana."*). | **PASA** |
| **Consultar mi horario** | CP-RF008-19 | `features/mi-horario/mi-horario-page.tsx:87-93`<br>`features/mi-horario/consts/mi-horario.constants.ts:21-23` | Implementado para docentes y estudiantes de sección. El apoderado no dispone de listado de estudiantes (P-24). | **EXCLUIDO (NO SUMA)** |
| **Usuario sin permiso** | CP-RF008-20 | `features/secciones/hooks/use-secciones-query.ts:26`<br>`features/horarios/hooks/use-horarios-permiso.ts:11`<br>`config/navigation/menu-del-usuario.ts:17-25` | Hooks de autorización `usePuedeGestionarSecciones` y `usePuedeGestionarHorarios` condicionan la UI y el menú según roles autorizados. | **PASA** |

---

## 2. Exclusión de CP-RF008-19 y Fundamentación de P-24

En `SGA-WEB/features/mi-horario/mi-horario-page.tsx`:
```tsx
{rol === "apoderado" && (
  <EmptyState
    title={TEXTOS_MI_HORARIO.APODERADO_SIN_LISTADO_TITULO}
    description={TEXTOS_MI_HORARIO.APODERADO_SIN_LISTADO_DESCRIPCION}
    icon={Calendar03Icon}
  />
)}
```
Donde `TEXTOS_MI_HORARIO` define:
- `APODERADO_SIN_LISTADO_TITULO`: *"Consulta de horario de estudiantes"*
- `APODERADO_SIN_LISTADO_DESCRIPCION`: *"Actualmente el sistema no dispone de un mecanismo para que el apoderado elija a sus estudiantes vinculados."*

**Evaluación del criterio:**
1. El requerimiento RF-008 HU3 estipula: *"cada docente ve su horario semanal (todas sus secciones); cada estudiante y apoderado ve el horario de su sección"*.
2. La implementación actual en SGA-WEB cubre plenamente la visualización de docentes y estudiantes de sección.
3. Para el apoderado, no existe en la API un endpoint que devuelva la lista de estudiantes vinculados a la cuenta del apoderado en sesión.
4. Siguiendo la regla estricta de la tarea (*«Un escenario sin cubrir (por ejemplo, el apoderado que no puede elegir a sus estudiantes) NO suma»*), se excluyó acertadamente este escenario del total implementado.
5. Se registró la consulta en `docs/requerimientos/PENDIENTES.md` como `P-24`, con estado `Pendiente` y dirigido a `Dirección / equipo de desarrollo`.

---

## 3. Verificación Matemática del Backlog

### 3.1 Cómputo del RF-008
- Escenarios que aplican a la capa Front: **20**
- Escenarios implementados y verificados: **19**
- Escenarios excluidos / pendientes: **1** (CP-RF008-19 por falta de consulta de estudiantes del apoderado)
$$\text{Front \%} = \frac{19}{20} \times 100 = 95\,\%$$

### 3.2 Tabla Completa de los 20 RFs y Promedio Front General

| RF | Requerimiento | Back % | Front % | Estado |
|---|---|:---:|:---:|---|
| RF-001 | Acceso al sistema | 100 % | 81 % | Pendiente (V3) |
| RF-002 | Usuarios, roles y menú | 70 % | 74 % | Pendiente (V3) |
| RF-003 | Bitácora de auditoría | 100 % | 100 % | Completado |
| RF-004 | Institución, turnos y equipos autorizados | 100 % | 100 % | Completado |
| RF-005 | Año escolar y calendario | 100 % | 67 % | En desarrollo |
| RF-006 | Grados, cursos y plan de estudios | 100 % | 100 % | Completado |
| RF-007 | Personas: docentes, estudiantes y apoderados | 0 % | 0 % | Por desarrollar |
| **RF-008** | **Secciones, carga académica y horarios** | **100 %** | **95 %** | **En desarrollo** |
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

**Recálculo de la suma de porcentajes Front:**
$$\sum \text{Front \%} = 81 + 74 + 100 + 100 + 67 + 100 + 0 + 95 + (0 \times 12) = 617\,\%$$

**Promedio Front:**
$$\text{Promedio Front} = \frac{617\,\%}{20} = 30.85\,\%$$

- El resumen de avance en `docs/00-Plan-y-Backlog-RF.md:69` consigna exactamente `30.85 %`.
- La columna Back % se mantuvo inalterada en `100 %`.
- El estado de RF-008 es `En desarrollo`, cumpliendo la directriz de la skill: solo pasa a `Completado` cuando Back y Front alcanzan 100 % simultáneamente.

---

## 4. Control de Archivos Modificados (`git diff`)

El comando `git diff --stat` arroja:
```text
 docs/00-Plan-y-Backlog-RF.md      | 5 +++--
 docs/requerimientos/PENDIENTES.md | 1 +
 2 files changed, 4 insertions(+), 2 deletions(-)
```

1. **`docs/00-Plan-y-Backlog-RF.md`:**
   - Línea 47: Fila RF-008 actualizada a `Front % = 95 %` con estado `En desarrollo`.
   - Línea 69: `Avance promedio Front` actualizado a `30.85 %`.
   - Línea 79: Nueva fila registrada en la primera posición del *Registro de avance* detallando la verificación de W01–W05, la aclaración de pruebas automáticas en SGA-WEB y el estado pendiente de CP-RF008-19.
2. **`docs/requerimientos/PENDIENTES.md`:**
   - Línea 30: Agregada la fila `P-24` al final de la tabla. Las 23 filas anteriores (`P-01` a `P-23`) permanecen intactas carácter por carácter.
3. No se modificó ningún archivo fuera de los autorizados. SGA-WEB se mantuvo en modo solo lectura.

---

## 5. Pruebas Ejecutadas

Se ejecutó la verificación técnica objetiva del repositorio SGA-API:
```bash
bash .agents/tools/verificar_tarea.sh T09
```
**Resultado:** `OK` (Exit code 0).
- Typecheck TypeScript (`tsc -p .agents/tools/tsconfig.verificacion.json`): Limpio.
- Linter ESLint (`eslint src test`): Limpio.
- Suite de pruebas Jest (`pnpm test`): 34 suites ejecutadas, 319 pruebas unitarias y de integración pasadas (0 fallos).
- Patrones prohibidos (`console.log`, `any`, `@ts-ignore`, `eslint-disable`): 0 incidencias.

---

## 6. Hallazgos

| Severidad | Archivo | Detalle |
|---|---|---|
| **baja** | `SGA-WEB/features/mi-horario/mi-horario-page.tsx` | La exclusión de CP-RF008-19 para el cómputo de avance del Front está correctamente fundamentada: la pantalla "Mi horario" gestiona el rol apoderado mostrando un EmptyState informativo ('Consulta de horario de estudiantes' - 'Actualmente el sistema no dispone de un mecanismo para que el apoderado elija a sus estudiantes vinculados'), preservando la consistencia de la interfaz mientras se resuelve el pendiente P-24 en la API. |
| **baja** | `docs/00-Plan-y-Backlog-RF.md` | El promedio general de la capa Front fue recalculado con precisión matemática a 30.85 % (suma 617 % dividido entre 20 requerimientos funcionales). Las columnas de la capa Back y el resto de los requerimientos permanecieron inalterados. |

---

## 7. Recomendación al DEV

La tarea T09 cumple cabalmente con todos los criterios de aceptación y las reglas metodológicas del proyecto. Se recomienda proceder con la emisión del veredicto favorable y, una vez recibida la confirmación («CONFIRMADO»), aplicar el commit propuesto:
`docs(rf-008): actualizar avance de front en backlog y registrar pendiente`.
