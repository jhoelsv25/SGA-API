# RF-009: Matrícula, Retiro y Traslado

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Matrícula
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 12 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (año escolar), `RF-007` (estudiantes y apoderados), `RF-008` (secciones y vacantes).

## Consideraciones y supuestos de negocio

- **Propósito.** Registrar en qué sección estudia cada estudiante cada año, y sus retiros, traslados y cambios de sección. La matrícula define quién recibe libreta en cada bimestre (`RF-014`) y, por tanto, el denominador del ISA (`RF-020`).
- **Una matrícula por estudiante y año.** Un estudiante solo puede tener una matrícula en un mismo año escolar, en una sección `activa` de ese año.
- **Datos de la matrícula.**

  | Dato                   | Obligatorio | Regla                                                                                  |
  | ---------------------- | ----------- | -------------------------------------------------------------------------------------- |
  | Código de matrícula    | Automático  | Año + correlativo (ej. `2027-000123`); único                                           |
  | Estudiante             | Sí          | Estado `activo` (`RF-007`)                                                             |
  | Año escolar            | Sí          | `planificado` o `en_curso`                                                             |
  | Sección                | Sí          | Del mismo año, `activa`, con vacantes                                                  |
  | Fecha de matrícula     | Sí          | Por defecto, hoy                                                                       |
  | Tipo                   | Sí          | `nuevo` (primer año en el colegio), `continuador` o `traslado` (viene de otro colegio) |
  | Repitente              | No          | Se marca si repite el grado                                                            |
  | Colegio de procedencia | Condicional | Obligatorio si el tipo es `traslado`                                                   |
  | Observaciones          | No          |                                                                                        |

- **Vacantes.** No se puede matricular en una sección que ya alcanzó sus vacantes. Solo cuentan las matrículas en estado `matriculado`.
- **Grado correcto para continuadores.** Para un continuador, el sistema propone el grado siguiente al del año anterior, o el mismo si se marca como repitente. Si se elige otro grado, pide confirmación.
- **Apoderado principal.** Si el estudiante no tiene apoderado principal registrado (`RF-007`), el sistema avisa al matricular, pero no lo impide.
- **Matrícula masiva de continuadores.** Al inicio del año, la Secretaria elige una sección del año anterior y la sección destino del año nuevo. El sistema lista a los estudiantes que culminaron, para desmarcar a los que no continúan, y los matricula a todos de una vez como `continuador`, respetando las vacantes.
- **Estados de la matrícula.**

  | Acción                   | Desde         | Hacia         | Efecto                                                                                  |
  | ------------------------ | ------------- | ------------- | --------------------------------------------------------------------------------------- |
  | Matricular               | —             | `matriculado` | El estudiante aparece en su sección                                                     |
  | Retirar                  | `matriculado` | `retirado`    | Fecha y motivo obligatorios; el estudiante pasa a `retirado`                            |
  | Trasladar a otro colegio | `matriculado` | `trasladado`  | Fecha y colegio de destino obligatorios; el estudiante pasa a `trasladado`              |
  | Culminar el año          | `matriculado` | `culminado`   | Automático al cerrar el año escolar (`RF-005`); en 5.°, el estudiante pasa a `egresado` |

- **Efecto del retiro o traslado.** Desde la fecha de salida, el estudiante deja de aparecer en las listas de asistencia y del aula virtual; su cuenta y su credencial se desactivan; y **no se le programan libretas** de los bimestres siguientes, para que no cuente en el ISA. Su historial (asistencias, entregas, libretas ya publicadas) se conserva.
- **Cambio de sección.** Dentro del mismo año, un estudiante `matriculado` puede pasar a otra sección del **mismo grado** con vacantes. La matrícula se mantiene y el cambio queda en la bitácora con el motivo.
- **Anular una matrícula.** Solo si se registró por error y el estudiante aún no tiene asistencias ni entregas. Si ya tiene actividad, se retira en lugar de anularse.
- **Constancia de matrícula.** Se puede imprimir con los datos del colegio, del estudiante, del año y de la sección.
- **Quién gestiona.** La Secretaria. Director y Subdirector consultan.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Matrículas, cambios de sección, retiros, traslados y anulaciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                    | Mensaje                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Ya matriculado en el año     | "El estudiante ya está matriculado en el año 2027."                                             |
| Sin vacantes                 | "La sección 5.° A no tiene vacantes disponibles."                                               |
| Estudiante no activo         | "Solo se pueden matricular estudiantes en estado activo."                                       |
| Falta colegio de procedencia | "Indique el colegio de procedencia del estudiante trasladado."                                  |
| Grado distinto al esperado   | "El estudiante cursó 3.° en 2026. ¿Confirma matricularlo en 5.°?"                               |
| Sin apoderado principal      | "El estudiante no tiene apoderado principal registrado. Regístrelo para que reciba la libreta." |
| Retiro incompleto            | "Indique la fecha y el motivo del retiro."                                                      |
| Traslado incompleto          | "Indique la fecha y el colegio de destino."                                                     |
| Cambio a otro grado          | "Solo se puede cambiar a una sección del mismo grado."                                          |
| Anulación con actividad      | "No se puede anular: el estudiante ya tiene actividad. Regístrelo como retirado."               |
| Matrícula masiva terminada   | "Se matricularon [N] estudiantes en 5.° A. [M] no se matricularon; revise el detalle."          |

## Requerimientos fuera de alcance (Out of Scope)

- **Registro de la ficha del estudiante y sus apoderados.** Corresponde a `RF-007`.
- **Pagos de matrícula o pensiones.** No se contempla.
- **Envío de la matrícula al SIAGIE.** La Secretaria la sigue registrando en el SIAGIE; el sistema no se integra.
- **Reserva de vacantes o lista de espera.** No se contempla.
- **Traslados entrantes con notas del colegio anterior.** Las notas del aula real no se registran.

## Acuerdos y puntos abiertos

- **Apoderado principal (acordado).** Se avisa pero no se exige al matricular.
- **Cuenta del estudiante retirado o trasladado (acordado).** Se desactiva; si necesita una libreta anterior, la solicita en secretaría.

## Historia de Usuario 1: Matrícula individual

**Como** Secretaria
**Quiero** matricular a un estudiante en una sección del año escolar
**Para** que forme parte de la sección y del sistema durante el año.

### Escenario: Matricular un estudiante nuevo

**Dado** que el estudiante está `activo`, no tiene matrícula en 2027 y 1.° A tiene vacantes
**Cuando** lo matriculo en 1.° A de 2027 como `nuevo` y guardo
**Entonces** el sistema crea la matrícula `matriculado` con código `2027-000001`
**Y** el estudiante aparece en la lista de 1.° A.

### Escenario: Estudiante ya matriculado en el año

**Dado** que el estudiante ya tiene matrícula en 2027
**Cuando** intento matricularlo otra vez en 2027
**Entonces** el sistema bloquea el guardado y muestra "El estudiante ya está matriculado en el año 2027."

### Escenario: Sección sin vacantes

**Dado** que 5.° A tiene 35 vacantes y 35 matriculados
**Cuando** intento matricular a otro estudiante en 5.° A
**Entonces** el sistema bloquea el guardado y muestra "La sección 5.° A no tiene vacantes disponibles."

### Escenario: Estudiante que llega por traslado

**Dado** que estoy matriculando a un estudiante de tipo `traslado`
**Cuando** intento guardar sin colegio de procedencia
**Entonces** el sistema impide guardar y muestra "Indique el colegio de procedencia del estudiante trasladado."

### Escenario: Continuador en un grado inesperado

**Dado** que el estudiante cursó 3.° en 2026
**Cuando** lo matriculo en 5.° en 2027
**Entonces** el sistema muestra "El estudiante cursó 3.° en 2026. ¿Confirma matricularlo en 5.°?" y solo guarda si confirmo.

### Escenario: Estudiante sin apoderado principal

**Dado** que el estudiante no tiene apoderado principal
**Cuando** lo matriculo
**Entonces** el sistema guarda la matrícula y muestra "El estudiante no tiene apoderado principal registrado. Regístrelo para que reciba la libreta."

### Escenario: Estudiante no activo

**Dado** que el estudiante está `egresado`
**Cuando** intento matricularlo
**Entonces** el sistema bloquea el guardado y muestra "Solo se pueden matricular estudiantes en estado activo."

### Escenario: Imprimir la constancia

**Dado** que el estudiante tiene matrícula vigente
**Cuando** presiono "Constancia de matrícula"
**Entonces** el sistema genera un PDF con los datos del colegio, del estudiante, del año y de la sección.

## Historia de Usuario 2: Matrícula masiva de continuadores

**Como** Secretaria
**Quiero** matricular de una vez a los estudiantes que continúan en el colegio
**Para** no hacerlo uno por uno al inicio del año.

### Escenario: Pasar una sección al grado siguiente

**Dado** que 4.° A de 2026 tiene 32 estudiantes con matrícula `culminado`
**Cuando** elijo 4.° A de 2026 como origen y 5.° A de 2027 como destino
**Entonces** el sistema lista los 32 estudiantes, todos marcados, con los que ya tienen matrícula en 2027 deshabilitados.

### Escenario: Confirmar la matrícula masiva

**Dado** que dejé marcados 30 estudiantes y 5.° A tiene 35 vacantes
**Cuando** presiono "Matricular"
**Entonces** el sistema matricula a los 30 como `continuador` y muestra "Se matricularon 30 estudiantes en 5.° A. 0 no se matricularon; revise el detalle."

### Escenario: Más estudiantes que vacantes

**Dado** que marqué 38 estudiantes y 5.° A tiene 35 vacantes
**Cuando** presiono "Matricular"
**Entonces** el sistema matricula a los primeros 35 en orden alfabético y lista a los 3 restantes como no matriculados por falta de vacantes.

## Historia de Usuario 3: Retiro, traslado y cambio de sección

**Como** Secretaria
**Quiero** registrar cuando un estudiante se retira, se traslada a otro colegio o cambia de sección
**Para** que las listas y los indicadores reflejen la realidad.

### Escenario: Retirar a un estudiante

**Dado** que el estudiante está `matriculado` en 5.° A
**Cuando** registro su retiro con fecha 15/08/2027 y motivo "Cambio de domicilio" y confirmo
**Entonces** la matrícula pasa a `retirado`, el estudiante a `retirado`, y se desactivan su cuenta y su credencial
**Y** desde esa fecha no aparece en las listas de asistencia ni del aula virtual, ni se le programan libretas de los bimestres siguientes.

### Escenario: Retiro sin motivo

**Dado** que estoy registrando un retiro
**Cuando** confirmo sin fecha o sin motivo
**Entonces** el sistema impide la acción y muestra "Indique la fecha y el motivo del retiro."

### Escenario: Traslado a otro colegio

**Dado** que el estudiante está `matriculado`
**Cuando** registro su traslado con fecha y colegio de destino y confirmo
**Entonces** la matrícula pasa a `trasladado` con los mismos efectos que un retiro.

### Escenario: Traslado sin colegio de destino

**Dado** que estoy registrando un traslado
**Cuando** confirmo sin fecha o sin colegio de destino
**Entonces** el sistema impide la acción y muestra "Indique la fecha y el colegio de destino."

### Escenario: Cambiar de sección

**Dado** que el estudiante está `matriculado` en 5.° A y 5.° B tiene vacantes
**Cuando** lo cambio a 5.° B indicando el motivo
**Entonces** el estudiante pasa a la lista de 5.° B desde hoy y el cambio queda en la bitácora.

### Escenario: Cambio a otro grado

**Dado** que el estudiante está en 5.° A
**Cuando** intento cambiarlo a 4.° B
**Entonces** el sistema bloquea la acción y muestra "Solo se puede cambiar a una sección del mismo grado."

### Escenario: Anular una matrícula con actividad

**Dado** que la matrícula ya tiene asistencias registradas
**Cuando** intento anularla
**Entonces** el sistema bloquea la acción y muestra "No se puede anular: el estudiante ya tiene actividad. Regístrelo como retirado."

### Escenario: Culminación al cerrar el año

**Dado** que el año 2027 se cierra (`RF-005`)
**Cuando** el sistema procesa el cierre
**Entonces** todas las matrículas `matriculado` de 2027 pasan a `culminado`
**Y** los estudiantes de 5.° pasan a `egresado`.

### Escenario: Listado de matrículas

**Dado** que estoy en "Matrículas"
**Cuando** elijo el año 2027
**Entonces** el sistema muestra código, estudiante, grado y sección, tipo, estado y fecha
**Y** permite filtrar por grado, sección, tipo y estado, con el total de matriculados por sección frente a sus vacantes.

### Escenario: Usuario sin permiso

**Dado** que mi perfil es Docente
**Cuando** intento abrir "Matrículas"
**Entonces** el sistema no muestra la opción y rechaza el acceso.

---

## Reglas de validación y negocio (resumen)

- **Matrícula:** una por estudiante y año; estudiante `activo`; sección `activa` del mismo año y con vacantes; código automático único.
- **Condicional:** colegio de procedencia obligatorio si el tipo es `traslado`.
- **Continuadores:** se propone el grado siguiente (o el mismo si repite); otro grado requiere confirmación.
- **Apoderado principal:** se avisa si falta; no bloquea.
- **Masiva:** respeta vacantes; matricula por orden alfabético; informa los no matriculados.
- **Estados:** `matriculado` → `retirado` / `trasladado` (fecha y motivo o destino obligatorios) / `culminado` (al cerrar el año; en 5.°, el estudiante egresa).
- **Retiro o traslado:** desactiva cuenta y credencial; no se programan libretas posteriores; el historial se conserva.
- **Cambio de sección:** solo al mismo grado y con vacantes.
- **Anulación:** solo sin actividad registrada.
- **Permisos:** gestión, la Secretaria; consulta, Director y Subdirector.
- **Auditoría:** todas las acciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Matrículas (listado con vacantes por sección) · Matricular estudiante · Matrícula masiva (origen, destino, lista con casillas) · Retiro / Traslado / Cambio de sección · Constancia. Escenarios: Alta · Sin vacantes · Masiva con exceso · Retiro · Cambio de sección · Culminación.
