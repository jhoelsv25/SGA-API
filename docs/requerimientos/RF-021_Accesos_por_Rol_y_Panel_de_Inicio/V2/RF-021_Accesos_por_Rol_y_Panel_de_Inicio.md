# RF-021: Accesos por Rol y Panel de Inicio

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad / Reportes
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 10 hh (IA Agéntica)
**Prerrequisitos:** `RF-001` (rol activo), `RF-002` (roles y Roles-Menú), `RF-020` (indicadores y panel). Los datos de cada tarjeta vienen de los RF de origen indicados. **(v2.0)** Para alinear la matriz con el catálogo del menú: `RF-002` V5, `RF-011` V3, `RF-013` V2, `RF-020` V2 y `RF-023` V1.

> **Cambios de la versión 2.0 sobre la 1.0 (matriz alineada con el catálogo del menú, 2026-11-09):**
>
> - **Matriz de accesos (v2.0).** La carga inicial del grupo "Seguimiento docente" se alinea con el catálogo de opciones de `RF-002` V5: se agregan **"Observaciones de aula"** (Director, Subdirector) y **"Mis observaciones"** (Docente) (`RF-023`), y **"Pendientes de seguimiento"** e **"Informe mensual de horas efectivas"** (Director, Subdirector) (`RF-013` V2).
> - **Fila de `RF-011` corregida (v2.0).** "Sesiones de hoy" y "Justificaciones de sesiones" para Director y Subdirector; "Mis sesiones" para el Docente. Antes solo figuraba el Docente.
> - **Filas separadas (v2.0).** La fila de `RF-013` ("Consolidado y ficha") se separa en "Consolidados docentes" y "Mi seguimiento"; la de `RF-012` en "Ausencias docentes" y "Mis ausencias"; la de `RF-020` en "Indicadores" y "Mis indicadores".
> - **Escenarios nuevos (v2.0):** cada rol ve su opción nueva y un rol sin la opción no la ve; el menú del Docente se actualiza con los nombres del catálogo.
> - **Sin cambios en lo demás:** panel de inicio por rol y sus tarjetas, mensajes, alcance de los datos y auditoría. No se agregan tarjetas nuevas.
> - **Pendientes:** sin nuevos; siguen abiertos P-33, P-34 y P-35.

## Consideraciones y supuestos de negocio

- **Propósito.** Definir, para cada rol del sistema, **qué opciones del menú tiene** (matriz de accesos por defecto) y **qué ve en su panel de inicio** (dashboard), para que cada persona entre y vea solo lo que necesita.
- **Término "rol".** Se usa "rol" y no "perfil", según `RF-002` v3.0. "Perfiles con acceso" en este documento significa **roles con acceso a la opción**.
- **Acceso solo por menú.** No hay permisos aparte (`RF-002`). La matriz de este RF es la **carga inicial** (semilla) de Roles-Menú; el Administrador puede ajustarla después, excepto la del Administrador, que siempre ve todo.
- **Panel de inicio por rol activo.** Al ingresar, y cada vez que cambia de rol activo (`RF-001`), el usuario llega a un panel con las tarjetas de **su rol activo**. Las tarjetas son de solo lectura y cada una lleva al detalle (opción del menú) si el rol la tiene.
- **Datos limitados al propio alcance.** Las tarjetas muestran solo datos que le corresponden al rol:
  - Docente: solo sus secciones y cursos (carga académica, `RF-008`).
  - Estudiante: solo lo suyo.
  - Apoderado: solo sus hijos/as vinculados (`RF-007`).
  - Director, Subdirector, Secretaria: todo el colegio.
- **Año lectivo.** Todo se calcula con el año lectivo de trabajo del usuario (header `x-anio-academico-id`).
- **Tarjeta sin datos.** Si no hay datos, la tarjeta muestra "Sin datos para mostrar" y no se oculta.
- **Tarjeta sin acceso.** Si el rol no tiene la opción de destino, la tarjeta se muestra solo con el dato, sin enlace.
- **Orden y límite.** Cada panel muestra entre 4 y 8 tarjetas; las alertas van primero.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Los cambios en la matriz de accesos quedan en la bitácora (`RF-003`) por `RF-002`. Ver el panel no se registra.

## Matriz de accesos por rol (carga inicial)

Leyenda: ● acceso completo · ◐ acceso limitado a lo propio · — sin acceso.

| Módulo / Opción                                                                | Admin |  Director  | Subdirector | Soporte TI  | Secretaria |        Docente        |  Estudiante  |     Apoderado      |
| ------------------------------------------------------------------------------ | :---: | :--------: | :---------: | :---------: | :--------: | :-------------------: | :----------: | :----------------: |
| **Panel de inicio**                                                            |   ●   |     ●      |      ●      |      ●      |     ●      |           ●           |      ●       |         ●          |
| **Seguridad** — Usuarios, Roles, Módulos, Menú, Cargos (`RF-002`)              |   ●   |     —      |      —      |      —      |     —      |           —           |      —       |         —          |
| **Seguridad** — Bitácora de auditoría (`RF-003`)                               |   ●   |     ●      |      —      |      ●      |     —      |           —           |      —       |         —          |
| **Configuración** — Institución y turnos (`RF-004`)                            |   ●   |     ●      |      ●      |      ●      |     —      |           —           |      —       |         —          |
| **Configuración** — Año escolar y calendario (`RF-005`)                        |   ●   |     ●      |      ●      |      —      | ◐ consulta |      ◐ consulta       |  ◐ consulta  |     ◐ consulta     |
| **Configuración** — Grados, cursos y plan (`RF-006`)                           |   ●   |     ●      |      ●      |      —      | ◐ consulta |           —           |      —       |         —          |
| **Comunidad** — Docentes, Estudiantes, Apoderados (`RF-007`)                   |   ●   | ● consulta |      ●      |      —      |     ●      |           —           |      —       |         —          |
| **Comunidad** — Corregir datos críticos (`RF-007`)                             |   ●   |     —      |      —      |      —      |     —      |           —           |      —       |         —          |
| **Organización** — Secciones, carga y horarios (`RF-008`)                      |   ●   |     ●      |      ●      |      —      | ● consulta |     ◐ su horario      | ◐ su horario | ◐ horario de hijos |
| **Matrícula** — Matrícula, retiro y traslado (`RF-009`)                        |   ●   | ● consulta |      ●      |      —      |     ●      |           —           |      —       |         —          |
| **Asistencia** — Marcación y asistencia (`RF-010`)                             |   ●   | ● consulta |      ●      | ● marcación |     ●      |    ◐ sus secciones    |  ◐ la suya   |   ◐ la de hijos    |
| **Seguimiento docente** — Sesiones de hoy (`RF-011`) (v2.0)                    |   ●   | ● consulta | ● consulta  |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Justificaciones de sesiones (`RF-011`) (v2.0)        |   ●   | ● consulta |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Mis sesiones (`RF-011`) (v2.0)                       |   ●   |     —      |      —      |      —      |     —      |      ◐ las suyas      |      —       |         —          |
| **Seguimiento docente** — Ausencias docentes (`RF-012`) (v2.0)                 |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Mis ausencias (`RF-012`) (v2.0)                      |   ●   |     —      |      —      |      —      |     —      | ◐ registrar las suyas |      —       |         —          |
| **Seguimiento docente** — Consolidados docentes (`RF-013`) (v2.0)              |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Mi seguimiento (`RF-013`) (v2.0)                     |   ●   |     —      |      —      |      —      |     —      |      ◐ su ficha       |      —       |         —          |
| **Seguimiento docente** — Pendientes de seguimiento (`RF-013`) (v2.0)          |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Informe mensual de horas efectivas (`RF-013`) (v2.0) |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Observaciones de aula (`RF-023`) (v2.0)              |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Seguimiento docente** — Mis observaciones (`RF-023`) (v2.0)                  |   ●   |     —      |      —      |      —      |     —      |      ◐ las suyas      |      —       |         —          |
| **Libretas** — Gestión de libretas (`RF-014`)                                  |   ●   |     ●      |      ●      |      —      |     ●      |           —           |      —       |         —          |
| **Libretas** — Mis libretas                                                    |   —   |     —      |      —      |      —      |     —      |           —           |      ◐       |      ◐ hijos       |
| **Aula virtual** — Unidades y materiales (`RF-015`)                            |   ●   | ● consulta | ● consulta  |      —      |     —      |           ◐           |  ◐ lectura   |         —          |
| **Aula virtual** — Tareas y calificación (`RF-016`)                            |   ●   |     —      |      —      |      —      |     —      |           ◐           |  ◐ entregas  |     ◐ lectura      |
| **Aula virtual** — Interacción del curso (`RF-017`)                            |   ●   |     —      |      —      |      —      |     —      |           ◐           |      ◐       |         —          |
| **Convivencia** — Conducta y observaciones (`RF-018`)                          |   ●   |     ●      |      ●      |      —      |     —      |      ◐ registrar      |  ◐ lectura   |     ◐ lectura      |
| **Comunicación** — Comunicados (`RF-019`)                                      |   ●   |     ●      |      ●      |      —      |     ●      |   ◐ a sus secciones   | ◐ recibidos  |    ◐ recibidos     |
| **Reportes** — Indicadores (`RF-020`)                                          |   ●   |     ●      |      ●      |      —      |     —      |           —           |      —       |         —          |
| **Reportes** — Mis indicadores: solo CSP e IGM propios (`RF-020`) (v2.0)       |   ●   |     —      |      —      |      —      |     —      |  ◐ CSP e IGM propios  |      —       |         —          |
| **Reportes** — Registrar pretest / Cerrar medición (`RF-020`)                  |   ●   |     ●      |      —      |      —      |     —      |           —           |      —       |         —          |

(v2.0) Las opciones de "Seguimiento docente" y sus roles por defecto coinciden con el catálogo de `RF-002` V5; el Administrador puede cambiarlos en Roles-Menú. "Indicadores de apoyo" no es una opción de menú: se ve con "Indicadores" (`RF-020` V2).

## Panel de inicio por rol

| Rol                                 | Qué ve al ingresar (tarjetas)                                                                                                                                                                                                                                            | Origen                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Administrador**                   | Cuentas activas, bloqueadas e inactivas · Intentos de acceso fallidos de hoy · Cuentas sin acceso en 30 días · Últimas acciones de la bitácora · Roles con cuentas · Estado del año escolar                                                                              | `RF-001`, `RF-002`, `RF-003`, `RF-005`                               |
| **Director**                        | Los tres indicadores del bimestre en curso (CSP, ISA, IGM) con comparación pretest–postest · Asistencia del colegio de hoy · Docentes con sesiones sin registrar · Ausencias de docentes del día · Libretas pendientes de publicar · Estudiantes con alertas de conducta | `RF-020`, `RF-010`, `RF-011`, `RF-012`, `RF-014`, `RF-018`           |
| **Subdirector**                     | Cumplimiento de sesiones por docente (semáforo) · Sesiones del día registradas vs. planificadas · Ausencias por justificar y reemplazos pendientes · Materiales planificados vs. publicados · Libretas por sección · Matrículas del mes                                  | `RF-011`, `RF-012`, `RF-013`, `RF-015`, `RF-014`, `RF-009`           |
| **Soporte TI**                      | Equipos autorizados y marcaciones de hoy · Dispositivos sin conexión o sin marcar · Sesiones abiertas · Cuentas bloqueadas por desbloquear · Errores recientes en la bitácora                                                                                            | `RF-004`, `RF-010`, `RF-001`, `RF-003`                               |
| **Secretaria**                      | Matrículas, retiros y traslados del mes · Estudiantes sin apoderado o sin documento · Libretas por imprimir o entregar · Comunicados recientes · Asistencia del día por sección · Fichas incompletas                                                                     | `RF-009`, `RF-007`, `RF-014`, `RF-019`, `RF-010`                     |
| **Docente**                         | Mis clases de hoy (horario) · Sesiones por registrar · Mi cumplimiento de sesiones (CSP propio) · Tareas por calificar · Mis materiales planificados vs. publicados (IGM propio) · Estudiantes con inasistencias o alertas en mis secciones · Comunicados nuevos         | `RF-008`, `RF-011`, `RF-020`, `RF-016`, `RF-015`, `RF-010`, `RF-019` |
| **Estudiante**                      | Mi horario de hoy · Tareas pendientes y próximas fechas de entrega · Materiales nuevos · Mi asistencia del bimestre · Mis libretas disponibles · Comunicados                                                                                                             | `RF-008`, `RF-016`, `RF-015`, `RF-010`, `RF-014`, `RF-019`           |
| **Apoderado**                       | Selector de hijo/a · Asistencia de hoy y del mes · Tareas pendientes del hijo/a · Libretas publicadas (y si ya las vio) · Observaciones de conducta · Comunicados                                                                                                        | `RF-007`, `RF-010`, `RF-016`, `RF-014`, `RF-018`, `RF-019`           |
| **Rol adicional** (ej. Coordinador) | Solo las tarjetas de las opciones de menú que el Administrador le asigne; si no tiene ninguna, "Sin información para su rol".                                                                                                                                            | —                                                                    |

## Mensajes del requerimiento

| Situación                        | Mensaje                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| Tarjeta sin datos                | "Sin datos para mostrar."                                         |
| Rol sin tarjetas                 | "Sin información para su rol."                                    |
| Opción no asignada al rol        | "Su rol no tiene acceso a esta opción."                           |
| Sin hijos vinculados (Apoderado) | "No tiene estudiantes vinculados. Comuníquese con la secretaría." |
| Sin año lectivo de trabajo       | "Seleccione un año lectivo para ver su panel."                    |
| Menú del Administrador           | "El rol Administrador siempre tiene todas las opciones."          |

## Requerimientos fuera de alcance (Out of Scope)

- **Crear o editar roles y asignar menús.** Corresponde a `RF-002`; este RF define solo los valores iniciales.
- **Permisos por acción y alcances configurables.** Eliminados en `RF-002` v3.0. El alcance a lo propio lo resuelve la regla de cada tarjeta.
- **Fórmulas y cierre de los indicadores de la tesis.** Corresponde a `RF-020`; aquí solo se muestran.
- **Paneles personalizables por el usuario** (mover o quitar tarjetas).
- **Notificaciones push o por correo desde el panel.** Corresponde a `RF-019`.
- **Exportación del panel.** Se exporta desde cada reporte de origen.

## Acuerdos y puntos abiertos

- **P-nuevo. Matriz de accesos.** Confirmar con el colegio la matriz propuesta, en especial: si la Secretaria puede ver matrículas y libretas, si el Director puede corregir datos críticos, y si el Soporte TI ve la bitácora.
- **P-nuevo. Tarjetas del panel.** Confirmar qué dato es prioritario para el Director y el Subdirector (propuesta: los tres indicadores de la tesis).
- **P-nuevo. Apoderado.** Confirmar si el apoderado ve la conducta de su hijo/a y las observaciones registradas (`RF-018`).
- **P-nuevo. Estudiante.** Confirmar si el estudiante ve sus propias libretas y su asistencia.
- Los puntos anteriores deben registrarse en `PENDIENTES.md` con su número definitivo.

## Historia de Usuario 1: Matriz de accesos por rol

**Como** Administrador
**Quiero** que cada rol del sistema venga con las opciones de menú que le corresponden
**Para** que cada persona vea solo lo que necesita desde su primer ingreso.

### Escenario: Carga inicial de accesos

**Dado** que el sistema se instala por primera vez
**Cuando** se cargan los roles del sistema
**Entonces** cada rol queda con las opciones de menú de la matriz de este RF
**Y** el Administrador tiene todas las opciones.

### Escenario: Menú del Docente (actualizado en v2.0)

**Dado** que ingreso con el rol Docente
**Cuando** se muestra el menú
**Entonces** veo Panel de inicio, mi horario, Mis sesiones, Mis ausencias, Mi seguimiento, Mis observaciones (v2.0), Mis indicadores (CSP e IGM propios), Aula virtual, Conducta y Comunicados
**Y** no veo Usuarios, Roles, Matrícula, Libretas de gestión ni las opciones de dirección (Sesiones de hoy, Observaciones de aula, Pendientes de seguimiento).

### Escenario: Menú del Apoderado

**Dado** que ingreso con el rol Apoderado
**Cuando** se muestra el menú
**Entonces** veo solo Panel de inicio, Asistencia de mis hijos, Tareas en lectura, Mis libretas, Conducta en lectura y Comunicados.

### Escenario: Acceso por ruta sin la opción

**Dado** que el rol Secretaria no tiene la opción "Indicadores de la tesis"
**Cuando** una secretaria intenta abrir esa pantalla por su ruta
**Entonces** el sistema rechaza el acceso y muestra "Su rol no tiene acceso a esta opción."

### Escenario: Ajuste de la matriz por el Administrador

**Dado** que la matriz inicial fue cargada
**Cuando** el Administrador le agrega al rol Subdirector la opción "Registrar pretest" en Roles-Menú
**Entonces** desde su siguiente ingreso el Subdirector la ve, y el cambio queda en la bitácora (`RF-002`, `RF-003`).

### Escenario: Opciones nuevas de seguimiento del Director y Subdirector (v2.0)

**Dado** que ingreso con el rol Director o Subdirector
**Cuando** se muestra el menú del grupo "SEGUIMIENTO DOCENTE"
**Entonces** veo "Observaciones de aula", "Pendientes de seguimiento" e "Informe mensual de horas efectivas"
**Y** veo "Sesiones de hoy" y "Justificaciones de sesiones"
**Y** no veo "Mis observaciones" ni "Mis sesiones".

### Escenario: Opción nueva del Docente (v2.0)

**Dado** que ingreso con el rol Docente
**Cuando** se muestra el menú del grupo "SEGUIMIENTO DOCENTE"
**Entonces** veo "Mis observaciones" y "Mis sesiones"
**Y** no veo "Observaciones de aula", "Pendientes de seguimiento" ni "Informe mensual de horas efectivas".

### Escenario: Rol sin la opción nueva no la ve (v2.0)

**Dado** que ingreso con el rol Secretaria, Estudiante o Apoderado
**Cuando** se muestra el menú
**Entonces** no veo ninguna opción del grupo "SEGUIMIENTO DOCENTE"
**Y** si intento abrir "Observaciones de aula" por su ruta, el sistema rechaza el acceso y muestra "Su rol no tiene acceso a esta opción."

### Escenario: Alcance a lo propio

**Dado** que ingreso con el rol Docente
**Cuando** abro Asistencia
**Entonces** veo solo las secciones de mi carga académica.

## Historia de Usuario 2: Panel de inicio del Director y Subdirector

**Como** Director o Subdirector
**Quiero** ver al ingresar el estado del colegio y de los indicadores
**Para** decidir y detectar problemas sin buscar en varias pantallas.

### Escenario: Indicadores de la tesis en el panel del Director

**Dado** que estoy en el bimestre en curso
**Cuando** ingreso con el rol Director
**Entonces** veo CSP, ISA e IGM con su valor "en curso" y, si existe, el pretest y la variación en puntos porcentuales (`RF-020`).

### Escenario: Alertas del día

**Dado** que hay docentes con sesiones sin registrar y ausencias del día
**Cuando** ingreso con el rol Director o Subdirector
**Entonces** las alertas aparecen primero, con el número y enlace al detalle.

### Escenario: Semáforo de cumplimiento por docente

**Dado** que ingreso con el rol Subdirector
**Cuando** veo la tarjeta de cumplimiento de sesiones
**Entonces** cada docente se muestra con su porcentaje y un color según su cumplimiento
**Y** puedo abrir su ficha de seguimiento (`RF-013`).

### Escenario: Sin datos todavía

**Dado** que el bimestre recién comenzó y no hay sesiones
**Cuando** ingreso con el rol Director
**Entonces** las tarjetas muestran "Sin datos para mostrar."

## Historia de Usuario 3: Panel de inicio del Docente

**Como** Docente
**Quiero** ver mis clases del día y mis pendientes
**Para** cumplir mis sesiones, tareas y materiales a tiempo.

### Escenario: Clases de hoy y sesiones por registrar

**Dado** que tengo 4 clases hoy y 2 sesiones de días anteriores sin registrar
**Cuando** ingreso con el rol Docente
**Entonces** veo mi horario de hoy y la tarjeta "Sesiones por registrar: 2" con enlace a `RF-011`.

### Escenario: Mi cumplimiento propio

**Dado** que ingreso con el rol Docente
**Cuando** veo mi tarjeta de indicadores
**Entonces** veo solo mi CSP y mi IGM del bimestre en curso, nunca los de otros docentes ni el ISA del colegio.

### Escenario: Solo mis secciones

**Dado** que dicto en 3 secciones
**Cuando** veo tareas por calificar y alertas de asistencia
**Entonces** los datos son solo de esas 3 secciones.

## Historia de Usuario 4: Panel de inicio del Estudiante y del Apoderado

**Como** Estudiante o Apoderado
**Quiero** ver el estado académico y mis pendientes
**Para** estar al día con tareas, asistencia y libretas.

### Escenario: Tareas pendientes del estudiante

**Dado** que tengo 2 tareas sin entregar
**Cuando** ingreso con el rol Estudiante
**Entonces** veo las tareas con su fecha de entrega, ordenadas por la más próxima.

### Escenario: Apoderado con varios hijos

**Dado** que soy apoderado de dos estudiantes
**Cuando** ingreso con el rol Apoderado
**Entonces** veo un selector de hijo/a y las tarjetas del seleccionado
**Y** al cambiarlo, todas las tarjetas se actualizan.

### Escenario: Apoderado sin hijos vinculados

**Dado** que mi cuenta no tiene estudiantes vinculados
**Cuando** ingreso con el rol Apoderado
**Entonces** veo "No tiene estudiantes vinculados. Comuníquese con la secretaría."

### Escenario: Libreta nueva

**Dado** que se publicó la libreta de mi hijo/a
**Cuando** ingreso con el rol Apoderado
**Entonces** la tarjeta de libretas la muestra como nueva con enlace para verla (`RF-014`).

## Historia de Usuario 5: Panel de inicio de Administrador, Soporte TI y Secretaria

**Como** Administrador, Soporte TI o Secretaria
**Quiero** ver los pendientes de mi trabajo diario
**Para** atenderlos sin buscarlos en el menú.

### Escenario: Cuentas bloqueadas

**Dado** que hay 3 cuentas bloqueadas
**Cuando** ingreso con el rol Administrador o Soporte TI
**Entonces** veo "Cuentas bloqueadas: 3" con enlace a Usuarios si mi rol la tiene.

### Escenario: Fichas incompletas de la secretaria

**Dado** que hay 5 estudiantes sin apoderado
**Cuando** ingreso con el rol Secretaria
**Entonces** veo "Estudiantes sin apoderado: 5" con enlace a Estudiantes.

### Escenario: Cambio de rol activo

**Dado** que mi cuenta tiene los roles Soporte TI y Docente
**Cuando** cambio el rol activo a Docente (`RF-001`)
**Entonces** el menú y el panel se reemplazan por los del rol Docente.

### Escenario: Rol adicional sin tarjetas

**Dado** que el rol Coordinador no tiene opciones de menú asignadas
**Cuando** ingreso con ese rol
**Entonces** veo "Sin información para su rol."

---

## Reglas de validación y negocio (resumen)

- **Acceso:** solo por opciones de menú del rol activo (`RF-002`); la matriz de este RF es la carga inicial.
- **(v2.0) Seguimiento docente:** la matriz sigue el catálogo de `RF-002` V5; cada opción se asigna por separado (Director y Subdirector: Sesiones de hoy, Justificaciones, Ausencias, Consolidados, Pendientes, Informe mensual, Observaciones de aula, Indicadores; Docente: Mis sesiones, Mis ausencias, Mi seguimiento, Mis observaciones, Mis indicadores).
- **Administrador:** ve todo, sin posibilidad de reducirlo.
- **Panel:** una vista por rol activo; cambia al cambiar de rol.
- **Alcance de los datos:** Docente a sus secciones, Estudiante a lo suyo, Apoderado a sus hijos, directivos y secretaría a todo el colegio.
- **Tarjetas:** de solo lectura, de 4 a 8, alertas primero; sin datos muestran mensaje, no se ocultan.
- **Año lectivo:** el de trabajo del usuario.
- **Este RF lo opera:** todos los roles (consulta).
- **Auditoría:** cambios de la matriz por `RF-002` / `RF-003`.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Panel de inicio por rol (Administrador, Director, Subdirector, Soporte TI, Secretaria, Docente, Estudiante, Apoderado). Escenarios: Con datos · Sin datos · Con alertas · Cambio de rol · Apoderado con varios hijos · Sin acceso.
