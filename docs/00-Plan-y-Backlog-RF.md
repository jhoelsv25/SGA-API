# Plan y Backlog de Requerimientos Funcionales (RF) — SGA Colegio

**Proyecto:** SGA Colegio (Sistema de Gestión Académica) — colegio de secundaria (1.° a 5.°)
**Desarrollador backend:** Jhoel Silvestre
**Versión del backlog:** 2.1
**Base:** Modelo de datos [`base-de-datos/Diseno-Base-Datos-PostgreSQL.sql`](base-de-datos/Diseno-Base-Datos-PostgreSQL.sql) v3.3, PostgreSQL 13+, 58 tablas (probado en PostgreSQL 17) · diferencias con el backend: [`base-de-datos/DIFERENCIAS-DISENO-VS-DRIZZLE.md`](base-de-datos/DIFERENCIAS-DISENO-VS-DRIZZLE.md)
**Última actualización:** 2026-10-09

> [!important] Fuente de verdad del avance
> Este archivo (`SGA-API/docs/00-Plan-y-Backlog-RF.md`) es el backlog vivo. Lo actualizan la skill `actualizar-backlog-rf` del backend (SGA-API) y del frontend (SGA-WEB) cada vez que se avanza o termina un RF. **Toda la documentación del proyecto vive en `SGA-API/docs`** (requerimientos, pruebas y `base-de-datos/`); no hay otra fuente de verdad.

---

## 1. Alcance del sistema

- **Solo secundaria.** No se modelan Inicial ni Primaria.
- **Notas.** La única nota que genera el sistema es la del **aula virtual** (reforzamiento). Las notas del aula real no se registran; la libreta oficial se descarga del **SIAGIE** en PDF y el docente la sube.
- **Seguimiento docente.** El docente firma ingreso y salida de su sesión en el **kiosko de sesiones de la subdirección** (código + PIN); el subdirector lo sigue en vivo; el director registra de vez en cuando los tramos en que el docente no estaba en clase, con fotos, y al cierre del bimestre genera un consolidado.
- **Marcación.** Solo en **equipos autorizados** dentro del colegio (kiosko de estudiantes, kiosko del personal). Sin geolocalización. Preparado para biométrico (ZKTeco).

---

## 2. Backlog de RF y avance

### Leyenda

| Columna              | Valores                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documento**        | `Por redactar` · `Redactado` (V1 sin dudas abiertas) · `Con pendientes` (tiene preguntas en [PENDIENTES.md](requerimientos/PENDIENTES.md)) · `V2` (corregido tras resolver pendientes) · `V2 (con pendientes)` |
| **Back % / Front %** | Escenarios Gherkin del RF implementados y probados en esa capa ÷ escenarios del RF que aplican a esa capa × 100                                                                        |
| **Estado**           | `Por desarrollar` (0 %) · `En desarrollo` (1–99 %) · `Completado` (Back y Front al 100 %) · `Bloqueado` (un pendiente impide avanzar) · `Pendiente (Vn)` (estaba desarrollado y el RF cambió a una nueva versión: falta implementar los cambios)                                                  |

> **Regla de versiones:** si un RF ya tiene desarrollo (Back o Front > 0 %) y su especificación cambia, **no se edita la versión vigente**: se crea una carpeta nueva (`V2`, `V3`…), el enlace de esta tabla apunta a la nueva versión, el estado pasa a `Pendiente (Vn)` y el porcentaje se recalcula con los escenarios de la nueva versión.

**Prioridad:** Alta (indicador de la tesis o imprescindible) · Media (operación diaria) · Baja (complementa).
**Indicador en negrita:** el RF registra directamente el dato del indicador.

| RF | Módulo | Requerimiento | Prioridad | Indicador | Documento | Pendientes | Back % | Front % | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-09 | RF-004 | Back + Front | 0 % (perdido en merge) | 75 % · Pendiente (V2) | Jhoel implementó la V1 (back `582b331`, front `9c7530f`) y la marcó 100 % en `65f6dc0`, pero ese cambio **se perdió al resolver el merge `707d09e`** (quedó 0 %). Se restituye su avance y se aplica la regla de versiones: V1 completa (24 casos) + V2 con 8 casos nuevos (variables) = 24/32. Pendiente menor: la institución aún expone la geocerca | RF-004: HU4 «Variables del sistema» (CP-RF004-25 a 32) |
| 2026-10-08 | RF-004 | Back + Front | 0 % | 100 % | [Jhoel Silvestre] Implementación backend y frontend de institución, turnos (ventanas de marcado) y equipos autorizados (`equipos_autorizados`) | — |
| 2026-10-09 | RF-002, RF-007 | Documento | V2 | V2 | Perfil (acceso) y cargo (puesto) separados: catálogo de cargos con perfiles sugeridos (RF-002 HU4) y cargos del personal con historial (RF-007 HU6). Terminología "rol" → "perfil" en los RF. Modelo: 58 tablas | RF-002: 4 casos nuevos · RF-007: 5 casos nuevos |
| [RF-001](requerimientos/RF-001_Acceso_al_Sistema/V2/RF-001_Acceso_al_Sistema.md) | Seguridad | Acceso al sistema | Alta | — | V2 | Implementar V2: varios perfiles y cambio de perfil, variables configurables (3 casos) | 88 % | 88 % | Pendiente (V2) |
| [RF-002](requerimientos/RF-002_Usuarios_Roles_y_Menu/V2/RF-002_Usuarios_Roles_y_Menu.md) | Seguridad | Usuarios, perfiles y menú | Alta | — | V2 | Implementar V2: varios perfiles por cuenta, historial, alcance por permiso, cargos con perfiles sugeridos (9 casos) | 74 % | 74 % | Pendiente (V2) |
| [RF-003](requerimientos/RF-003_Bitacora_de_Auditoria/V1/RF-003_Bitacora_de_Auditoria.md) | Seguridad | Bitácora de auditoría | Baja | — | Redactado | — | 100 % | 100 % | Completado |
| [RF-004](requerimientos/RF-004_Institucion_y_Turnos/V2/RF-004_Institucion_y_Turnos.md) | Configuración | Institución, turnos y equipos autorizados | Alta | — | V2 | Implementar V2: HU4 variables del sistema (8 casos); quitar geocerca de institución | 75 % | 75 % | Pendiente (V2) |
| [RF-005](requerimientos/RF-005_Anio_Escolar_y_Calendario/V1/RF-005_Anio_Escolar_y_Calendario.md) | Configuración | Año escolar y calendario | Alta | CSP | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-006](requerimientos/RF-006_Grados_Cursos_y_Plan_de_Estudios/V1/RF-006_Grados_Cursos_y_Plan_de_Estudios.md) | Configuración | Grados, cursos y plan de estudios | Alta | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-007](requerimientos/RF-007_Personas_Docentes_Estudiantes_Apoderados/V2/RF-007_Personas_Docentes_Estudiantes_Apoderados.md) | Comunidad | Personas: docentes, estudiantes y apoderados | Alta | — | V2 | — | 0 % | 0 % | Por desarrollar |
| [RF-008](requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md) | Organización | Secciones, carga académica y horarios | Alta | CSP | Con pendientes | P-03, P-04 | 0 % | 0 % | Por desarrollar |
| [RF-009](requerimientos/RF-009_Matricula_Retiro_y_Traslado/V1/RF-009_Matricula_Retiro_y_Traslado.md) | Matrícula | Matrícula, retiro y traslado | Alta | ISA | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-010](requerimientos/RF-010_Marcacion_y_Asistencia_de_Estudiantes/V1/RF-010_Marcacion_y_Asistencia_de_Estudiantes.md) | Asistencia | Marcación y asistencia de estudiantes | Media | — | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-011](requerimientos/RF-011_Registro_de_Sesion_de_Clase/V2/RF-011_Registro_de_Sesion_de_Clase.md) | Seguimiento docente | Registro de sesión de clase | Alta | **CSP** | V2 (con pendientes) | P-04, P-07 | 0 % | 0 % | Por desarrollar |
| [RF-012](requerimientos/RF-012_Supervision_y_Ausencias_del_Docente/V2/RF-012_Supervision_y_Ausencias_del_Docente.md) | Seguimiento docente | Supervisión y ausencias del docente | Alta | **CSP** | V2 | — | 0 % | 0 % | Por desarrollar |
| [RF-013](requerimientos/RF-013_Consolidado_y_Ficha_de_Seguimiento_Docente/V1/RF-013_Consolidado_y_Ficha_de_Seguimiento_Docente.md) | Seguimiento docente | Consolidado y ficha de seguimiento docente | Alta | **CSP** | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-014](requerimientos/RF-014_Libretas_del_SIAGIE/V1/RF-014_Libretas_del_SIAGIE.md) | Libretas | Libretas del SIAGIE | Alta | **ISA** | Con pendientes | P-12 | 0 % | 0 % | Por desarrollar |
| [RF-015](requerimientos/RF-015_Unidades_y_Materiales_de_Reforzamiento/V2/RF-015_Unidades_y_Materiales_de_Reforzamiento.md) | Aula virtual | Unidades y materiales de reforzamiento | Alta | **IGM** | V2 | — | 0 % | 0 % | Por desarrollar |
| [RF-016](requerimientos/RF-016_Tareas_Entregas_y_Calificacion/V2/RF-016_Tareas_Entregas_y_Calificacion.md) | Aula virtual | Tareas, entregas y calificación | Media | IGM | V2 (con pendientes) | P-15 | 0 % | 0 % | Por desarrollar |
| [RF-017](requerimientos/RF-017_Interaccion_y_Actividad_del_Curso/V1/RF-017_Interaccion_y_Actividad_del_Curso.md) | Aula virtual | Interacción y actividad del curso | Baja | IGM | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-018](requerimientos/RF-018_Conducta_y_Observaciones_del_Estudiante/V2/RF-018_Conducta_y_Observaciones_del_Estudiante.md) | Convivencia | Conducta y observaciones del estudiante | Baja | — | V2 | — | 0 % | 0 % | Por desarrollar |
| [RF-019](requerimientos/RF-019_Comunicados_y_Notificaciones/V1/RF-019_Comunicados_y_Notificaciones.md) | Comunicación | Comunicados y notificaciones | Media | ISA | Redactado | — | 0 % | 0 % | Por desarrollar |
| [RF-020](requerimientos/RF-020_Indicadores_de_la_Tesis_y_Panel/V1/RF-020_Indicadores_de_la_Tesis_y_Panel.md) | Reportes | Indicadores de la tesis y panel | Alta | **ISA · CSP · IGM** | Con pendientes | P-18 | 0 % | 0 % | Por desarrollar |

### Resumen de avance

| Concepto | Valor |
|---|---|
| RF redactados | 20 / 20 |
| RF con pendientes | 5 (RF-008, RF-011, RF-014, RF-016, RF-020) |
| RF completados | 1 / 20 |
| Avance promedio Back | 16.9 % |
| Avance promedio Front | 16.9 % |

---

## 2.1 Registro de avance

Una fila por cada actualización. La más reciente arriba.

| Fecha | RF | Capa | Antes | Después | Qué se hizo | Escenarios pendientes |
|---|---|---|---|---|---|---|
| 2026-10-09 | RF-001, RF-002 | Back + Front | 100 % | RF-001 88 % · RF-002 83 % | Pasan a `Pendiente (V2)`: verificado en el código que no existen `usuario_roles`, `rol_permisos.alcance` ni `variables_sistema` (sí existen los roles Subdirector y Soporte TI). Porcentaje recalculado con los escenarios de la V2 | RF-001: CP-RF001-23 a 25 · RF-002: «Alcance de un permiso» y CP-RF002-27 a 30 |
| 2026-10-09 | RF-001, 002, 004, 007, 011, 012, 015, 016, 018 | Documento | V1 | V2 | Respuestas de la entrevista (P-01, 02, 05, 06, 08, 09, 10, 13, 14, 16, 17): varios perfiles por usuario, variables configurables con historial, tolerancias de sesión 15/15, salida automática, pesos por tipo. Modelo v3.3 (55 tablas). **RF-001 y RF-002 ya implementados en V1: falta implementar lo nuevo** | RF-001: 3 casos nuevos · RF-002: 4 casos nuevos |
| 2026-10-08 | RF-001, RF-002 | Documento | 100 % | 100 % (revisar) | Tras la implementación, el RF-002 V1 se ajustó: alcance por permiso (propio/tutoría/mis secciones/colegio), roles Subdirector y Soporte TI; el RF-001 sumó esos roles. Verificar que la implementación cubra los escenarios nuevos con la skill actualizar-backlog-rf | RF-002: «Alcance de un permiso» |
| 2026-10-08 | RF-020 | Documento | Por redactar | Con pendientes | Redacción V1 (fórmulas, pretest manual, postest congelado, Excel y PDF). Backlog 20/20 redactado | — |
| 2026-10-08 | RF-019 | Documento | Por redactar | Redactado | Redacción V1 (publicación por rol con alcance, lectura al abrir, solo en el sistema) | — |
| 2026-10-08 | RF-018 | Documento | Por redactar | Con pendientes | Redacción V1 (acceso por rol con alcance, confidencialidad, aviso al apoderado) | — |
| 2026-10-08 | RF-002, RF-014 | Documento | Redactado / Con pendientes | Ajustado | Alcance por rol (propio, tutoría, mis secciones, colegio) para todo el sistema | — |
| 2026-10-08 | RF-017 | Documento | Por redactar | Redactado | Redacción V1 (muro abierto, chat grupal sin privados, moderación con vigencia 0) | — |
| 2026-10-08 | RF-016 | Documento | Por redactar | Con pendientes | Redacción V1 (tipos configurables, intentos, calificación automática, literal al exportar) | — |
| 2026-10-08 | RF-015 | Documento | Por redactar | Con pendientes | Redacción V1 (planificación congelada, solicitudes de cambio de fecha) | — |
| 2026-10-08 | RF-014 | Documento | Por redactar | Con pendientes | Redacción V1 (carga en bloque, alcance configurable, historial de archivos) | — |
| 2026-10-08 | RF-013 | Documento | Por redactar | Redactado | Redacción V1 (informativo, versiones, solicitudes de revisión) | — |
| 2026-10-08 | RF-002, RF-003 | Fullstack | 100 % | 100 % | [Jhoel Silvestre] Optimización de rendimiento y arquitectura: paginación por cursor en BD con PL/pgSQL JSONB (`fn_consultar_usuarios`, `fn_consultar_bitacora_auditoria`), auditoría asíncrona desacoplada con BullMQ (`audit-queue`) y estandarización modular por carpetas | — |
| 2026-10-07 | RF-003 | Front | 0 % | 100 % | [Jhoel Silvestre] Implementación completa frontend en Next.js / Bun: Bitácora de Auditoría (/admin/audit), filtros de fecha (máx 31d), acciones, modal comparativo antes/después y sellado inmutable | — |
| 2026-10-07 | RF-001 | Front | 0 % | 100 % | [Jhoel Silvestre] Implementación completa frontend de Autenticación: Login institucional, auto-redirección de sesión activa, cambio forzoso de clave y guards | — |
| 2026-10-05 | RF-012 | Documento | Con pendientes | Con pendientes | P-11 resuelto: historial de versiones con baja lógica (vigencia 0) | — |
| 2026-10-05 | RF-012 | Documento | Por redactar | Con pendientes | Redacción V1 (ausencias con fotos, descargo, anulación) | — |
| 2026-10-05 | RF-002 | Front | 0 % | 100 % | [Jhoel Silvestre] Implementación completa frontend en Next.js / Bun: Gestión de Usuarios, Roles, Permisos RBAC, modales y exportación Excel | — |
| 2026-10-05 | RF-003 | Back | 0 % | 100 % | [Jhoel Silvestre] Implementación completa backend de Bitácora de Auditoría: DTOs, filtros, paginación, servicio, controlador y unit tests (81 tests en 11 suites) | — |
| 2026-10-05 | RF-001 | Back | 0 % | 100 % | [Jhoel Silvestre] Certificación de pruebas unitarias backend y migración a jerarquía test/ con aliases @/ (66 tests pasando en 9 suites) | — |
| 2026-10-05 | RF-002 | Back | 0 % | 100 % | [Jhoel Silvestre] Implementación completa backend: HU1 Cuentas, HU2 Roles/Permisos, HU3 Módulos y Menú (25 escenarios cubiertos con tests) | — |
| 2026-10-03 | RF-011 | Documento | Por redactar | Con pendientes | Redacción V1 (kiosko de sesiones, justificación por subdirector) | — |
| 2026-10-03 | RF-010 | Documento | Por redactar | Redactado | Redacción V1 (asistencia por sesión) | — |
| 2026-10-03 | RF-009 | Documento | Por redactar | Redactado | Redacción V1 | — |
| 2026-10-03 | RF-001 a RF-008 | Documento | Por redactar | Redactado / Con pendientes | Redacción V1 con la skill Gherkin | — |

---

## 3. Matriz de trazabilidad (objetivo → indicador → RF → datos)

> [!warning] Por confirmar
> La columna _Objetivo específico_ usa provisionalmente el nombre del indicador del Anexo 03. Hay que reemplazarla por la redacción exacta de los objetivos específicos del proyecto de tesis.

| Objetivo específico | Indicador | Fórmula | RF que lo soportan | Tablas |
|---|---|---|---|---|
| Mejorar las prácticas pedagógicas *(por confirmar)* | **CSP** — Cumplimiento de sesiones planificadas | (cumplidas + parciales) ÷ (planificadas − justificadas) × 100 *(P-18)* | RF-005, RF-008, RF-011, RF-012, RF-013, RF-020 | `horarios`, `calendario_eventos`, `sesiones_clase`, `ausencias_sesion`, `evidencias_ausencia`, `consolidados_docente` |
| Mejorar el seguimiento académico *(por confirmar)* | **ISA** — Informes de seguimiento académico entregados | libretas publicadas a tiempo ÷ libretas programadas × 100 | RF-009, RF-014, RF-019, RF-020 | `matriculas`, `libretas`, `notificaciones` |
| Mejorar la gestión del aula virtual *(por confirmar)* | **IGM** — Gestión de materiales | materiales publicados a tiempo ÷ materiales planificados × 100 | RF-015, RF-016, RF-017, RF-020 | `unidades_aprendizaje`, `materiales`, `tareas`, `actividad_aula` |

---

## 4. Requerimientos no funcionales (RNF)

| RNF    | Categoría      | Requerimiento                                                                                                                                                  |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Seguridad      | Las contraseñas se guardan cifradas (hash) y nunca en texto plano; la cuenta se bloquea tras intentos fallidos consecutivos.                                   |
| RNF-02 | Seguridad      | Cada usuario accede solo a las opciones y datos que permite su rol (control de acceso por permisos).                                                           |
| RNF-03 | Auditoría      | Las altas, cambios y eliminaciones de datos sensibles quedan registrados en una bitácora que no se puede editar.                                               |
| RNF-04 | Usabilidad     | El sistema se puede usar desde computadora y celular (diseño adaptable); la marcación y la firma de sesión se hacen en kioskos autorizados dentro del colegio. |
| RNF-05 | Rendimiento    | Las consultas y pantallas de uso diario responden en menos de 3 segundos en condiciones normales.                                                              |
| RNF-06 | Disponibilidad | El sistema está disponible durante el horario escolar (lunes a viernes, 7:00 a 18:00) con al menos 99 % de disponibilidad.                                     |
| RNF-07 | Respaldo       | Se hace una copia de seguridad diaria de la base de datos y de los archivos (libretas, evidencias, materiales).                                                |
| RNF-08 | Integridad     | Los consolidados docentes cerrados y las libretas publicadas no se pueden modificar sin dejar registro.                                                        |

---

## 5. Orden de redacción (Fase 3)

**Primero el núcleo de la tesis, después la base del sistema.**

| Orden | RF                                                | Motivo                            |
| ----- | ------------------------------------------------- | --------------------------------- |
| 1     | RF-011 Registro de sesión de clase                | Origen del dato del CSP           |
| 2     | RF-012 Supervisión y ausencias del docente        | Evidencia del seguimiento docente |
| 3     | RF-013 Consolidado y ficha de seguimiento docente | Cierre del seguimiento docente    |
| 4     | RF-014 Libretas del SIAGIE                        | Origen del dato del ISA           |
| 5     | RF-015 Unidades y materiales de reforzamiento     | Origen del dato del IGM           |
| 6     | RF-020 Indicadores de la tesis y panel            | Medición de los tres indicadores  |
| 7     | RF-016, RF-017                                    | Resto del aula virtual            |
| 8     | RF-001 a RF-010                                   | Base del sistema                  |
| 9     | RF-018, RF-019, RF-003                            | Complementarios                   |

### Pendientes antes de redactar

- [ ] Cabecera de los RF: **Proyecto** (ej. "IENSC — SGA Colegio") y **BA responsable**.
- [ ] Redacción exacta de los **objetivos específicos** para la matriz de trazabilidad.
- [ ] Actualizar el Modelo Conceptual (`Diseño de Base de Datos/02 - Modelo Conceptual (Diagrama E-R).md`) a la v3.1 del modelo.
