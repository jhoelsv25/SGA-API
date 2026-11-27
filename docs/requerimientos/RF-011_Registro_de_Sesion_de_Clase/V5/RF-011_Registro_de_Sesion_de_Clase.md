# RF-011: Registro de Sesión de Clase

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Kiosko de Sesiones y Portal Web — Seguimiento docente
**Versión:** 5.0
**Fecha:** actualización v5.0: 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-004` (kiosko de sesiones autorizado), `RF-005` (bimestres y días sin clases), `RF-007` (credencial del docente), `RF-008` (horario y carga académica). Para las notificaciones de las alertas y avisos: `RF-019`. Para las opciones del menú: `RF-002`. Para la planificación de la sesión: `RF-024`.

> **Cambios de la versión 5.0 sobre la 4.0 (2026-11-26):**
>
> - **Voz en el Kiosko de Sesiones:** al identificarse y al firmar, dice el nombre del docente.

> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
>
> - **Ventana de ingreso (P-05):** desde **15 minutos antes** del inicio hasta el fin del bloque; configurable.
> - **Tolerancia (P-06):** **15 minutos** al ingresar y **15** al salir; configurables.
> - **Olvido de la firma de salida (P-08):** la sesión queda `parcial` con "Sin firma de salida" y el sistema pone **automáticamente la hora de salida** (fin del bloque).

> **Cambios de la versión 3.0 sobre la 2.0 (refuerzo del seguimiento; el colegio es público, 2026-11-09).** Lo vigente de la 2.0 no cambia; se refuerza con:
>
> - **Alertas proactivas (v3.0):** además de la alerta por falta de firma de ingreso, el panel "Sesiones de hoy" avisa cuando una sesión `en_curso` está por terminar sin firma de salida y cuando un docente acumula minutos perdidos sobre un umbral (en el día o la semana). Las alertas también se envían como notificación del sistema (`RF-019`) al Subdirector y al Director, sin duplicarse.
> - **Bandeja de "Justificaciones de sesiones" (v3.0):** lista de solicitudes pendientes con su antigüedad, filtros y aviso al aprobador cuando una solicitud supera el plazo configurable.
> - **Motivo catalogado y documento según el motivo (v3.0):** la justificación se elige de un catálogo de motivos; el documento es obligatorio para algunos motivos.
> - **Norma pública (v3.0):** presentar la solicitud no da derecho a la licencia o permiso (Lineamientos MINEDU, art. 3); el permiso personal sin compensación horaria se concede hasta **3 días al año**, con justificación y autorización previa (disposición complementaria 3.ª). Se agrega un **contador de permisos personales** del docente en el año lectivo, visible al aprobar, con aviso (no bloqueo) al pasar del tope.
> - **Pendientes nuevos:** P-45 a P-49.

> **Cambios de la versión 4.0 sobre la 3.0 (planificación y supervisión de la sesión, 2026-11-23).** Lo vigente de la 3.0 no cambia; se agrega:
>
> - **Registro a cargo del docente (v4.0):** el docente es quien registra y planifica sus sesiones (`RF-024`); el supervisor **no edita** el contenido.
> - **Supervisión (v4.0):** el Director o el Subdirector **visualizan** la sesión y su planificación, **añaden comentarios** y pueden registrar las **horas reales en que el docente estuvo en el aula** (verificación de aula), que se contrastan con las horas firmadas.
> - **Marca «Sin planificación» (v4.0):** el panel «Sesiones de hoy» indica si la sesión tiene planificación `lista` (P-90).
> - **Firma:** sigue **solo en el Kiosko de Sesiones** de la subdirección; planificar desde cualquier equipo no equivale a firmar. La firma desde la web queda **apagada por defecto** (`sesion.permitir_firma_web`).
- **Kioskos separados (v4.0):** cada equipo autorizado tiene **un solo propósito**: `marcacion` (asistencia) o `sesiones`. Un kiosko de sesiones solo lo usan docentes y no sirve para marcar asistencia, y al revés.
> - **Firma y planificación (v4.0):** al firmar el ingreso, la planificación del bloque pasa a `ejecutada` y queda ligada a la sesión. Si el docente no escribe el tema, se toma el **título de su planificación**; sin planificación ni tema, el tema sigue siendo obligatorio.
- **Alcance:** la planificación deja de estar fuera de alcance y pasa a `RF-024`.
> - **Pendientes nuevos:** P-90 a P-95.

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
- **Ventana para firmar el ingreso.** Desde **15 minutos antes** de la hora de inicio del bloque hasta su hora de fin. Pasada la hora de fin, ya no se puede firmar el ingreso. **(v2.0, P-05: configurable en `sesion.minutos_antes_firma_ingreso`.)**
- **Firma de salida.** Después del ingreso, hasta el final del día.
- **Tolerancia y minutos perdidos.** Tolerancia de **15 minutos al ingresar y 15 al salir** **(v2.0, P-06: configurables en `sesion.tolerancia_ingreso_min` y `sesion.tolerancia_salida_min`)**:
  - **Retraso** = minutos entre la hora de inicio y la firma de ingreso, si supera la tolerancia.
  - **Salida antes de tiempo** = minutos entre la firma de salida y la hora de fin, si supera la tolerancia.
  - **Minutos perdidos** = retraso + salida antes de tiempo. Si son 0, la sesión queda `cumplida`; si son más, `parcial`.
- **Cierre del día.** Al terminar el día, el sistema cierra las sesiones abiertas:
  - `pendiente` → `no_cumplida`.
  - `en_curso` (sin firma de salida) → `parcial`, con la observación "Sin firma de salida". **Precisión (v2.0, P-08):** el sistema registra **automáticamente la hora de salida** igual a la hora de fin del bloque y marca la sesión con "salida automática"; los minutos perdidos solo consideran el retraso del ingreso. Se puede desactivar con `sesion.salida_automatica_sin_firma`.
- **Reemplazo.** Si el titular no dictará una sesión, el subdirector puede asignarle **otro docente** mientras esté `pendiente`. Desde ese momento, solo el reemplazo puede firmarla y la sesión cuenta como suya.
- **Justificación.** Para una sesión `no_cumplida`, el docente solicita la justificación con un motivo y, opcionalmente, un documento. El **Subdirector** la aprueba (la sesión pasa a `justificada`) o la rechaza con un comentario (queda `no_cumplida`). _(P-07.)_ Se puede solicitar hasta que se cierre el bimestre. **(v3.0: el motivo se elige de un catálogo y el documento puede ser obligatorio según el motivo; ver abajo.)**
- **Motivos de justificación (v3.0).** Catálogo cerrado; el docente elige uno al solicitar:

  | Motivo                       | Código                         | Documento   | Observación     |
  | ---------------------------- | ------------------------------ | ----------- | --------------- |
  | Descanso médico              | `descanso_medico`              | Obligatorio | Opcional        |
  | Permiso personal             | `permiso_personal`             | Opcional    | Opcional        |
  | Comisión de servicio         | `comision_de_servicio`         | Obligatorio | Opcional        |
  | Licencia                     | `licencia`                     | Obligatorio | Opcional        |
  | Caso fortuito o fuerza mayor | `caso_fortuito_o_fuerza_mayor` | Opcional    | Opcional        |
  | Otro                         | `otro`                         | Opcional    | **Obligatoria** |

  Los motivos que exigen documento se configuran en `sesion.justificacion_motivos_con_documento` (supuesto: `descanso_medico`, `comision_de_servicio` y `licencia`; _P-47_). El documento es PDF o imagen, como en el resto del sistema.

- **Norma pública aplicable (v3.0).** Según los Lineamientos MINEDU: (a) **la sola presentación de la solicitud no da derecho** a la licencia o permiso, salvo caso fortuito o fuerza mayor (art. 3): el sistema registra la solicitud, pero la sesión solo pasa a `justificada` cuando el aprobador la aprueba; (b) el **permiso personal sin compensación horaria** se concede hasta **3 días al año**, con justificación y **autorización previa** (disposición complementaria 3.ª). El sistema no bloquea por estas reglas: informa al aprobador (ver contador).
- **Contador de permisos personales (v3.0).** Para cada docente y año lectivo, el sistema cuenta los **días** con al menos una sesión `justificada` con motivo `permiso_personal` (no las sesiones; varias sesiones del mismo día cuentan como 1 día). Al revisar una solicitud con motivo `permiso_personal`, el aprobador ve "Lleva X de 3 días de permiso personal este año" (el 3 se configura en `sesion.permisos_personales_max_anio`; _P-48_). Si al aprobar se supera el tope, el sistema **avisa** y pide confirmar; **no bloquea**. El contador usa el año lectivo de trabajo elegido en el encabezado.
- **Bandeja de "Justificaciones de sesiones" (v3.0).** El aprobador ve las solicitudes en estado `solicitada`, de la más antigua a la más reciente, con docente, sesión (fecha, curso, sección), motivo, si trae documento, fecha de solicitud y **antigüedad** (días desde la solicitud). Filtros: estado (`solicitada`, aprobada, rechazada), motivo, docente, rango de fechas de la solicitud y "vencidas" (las que superan el plazo). Cuando una solicitud supera `sesion.justificacion_aviso_dias` (supuesto: **3 días hábiles**, sin contar feriados ni días sin clases del `RF-005`; _P-46_), se marca "Vencida" y se envía **una** notificación (`RF-019`) al aprobador. Hasta ahora quién aprueba es el Subdirector; el Director consulta (_P-49_).
- **Seguimiento en vivo.** El subdirector ve un panel del día con cada bloque: quién firmó y a qué hora, quién está en clase, y **alertas** de las sesiones que pasaron su tolerancia sin firma de ingreso.
- **Alertas proactivas (v3.0).** Además de la alerta anterior, el panel muestra y notifica:

  | Alerta                               | Condición                                                                                                          | Parámetro                                      |
  | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
  | Falta de firma de ingreso            | Sesión `pendiente` que pasó la tolerancia de ingreso (vigente desde la 2.0)                                        | `sesion.tolerancia_ingreso_min`                |
  | Falta de firma de salida (v3.0)      | Sesión `en_curso` sin firma de salida cuando faltan **N** minutos o menos para el fin del bloque (supuesto N = 10) | `sesion.alerta_salida_minutos`                 |
  | Minutos perdidos del día (v3.0)      | El docente suma en el día más minutos perdidos que el umbral (supuesto: 45 min)                                    | `sesion.alerta_minutos_perdidos_umbral`        |
  | Minutos perdidos de la semana (v3.0) | El docente suma en la semana (lunes a viernes) más minutos perdidos que el umbral semanal (supuesto: 120 min)      | `sesion.alerta_minutos_perdidos_umbral_semana` |

  Los valores son supuestos pendientes de confirmar (_P-45_). Los minutos perdidos son los definidos arriba (retraso + salida antes de tiempo); para los acumulados cuentan las sesiones `parcial` y, mientras corre el día, las que ya firmaron con retraso. Las sesiones `justificada` no suman. Poner un parámetro en 0 desactiva esa alerta.

- **Notificación y sin duplicados (v3.0).** Cada alerta se envía como notificación del sistema (`RF-019`) al **Subdirector** y al **Director** (los usuarios con acceso a la opción del menú "Sesiones de hoy"), enlazada al panel. Se envía **una sola vez por sesión y condición** (la de salida, una por sesión) y **una sola vez por docente y periodo** (la de minutos perdidos, una por día o una por semana). Si la condición deja de cumplirse (por ejemplo, el docente firma la salida), la alerta desaparece del panel pero la notificación ya enviada se conserva. Las alertas y los avisos quedan en la bitácora (`RF-003`).
- **Supervisión de la sesión (v4.0).** El supervisor (opción «Sesiones de hoy») puede, sobre cualquier sesión:
  - **Ver** su planificación en solo lectura (`RF-024`).
  - **Comentar**: queda con autor, fecha y hora; el docente lo ve y recibe un aviso (`RF-019`).
  - **Registrar las horas reales en el aula**: hora de inicio y fin en que el docente estuvo en clase, u «no estuvo en el aula», con observación. No cambia el estado de la sesión ni reemplaza a las ausencias de `RF-012` (P-94). Se calcula la diferencia con las horas planificadas y firmadas.
  - **No puede** editar el tema ni la planificación; solo el docente.

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

| Situación                         | Mensaje                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Ingreso firmado                   | "Ingreso firmado a las 08:30. Matemática – 5.° A."                                      |
| Ingreso con retraso               | "Ingreso firmado a las 08:50 con 20 minutos de retraso."                                |
| Salida firmada                    | "Salida firmada a las 10:00. Sesión cumplida."                                          |
| Salida antes de tiempo            | "Salida firmada a las 09:40. Sesión parcial: 20 minutos perdidos."                      |
| Falta el tema                     | "Ingrese el tema de la sesión para firmar el ingreso."                                  |
| Antes de la ventana               | "Aún no puede firmar. El ingreso se habilita a las 08:15."                              |
| Después de la ventana             | "La sesión ya terminó. No se puede firmar el ingreso."                                  |
| Sin sesiones hoy                  | "No tiene sesiones programadas para hoy."                                               |
| Sesión de otro docente            | "Esta sesión está asignada a otro docente."                                             |
| Código o PIN incorrecto           | "Código o PIN incorrecto."                                                              |
| Equipo no autorizado              | "Este equipo no está autorizado. Comuníquese con el área de TI."                        |
| Bimestre cerrado                  | "El bimestre está cerrado. La sesión ya no se puede modificar."                         |
| Justificación enviada             | "Su justificación fue enviada al subdirector."                                          |
| Justificación sin motivo          | "Indique el motivo de la justificación."                                                |
| Justificación aprobada            | "Sesión justificada."                                                                   |
| Sin conexión                      | "Sin conexión. No se registró la firma; intente nuevamente."                            |
| Alerta de salida (v3.0)           | "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida."        |
| Alerta de minutos perdidos (v3.0) | "El docente Quispe acumula 60 minutos perdidos hoy (umbral: 45)."                       |
| Motivo no elegido (v3.0)          | "Elija el motivo de la justificación."                                                  |
| Falta documento (v3.0)            | "Para este motivo debe adjuntar un documento."                                          |
| Falta observación (v3.0)          | "Indique la observación del motivo «Otro»."                                             |
| Contador de permisos (v3.0)       | "Lleva 2 de 3 días de permiso personal este año."                                       |
| Tope de permisos superado (v3.0)  | "Con esta aprobación superará los 3 días de permiso personal al año. ¿Desea continuar?" |
| Aviso norma (v3.0)                | "Presentar la solicitud no da derecho al permiso o licencia; debe ser aprobada."        |
| Solicitud vencida (v3.0)          | "La justificación de Quispe (Matemática – 5.° A, 04/11) lleva 4 días sin respuesta."    |

## Requerimientos fuera de alcance (Out of Scope)

- **Armado del horario y asignación de docentes.** Corresponde a `RF-008`.
- **Registro de ausencias del docente durante la sesión.** Corresponde a `RF-012`.
- **Consolidado bimestral y ficha imprimible.** Corresponde a `RF-013`.
- **Cálculo y reporte del CSP.** Corresponde a `RF-020`.
- **Reprogramación de una sesión a otra fecha.** No se contempla en esta versión.
- **Firma desde el celular o con geolocalización.** Descartada; solo en el Kiosko de Sesiones.
- **Descuentos, planillas y sanciones por inasistencia o tardanza.** Las alertas y justificaciones no calculan descuentos; el reporte para planillas corresponde a otro módulo.
- **Licencias formales ante la UGEL** (trámite de licencia, resolución, subsidio). El sistema solo registra la justificación de la sesión.
- **Alertas por WhatsApp, correo o SMS.** Solo panel y notificación del sistema (`RF-019`).
- **Planificación de la sesión de aprendizaje** (propósito, competencias, secuencia didáctica). **(v4.0)** Corresponde a `RF-024`; aquí solo se registra el tema (que se toma de la planificación si existe).

## Acuerdos y puntos abiertos

- **Kiosko de sesiones en la subdirección (acordado).** Reemplaza la hoja física.
- **Ventana de ingreso (acordado, P-05).** Desde 15 minutos antes del inicio hasta el fin del bloque; configurable. **(v2.0)**
- **Tolerancia (acordado, P-06).** 15 minutos al ingresar y 15 al salir; configurables. **(v2.0)**
- **Aprobación de justificaciones (pendiente, P-07).** Supuesto: Subdirector.
- **Olvido de la firma de salida (acordado, P-08).** `parcial` con salida automática a la hora de fin del bloque. **(v2.0)**
- **Bloque doble (pendiente, P-04).** Supuesto: una sola sesión.
- **Umbrales de las alertas (pendiente, P-45).** Supuestos: salida N = 10 min; minutos perdidos 45 por día y 120 por semana. **(v3.0)**
- **Plazo de aviso de justificaciones (pendiente, P-46).** Supuesto: 3 días hábiles. **(v3.0)**
- **Motivos que exigen documento (pendiente, P-47).** Supuesto: descanso médico, comisión de servicio y licencia. **(v3.0)**
- **Permiso personal, tope anual (pendiente, P-48).** Supuesto: 3 días al año (norma), aviso sin bloqueo; el contador cuenta días. **(v3.0)**
- **Denegar por razones de servicio y quién aprueba (pendiente, P-49).** Supuesto: aprueba el Subdirector, el Director consulta; la denegación se registra como rechazo con comentario. **(v3.0)**

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
**Entonces** la sesión pasa a `parcial` con la observación "Sin firma de salida"
**Y** el sistema registra como hora de salida la hora de fin del bloque, marcada como salida automática. **(v2.0)**

## Historia de Usuario 2: Firma de la sesión en el kiosko

**Como** Docente
**Quiero** firmar el ingreso y la salida de mi sesión en el Kiosko de Sesiones
**Para** dejar constancia de que dicté la clase y del tema que traté.

### Escenario: Firmar el ingreso a tiempo

**Dado** que tengo Matemática en 5.° A de 08:30 a 10:00 y estoy en el Kiosko de Sesiones a las 08:30
**Cuando** ingreso mi código y PIN, elijo la sesión, escribo el tema "Ecuaciones cuadráticas" y presiono "Firmar ingreso"
**Entonces** la sesión pasa a `en_curso` con hora de ingreso 08:30 y el kiosko muestra "Ingreso firmado a las 08:30. Matemática – 5.° A."

### Escenario: Firmar el ingreso con retraso

**Dado** la misma sesión con tolerancia de 15 minutos **(v2.0)**
**Cuando** firmo el ingreso a las 08:50
**Entonces** la sesión pasa a `en_curso` con 20 minutos de retraso y el kiosko muestra "Ingreso firmado a las 08:50 con 20 minutos de retraso."

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
**Cuando** intento firmar el ingreso a las 08:10 **(v2.0)**
**Entonces** el sistema impide la firma y muestra "Aún no puede firmar. El ingreso se habilita a las 08:15."

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

### Escenario: Ingreso dentro de la tolerancia (v2.0)

**Dado** que mi clase empieza a las 08:30 y la tolerancia de ingreso es 15 minutos
**Cuando** firmo el ingreso a las 08:42
**Entonces** la sesión pasa a `en_curso` sin minutos de retraso.

### Escenario: El Kiosko de Sesiones dice el nombre (v5.0)

**Dado** que el sonido del kiosko está activado
**Cuando** me identifico, firmo el ingreso o firmo la salida
**Entonces** el kiosko dice en voz alta mi primer nombre, mi apellido paterno y el resultado.

## Historia de Usuario 3: Seguimiento del subdirector

**Como** Subdirector
**Quiero** ver en vivo las firmas de las sesiones y gestionar reemplazos y justificaciones
**Para** hacer el seguimiento sin la hoja física.

### Escenario: Panel en vivo

**Dado** que es martes a las 08:40
**Cuando** abro "Sesiones de hoy"
**Entonces** el sistema muestra, por bloque y sección, el docente, el tema, la hora de ingreso y salida y el estado
**Y** destaca con una alerta las sesiones que pasaron su tolerancia sin firma de ingreso.

### Escenario: Alerta por sesión sin firma de salida próxima a terminar (v3.0)

**Dado** que la sesión de Matemática – 5.° A de 08:30 a 10:00 está `en_curso` y `sesion.alerta_salida_minutos` es 10
**Cuando** son las 09:50 y el docente no firmó la salida
**Entonces** el panel "Sesiones de hoy" destaca la sesión con la alerta "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida."
**Y** el sistema envía una notificación al Subdirector y al Director.

### Escenario: La alerta de salida no se duplica (v3.0)

**Dado** que ya se envió la alerta de salida de esa sesión
**Cuando** el panel se actualiza a las 09:55 y la sesión sigue sin firma de salida
**Entonces** el panel sigue mostrando la alerta
**Y** el sistema no envía otra notificación por esa sesión.

### Escenario: La alerta de salida desaparece al firmar (v3.0)

**Dado** que la sesión tiene la alerta de salida
**Cuando** el docente firma la salida
**Entonces** la alerta desaparece del panel
**Y** la notificación ya enviada se conserva en la bandeja.

### Escenario: Alerta por minutos perdidos del día (v3.0)

**Dado** que el umbral diario es 45 minutos y el docente Quispe perdió 25 minutos en su primera sesión de hoy
**Cuando** su segunda sesión queda `parcial` con 35 minutos perdidos (total 60)
**Entonces** el panel muestra "El docente Quispe acumula 60 minutos perdidos hoy (umbral: 45)."
**Y** envía una sola notificación al Subdirector y al Director por ese docente y ese día.

### Escenario: Alerta por minutos perdidos de la semana (v3.0)

**Dado** que el umbral semanal es 120 minutos y el docente Quispe acumula 110 minutos perdidos de lunes a jueves
**Cuando** el viernes pierde 15 minutos más
**Entonces** el panel muestra la alerta semanal del docente
**Y** envía una sola notificación por ese docente y esa semana.

### Escenario: Minutos perdidos justificados no suman (v3.0)

**Dado** que una sesión del docente quedó `justificada`
**Cuando** el sistema calcula sus minutos perdidos del día y de la semana
**Entonces** esa sesión no suma para las alertas.

### Escenario: Alerta desactivada (v3.0)

**Dado** que `sesion.alerta_minutos_perdidos_umbral` es 0
**Cuando** un docente acumula minutos perdidos en el día
**Entonces** el sistema no muestra ni envía la alerta de minutos perdidos del día.

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

### Escenario: Bandeja de justificaciones con antigüedad (v3.0)

**Dado** que hay 3 solicitudes `solicitada`, hechas hace 1, 2 y 4 días
**Cuando** abro "Justificaciones de sesiones"
**Entonces** el sistema las lista de la más antigua a la más reciente, con docente, sesión, motivo, si trae documento, fecha de solicitud y antigüedad en días
**Y** marca "Vencida" la de 4 días.

### Escenario: Filtrar la bandeja (v3.0)

**Dado** que la bandeja tiene solicitudes de varios docentes y motivos
**Cuando** filtro por el motivo "Descanso médico" y por "vencidas"
**Entonces** el sistema muestra solo las solicitudes que cumplen ambos filtros.

### Escenario: Aviso por solicitud vencida (v3.0)

**Dado** que `sesion.justificacion_aviso_dias` es 3 días hábiles y una solicitud lleva 4 días hábiles sin respuesta
**Cuando** se ejecuta la revisión diaria de la bandeja
**Entonces** el sistema envía una notificación al aprobador "La justificación de Quispe (Matemática – 5.° A, 04/11) lleva 4 días sin respuesta."
**Y** no vuelve a enviar aviso por esa misma solicitud.

### Escenario: Contador de permisos personales al aprobar (v3.0)

**Dado** que el docente Quispe tiene 2 días de permiso personal justificados este año lectivo y solicita otro con el motivo "Permiso personal"
**Cuando** abro su solicitud
**Entonces** veo "Lleva 2 de 3 días de permiso personal este año."

### Escenario: Aprobar un permiso personal que supera el tope (v3.0)

**Dado** que el docente Quispe ya tiene 3 días de permiso personal justificados este año lectivo
**Cuando** intento aprobar otra solicitud de permiso personal de un día distinto
**Entonces** el sistema muestra "Con esta aprobación superará los 3 días de permiso personal al año. ¿Desea continuar?"
**Y** si confirmo, la sesión pasa a `justificada` y queda registrado en la bitácora que se superó el tope.

### Escenario: Varias sesiones del mismo día cuentan un día (v3.0)

**Dado** que el docente tiene 3 sesiones `no_cumplida` del mismo día con motivo `permiso_personal`
**Cuando** el aprobador las aprueba
**Entonces** el contador de permisos personales suma 1 día.

### Escenario: Aviso de que la solicitud no da derecho (v3.0)

**Dado** que soy docente y elijo el motivo "Permiso personal" o "Licencia"
**Cuando** completo el formulario de justificación
**Entonces** el sistema muestra "Presentar la solicitud no da derecho al permiso o licencia; debe ser aprobada."
**Y** la sesión sigue `no_cumplida` hasta que el aprobador la apruebe.

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
**Entonces** el sistema impide el envío y muestra "Indique el motivo de la justificación." **(v3.0: el mensaje es "Elija el motivo de la justificación.", porque el motivo se elige del catálogo.)**

### Escenario: Elegir el motivo del catálogo (v3.0)

**Dado** que estoy solicitando la justificación de una sesión `no_cumplida`
**Cuando** abro el campo de motivo
**Entonces** veo las opciones Descanso médico, Permiso personal, Comisión de servicio, Licencia, Caso fortuito o fuerza mayor y Otro.

### Escenario: Documento obligatorio según el motivo (v3.0)

**Dado** que elegí el motivo "Descanso médico"
**Cuando** envío sin adjuntar documento
**Entonces** el sistema impide el envío y muestra "Para este motivo debe adjuntar un documento."

### Escenario: Documento opcional según el motivo (v3.0)

**Dado** que elegí el motivo "Permiso personal"
**Cuando** envío sin adjuntar documento
**Entonces** la justificación queda `solicitada` y el sistema muestra "Su justificación fue enviada al subdirector."

### Escenario: Motivo "Otro" sin observación (v3.0)

**Dado** que elegí el motivo "Otro"
**Cuando** envío sin escribir la observación
**Entonces** el sistema impide el envío y muestra "Indique la observación del motivo «Otro»."

### Escenario: Bimestre cerrado

**Dado** que el bimestre de la sesión ya se cerró
**Cuando** intento justificarla o corregir su tema
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado. La sesión ya no se puede modificar."

---

## Reglas de validación y negocio (resumen)

- **Generación:** diaria; un registro por bloque de clase con docente; no se genera en días sin clases, fuera de bimestre o sin docente; bloque doble = una sesión.
- **Firma:** solo en el Kiosko de Sesiones autorizado; código + PIN; solo el docente asignado (titular o reemplazo); hora del servidor; se guarda el equipo; una firma de ingreso y una de salida.
- **Tema:** obligatorio para el ingreso; editable hasta la salida.
- **Ventana de ingreso:** desde 15 minutos antes del inicio hasta el fin del bloque; configurable. **(v2.0)**
- **Minutos perdidos:** retraso + salida antes de tiempo que superen la tolerancia de 15 minutos al ingresar o al salir, configurables **(v2.0)**; 0 → `cumplida`, más → `parcial`.
- **Cierre del día:** `pendiente` → `no_cumplida`; `en_curso` → `parcial` con hora de salida automática **(v2.0)**.
- **Reemplazo:** solo en sesiones `pendiente`; lo asigna el subdirector.
- **Justificación:** solo de `no_cumplida`; motivo obligatorio **elegido del catálogo (v3.0)**; la aprueba o rechaza el subdirector (P-07); aprobada → `justificada`.
- **Motivos y documento (v3.0):** `descanso_medico`, `permiso_personal`, `comision_de_servicio`, `licencia`, `caso_fortuito_o_fuerza_mayor`, `otro` (observación obligatoria); documento obligatorio en `descanso_medico`, `comision_de_servicio` y `licencia`, configurable (P-47).
- **Norma pública (v3.0):** la solicitud no da derecho al permiso o licencia hasta que se aprueba; permiso personal hasta 3 días al año (`sesion.permisos_personales_max_anio`), contado por días en el año lectivo; al superarlo, aviso y confirmación, sin bloqueo (P-48, P-49).
- **Bandeja (v3.0):** pendientes con antigüedad en días, filtros por estado, motivo, docente, fechas y vencidas; aviso único por solicitud al superar `sesion.justificacion_aviso_dias` (3 días hábiles, P-46).
- **Alertas (v3.0):** salida pendiente a `sesion.alerta_salida_minutos` del fin (10); minutos perdidos del día y de la semana sobre `sesion.alerta_minutos_perdidos_umbral` y `..._umbral_semana` (45 y 120; 0 desactiva); panel + notificación (`RF-019`) al Subdirector y Director; una por sesión y condición, o por docente y periodo (P-45).
- **Bloqueo:** al cerrar el bimestre no se firma, modifica ni justifica.
- **Acceso:** firma, el docente (kiosko); las opciones del menú "Sesiones de hoy" y "Justificaciones de sesiones" las ven el Subdirector y el Director (consulta), según Roles-Menú (`RF-002`); "Mis sesiones", el docente.
- **Auditoría:** firmas, temas, reemplazos, cierres, justificaciones, alertas enviadas y avisos de vencimiento (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Kiosko de Sesiones a pantalla completa (código/QR + PIN, lista de sesiones de hoy, campo de tema, botones "Firmar ingreso" y "Firmar salida", tarjeta de resultado) · Portal web: Sesiones de hoy (panel en vivo con alertas) · Mis sesiones · Justificaciones pendientes. **(v3.0)** Portal web: Justificaciones de sesiones (bandeja con antigüedad, filtros y contador de permisos personales) · alertas de salida y de minutos perdidos en Sesiones de hoy. Escenarios: Ingreso a tiempo · Con retraso · Salida antes de tiempo · Sin tema · Fuera de ventana · Reemplazo · Justificación aprobada y rechazada.
