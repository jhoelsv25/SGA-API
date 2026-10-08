# RF-018: Conducta y Observaciones del Estudiante

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Convivencia
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Baja | **Complejidad:** Media | **Esfuerzo estimado:** 8 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permisos con alcance), `RF-007` (estudiantes y apoderados), `RF-008` (tutor y secciones), `RF-009` (matrículas), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

*   **Propósito.** Registrar la conducta del estudiante (méritos y faltas) y el seguimiento tutorial o psicopedagógico, y mantener informada a la familia.
*   **Acceso por rol con alcance.** Quién registra no es fijo: depende del permiso y su alcance por rol (`RF-002`). Valores por defecto:

    | Rol | `conducta.registrar` | `observaciones.registrar` |
    |---|---|---|
    | Docente | `mis_secciones` (sus salones) | `mis_secciones` |
    | Director, Subdirector | `colegio` | `colegio` |

    El Administrador puede darlos a otro rol (por ejemplo, un Auxiliar o un Psicólogo) con el alcance que corresponda, en cualquier momento.
*   **Incidencias de conducta.**

    | Dato | Obligatorio | Regla |
    |---|---|---|
    | Estudiante | Sí | Con matrícula vigente, dentro del alcance del usuario |
    | Fecha | Sí | No futura; dentro de un bimestre (se asigna el bimestre automáticamente) |
    | Tipo | Sí | `merito` o `falta` |
    | Categoría | Sí | Ej. Puntualidad, Respeto, Responsabilidad, Participación, Uniforme |
    | Gravedad | Condicional | Obligatoria en faltas: `leve`, `grave`, `muy_grave`; no aplica en méritos |
    | Descripción | Sí | |
    | Lugar | No | |
    | Medidas tomadas | No | |

*   **Aviso al apoderado.** Al registrar una incidencia (mérito o falta), el sistema **notifica automáticamente** al apoderado principal (`RF-019`) y marca la incidencia como notificada con la fecha.
*   **Quién ve las incidencias.** El estudiante, sus apoderados, su tutor, quien la registró y los roles con alcance `colegio`. **No** las ven otros estudiantes, otros apoderados ni otros docentes.
*   **Observaciones del estudiante.** Seguimiento tutorial o psicopedagógico: fecha, tipo (`academica`, `conductual`, `socioemocional`, `salud`, `familiar`), observación, seguimiento, derivado a (psicología, DEMUNA, centro de salud…) y si es **confidencial**.
*   **Quién ve las observaciones.**

    | Observación | La ven |
    |---|---|
    | No confidencial | Quien la registró, el tutor, los docentes de la sección, los apoderados y los roles con alcance `colegio` |
    | **Confidencial** | Solo **quien la registró**, el **tutor** y los **apoderados** del estudiante, y el Director *(P-17)* |

    Nunca las ven otros estudiantes, otros apoderados ni docentes que no la registraron (en el caso de las confidenciales).
*   **Corrección con historial.** Quien registró una incidencia u observación puede corregirla dentro de **24 horas**; después, solo se **anula** con motivo. Una corrección crea una versión nueva y la anterior queda con **vigencia 0**, con quién y cuándo. Nada se borra (mismo criterio que `RF-012`).
*   **Resumen del estudiante.** En su ficha se ve el total de méritos y faltas por bimestre y gravedad.
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Registro, corrección, anulación y consultas de observaciones confidenciales quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Incidencia registrada | "Incidencia registrada. Se notificó al apoderado." |
| Falta sin gravedad | "Indique la gravedad de la falta." |
| Fecha futura | "La fecha no puede ser posterior a hoy." |
| Fuera de alcance | "No tiene permiso para registrar sobre estudiantes de esta sección." |
| Corrección fuera de plazo | "Ya no se puede corregir. Puede anularla indicando el motivo." |
| Anulación sin motivo | "Indique el motivo de la anulación." |
| Sin acceso a la observación | "No tiene acceso a esta observación." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Nota de conducta en la libreta.** La libreta es el PDF del SIAGIE (`RF-014`).
*   **Historia clínica o informes psicológicos completos.** Solo se registra el seguimiento.
*   **Envío por SMS o WhatsApp.** El aviso es una notificación dentro del sistema (`RF-019`).
*   **Configuración de roles, permisos y alcances.** Corresponde a `RF-002`.

## Acuerdos y puntos abiertos

*   **Acceso configurable por rol (acordado).** Por defecto, el docente registra en sus salones y el Director y Subdirector en todo el colegio.
*   **Aviso al apoderado (acordado).** Ve las incidencias y recibe notificación.
*   **Observaciones confidenciales (acordado).** Las ven quien la registró, el tutor y los apoderados.
*   **Director y estudiante en las confidenciales (pendiente, P-17).** Supuesto: el Director sí, el estudiante no.

## Historia de Usuario 1: Registrar incidencias de conducta

**Como** Docente
**Quiero** registrar méritos y faltas de mis estudiantes
**Para** dejar constancia de su conducta e informar a su familia.

### Escenario: Registrar una falta
**Dado** que dicto en 5.° A y tengo `conducta.registrar` con alcance `mis_secciones`
**Cuando** registro una `falta` de gravedad `leve`, categoría "Uniforme", con descripción, para un estudiante de 5.° A
**Entonces** el sistema guarda la incidencia, notifica al apoderado principal y muestra "Incidencia registrada. Se notificó al apoderado."

### Escenario: Registrar un mérito
**Dado** que estoy registrando una incidencia
**Cuando** registro un `merito` de categoría "Participación"
**Entonces** el sistema la guarda sin gravedad y notifica al apoderado.

### Escenario: Falta sin gravedad
**Dado** que estoy registrando una `falta`
**Cuando** intento guardar sin gravedad
**Entonces** el sistema impide guardar y muestra "Indique la gravedad de la falta."

### Escenario: Fecha futura
**Dado** que estoy registrando una incidencia
**Cuando** pongo una fecha posterior a hoy
**Entonces** el sistema impide guardar y muestra "La fecha no puede ser posterior a hoy."

### Escenario: Estudiante fuera de mi alcance
**Dado** que mi alcance es `mis_secciones` y no dicto en 4.° B
**Cuando** intento registrar una incidencia de un estudiante de 4.° B
**Entonces** el sistema rechaza la acción y muestra "No tiene permiso para registrar sobre estudiantes de esta sección."

### Escenario: Director registra en todo el colegio
**Dado** que soy Director con alcance `colegio`
**Cuando** registro una incidencia de cualquier estudiante
**Entonces** el sistema la guarda.

### Escenario: Corregir dentro del plazo
**Dado** que registré una incidencia hace 3 horas
**Cuando** corrijo su descripción y guardo
**Entonces** el sistema crea una versión nueva y deja la anterior con vigencia 0, con quién y cuándo.

### Escenario: Corrección fuera de plazo
**Dado** que la incidencia se registró hace 2 días
**Cuando** intento corregirla
**Entonces** el sistema lo impide y muestra "Ya no se puede corregir. Puede anularla indicando el motivo."

### Escenario: Anular sin motivo
**Dado** que estoy anulando una incidencia
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo de la anulación."

## Historia de Usuario 2: Observaciones del estudiante

**Como** Tutor
**Quiero** registrar el seguimiento tutorial de mis estudiantes, incluso de forma confidencial
**Para** acompañarlos sin exponer información sensible.

### Escenario: Registrar una observación confidencial
**Dado** que soy tutor de 5.° A
**Cuando** registro una observación `familiar`, marcada como confidencial, derivada a psicología
**Entonces** el sistema la guarda y solo la podrán ver quien la registró, el tutor, los apoderados del estudiante y el Director.

### Escenario: Otro docente intenta ver una confidencial
**Dado** que soy docente de 5.° A pero no registré la observación ni soy tutor
**Cuando** intento abrir una observación confidencial de un estudiante de 5.° A
**Entonces** el sistema no la muestra y, si se intenta por otra vía, muestra "No tiene acceso a esta observación."

### Escenario: Observación no confidencial
**Dado** que se registró una observación `academica` no confidencial
**Cuando** un docente de la sección abre la ficha del estudiante
**Entonces** puede verla.

## Historia de Usuario 3: Consulta de la familia y el estudiante

**Como** Apoderado
**Quiero** ver las incidencias y observaciones de mi hijo
**Para** acompañar su conducta y su bienestar.

### Escenario: Apoderado recibe y ve una incidencia
**Dado** que se registró una falta de mi hijo
**Cuando** abro la notificación
**Entonces** veo la fecha, el tipo, la categoría, la gravedad, la descripción y las medidas tomadas.

### Escenario: Apoderado ve las observaciones
**Dado** que mi hijo tiene observaciones, algunas confidenciales
**Cuando** abro "Seguimiento" de mi hijo
**Entonces** veo sus observaciones, incluidas las confidenciales.

### Escenario: Información de otro estudiante
**Dado** que soy apoderado
**Cuando** intento ver incidencias u observaciones de un estudiante que no es mi hijo
**Entonces** el sistema rechaza el acceso.

### Escenario: Estudiante consulta su conducta
**Dado** que soy estudiante
**Cuando** abro "Mi conducta"
**Entonces** veo mis méritos y faltas, pero no las observaciones confidenciales.

### Escenario: Resumen en la ficha
**Dado** que soy tutor
**Cuando** abro la ficha de un estudiante
**Entonces** veo el total de méritos y faltas por bimestre y por gravedad.

---

## Reglas de validación y negocio (resumen)

*   **Permisos con alcance (`RF-002`):** `conducta.registrar` y `observaciones.registrar`; por defecto Docente `mis_secciones`, Director y Subdirector `colegio`.
*   **Incidencias:** obligatorios Estudiante, Fecha (no futura), Tipo, Categoría y Descripción; Gravedad obligatoria solo en faltas; bimestre automático; notificación automática al apoderado principal.
*   **Visibilidad de incidencias:** estudiante, apoderados, tutor, quien registró y alcance `colegio`.
*   **Observaciones confidenciales:** quien registró, tutor, apoderados y Director (P-17); no el estudiante.
*   **Corrección:** dentro de 24 horas con versión nueva (la anterior con vigencia 0); después, anulación con motivo; nada se borra.
*   **Auditoría:** registro, corrección, anulación y consultas de confidenciales (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Registrar incidencia · Registrar observación (con casilla "Confidencial") · Ficha del estudiante (pestañas Conducta y Seguimiento, con resumen) · Mi conducta (estudiante) · Seguimiento de mi hijo (apoderado). Escenarios: Falta con aviso · Mérito · Fuera de alcance · Confidencial sin acceso · Corrección y anulación.
