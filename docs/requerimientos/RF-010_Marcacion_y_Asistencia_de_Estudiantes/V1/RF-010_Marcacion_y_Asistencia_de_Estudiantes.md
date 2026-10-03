# RF-010: Marcación y Asistencia de Estudiantes

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Kiosko y Portal Web — Asistencia
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-004` (turnos y equipos autorizados), `RF-005` (días con y sin clases), `RF-007` (credenciales), `RF-009` (matrículas vigentes), `RF-011` (sesiones de clase).

## Consideraciones y supuestos de negocio

*   **Propósito.** Registrar dos asistencias distintas:
    1.  **Asistencia al colegio:** la marcación en los kioskos de la puerta (estudiantes) y del personal (docentes y administrativos).
    2.  **Asistencia en clase:** la que toma el docente a sus estudiantes **en cada sesión de clase**.
    Son independientes: un estudiante puede haber marcado en la puerta y tener falta en una clase, o al revés.
*   **Quién marca y qué marca.**

    | Persona | Kiosko | Marca |
    |---|---|---|
    | Estudiante | Kiosko Estudiantes (puerta principal) | **Solo entrada** |
    | Docente y administrativo | Kiosko Personal (afuera de secretaría) | **Entrada y salida** |

*   **Cómo se marca.** En un equipo autorizado (`RF-004`), la persona lee su QR o escribe su código y luego su **PIN**. El kiosko muestra su foto, su nombre y el resultado durante unos segundos y queda listo para la siguiente persona.
*   **Validaciones al marcar.**
    *   El equipo debe estar autorizado y activo.
    *   La credencial debe estar activa y el PIN ser correcto.
    *   La persona debe poder usar ese equipo (por ejemplo, un estudiante no marca en el Kiosko Personal).
    *   Un estudiante debe tener matrícula vigente (`RF-009`).
*   **Entrada o salida.** Para el personal, el sistema lo decide solo: la primera marcación del día es **entrada** y la siguiente es **salida**. Los estudiantes solo registran entrada.
*   **Una entrada por día.** Si la persona ya marcó su entrada hoy (y, en el personal, también su salida), una nueva marcación no se registra y el kiosko lo indica.
*   **Resultado de la marcación** (con el turno de su tipo, `RF-004`):

    | Resultado | Cuándo |
    |---|---|
    | `puntual` | Entrada hasta *hora oficial + tolerancia*, o salida desde la hora oficial |
    | `tardanza` | Entrada después de *hora oficial + tolerancia*; se guardan los minutos de tardanza |
    | `salida_anticipada` | Salida antes de la hora oficial |
    | `fuera_de_turno` | Marcación fuera de las ventanas de entrada o salida, o en un día no laborable o sin clases |

*   **Falta al colegio.** Un estudiante con matrícula vigente que no marcó entrada en un día con clases tiene **falta al colegio** ese día. No se guarda un registro de falta: se obtiene al consultar (día con clases sin marcación de entrada).
*   **Marcación manual.** Si un equipo falla o la persona olvidó su carné, el Administrador o la Secretaria registran la marcación a mano con la hora real y una observación obligatoria. Queda identificada como `manual`.
*   **Justificación de marcaciones.** El Director, el Subdirector o la Secretaria pueden justificar una tardanza o salida anticipada con un motivo. La marcación conserva su resultado, pero queda marcada como justificada.
*   **Asistencia en clase.** El docente toma asistencia en **cada sesión de clase** (`RF-011`):
    *   La lista trae a los estudiantes con matrícula vigente en la sección, todos en **presente** por defecto; el docente marca solo las excepciones: `tardanza` o `falta`.
    *   Como ayuda, la lista señala a los estudiantes que **no marcaron entrada** en la puerta ese día.
    *   Se puede tomar desde que el docente firma el ingreso de la sesión hasta el final del día, y corregir el mismo día.
    *   Al cerrar el bimestre ya no se puede modificar (`RF-005`).
    *   Solo la toma el docente que dicta la sesión (titular o reemplazo).
*   **Falta justificada en clase.** La Secretaria o el tutor de la sección cambian una falta a `falta_justificada` con un motivo y, si hay, un documento (por ejemplo, un certificado médico).
*   **Consultas.**
    *   **Apoderado y estudiante:** asistencia al colegio y por curso del estudiante.
    *   **Docente:** asistencia de sus sesiones; el tutor, además, la de su sección completa.
    *   **Director, Subdirector y Secretaria:** marcaciones del día en vivo (quién marcó, tardanzas, quién falta) y reportes por fecha, sección y persona.
*   **Hora del servidor.** Toda marcación usa la hora del servidor (zona horaria de Lima), nunca la del equipo.
*   **Biométrico.** Las marcaciones de un reloj biométrico seguirán las mismas reglas cuando se integre (versión futura).
*   **Operación 100% en línea.** Si el kiosko pierde conexión, muestra un aviso y no registra; se usa la marcación manual.
*   **Auditoría inmutable.** Marcaciones manuales, justificaciones y correcciones de asistencia quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Entrada registrada | "Bienvenido(a), [Nombre]. Entrada registrada a las 07:52." |
| Tardanza | "[Nombre], entrada registrada a las 08:05 con 10 minutos de tardanza." |
| Salida registrada | "Hasta luego, [Nombre]. Salida registrada a las 14:03." |
| Ya marcó | "Ya registró su entrada hoy a las 07:52." |
| Ya marcó entrada y salida | "Ya registró su entrada y su salida hoy." |
| Código o PIN incorrecto | "Código o PIN incorrecto." |
| Credencial anulada | "Su credencial no está activa. Acérquese a secretaría." |
| Equipo equivocado | "Este kiosko no es para su tipo de usuario." |
| Estudiante sin matrícula | "No tiene matrícula vigente. Acérquese a secretaría." |
| Fuera de horario | "Marcación registrada fuera del horario permitido." |
| Sin conexión | "Sin conexión. Avise a secretaría para registrar su marcación." |
| Manual sin observación | "Indique el motivo de la marcación manual." |
| Asistencia fuera de plazo | "La asistencia de esta sesión ya no se puede modificar." |
| Asistencia de otra sesión | "Solo el docente que dicta la sesión puede tomar su asistencia." |
| Asistencia guardada | "Asistencia guardada: 30 presentes, 2 tardanzas, 1 falta." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Registro y autorización de los equipos, y configuración de turnos.** Corresponde a `RF-004`.
*   **Firma de ingreso y salida de las sesiones de clase.** Corresponde a `RF-011`.
*   **Descarga de marcaciones de relojes biométricos.** Versión futura.
*   **Marcación desde el celular o con geolocalización.** Descartada.
*   **Envío de SMS o WhatsApp al apoderado por falta o tardanza.** No se contempla; el apoderado consulta en el sistema. Los avisos dentro del sistema corresponden a `RF-019`.
*   **Descuentos por tardanzas.** No se contempla.

## Acuerdos y puntos abiertos

*   **Marcación de estudiantes (acordado).** Solo entrada.
*   **Asistencia en clase (acordado).** El docente la toma en cada sesión.
*   **Dos asistencias independientes (acordado).** La puerta es la asistencia al colegio; la sesión es la asistencia en clase.

## Historia de Usuario 1: Marcación en el kiosko

**Como** estudiante, docente o administrativo
**Quiero** marcar mi llegada (y mi salida, si soy personal) en el kiosko
**Para** que quede registrada mi asistencia al colegio.

### Escenario: Estudiante marca su entrada a tiempo
**Dado** que el turno de estudiantes es a las 07:45 con 10 minutos de tolerancia y estoy en el Kiosko Estudiantes
**Cuando** leo mi QR e ingreso mi PIN a las 07:52
**Entonces** el sistema registra mi entrada como `puntual` y muestra "Bienvenido(a), [Nombre]. Entrada registrada a las 07:52."

### Escenario: Estudiante llega tarde
**Dado** el mismo turno
**Cuando** marco a las 08:05
**Entonces** el sistema registra mi entrada como `tardanza` con 10 minutos y muestra "[Nombre], entrada registrada a las 08:05 con 10 minutos de tardanza."

### Escenario: Estudiante marca dos veces
**Dado** que ya marqué mi entrada hoy a las 07:52
**Cuando** vuelvo a marcar
**Entonces** el sistema no registra nada y muestra "Ya registró su entrada hoy a las 07:52."

### Escenario: Docente marca entrada y salida
**Dado** que soy docente y ya marqué mi entrada hoy
**Cuando** marco a las 14:03 en el Kiosko Personal
**Entonces** el sistema registra mi salida y muestra "Hasta luego, [Nombre]. Salida registrada a las 14:03."

### Escenario: Salida anticipada
**Dado** que la salida oficial de docentes es 14:00
**Cuando** marco mi salida a las 12:45
**Entonces** el sistema la registra como `salida_anticipada`.

### Escenario: Marcación fuera de horario
**Dado** que la ventana de entrada de estudiantes termina a las 09:30
**Cuando** un estudiante marca a las 10:15
**Entonces** el sistema la registra como `fuera_de_turno` y muestra "Marcación registrada fuera del horario permitido."

### Escenario: PIN incorrecto
**Dado** que estoy en un kiosko
**Cuando** leo mi QR e ingreso un PIN equivocado
**Entonces** el sistema no registra nada y muestra "Código o PIN incorrecto."

### Escenario: Credencial anulada
**Dado** que mi credencial fue anulada por pérdida del carné
**Cuando** intento marcar con ella
**Entonces** el sistema no registra nada y muestra "Su credencial no está activa. Acérquese a secretaría."

### Escenario: Kiosko equivocado
**Dado** que soy estudiante
**Cuando** intento marcar en el Kiosko Personal
**Entonces** el sistema no registra nada y muestra "Este kiosko no es para su tipo de usuario."

### Escenario: Estudiante sin matrícula vigente
**Dado** que el estudiante fue retirado
**Cuando** intenta marcar
**Entonces** el sistema no registra nada y muestra "No tiene matrícula vigente. Acérquese a secretaría."

### Escenario: Sin conexión
**Dado** que el kiosko perdió la conexión con el servidor
**Cuando** alguien intenta marcar
**Entonces** el kiosko no registra nada y muestra "Sin conexión. Avise a secretaría para registrar su marcación."

## Historia de Usuario 2: Marcación manual y justificación

**Como** Secretaria
**Quiero** registrar marcaciones a mano y justificar tardanzas
**Para** cubrir fallas del equipo y casos con motivo válido.

### Escenario: Registrar una marcación manual
**Dado** que el Kiosko Estudiantes falló de 07:40 a 08:00
**Cuando** registro la entrada de un estudiante con hora 07:50 y la observación "Kiosko sin conexión"
**Entonces** el sistema la guarda como `manual`, calcula su resultado con esa hora y la registra en la bitácora.

### Escenario: Marcación manual sin observación
**Dado** que estoy registrando una marcación manual
**Cuando** intento guardar sin observación
**Entonces** el sistema impide guardar y muestra "Indique el motivo de la marcación manual."

### Escenario: Justificar una tardanza
**Dado** que un docente tiene una tardanza hoy
**Cuando** el Subdirector la justifica con el motivo "Cita médica con constancia"
**Entonces** la marcación conserva el resultado `tardanza`, queda marcada como justificada con quién y cuándo la justificó.

### Escenario: Panel del día
**Dado** que soy Subdirector
**Cuando** abro "Marcaciones de hoy"
**Entonces** el sistema muestra en vivo quién marcó, a qué hora y con qué resultado, el total de tardanzas, y quiénes aún no han marcado, separados por estudiantes y personal.

## Historia de Usuario 3: Asistencia en clase

**Como** Docente
**Quiero** tomar la asistencia de mis estudiantes en cada sesión
**Para** registrar quién estuvo en mi clase.

### Escenario: Tomar asistencia
**Dado** que firmé el ingreso de mi sesión de Matemática en 5.° A
**Cuando** abro "Asistencia", marco a 2 estudiantes con `tardanza` y a 1 con `falta`, y guardo
**Entonces** el sistema guarda al resto como `presente` y muestra "Asistencia guardada: 30 presentes, 2 tardanzas, 1 falta."

### Escenario: Estudiantes que no marcaron en la puerta
**Dado** que 2 estudiantes de 5.° A no marcaron entrada hoy
**Cuando** abro la lista de asistencia
**Entonces** el sistema los señala con "No marcó ingreso", pero los deja en `presente` hasta que yo decida.

### Escenario: Corregir la asistencia el mismo día
**Dado** que guardé la asistencia de la sesión de hoy
**Cuando** cambio una `falta` a `presente` y guardo
**Entonces** el sistema actualiza la asistencia y registra el cambio en la bitácora.

### Escenario: Asistencia fuera de plazo
**Dado** que la sesión es de ayer o su bimestre está cerrado
**Cuando** intento modificar su asistencia
**Entonces** el sistema bloquea la acción y muestra "La asistencia de esta sesión ya no se puede modificar."

### Escenario: Asistencia de una sesión ajena
**Dado** que la sesión la dicta otro docente
**Cuando** intento tomar su asistencia
**Entonces** el sistema bloquea la acción y muestra "Solo el docente que dicta la sesión puede tomar su asistencia."

### Escenario: Estudiante retirado
**Dado** que un estudiante de 5.° A se retiró ayer
**Cuando** abro la lista de asistencia de hoy
**Entonces** el estudiante no aparece en la lista.

### Escenario: Justificar una falta
**Dado** que un estudiante tiene `falta` en Matemática
**Cuando** la Secretaria la cambia a `falta_justificada` con el motivo "Certificado médico" y adjunta el documento
**Entonces** el sistema guarda la justificación con quién la registró.

## Historia de Usuario 4: Consultas de asistencia

**Como** Apoderado
**Quiero** ver la asistencia de mi hijo al colegio y a sus clases
**Para** estar al tanto de sus faltas y tardanzas.

### Escenario: Apoderado consulta la asistencia
**Dado** que soy apoderado de un estudiante de 5.° A
**Cuando** abro "Asistencia" y elijo el bimestre
**Entonces** el sistema muestra sus entradas al colegio (con tardanzas y faltas al colegio) y su asistencia por curso, con totales.

### Escenario: Falta al colegio
**Dado** que el 12/05/2027 hubo clases y el estudiante no marcó entrada
**Cuando** consulto su asistencia
**Entonces** ese día aparece como "Falta al colegio".

### Escenario: Tutor consulta su sección
**Dado** que soy tutor de 5.° A
**Cuando** abro "Asistencia de mi sección"
**Entonces** el sistema muestra, por estudiante, sus faltas y tardanzas al colegio y por curso en el rango elegido.

---

## Reglas de validación y negocio (resumen)

*   **Kiosko:** equipo autorizado y activo; credencial activa; PIN correcto; persona habilitada para ese equipo; estudiante con matrícula vigente.
*   **Qué se marca:** estudiantes, solo entrada; personal, entrada y salida (detectada automáticamente).
*   **Duplicados:** una entrada por día (y una salida para el personal).
*   **Resultado:** `puntual`, `tardanza` (con minutos), `salida_anticipada` o `fuera_de_turno`, según el turno.
*   **Falta al colegio:** día con clases sin marcación de entrada; se calcula, no se guarda.
*   **Manual:** con hora y observación obligatoria; solo Administrador o Secretaria.
*   **Justificación:** no cambia el resultado; registra quién y cuándo.
*   **Asistencia en clase:** por sesión; presente por defecto; solo el docente de la sesión; desde la firma de ingreso hasta el fin del día; bloqueada al cerrar el bimestre; solo estudiantes con matrícula vigente.
*   **Falta justificada:** motivo obligatorio; la registran la Secretaria o el tutor.
*   **Hora:** siempre la del servidor.
*   **Auditoría:** manuales, justificaciones y correcciones (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Pantalla de kiosko a pantalla completa (lectura de QR, teclado de PIN, tarjeta de resultado) · Portal web: Marcaciones de hoy (panel en vivo) · Marcación manual · Asistencia de la sesión (lista con casillas) · Asistencia del estudiante. Escenarios: Puntual · Tardanza · Ya marcó · PIN incorrecto · Equipo equivocado · Sin conexión · Lista con "No marcó ingreso".
