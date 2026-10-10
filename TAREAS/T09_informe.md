# Informe de Tarea T09 — Backlog: Avance del Front % del RF-008 y Pendiente de Apoderados

**Agente:** DEV-1  
**Repositorio:** `/home/heverlima/DEV_LINUX/Tesis/SGA-API` (SGA-WEB consultado en modo solo lectura)  
**Requerimiento:** RF-008 (Secciones, Carga académica y Horarios) — Capa Documentación / Backlog vivo  
**Rama:** `feat/rf-008-secciones-carga-horarios`  
**Estado:** Ejecución completada según las especificaciones. **No commiteado** (a la espera de «CONFIRMADO»).

---

## 1. Archivos modificados y qué se hizo

Se modificaron exclusivamente los 2 archivos permitidos por la tarea:

1. `docs/00-Plan-y-Backlog-RF.md`:
   - **Fila RF-008:** Se actualizó la columna **Front %** de `0 %` a `95 %`. El **Estado** se mantuvo como `En desarrollo` (Back 100 %, Front 95 %). No se modificaron Back % ni otras columnas de la fila.
   - **Resumen de avance:** Se recalculó el **Avance promedio Front** pasando de `21.4 %` a `30.85 %` mediante el cómputo exacto de las 20 filas del backlog (suma = 617 %, 617 / 20 = 30.85 %).
   - **Registro de avance:** Se agregó una nueva fila arriba de la tabla con fecha `2026-10-09`, detallando la implementación de W01–W05 en SGA-WEB, la verificación mediante typecheck, linter y build estático limpio comprobado por los validadores (aclarando que SGA-WEB no dispone de ejecutor de pruebas automáticas), los 19 de 20 escenarios cubiertos y el escenario pendiente.
   - **Fecha de cabecera:** Mantenida en `2026-10-09`.

2. `docs/requerimientos/PENDIENTES.md`:
   - Se añadió al final de la tabla la nueva fila `P-24` (siguiente libre) sin alterar ninguna fila existente:
     - N.°: `P-24`
     - RF: `` `RF-008` ``
     - Pregunta: `El apoderado debe ver el horario de la sección de sus estudiantes, pero hoy no existe una consulta para listar los estudiantes vinculados al apoderado que inició sesión; la pantalla "Mi horario" no puede mostrarle ninguno. ¿Se agrega esa consulta en la API?`
     - A quién: `Dirección / equipo de desarrollo`
     - Supuesto actual (V1): `La pantalla informa que aún no está disponible.`
     - Estado: `Pendiente`
     - Respuesta: vacía.

---

## 2. Lista de escenarios contados (RF-008 en Capa Front)

Total de escenarios del RF-008 que aplican a la capa **Front**: 20 de 20 (todos corresponden a interfaces de presentación, interacción y flujos de usuario verificados en CP-RF008-01 a 20).

### Historia de Usuario 1: Secciones (W01)
- ✅ **CP-RF008-01 (Crear una sección):** Cubierto en `features/secciones/components/forms/seccion-form.tsx` y modal `create-seccion-modal.tsx`.
- ✅ **CP-RF008-02 (Sección repetida):** Cubierto en `features/secciones/components/forms/seccion-form.tsx:104` (captura de 409 con mensaje exacto: *"Ya existe la sección A de 5.° en este año."*).
- ✅ **CP-RF008-03 (Vacantes inválidas):** Cubierto con validación Zod en `features/secciones/schemas/seccion.schema.ts` y mensaje inline *"Las vacantes deben ser mayores que 0."*.
- ✅ **CP-RF008-04 (Tutor de dos secciones):** Cubierto en `features/secciones/components/forms/seccion-form.tsx:108` (captura de conflicto 409 con mensaje exacto *"Este docente ya es tutor de otra sección en este año."*).
- ✅ **CP-RF008-05 (Cerrar una sección con matriculados):** Cubierto en `features/secciones/views/columns/seccion-actions.tsx` y mutación con captura 409 mostrando *"No se puede cerrar una sección con estudiantes matriculados."*.

### Historia de Usuario 2: Carga académica (W02, W05)
- ✅ **CP-RF008-06 (Asignar un docente):** Cubierto en `features/carga-academica/views/seccion-carga-view.tsx` y `views/columns/seccion-carga-actions.tsx` con toast de nueva carga horaria.
- ✅ **CP-RF008-07 (Docente inactivo):** Cubierto con filtro estricto de docentes activos (`estado === "activo"`) y captura de mensaje 400.
- ✅ **CP-RF008-08 (Exceso de carga horaria):** Cubierto en `features/carga-academica/components/confirmacion-exceso-dialog.tsx` (diálogo que muestra *"El docente supera su jornada: tendrá 34 horas asignadas de 30."* y reintenta con `confirmarExceso: true`).
- ✅ **CP-RF008-09 (Cambiar el docente a mitad de año):** Cubierto con reasignación en caliente en la tabla de carga con guardado individual por curso.
- ✅ **CP-RF008-10 (Ver la carga de un docente):** Cubierto en `/admin/docentes/[id]/carga` (`features/carga-academica/views/docente-carga-view.tsx`) y acción enlazada en lista de docentes (`features/docentes/views/columns/docente-actions.tsx`, W05).

### Historia de Usuario 3: Horario semanal (W03, W04, W05)
- ✅ **CP-RF008-11 (Proponer la grilla del día):** Cubierto en `features/horarios/components/modals/proponer-grilla-modal.tsx` y `views/grilla/grilla-semanal.tsx` con franjas derivadas de la propuesta de la API.
- ✅ **CP-RF008-12 (Asignar un curso a un bloque):** Cubierto en `features/horarios/views/grilla/celda-vacia.tsx` (clic con curso activo y arrastre HTML5) y renderizado en `celda-bloque.tsx`.
- ✅ **CP-RF008-13 (Bloque doble):** Cubierto en `features/horarios/components/forms/bloque-form.tsx` y cálculo de `rowSpan` continuo en la grilla.
- ✅ **CP-RF008-14 (Bloques superpuestos):** Cubierto en `features/horarios/hooks/use-horarios-query.ts` capturando 409 y mensaje *"El bloque se cruza con otro bloque de la sección."*.
- ✅ **CP-RF008-15 (Cruce de docente):** Cubierto en `features/horarios/hooks/use-horarios-query.ts` capturando 409 con mensaje *"El docente ya dicta en [sección] el [día] de [inicio] a [fin]."* y reporte en modal de copia.
- ✅ **CP-RF008-16 (Horas distintas al plan):** Cubierto en `features/horarios/components/avisos-y-advertencias.tsx` (banner no bloqueante con el texto exacto devuelto por la API) y panel comparativo de horas.
- ✅ **CP-RF008-17 (Copiar el horario a otra sección):** Cubierto en `features/horarios/components/modals/copiar-horario-modal.tsx` con selección de sección del mismo grado y panel de conflictos detectados.
- ✅ **CP-RF008-18 (Cambiar el horario a mitad de año):** Cubierto en `features/horarios/components/avisos-y-advertencias.tsx` con mensaje *"El horario se guardó. Los cambios rigen desde mañana."*.
- ⬜ **CP-RF008-19 (Consultar mi horario):** Implementado para docente y para estudiante de sección en `features/mi-horario/mi-horario-page.tsx` (W04). Sin embargo, el apoderado **no puede elegir ni visualizar los horarios de sus estudiantes** al carecer la API de un endpoint de consulta para listar los estudiantes vinculados al apoderado activo (registrado en `PENDIENTES.md` como P-24). Siguiendo la regla estricta de la tarea ("Un escenario sin cubrir NO suma"), **no suma** como completado.
- ✅ **CP-RF008-20 (Usuario sin permiso):** Cubierto en `usePuedeGestionarSecciones`, `usePuedeGestionarHorarios` y en el filtrado de navegación por rol de `config/navigation/menu-del-usuario.ts` (W05).

**Resultado:** 19 escenarios implementados y verificados ÷ 20 escenarios aplicables = **95 %**.

---

## 3. Recálculo del promedio Front del resumen

Suma manual de las 20 filas de la tabla de RF:

| N.° | RF | Front % |
|---|---|---|
| 1 | RF-001 | 81 % |
| 2 | RF-002 | 74 % |
| 3 | RF-003 | 100 % |
| 4 | RF-004 | 100 % |
| 5 | RF-005 | 67 % |
| 6 | RF-006 | 100 % |
| 7 | RF-007 | 0 % |
| 8 | RF-008 | 95 % (actualizado) |
| 9 | RF-009 | 0 % |
| 10 | RF-010 | 0 % |
| 11 | RF-011 | 0 % |
| 12 | RF-012 | 0 % |
| 13 | RF-013 | 0 % |
| 14 | RF-014 | 0 % |
| 15 | RF-015 | 0 % |
| 16 | RF-016 | 0 % |
| 17 | RF-017 | 0 % |
| 18 | RF-018 | 0 % |
| 19 | RF-019 | 0 % |
| 20 | RF-020 | 0 % |

- **Suma total Front:** `81 + 74 + 100 + 100 + 67 + 100 + 0 + 95 + 0 = 617 %`
- **Promedio Front:** `617 ÷ 20 = 30.85 %`

---

## 4. Skills leídas y reglas aplicadas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `actualizar-backlog-rf/SKILL.md` | Cálculo estricto por escenarios Gherkin (19/20 = 95 %); solo actualizar la columna Front % y Estado de RF-008; no tocar Back %; agregar registro en la parte superior con fecha y detalle de escenarios pendientes; actualización de fecha de cabecera; nuevo pendiente P-XX en `PENDIENTES.md`. | `docs/00-Plan-y-Backlog-RF.md`, `docs/requerimientos/PENDIENTES.md` |
| `idioma_español.md` | Redacción 100% en español con tildes y eñes en la bitácora y tabla de pendientes; uso del término «Año académico» y «rol». | `docs/00-Plan-y-Backlog-RF.md`, `docs/requerimientos/PENDIENTES.md` |
| `_comun_DEV.md` | Solo modificar archivos permitidos; no commitear hasta confirmación; verificación mediante scripts oficiales del proyecto. | `docs/00-Plan-y-Backlog-RF.md`, `docs/requerimientos/PENDIENTES.md` |
| `conventional-commits/SKILL.md` | Estructura `docs(rf-008): ...` ≤ 72 caracteres, descripción en español, viñetas de cuerpo y pie de coautoría. | Sección final de este informe |

---

## 5. Salida de los comandos de verificación

### 5.1. Chequeo de tipos (`pnpm typecheck`)
```text
> sga-api@0.0.1 typecheck /home/heverlima/DEV_LINUX/Tesis/SGA-API
> tsc --noEmit

(Salida limpia, exit code 0)
```

### 5.2. Verificación de la tarea (`bash .agents/tools/verificar_tarea.sh T09`)
```text
OK
```
(Exit code 0. TypeScript, ESLint, suite de pruebas Jest y validación de patrones prohibidos limpios).

### 5.3. Control de archivos modificados (`git diff --stat`)
```text
 docs/00-Plan-y-Backlog-RF.md      | 5 +++--
 docs/requerimientos/PENDIENTES.md | 1 +
 2 files changed, 4 insertions(+), 2 deletions(-)
```
*(Solo muestra los 2 archivos permitidos).*

### 5.4. Estado del árbol de trabajo (`git status --porcelain`)
```text
 M docs/00-Plan-y-Backlog-RF.md
 M docs/requerimientos/PENDIENTES.md
?? .claude/settings.local.json
?? TAREAS/
```
*(Únicamente los 2 archivos permitidos modificados para versionado; `.claude/` y `TAREAS/` se mantienen sin versionar según las reglas del proyecto).*

---

## 6. Commit propuesto

```text
docs(rf-008): actualizar avance de front en backlog y registrar pendiente

- Actualizar Front % de RF-008 a 95 % tras verificar tareas W01 a W05
- Recalcular promedio Front a 30.85 % y registrar avance en la bitácora
- Registrar P-24 en PENDIENTES.md sobre consulta de estudiantes para apoderado

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

> **Nota:** No se ha ejecutado `git commit`. Se espera la confirmación explícita «CONFIRMADO» para efectuar el commit final.
