# Plan y Backlog de Requerimientos Funcionales (RF) — SGA Colegio

**Proyecto:** SGA Colegio (Sistema de Gestión Académica) — colegio de secundaria (1.° a 5.°)
**Versión del backlog:** 2.1
**Base:** Modelo de datos v3.2 (`02-Diseno-Base-Datos-SQLServer.sql`, 49 tablas)
**Última actualización:** 2026-10-03

> [!important] Fuente de verdad del avance
> Este archivo (`SGA-API/docs/00-Plan-y-Backlog-RF.md`) es el backlog vivo. Lo actualizan la skill `actualizar-backlog-rf` del backend (SGA-API) y del frontend (SGA-WEB) cada vez que se avanza o termina un RF. La copia en Obsidian es la versión de planificación (v2.0).

---

## 1. Alcance del sistema

- **Solo secundaria.** No se modelan Inicial ni Primaria.
- **Notas.** La única nota que genera el sistema es la del **aula virtual** (reforzamiento). Las notas del aula real no se registran; la libreta oficial se descarga del **SIAGIE** en PDF y el docente la sube.
- **Seguimiento docente.** El docente firma ingreso y salida de su sesión en el **kiosko de sesiones de la subdirección** (código + PIN); el subdirector lo sigue en vivo; el director registra de vez en cuando los tramos en que el docente no estaba en clase, con fotos, y al cierre del bimestre genera un consolidado.
- **Marcación.** Solo en **equipos autorizados** dentro del colegio (kiosko de estudiantes, kiosko del personal). Sin geolocalización. Preparado para biométrico (ZKTeco).

---

## 2. Backlog de RF y avance

### Leyenda

| Columna | Valores |
|---|---|
| **Documento** | `Por redactar` · `Redactado` (V1 sin dudas abiertas) · `Con pendientes` (tiene preguntas en [PENDIENTES.md](requerimientos/PENDIENTES.md)) · `V2` (corregido tras resolver pendientes) |
| **Back % / Front %** | Escenarios Gherkin del RF implementados y probados en esa capa ÷ escenarios del RF que aplican a esa capa × 100 |
| **Estado** | `Por desarrollar` (0 %) · `En desarrollo` (1–99 %) · `Completado` (Back y Front al 100 %) · `Bloqueado` (un pendiente impide avanzar) |

**Prioridad:** Alta (indicador de la tesis o imprescindible) · Media (operación diaria) · Baja (complementa).
**Indicador en negrita:** el RF registra directamente el dato del indicador.

| RF | Módulo | Requerimiento | Prioridad | Indicador | Documento | Pendientes | Back % | Front % | Estado |
|---|---|---|---|---|---|---|---|---|---|
| [RF-001](requerimientos/RF-001_Acceso_al_Sistema/V1/RF-001_Acceso_al_Sistema.md) | Seguridad | Acceso al sistema | Alta | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-002](requerimientos/RF-002_Usuarios_Roles_y_Menu/V1/RF-002_Usuarios_Roles_y_Menu.md) | Seguridad | Usuarios, roles y menú | Alta | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-003](requerimientos/RF-003_Bitacora_de_Auditoria/V1/RF-003_Bitacora_de_Auditoria.md) | Seguridad | Bitácora de auditoría | Baja | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-004](requerimientos/RF-004_Institucion_y_Turnos/V1/RF-004_Institucion_y_Turnos.md) | Configuración | Institución, turnos y equipos autorizados | Alta | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-005](requerimientos/RF-005_Anio_Escolar_y_Calendario/V1/RF-005_Anio_Escolar_y_Calendario.md) | Configuración | Año escolar y calendario | Alta | CSP | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-006](requerimientos/RF-006_Grados_Cursos_y_Plan_de_Estudios/V1/RF-006_Grados_Cursos_y_Plan_de_Estudios.md) | Configuración | Grados, cursos y plan de estudios | Alta | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-007](requerimientos/RF-007_Personas_Docentes_Estudiantes_Apoderados/V1/RF-007_Personas_Docentes_Estudiantes_Apoderados.md) | Comunidad | Personas: docentes, estudiantes y apoderados | Alta | — | Con pendientes | P-01, P-02 | 0 % | 0 % | Por desarrollar |
| [RF-008](requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md) | Organización | Secciones, carga académica y horarios | Alta | CSP | Con pendientes | P-03, P-04 | 0 % | 0 % | Por desarrollar |
| [RF-009](requerimientos/RF-009_Matricula_Retiro_y_Traslado/V1/RF-009_Matricula_Retiro_y_Traslado.md) | Matrícula | Matrícula, retiro y traslado | Alta | ISA | Redactado | — | 0 % | 0 % | Por desarrollar |
| RF-010 | Asistencia | Marcación y asistencia de estudiantes | Media | — | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-011 | Seguimiento docente | Registro de sesión de clase | Alta | **CSP** | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-012 | Seguimiento docente | Supervisión y ausencias del docente | Alta | **CSP** | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-013 | Seguimiento docente | Consolidado y ficha de seguimiento docente | Alta | **CSP** | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-014 | Libretas | Libretas del SIAGIE | Alta | **ISA** | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-015 | Aula virtual | Unidades y materiales de reforzamiento | Alta | **IGM** | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-016 | Aula virtual | Tareas, entregas y calificación | Media | IGM | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-017 | Aula virtual | Interacción y actividad del curso | Baja | IGM | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-018 | Convivencia | Conducta y observaciones del estudiante | Baja | — | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-019 | Comunicación | Comunicados y notificaciones | Media | ISA | Por redactar | — | 0 % | 0 % | Por desarrollar |
| RF-020 | Reportes | Indicadores de la tesis y panel | Alta | **ISA · CSP · IGM** | Por redactar | — | 0 % | 0 % | Por desarrollar |

### Resumen de avance

| Concepto | Valor |
|---|---|
| RF redactados | 9 / 20 |
| RF con pendientes | 2 |
| RF completados | 0 / 20 |
| Avance promedio Back | 0 % |
| Avance promedio Front | 0 % |

---

## 2.1 Registro de avance

Una fila por cada actualización. La más reciente arriba.

| Fecha | RF | Capa | Antes | Después | Qué se hizo | Escenarios pendientes |
|---|---|---|---|---|---|---|
| 2026-10-03 | RF-009 | Documento | Por redactar | Redactado | Redacción V1 | — |
| 2026-10-03 | RF-001 a RF-008 | Documento | Por redactar | Redactado / Con pendientes | Redacción V1 con la skill Gherkin | — |

---

## 3. Matriz de trazabilidad (objetivo → indicador → RF → datos)

> [!warning] Por confirmar
> La columna *Objetivo específico* usa provisionalmente el nombre del indicador del Anexo 03. Hay que reemplazarla por la redacción exacta de los objetivos específicos del proyecto de tesis.

| Objetivo específico | Indicador | Fórmula | RF que lo soportan | Tablas |
|---|---|---|---|---|
| Mejorar las prácticas pedagógicas *(por confirmar)* | **CSP** — Cumplimiento de sesiones planificadas | sesiones ejecutadas ÷ sesiones planificadas × 100 | RF-005, RF-008, RF-011, RF-012, RF-013, RF-020 | `horarios`, `calendario_eventos`, `sesiones_clase`, `ausencias_sesion`, `evidencias_ausencia`, `consolidados_docente` |
| Mejorar el seguimiento académico *(por confirmar)* | **ISA** — Informes de seguimiento académico entregados | libretas publicadas a tiempo ÷ libretas programadas × 100 | RF-009, RF-014, RF-019, RF-020 | `matriculas`, `libretas`, `notificaciones` |
| Mejorar la gestión del aula virtual *(por confirmar)* | **IGM** — Gestión de materiales | materiales publicados a tiempo ÷ materiales planificados × 100 | RF-015, RF-016, RF-017, RF-020 | `unidades_aprendizaje`, `materiales`, `tareas`, `actividad_aula` |

---

## 4. Requerimientos no funcionales (RNF)

| RNF | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Seguridad | Las contraseñas se guardan cifradas (hash) y nunca en texto plano; la cuenta se bloquea tras intentos fallidos consecutivos. |
| RNF-02 | Seguridad | Cada usuario accede solo a las opciones y datos que permite su rol (control de acceso por permisos). |
| RNF-03 | Auditoría | Las altas, cambios y eliminaciones de datos sensibles quedan registrados en una bitácora que no se puede editar. |
| RNF-04 | Usabilidad | El sistema se puede usar desde computadora y celular (diseño adaptable); la marcación y la firma de sesión se hacen en kioskos autorizados dentro del colegio. |
| RNF-05 | Rendimiento | Las consultas y pantallas de uso diario responden en menos de 3 segundos en condiciones normales. |
| RNF-06 | Disponibilidad | El sistema está disponible durante el horario escolar (lunes a viernes, 7:00 a 18:00) con al menos 99 % de disponibilidad. |
| RNF-07 | Respaldo | Se hace una copia de seguridad diaria de la base de datos y de los archivos (libretas, evidencias, materiales). |
| RNF-08 | Integridad | Los consolidados docentes cerrados y las libretas publicadas no se pueden modificar sin dejar registro. |

---

## 5. Orden de redacción (Fase 3)

**Primero el núcleo de la tesis, después la base del sistema.**

| Orden | RF | Motivo |
|---|---|---|
| 1 | RF-011 Registro de sesión de clase | Origen del dato del CSP |
| 2 | RF-012 Supervisión y ausencias del docente | Evidencia del seguimiento docente |
| 3 | RF-013 Consolidado y ficha de seguimiento docente | Cierre del seguimiento docente |
| 4 | RF-014 Libretas del SIAGIE | Origen del dato del ISA |
| 5 | RF-015 Unidades y materiales de reforzamiento | Origen del dato del IGM |
| 6 | RF-020 Indicadores de la tesis y panel | Medición de los tres indicadores |
| 7 | RF-016, RF-017 | Resto del aula virtual |
| 8 | RF-001 a RF-010 | Base del sistema |
| 9 | RF-018, RF-019, RF-003 | Complementarios |

### Pendientes antes de redactar

- [ ] Cabecera de los RF: **Proyecto** (ej. "IENSC — SGA Colegio") y **BA responsable**.
- [ ] Redacción exacta de los **objetivos específicos** para la matriz de trazabilidad.
- [ ] Actualizar el Modelo Conceptual (`Diseño de Base de Datos/02 - Modelo Conceptual (Diagrama E-R).md`) a la v3.1 del modelo.
