# RF-008: Secciones, Carga Académica y Horarios

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Organización escolar
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (año escolar en curso), `RF-006` (grados, cursos y plan de estudios), `RF-007` (docentes).

## Consideraciones y supuestos de negocio

- **Propósito.** Organizar el año escolar en secciones, asignar qué docente dicta cada curso en cada sección y armar el horario semanal. El horario es la **planificación** de la que nacen las sesiones de clase (`RF-011`) y, por tanto, el denominador del CSP (`RF-020`).
- **Secciones.** Cada sección pertenece a un año escolar y a un grado, y tiene nombre (A, B, Única…), aula, vacantes (mayor que 0) y un docente tutor (opcional). No puede haber dos secciones con el mismo nombre en el mismo grado y año.
- **Tutor.** Debe ser un docente `activo`. Un docente puede ser tutor de una sola sección por año.
- **Estados de la sección.** `activa` o `cerrada`. Solo se cierra una sección sin estudiantes matriculados vigentes (`RF-009`).
- **Carga académica automática.** Al crear una sección, el sistema crea su carga académica con **todos los cursos del plan de estudios de su grado** (`RF-006`), sin docente. Luego se asigna el docente de cada curso.
- **Asignación de docentes.**
  - Solo docentes `activo`.
  - Una sección puede quedar con cursos sin docente; el horario se puede armar igual, pero esas clases no generan sesiones hasta que tengan docente.
  - **Carga horaria del docente:** la pantalla muestra la suma de horas semanales asignadas frente a su jornada (`RF-007`). Si la supera, avisa, pero no bloquea.
- **Cambio de docente a mitad de año.** Las sesiones ya firmadas conservan al docente que las dictó; las sesiones que se generen desde el cambio usan al nuevo docente (`RF-011`).
- **Jornada y hora pedagógica.** Según la norma peruana para secundaria de Jornada Escolar Regular (JER): **hora pedagógica de 45 minutos**, **7 horas pedagógicas al día** y **35 a la semana**, de lunes a viernes. Estos valores son parámetros del sistema y solo sirven para proponer los bloques del horario. _(Ver `PENDIENTES.md`, P-03.)_
- **Horario semanal.** Cada sección tiene bloques con día (lunes a viernes), hora de inicio, hora de fin, tipo (`clase` o `receso`) y aula opcional. Un bloque de clase pertenece a un curso de la carga académica; un receso no tiene curso.
- **Plantilla de bloques.** A partir de la hora de entrada y los parámetros de jornada, el sistema propone la grilla del día (por ejemplo, 07:45–08:30, 08:30–09:15… con el recreo), y el Administrador asigna un curso a cada bloque.
- **Bloques dobles.** Un curso puede ocupar dos horas pedagógicas seguidas como un solo bloque (por ejemplo, 08:30–10:00), o como dos bloques separados. _(Ver `PENDIENTES.md`, P-04.)_
- **Reglas del horario.**
  - Los bloques de una sección no se superponen.
  - **Un docente no puede estar en dos secciones a la misma hora.**
  - La hora de fin es posterior a la de inicio.
  - **Horas del plan:** la pantalla compara, por curso, las horas del horario con las del plan de estudios (por ejemplo, Matemática 5 de 6) y avisa si no coinciden. No bloquea.
- **Copiar horario.** Se puede copiar el horario de una sección a otra del mismo grado; los cursos se emparejan por curso y se vuelve a validar el cruce de docentes.
- **Cambios del horario a mitad de año.** Rigen desde el día siguiente. No cambian las sesiones ya generadas ni las ya firmadas.
- **Consulta.** Cada docente ve su horario semanal (todas sus secciones); cada estudiante y apoderado ve el horario de su sección.
- **Quién gestiona.** Perfiles con el permiso de organización escolar (por defecto, Administrador y Subdirector).
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear o editar secciones, asignar docentes y cambiar el horario queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                | Mensaje                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| Sección repetida         | "Ya existe la sección A de 5.° en este año."                         |
| Vacantes inválidas       | "Las vacantes deben ser mayores que 0."                              |
| Tutor ocupado            | "Este docente ya es tutor de otra sección en este año."              |
| Docente inactivo         | "Solo se pueden asignar docentes activos."                           |
| Exceso de carga horaria  | "El docente supera su jornada: tendrá 34 horas asignadas de 30."     |
| Sección con matriculados | "No se puede cerrar una sección con estudiantes matriculados."       |
| Bloques superpuestos     | "El bloque se cruza con otro bloque de la sección."                  |
| Cruce de docente         | "El docente ya dicta en 4.° B el lunes de 08:30 a 09:15."            |
| Horas invertidas         | "La hora de fin debe ser posterior a la hora de inicio."             |
| Horas distintas al plan  | "Matemática tiene 5 horas en el horario y 6 en el plan de estudios." |
| Horario guardado         | "El horario se guardó. Los cambios rigen desde mañana."              |

## Requerimientos fuera de alcance (Out of Scope)

- **Matrícula de estudiantes en la sección.** Corresponde a `RF-009`.
- **Generación de las sesiones de clase desde el horario.** Corresponde a `RF-011`.
- **Armado automático del horario** (que el sistema reparta solo los cursos). No se contempla; el sistema propone la grilla y valida.
- **Horarios distintos por bimestre.** El horario es uno por sección y rige desde su última modificación.
- **Sábados y domingos.** No se programan clases.

## Acuerdos y puntos abiertos

- **Jornada (pendiente, P-03).** Se asume JER: 45 minutos por hora pedagógica, 7 al día, 35 a la semana.
- **Bloques dobles (pendiente, P-04).** Se permiten como un solo bloque o como dos bloques.

## Historia de Usuario 1: Secciones

**Como** Administrador
**Quiero** crear las secciones del año con su tutor y sus vacantes
**Para** organizar a los estudiantes y docentes del año escolar.

### Escenario: Crear una sección

**Dado** que el año 2027 está en curso y el plan de estudios de 5.° tiene 12 cursos
**Cuando** creo la sección A de 5.° con aula "Pab. B – 201", 35 vacantes y tutor el docente Pérez
**Entonces** el sistema crea la sección `activa` y su carga académica con los 12 cursos sin docente.

### Escenario: Sección repetida

**Dado** que ya existe 5.° A en 2027
**Cuando** intento crear otra 5.° A en 2027
**Entonces** el sistema bloquea el guardado y muestra "Ya existe la sección A de 5.° en este año."

### Escenario: Vacantes inválidas

**Dado** que estoy creando una sección
**Cuando** ingreso 0 vacantes
**Entonces** el sistema impide guardar y muestra "Las vacantes deben ser mayores que 0."

### Escenario: Tutor de dos secciones

**Dado** que el docente Pérez ya es tutor de 5.° A en 2027
**Cuando** lo asigno como tutor de 4.° B en 2027
**Entonces** el sistema bloquea el guardado y muestra "Este docente ya es tutor de otra sección en este año."

### Escenario: Cerrar una sección con matriculados

**Dado** que 5.° C tiene estudiantes matriculados
**Cuando** intento cerrarla
**Entonces** el sistema bloquea la acción y muestra "No se puede cerrar una sección con estudiantes matriculados."

## Historia de Usuario 2: Carga académica

**Como** Administrador
**Quiero** asignar el docente de cada curso en cada sección
**Para** saber quién dicta qué y generar sus sesiones de clase.

### Escenario: Asignar un docente

**Dado** que 5.° A tiene Matemática sin docente
**Cuando** asigno al docente Quispe y guardo
**Entonces** el sistema registra la asignación y muestra la nueva carga horaria del docente.

### Escenario: Docente inactivo

**Dado** que el docente Ramos está `cesado`
**Cuando** intento asignarlo a un curso
**Entonces** el sistema no lo ofrece en la lista
**Y** si se intenta por otra vía, el servidor lo rechaza con "Solo se pueden asignar docentes activos."

### Escenario: Exceso de carga horaria

**Dado** que el docente Quispe tiene jornada de 30 horas y 28 asignadas
**Cuando** le asigno un curso de 6 horas
**Entonces** el sistema muestra "El docente supera su jornada: tendrá 34 horas asignadas de 30." y permite confirmar.

### Escenario: Cambiar el docente a mitad de año

**Dado** que Matemática de 5.° A la dicta Quispe y ya tiene sesiones firmadas
**Cuando** la asigno a la docente Flores
**Entonces** las sesiones ya firmadas siguen a nombre de Quispe
**Y** las sesiones que se generen desde ahora son de Flores.

### Escenario: Ver la carga de un docente

**Dado** que estoy en la ficha del docente Quispe
**Cuando** abro "Carga académica"
**Entonces** el sistema lista sus cursos y secciones con las horas de cada uno y el total frente a su jornada.

## Historia de Usuario 3: Horario semanal

**Como** Administrador
**Quiero** armar el horario semanal de cada sección
**Para** que el sistema sepa qué clases están planificadas cada día.

### Escenario: Proponer la grilla del día

**Dado** que la hora de entrada de estudiantes es 07:45 y la jornada es de 7 horas de 45 minutos
**Cuando** abro el horario de 5.° A
**Entonces** el sistema propone los bloques de lunes a viernes, con el recreo, listos para asignarles un curso.

### Escenario: Asignar un curso a un bloque

**Dado** que el lunes 07:45–08:30 de 5.° A está libre
**Cuando** le asigno Matemática
**Entonces** el bloque queda como clase de Matemática con su docente.

### Escenario: Bloque doble

**Dado** que el lunes 08:30–10:00 está libre
**Cuando** registro un bloque de Comunicación de 08:30 a 10:00
**Entonces** el sistema lo guarda como un solo bloque de 2 horas pedagógicas.

### Escenario: Bloques superpuestos

**Dado** que 5.° A tiene clase el lunes de 08:30 a 09:15
**Cuando** registro otro bloque el lunes de 09:00 a 09:45
**Entonces** el sistema impide guardar y muestra "El bloque se cruza con otro bloque de la sección."

### Escenario: Cruce de docente

**Dado** que el docente Quispe dicta en 4.° B el lunes de 08:30 a 09:15
**Cuando** asigno su curso en 5.° A el lunes de 08:30 a 09:15
**Entonces** el sistema impide guardar y muestra "El docente ya dicta en 4.° B el lunes de 08:30 a 09:15."

### Escenario: Horas distintas al plan

**Dado** que Matemática tiene 6 horas en el plan de 5.°
**Cuando** guardo un horario con 5 horas de Matemática
**Entonces** el sistema guarda y muestra "Matemática tiene 5 horas en el horario y 6 en el plan de estudios."

### Escenario: Copiar el horario a otra sección

**Dado** que el horario de 5.° A está completo
**Cuando** lo copio a 5.° B
**Entonces** el sistema crea los mismos bloques con los cursos de 5.° B
**Y** marca los bloques donde el docente de 5.° B tiene cruce, para corregirlos.

### Escenario: Cambiar el horario a mitad de año

**Dado** que el año está en curso
**Cuando** cambio un bloque y guardo
**Entonces** el sistema muestra "El horario se guardó. Los cambios rigen desde mañana."
**Y** las sesiones de hoy no cambian.

### Escenario: Consultar mi horario

**Dado** que soy docente con sesión iniciada
**Cuando** abro "Mi horario"
**Entonces** el sistema muestra mi semana con cada bloque, curso, sección y aula, con el color de cada curso.

### Escenario: Usuario sin permiso

**Dado** que mi perfil no tiene el permiso de organización escolar
**Cuando** intento abrir "Secciones" o "Horarios" para editar
**Entonces** el sistema no me ofrece crear ni modificar.

---

## Reglas de validación y negocio (resumen)

- **Secciones:** nombre único por grado y año; vacantes > 0; tutor docente activo, tutor de una sola sección por año; se cierra solo sin matriculados.
- **Carga académica:** se crea con los cursos del plan del grado; solo docentes activos; aviso si se supera la jornada; el cambio de docente no altera sesiones firmadas.
- **Horario:** lunes a viernes; fin posterior al inicio; sin superposición en la sección; sin cruce de docente; aviso si las horas no coinciden con el plan; cambios rigen desde el día siguiente.
- **Jornada (parámetro):** 45 minutos por hora pedagógica, 7 al día.
- **Permisos:** gestión, perfiles con el permiso de organización escolar (Administrador y Subdirector); consulta del propio horario, docentes, estudiantes y apoderados.
- **Auditoría:** secciones, asignaciones y horarios (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Secciones (listado por grado y formulario) · Carga académica (tabla curso–docente con carga horaria) · Horario (grilla semanal con arrastrar y soltar) · Mi horario. Escenarios: Grilla propuesta · Bloque doble · Superposición · Cruce de docente · Horas distintas al plan · Copiar horario.
