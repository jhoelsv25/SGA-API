# RF-011: Registro de Sesión de Clase

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Kiosko de Sesiones y Portal Web — Seguimiento docente
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-004` (kiosko de sesiones autorizado), `RF-005` (bimestres y días sin clases), `RF-007` (credencial del docente), `RF-008` (horario y carga académica).

## Consideraciones y supuestos de negocio

- **Propósito.** Reemplazar la hoja física de la subdirección. Cada día el sistema genera las sesiones planificadas; el docente firma el ingreso y la salida de cada una en el **Kiosko de Sesiones** con su código y PIN; el subdirector lo sigue en vivo. Con esto se calcula el **CSP**: sesiones ejecutadas ÷ sesiones planificadas (`RF-020`).
- **Generación diaria.** Cada día escolar, a primera hora, el sistema crea una sesión `pendiente` por cada bloque de clase del horario de ese día de la semana (`RF-008`), siempre que:
  - el año esté en curso y la fecha caiga dentro de un bimestre (no en vacaciones);
  - el día no tenga un evento que suspenda clases (`RF-005`);
  - el curso de esa sección tenga docente asignado.
    La sesión queda a nombre del docente asignado ese día. Un bloque doble genera **una sola sesión** (`PENDIENTES.md`, P-04).
- **Estados de la sesión.**

  | Estado        | Significado                                                                    |
  | ------------- | ------------------------------------------------------------------------------ |
  | `pendiente`   | Generada; el docente aún no firma el ingreso                                   |
  | `en_curso`    | Firmó el ingreso; falta la salida                                              |
  | `cumplida`    | Firmó ingreso y salida dentro de la tolerancia                                 |
  | `parcial`     | Firmó, pero con minutos perdidos (llegó tarde, salió antes u olvidó la salida) |
  | `no_cumplida` | Terminó el día sin firma de ingreso                                            |
  | `justificada` | Era `no_cumplida` y el subdirector aprobó su justificación                     |

- **Firma en el Kiosko de Sesiones.** El docente se identifica con su QR o código y su **PIN** (`RF-007`). El kiosko le muestra **sus** sesiones de hoy, con la sesión actual o la siguiente destacada. La firma es la combinación de código + PIN con la hora del servidor; se guarda en qué equipo firmó.
- **Tema.** Es obligatorio para firmar el ingreso, igual que en la hoja física. Se puede corregir hasta firmar la salida.
- **Ventana para firmar el ingreso.** Desde **1 minuto antes** de la hora de inicio del bloque hasta su hora de fin. Pasada la hora de fin, ya no se puede firmar el ingreso. _(P-05.)_
- **Firma de salida.** Después del ingreso, hasta el final del día.
- **Tolerancia y minutos perdidos.** Tolerancia de **3 minutos** _(P-06)_:
  - **Retraso** = minutos entre la hora de inicio y la firma de ingreso, si supera la tolerancia.
  - **Salida antes de tiempo** = minutos entre la firma de salida y la hora de fin, si supera la tolerancia.
  - **Minutos perdidos** = retraso + salida antes de tiempo. Si son 0, la sesión queda `cumplida`; si son más, `parcial`.
- **Cierre del día.** Al terminar el día, el sistema cierra las sesiones abiertas:
  - `pendiente` → `no_cumplida`.
  - `en_curso` (sin firma de salida) → `parcial`, con la observación "Sin firma de salida". _(P-08.)_
- **Reemplazo.** Si el titular no dictará una sesión, el subdirector puede asignarle **otro docente** mientras esté `pendiente`. Desde ese momento, solo el reemplazo puede firmarla y la sesión cuenta como suya.
- **Justificación.** Para una sesión `no_cumplida`, el docente solicita la justificación con un motivo y, opcionalmente, un documento. El **Subdirector** la aprueba (la sesión pasa a `justificada`) o la rechaza con un comentario (queda `no_cumplida`). _(P-07.)_ Se puede solicitar hasta que se cierre el bimestre.
- **Seguimiento en vivo.** El subdirector ve un panel del día con cada bloque: quién firmó y a qué hora, quién está en clase, y **alertas** de las sesiones que pasaron su tolerancia sin firma de ingreso.
- **Relación con otros RF.**
  - Al firmar el ingreso se habilita la asistencia de los estudiantes de esa sesión (`RF-010`).
  - El director puede registrar ausencias del docente durante la sesión (`RF-012`); no cambian el estado de la sesión.
  - Los materiales y tareas del aula virtual pueden ligarse a la sesión que refuerzan (`RF-015`, `RF-016`).
- **Bloqueo por cierre de bimestre.** Al cerrar el bimestre (`RF-005`), sus sesiones ya no se pueden firmar, modificar ni justificar.
- **Consulta del docente.** En el portal, el docente ve "Mis sesiones": su historial con tema, horas firmadas, estado y minutos perdidos.
- **Hora del servidor.** Todas las firmas usan la hora del servidor (zona horaria de Lima).
- **Operación 100% en línea.** Sin conexión, el kiosko no registra firmas y lo indica.
- **Auditoría inmutable.** Firmas, cambios de tema, reemplazos, cierres automáticos y justificaciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                | Mensaje                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| Ingreso firmado          | "Ingreso firmado a las 08:30. Matemática – 5.° A."                 |
| Ingreso con retraso      | "Ingreso firmado a las 08:41 con 11 minutos de retraso."           |
| Salida firmada           | "Salida firmada a las 10:00. Sesión cumplida."                     |
| Salida antes de tiempo   | "Salida firmada a las 09:40. Sesión parcial: 20 minutos perdidos." |
| Falta el tema            | "Ingrese el tema de la sesión para firmar el ingreso."             |
| Antes de la ventana      | "Aún no puede firmar. El ingreso se habilita a las 08:29."         |
| Después de la ventana    | "La sesión ya terminó. No se puede firmar el ingreso."             |
| Sin sesiones hoy         | "No tiene sesiones programadas para hoy."                          |
| Sesión de otro docente   | "Esta sesión está asignada a otro docente."                        |
| Código o PIN incorrecto  | "Código o PIN incorrecto."                                         |
| Equipo no autorizado     | "Este equipo no está autorizado. Comuníquese con el área de TI."   |
| Bimestre cerrado         | "El bimestre está cerrado. La sesión ya no se puede modificar."    |
| Justificación enviada    | "Su justificación fue enviada al subdirector."                     |
| Justificación sin motivo | "Indique el motivo de la justificación."                           |
| Justificación aprobada   | "Sesión justificada."                                              |
| Sin conexión             | "Sin conexión. No se registró la firma; intente nuevamente."       |

## Requerimientos fuera de alcance (Out of Scope)

- **Armado del horario y asignación de docentes.** Corresponde a `RF-008`.
- **Registro de ausencias del docente durante la sesión.** Corresponde a `RF-012`.
- **Consolidado bimestral y ficha imprimible.** Corresponde a `RF-013`.
- **Cálculo y reporte del CSP.** Corresponde a `RF-020`.
- **Reprogramación de una sesión a otra fecha.** No se contempla en esta versión.
- **Firma desde el celular o con geolocalización.** Descartada; solo en el Kiosko de Sesiones.
- **Planificación de la sesión de aprendizaje** (propósito, competencias, secuencia didáctica). Solo se registra el tema.

## Acuerdos y puntos abiertos

- **Kiosko de sesiones en la subdirección (acordado).** Reemplaza la hoja física.
- **Ventana de ingreso (pendiente, P-05).** Supuesto: desde 1 minuto antes del inicio.
- **Tolerancia (pendiente, P-06).** Supuesto: 3 minutos.
- **Aprobación de justificaciones (pendiente, P-07).** Supuesto: Subdirector.
- **Olvido de la firma de salida (pendiente, P-08).** Supuesto: `parcial`.
- **Bloque doble (pendiente, P-04).** Supuesto: una sola sesión.

## Historia de Usuario 1: Generación y cierre automático de sesiones

**Como** sistema
**Quiero** generar cada día las sesiones planificadas y cerrarlas al final del día
**Para** que exista un registro de cada clase programada y se pueda calcular el CSP.

### Escenario: Generación de las sesiones del día

**Dado** que hoy es martes, día con clases dentro del bimestre II, y 5.° A tiene 6 bloques de clase el martes, todos con docente
**Cuando** se ejecuta la generación diaria
**Entonces** el sistema crea 6 sesiones `pendiente` de 5.° A para hoy, cada una a nombre del docente asignado.

### Escenario: Día sin clases

**Dado** que hoy es feriado
**Cuando** se ejecuta la generación diaria
**Entonces** el sistema no crea ninguna sesión.

### Escenario: Curso sin docente

**Dado** que Inglés de 5.° A no tiene docente asignado
**Cuando** se ejecuta la generación diaria
**Entonces** el sistema no crea las sesiones de Inglés de 5.° A.

### Escenario: Vacaciones entre bimestres

**Dado** que hoy cae entre el fin del bimestre II y el inicio del III
**Cuando** se ejecuta la generación diaria
**Entonces** el sistema no crea ninguna sesión.

### Escenario: Cierre del día con sesión sin firmar

**Dado** que una sesión de hoy sigue `pendiente`
**Cuando** se ejecuta el cierre del día
**Entonces** la sesión pasa a `no_cumplida`.

### Escenario: Cierre del día sin firma de salida

**Dado** que una sesión de hoy está `en_curso`
**Cuando** se ejecuta el cierre del día
**Entonces** la sesión pasa a `parcial` con la observación "Sin firma de salida".

## Historia de Usuario 2: Firma de la sesión en el kiosko

**Como** Docente
**Quiero** firmar el ingreso y la salida de mi sesión en el Kiosko de Sesiones
**Para** dejar constancia de que dicté la clase y del tema que traté.

### Escenario: Firmar el ingreso a tiempo

**Dado** que tengo Matemática en 5.° A de 08:30 a 10:00 y estoy en el Kiosko de Sesiones a las 08:30
**Cuando** ingreso mi código y PIN, elijo la sesión, escribo el tema "Ecuaciones cuadráticas" y presiono "Firmar ingreso"
**Entonces** la sesión pasa a `en_curso` con hora de ingreso 08:30 y el kiosko muestra "Ingreso firmado a las 08:30. Matemática – 5.° A."

### Escenario: Firmar el ingreso con retraso

**Dado** la misma sesión con tolerancia de 3 minutos
**Cuando** firmo el ingreso a las 08:41
**Entonces** la sesión pasa a `en_curso` con 11 minutos de retraso y el kiosko muestra "Ingreso firmado a las 08:41 con 11 minutos de retraso."

### Escenario: Firmar la salida a tiempo

**Dado** que firmé el ingreso a las 08:30
**Cuando** firmo la salida a las 10:00
**Entonces** la sesión pasa a `cumplida` y el kiosko muestra "Salida firmada a las 10:00. Sesión cumplida."

### Escenario: Firmar la salida antes de tiempo

**Dado** que firmé el ingreso a las 08:30 y la clase termina a las 10:00
**Cuando** firmo la salida a las 09:40
**Entonces** la sesión pasa a `parcial` con 20 minutos perdidos y el kiosko muestra "Salida firmada a las 09:40. Sesión parcial: 20 minutos perdidos."

### Escenario: Firmar sin tema

**Dado** que elegí mi sesión en el kiosko
**Cuando** presiono "Firmar ingreso" sin escribir el tema
**Entonces** el sistema impide la firma y muestra "Ingrese el tema de la sesión para firmar el ingreso."

### Escenario: Firmar antes de la ventana

**Dado** que mi clase empieza a las 08:30
**Cuando** intento firmar el ingreso a las 08:20
**Entonces** el sistema impide la firma y muestra "Aún no puede firmar. El ingreso se habilita a las 08:29."

### Escenario: Firmar después de que terminó la clase

**Dado** que mi clase terminó a las 10:00 y no firmé el ingreso
**Cuando** intento firmarlo a las 10:15
**Entonces** el sistema impide la firma y muestra "La sesión ya terminó. No se puede firmar el ingreso."

### Escenario: Docente sin sesiones hoy

**Dado** que no tengo clases programadas hoy
**Cuando** ingreso mi código y PIN en el Kiosko de Sesiones
**Entonces** el kiosko muestra "No tiene sesiones programadas para hoy."

### Escenario: Sesión reasignada a un reemplazo

**Dado** que el subdirector asignó mi sesión de hoy a otro docente
**Cuando** intento firmarla
**Entonces** el sistema impide la firma y muestra "Esta sesión está asignada a otro docente."

### Escenario: PIN incorrecto

**Dado** que estoy en el Kiosko de Sesiones
**Cuando** ingreso un PIN equivocado
**Entonces** el kiosko no muestra sesiones y muestra "Código o PIN incorrecto."

### Escenario: Equipo no autorizado

**Dado** que una PC no está autorizada como Kiosko de Sesiones
**Cuando** se abre la pantalla de firma
**Entonces** no se permite firmar y se muestra "Este equipo no está autorizado. Comuníquese con el área de TI."

### Escenario: Doble clic al firmar

**Dado** que presioné "Firmar ingreso" dos veces seguidas
**Cuando** el servidor recibe las dos solicitudes
**Entonces** solo registra una firma de ingreso.

### Escenario: Sin conexión

**Dado** que el kiosko perdió la conexión
**Cuando** intento firmar
**Entonces** no se registra la firma y el kiosko muestra "Sin conexión. No se registró la firma; intente nuevamente."

## Historia de Usuario 3: Seguimiento del subdirector

**Como** Subdirector
**Quiero** ver en vivo las firmas de las sesiones y gestionar reemplazos y justificaciones
**Para** hacer el seguimiento sin la hoja física.

### Escenario: Panel en vivo

**Dado** que es martes a las 08:40
**Cuando** abro "Sesiones de hoy"
**Entonces** el sistema muestra, por bloque y sección, el docente, el tema, la hora de ingreso y salida y el estado
**Y** destaca con una alerta las sesiones que pasaron su tolerancia sin firma de ingreso.

### Escenario: Asignar un reemplazo

**Dado** que el docente Quispe faltó y su sesión de 10:15 sigue `pendiente`
**Cuando** asigno a la docente Flores como reemplazo
**Entonces** la sesión queda a nombre de Flores y solo ella puede firmarla.

### Escenario: Reemplazo de una sesión ya firmada

**Dado** que la sesión ya tiene firma de ingreso
**Cuando** intento asignar un reemplazo
**Entonces** el sistema no ofrece la acción.

### Escenario: Aprobar una justificación

**Dado** que el docente solicitó justificar una sesión `no_cumplida` con el motivo "Descanso médico" y adjuntó el certificado
**Cuando** la apruebo
**Entonces** la sesión pasa a `justificada`, se registra quién la aprobó y cuándo, y se muestra "Sesión justificada."

### Escenario: Rechazar una justificación

**Dado** que hay una justificación solicitada
**Cuando** la rechazo con el comentario "No presentó documento"
**Entonces** la sesión sigue `no_cumplida` y el docente ve el rechazo con el comentario.

## Historia de Usuario 4: Mis sesiones y justificación

**Como** Docente
**Quiero** ver el historial de mis sesiones y justificar las que no pude dictar
**Para** conocer mi cumplimiento y regularizar mis ausencias.

### Escenario: Ver mis sesiones

**Dado** que soy docente con sesión iniciada en el portal
**Cuando** abro "Mis sesiones" y elijo el bimestre II
**Entonces** el sistema lista cada sesión con fecha, curso, sección, tema, horas firmadas, estado y minutos perdidos, con el total de cumplidas, parciales y no cumplidas.

### Escenario: Solicitar una justificación

**Dado** que tengo una sesión `no_cumplida`
**Cuando** escribo el motivo "Descanso médico", adjunto el certificado y envío
**Entonces** la justificación queda `solicitada` y el sistema muestra "Su justificación fue enviada al subdirector."

### Escenario: Justificación sin motivo

**Dado** que estoy solicitando una justificación
**Cuando** envío sin motivo
**Entonces** el sistema impide el envío y muestra "Indique el motivo de la justificación."

### Escenario: Bimestre cerrado

**Dado** que el bimestre de la sesión ya se cerró
**Cuando** intento justificarla o corregir su tema
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado. La sesión ya no se puede modificar."

---

## Reglas de validación y negocio (resumen)

- **Generación:** diaria; un registro por bloque de clase con docente; no se genera en días sin clases, fuera de bimestre o sin docente; bloque doble = una sesión.
- **Firma:** solo en el Kiosko de Sesiones autorizado; código + PIN; solo el docente asignado (titular o reemplazo); hora del servidor; se guarda el equipo; una firma de ingreso y una de salida.
- **Tema:** obligatorio para el ingreso; editable hasta la salida.
- **Ventana de ingreso:** desde 1 minuto antes del inicio hasta el fin del bloque (P-05).
- **Minutos perdidos:** retraso + salida antes de tiempo que superen la tolerancia de 3 minutos (P-06); 0 → `cumplida`, más → `parcial`.
- **Cierre del día:** `pendiente` → `no_cumplida`; `en_curso` → `parcial` (P-08).
- **Reemplazo:** solo en sesiones `pendiente`; lo asigna el subdirector.
- **Justificación:** solo de `no_cumplida`; motivo obligatorio; la aprueba o rechaza el subdirector (P-07); aprobada → `justificada`.
- **Bloqueo:** al cerrar el bimestre no se firma, modifica ni justifica.
- **Permisos:** firma, el docente; panel, reemplazos y justificaciones, el subdirector (y el director para consulta).
- **Auditoría:** firmas, temas, reemplazos, cierres y justificaciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Kiosko de Sesiones a pantalla completa (código/QR + PIN, lista de sesiones de hoy, campo de tema, botones "Firmar ingreso" y "Firmar salida", tarjeta de resultado) · Portal web: Sesiones de hoy (panel en vivo con alertas) · Mis sesiones · Justificaciones pendientes. Escenarios: Ingreso a tiempo · Con retraso · Salida antes de tiempo · Sin tema · Fuera de ventana · Reemplazo · Justificación aprobada y rechazada.
