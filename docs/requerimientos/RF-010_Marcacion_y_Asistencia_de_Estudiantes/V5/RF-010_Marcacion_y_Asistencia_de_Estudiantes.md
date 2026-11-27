# RF-010: Marcación y Asistencia de Estudiantes

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Kiosko y Portal Web — Asistencia
**Versión:** 5.0
**Fecha:** actualización v5.0: 2026-11-26 · actualización v4.0: 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-004` (turnos y equipos autorizados), `RF-005` (días con y sin clases), `RF-007` (credenciales), `RF-009` (matrículas vigentes), `RF-011` (sesiones de clase).

> **Cambios de la versión 5.0 sobre la 4.0 (indicado por el responsable, 2026-11-26):**
>
> - **El horario del docente es el del Reglamento Interno:** es el turno de docentes configurado en Turnos. Calcularlo según sus clases pasa a ser una opción (`asistencia.docente_horario_segun_clases`, apagada por defecto). Sustento: RSG 326-2017-MINEDU, 5.2.7.
> - El colegio es **público**: le aplica la RSG 326-2017-MINEDU. El reporte mensual a la UGEL se define en `RF-025`.

> **Cambios de la versión 4.0 sobre la 3.0 (2026-11-26):**
>
> - **Horario esperado del docente según sus clases** (aceptado por el responsable, P-96): entra a su primera clase y sale al terminar la última. Sin clases ese día, vale el turno general.
> - **Control diario de asistencia:** reemplaza el panel del día para docentes y personal; permite ver cualquier día, las sesiones de clase firmadas y el mes de cada persona.

> **Cambios de la versión 3.0 sobre la 2.0 (2026-11-26):**
>
> - **La primera marca del día es la entrada y la última es la salida** (como entrega el reloj biométrico; confirmado por el responsable). Una sola marca es entrada, a cualquier hora. Las intermedias no cuentan.
> - **Registro manual:** solo reemplaza con una entrada más temprana o una salida más tarde. La justificación de la marca reemplazada se quita y queda en la bitácora.
> - **Voz en el kiosko:** al responder, dice el nombre y el resultado.

> **Cambios de la versión 2.0 sobre la 1.0 (marcaciones del mismo docente por distintas vías, 2026-11-07):**
>
> - **Misma asistencia por dos vías (P-44):** si el personal ya marcó por el reloj biométrico (`RF-022`) o a mano y marca en el kiosko a pocos minutos, el kiosko no la guarda como salida: indica que ya tiene una marcación registrada. La ventana se configura con la variable `marcacion.minutos_duplicado_entre_vias` (30 minutos por defecto).
> - **Entrada y salida del personal por la hora de la marca**, no por el orden de llegada (el detalle está en `RF-022` v2.0).

## Consideraciones y supuestos de negocio

- **Propósito.** Registrar dos asistencias distintas:
  1.  **Asistencia al colegio:** la marcación en los kioskos de la puerta (estudiantes) y del personal (docentes y administrativos).
  2.  **Asistencia en clase:** la que toma el docente a sus estudiantes **en cada sesión de clase**.
      Son independientes: un estudiante puede haber marcado en la puerta y tener falta en una clase, o al revés.
- **Quién marca y qué marca.**

  | Persona                  | Kiosko                                 | Marca                |
  | ------------------------ | -------------------------------------- | -------------------- |
  | Estudiante               | Kiosko Estudiantes (puerta principal)  | **Solo entrada**     |
  | Docente y administrativo | Kiosko Personal (afuera de secretaría) | **Entrada y salida** |

- **Cómo se marca.** En un equipo autorizado (`RF-004`), la persona lee su QR o escribe su código y luego su **PIN**. El kiosko muestra su foto, su nombre y el resultado durante unos segundos y queda listo para la siguiente persona.
- **Validaciones al marcar.**
  - El equipo debe estar autorizado y activo.
  - La credencial debe estar activa y el PIN ser correcto.
  - La persona debe poder usar ese equipo (por ejemplo, un estudiante no marca en el Kiosko Personal).
  - Un estudiante debe tener matrícula vigente (`RF-009`).
- **Entrada o salida.** Para el personal, el sistema lo decide solo: la marcación más temprana del día es **entrada** y la más tarde es **salida**, por la hora de la marca. Una sola marca es entrada. Una marca posterior a la salida la reemplaza; una intermedia no cuenta y queda guardada para revisarla (v3.0). Los estudiantes solo registran entrada.
- **Una entrada y una salida por día.** Los estudiantes solo tienen la entrada: si ya la marcaron, otra no se registra y el kiosko lo indica. Al reemplazar una hora del personal se recalcula el resultado, se quita la justificación anterior y los valores previos quedan en la bitácora (v3.0).
- **Cuándo aplica (v5.0).** Lo que sigue solo rige si `asistencia.docente_horario_segun_clases` está activada. Apagada (valor por defecto), todo docente usa el turno de docentes.
- **Horario esperado (v4.0).** El docente con clases ese día se evalúa así: hora oficial de entrada = inicio de su primera clase; hora oficial de salida = fin de la última. Se usan las sesiones generadas de la fecha (incluyen reemplazos) y, si no hay, el horario semanal del año en curso. La tolerancia y los márgenes de las ventanas son los del turno de docentes (misma distancia respecto de la hora oficial; ver P-97). Un día con clases es laborable para ese docente; el calendario sin clases sigue dando `fuera_de_turno`. Administrativos, estudiantes y docentes sin clases ese día usan el turno general. Las marcas ya guardadas conservan su resultado.
- **Control diario (v4.0).** Lista de docentes y personal de una fecha con: horario esperado y su origen, entrada y salida, clases firmadas y estado (`Entrada y salida`, `En el colegio`, `Sin salida`, `Sin entrada`, `Sin marca`, `Aún no es su hora`, `No corresponde`). `Aún no es su hora` aplica solo hoy, hasta la hora de entrada más la tolerancia. En días pasados sin sesiones generadas, el horario esperado se calcula con el horario y el turno vigentes.
- **Resultado de la marcación** (con el horario esperado o el turno de su tipo, `RF-004`):

  | Resultado           | Cuándo                                                                                     |
  | ------------------- | ------------------------------------------------------------------------------------------ |
  | `puntual`           | Entrada hasta _hora oficial + tolerancia_, o salida desde la hora oficial                  |
  | `tardanza`          | Entrada después de _hora oficial + tolerancia_; se guardan los minutos de tardanza         |
  | `salida_anticipada` | Salida antes de la hora oficial                                                            |
  | `fuera_de_turno`    | Marcación fuera de las ventanas de entrada o salida, o en un día no laborable o sin clases |

- **Falta al colegio.** Un estudiante con matrícula vigente que no marcó entrada en un día con clases tiene **falta al colegio** ese día. No se guarda un registro de falta: se obtiene al consultar (día con clases sin marcación de entrada).
- **Marcación manual.** Si un equipo falla o la persona olvidó su carné, el Administrador o la Secretaria registran la marcación a mano con la hora real y una observación obligatoria. Queda identificada como `manual`.
- **Justificación de marcaciones.** El Director, el Subdirector o la Secretaria pueden justificar una tardanza o salida anticipada con un motivo. La marcación conserva su resultado, pero queda marcada como justificada.
- **Asistencia en clase.** El docente toma asistencia en **cada sesión de clase** (`RF-011`):
  - La lista trae a los estudiantes con matrícula vigente en la sección, todos en **presente** por defecto; el docente marca solo las excepciones: `tardanza` o `falta`.
  - Como ayuda, la lista señala a los estudiantes que **no marcaron entrada** en la puerta ese día.
  - Se puede tomar desde que el docente firma el ingreso de la sesión hasta el final del día, y corregir el mismo día.
  - Al cerrar el bimestre ya no se puede modificar (`RF-005`).
  - Solo la toma el docente que dicta la sesión (titular o reemplazo).
- **Falta justificada en clase.** La Secretaria o el tutor de la sección cambian una falta a `falta_justificada` con un motivo y, si hay, un documento (por ejemplo, un certificado médico).
- **Consultas.**
  - **Apoderado y estudiante:** asistencia al colegio y por curso del estudiante.
  - **Docente:** asistencia de sus sesiones; el tutor, además, la de su sección completa.
  - **Director, Subdirector y Secretaria:** marcaciones del día en vivo (quién marcó, tardanzas, quién falta) y reportes por fecha, sección y persona.
- **Hora del servidor.** Toda marcación usa la hora del servidor (zona horaria de Lima), nunca la del equipo.
- **Biométrico (v2.0).** Las marcaciones del reloj biométrico (`RF-022`) siguen las mismas reglas y se guardan en el mismo registro. Si el personal marca por dos vías a pocos minutos (kiosko, manual o reloj), cuenta como una sola asistencia: la segunda no se guarda y el kiosko lo indica.
- **Operación 100% en línea.** Si el kiosko pierde conexión, muestra un aviso y no registra; se usa la marcación manual.
- **Auditoría inmutable.** Marcaciones manuales, justificaciones y correcciones de asistencia quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                                 | Mensaje                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Entrada registrada                                        | "Bienvenido(a), [Nombre]. Entrada registrada a las 07:52."             |
| Tardanza                                                  | "[Nombre], entrada registrada a las 08:05 con 10 minutos de tardanza." |
| Salida registrada                                         | "Hasta luego, [Nombre]. Salida registrada a las 14:03."                |
| Ya marcó                                                  | "Ya registró su entrada hoy a las 07:52."                              |
| Personal que ya marcó por otra vía a pocos minutos (v2.0) | "Ya tiene una marcación registrada a las [hora]."                      |
| Marca intermedia (v3.0)                                   | "No cuenta: ya hay una entrada anterior y una salida posterior."       |
| Ya marcó entrada y salida                                 | "Ya registró su entrada y su salida hoy."                              |
| Código o PIN incorrecto                                   | "Código o PIN incorrecto."                                             |
| Credencial anulada                                        | "Su credencial no está activa. Acérquese a secretaría."                |
| Equipo equivocado                                         | "Este kiosko no es para su tipo de usuario."                           |
| Estudiante sin matrícula                                  | "No tiene matrícula vigente. Acérquese a secretaría."                  |
| Fuera de horario                                          | "Marcación registrada fuera del horario permitido."                    |
| Sin conexión                                              | "Sin conexión. Avise a secretaría para registrar su marcación."        |
| Manual sin observación                                    | "Indique el motivo de la marcación manual."                            |
| Asistencia fuera de plazo                                 | "La asistencia de esta sesión ya no se puede modificar."               |
| Asistencia de otra sesión                                 | "Solo el docente que dicta la sesión puede tomar su asistencia."       |
| Asistencia guardada                                       | "Asistencia guardada: 30 presentes, 2 tardanzas, 1 falta."             |

## Requerimientos fuera de alcance (Out of Scope)

- **Registro y autorización de los equipos, y configuración de turnos.** Corresponde a `RF-004`.
- **Firma de ingreso y salida de las sesiones de clase.** Corresponde a `RF-011`.
- **Descarga de marcaciones de relojes biométricos.** Versión futura.
- **Marcación desde el celular o con geolocalización.** Descartada.
- **Envío de SMS o WhatsApp al apoderado por falta o tardanza.** No se contempla; el apoderado consulta en el sistema. Los avisos dentro del sistema corresponden a `RF-019`.
- **Descuentos por tardanzas.** No se contempla.

## Acuerdos y puntos abiertos

- **Marcación de estudiantes (acordado).** Solo entrada.
- **Asistencia en clase (acordado).** El docente la toma en cada sesión.
- **Dos asistencias independientes (acordado).** La puerta es la asistencia al colegio; la sesión es la asistencia en clase.

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

### Escenario: Docente marca en el kiosko poco después de marcar en otra vía (v2.0)

**Dado** que soy docente y ya marqué mi entrada hoy a las 07:30 en el reloj biométrico (o Secretaría la registró a mano) y la variable de minutos entre vías es 30
**Cuando** marco a las 07:40 en el Kiosko Personal
**Entonces** el sistema no registra una salida y muestra "Ya tiene una marcación registrada a las 07:30."

### Escenario: Salida anticipada

**Dado** que la salida oficial de docentes es 14:00
**Cuando** marco mi salida a las 12:45
**Entonces** el sistema la registra como `salida_anticipada`.

### Escenario: Marcación fuera de horario

**Dado** que la ventana de entrada de estudiantes termina a las 09:30
**Cuando** un estudiante marca a las 10:15
**Entonces** el sistema la registra como `fuera_de_turno` y muestra "Marcación registrada fuera del horario permitido."

### Escenario: Por defecto vale el horario del Reglamento Interno (v5.0)

**Dado** que `asistencia.docente_horario_segun_clases` está apagada, el turno de docentes es de 07:45 a 13:30 sin tolerancia y hoy un docente tiene su primera clase a las 11:00
**Cuando** se registra su entrada a las 09:00
**Entonces** queda como `tardanza` de 75 minutos.

### Escenario: El docente se evalúa con su horario de clases (v4.0)

**Dado** que `asistencia.docente_horario_segun_clases` está activada (v5.0)
**Y** que hoy un docente tiene clases de 11:00 a 12:30 y la tolerancia es 10 minutos
**Cuando** marca su entrada a las 11:08
**Entonces** queda `puntual`
**Y** si su última marca es a las 12:10, la salida queda como `salida_anticipada`.

### Escenario: Docente sin clases ese día (v4.0)

**Dado** que un docente no tiene clases hoy
**Cuando** marca
**Entonces** se evalúa con el turno general de docentes.

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

### Escenario: Docente vuelve a marcar después de su salida (v3.0)

**Dado** que tengo entrada a las 07:40 y salida a las 13:35
**Cuando** marco a las 15:30
**Entonces** mi salida pasa a ser las 15:30 y el cambio queda en la bitácora.

### Escenario: Marca intermedia (v3.0)

**Dado** que tengo entrada a las 07:40 y salida a las 15:00
**Cuando** llega una marca de las 11:00
**Entonces** no cambia la entrada ni la salida y la marca queda guardada para revisarla.

### Escenario: Una sola marca por la tarde (v3.0)

**Dado** que no he marcado hoy
**Cuando** marco a las 15:27
**Entonces** el sistema la registra como entrada.

### Escenario: El kiosko dice el nombre (v3.0)

**Dado** que el sonido del kiosko está activado
**Cuando** el kiosko responde a mi marcación
**Entonces** dice en voz alta mi primer nombre, mi apellido paterno y el resultado.

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

### Escenario: Registro manual de una salida más tarde (v3.0)

**Dado** un docente con salida a las 13:00 justificada
**Cuando** se registra a mano una salida a las 13:40
**Entonces** reemplaza la anterior, quita su justificación y guarda los valores anteriores en la bitácora.

### Escenario: Ver el control de un día anterior (v4.0)

**Dado** que soy usuario con acceso al control diario
**Cuando** elijo una fecha anterior
**Entonces** veo de cada docente y administrativo su horario esperado, su entrada, su salida, sus clases firmadas y su estado
**Y** el resumen del día; no puedo elegir una fecha futura.

### Escenario: Todavía no es su hora (v4.0)

**Dado** que un docente tiene su primera clase a las 14:00, la tolerancia es 10 minutos y aún no marcó
**Cuando** consulto el día de hoy a las 09:00
**Entonces** aparece como "Aún no es su hora"
**Y** desde las 14:11 aparece como "Sin marca".

### Escenario: Detalle y mes de una persona (v4.0)

**Dado** que estoy en el control diario
**Cuando** abro a una persona
**Entonces** veo sus marcas del día con su origen y resultado, cada sesión de clase con su firma
**Y** un calendario del mes donde puedo elegir otro día.

### Escenario: Registro manual que no mejora la hora (v3.0)

**Dado** un docente con salida a las 13:00
**Cuando** se intenta registrar a mano una salida a las 12:40
**Entonces** el sistema la rechaza.

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

- **Kiosko:** equipo autorizado y activo; credencial activa; PIN correcto; persona habilitada para ese equipo; estudiante con matrícula vigente.
- **Qué se marca:** estudiantes, solo entrada; personal, entrada y salida (detectada automáticamente).
- **Duplicados:** una entrada y una salida por día; vale la primera como entrada y la última como salida (v3.0). Una marca del personal por otra vía a menos de _N_ minutos de una existente cuenta como la misma asistencia y no se guarda (v2.0).
- **Resultado:** `puntual`, `tardanza` (con minutos), `salida_anticipada` o `fuera_de_turno`, según el turno.
- **Falta al colegio:** día con clases sin marcación de entrada; se calcula, no se guarda.
- **Manual:** con hora y observación obligatoria; solo Administrador o Secretaria.
- **Justificación:** no cambia el resultado; registra quién y cuándo.
- **Asistencia en clase:** por sesión; presente por defecto; solo el docente de la sesión; desde la firma de ingreso hasta el fin del día; bloqueada al cerrar el bimestre; solo estudiantes con matrícula vigente.
- **Falta justificada:** motivo obligatorio; la registran la Secretaria o el tutor.
- **Hora:** siempre la del servidor.
- **Auditoría:** manuales, justificaciones y correcciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Pantalla de kiosko a pantalla completa (lectura de QR, teclado de PIN, tarjeta de resultado) · Portal web: Marcaciones de hoy (panel en vivo) · Marcación manual · Asistencia de la sesión (lista con casillas) · Asistencia del estudiante. Escenarios: Puntual · Tardanza · Ya marcó · PIN incorrecto · Equipo equivocado · Sin conexión · Lista con "No marcó ingreso".
