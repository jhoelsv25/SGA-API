# RF-019: Comunicados y Notificaciones

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Comunicación
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Media | **Esfuerzo estimado:** 10 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permisos con alcance), `RF-007` (estudiantes y apoderados), `RF-008` (secciones y tutores), `RF-009` (matrículas vigentes). Eventos que originan notificaciones nuevas (v2.0): `RF-011` V3, `RF-013` V2, `RF-023`.

> **Cambios de la versión 2.0 sobre la 1.0 (solo se amplían las notificaciones automáticas; comunicados y bandeja no cambian):**
>
> - **Notificaciones de seguimiento docente (v2.0).** Se agregan a la lista las notificaciones que definen `RF-011` V3 (alertas de sesión sin firma de salida, minutos perdidos del día y de la semana, justificación vencida), `RF-013` V2 (compromiso de mejora: registro, recordatorio al Director y cierre) y `RF-023` (observación de aula: programada, reprogramada, cancelada, retroalimentación cerrada, corrección, recordatorio de revisión y comentario del docente).
> - **Tabla con momento, enlace y regla anti-duplicado (v2.0).** Cada notificación nueva indica destinatario, cuándo se genera, a dónde lleva y cuántas veces se envía.
> - **Regla de no duplicar (v2.0).** Una notificación por condición: el sistema no repite el aviso mientras la condición siga cumpliéndose, y una notificación ya enviada se conserva aunque la condición desaparezca.
> - **Escenarios nuevos (v2.0)** en la Historia de Usuario 4 y mensajes literales de las alertas.

## Consideraciones y supuestos de negocio

- **Propósito.** Comunicar a la comunidad educativa por dos vías:
  1.  **Comunicados:** anuncios que redacta una persona (citaciones, reuniones, avisos) para un grupo.
  2.  **Notificaciones:** avisos personales que el sistema genera solo cuando ocurre algo que afecta al usuario.
- **Solo dentro del sistema.** Todo se entrega en la **bandeja de notificaciones** del sistema (campana con contador). No se envían correos, SMS ni WhatsApp.
- **Quién publica comunicados: por perfil con alcance** (`RF-002`). Valores por defecto del permiso `comunicados.publicar`:

  | Perfil                | Alcance   | Puede dirigir comunicados a…            |
  | --------------------- | --------- | --------------------------------------- |
  | Director, Subdirector | `colegio` | Todo el colegio, un grado o una sección |
  | Docente (tutor)       | `tutoria` | Solo su sección                         |
  | Secretaria            | `colegio` | Todo el colegio, un grado o una sección |

  El Administrador puede cambiarlo en cualquier momento.

- **Datos del comunicado.** Título, contenido, **público** (`todos`, `docentes`, `estudiantes` o `apoderados`), **alcance** (todo el colegio, un grado o una sección, siempre dentro del alcance del autor), prioridad (`normal`, `importante`, `urgente`), adjunto opcional (PDF o imagen de hasta 10 MB) y fecha de vencimiento opcional.
- **Destinatarios.** Al publicar, el sistema calcula los destinatarios según público y alcance: en una sección, sus estudiantes con matrícula vigente, sus apoderados y sus docentes, según el público elegido. Cada destinatario recibe una notificación enlazada al comunicado.
- **Control de lectura.** Basta con que el destinatario **abra** el comunicado: se registra la fecha y hora de la primera lectura. No hay botón de "Enterado". El autor ve cuántos lo leyeron y la lista de quiénes faltan.
- **Estados del comunicado.** `borrador` → `publicado` → `archivado`. Un comunicado publicado **no se edita**: si hay un error, se archiva y se publica uno nuevo; el archivado queda en el historial (nada se borra). Al vencer, deja de mostrarse como vigente, pero se conserva.
- **Notificaciones automáticas.** El sistema notifica, entre otros:

  | Evento                                                                                                            | A quién                                                         | RF                 |
  | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------ |
  | Ausencia registrada en su sesión                                                                                  | Docente                                                         | `RF-012`           |
  | Justificación de sesión aprobada o rechazada                                                                      | Docente                                                         | `RF-011`           |
  | Consolidado generado o solicitud resuelta                                                                         | Docente                                                         | `RF-013`           |
  | Solicitud de revisión recibida                                                                                    | Director                                                        | `RF-013`           |
  | Libreta publicada                                                                                                 | Estudiante y apoderado principal                                | `RF-014`           |
  | Material o tarea publicados                                                                                       | Estudiantes de la sección                                       | `RF-015`, `RF-016` |
  | Cambio de fecha de material aprobado o rechazado                                                                  | Docente                                                         | `RF-015`           |
  | Entrega calificada o devuelta                                                                                     | Estudiante                                                      | `RF-016`           |
  | Nueva publicación en el muro                                                                                      | Participantes del curso                                         | `RF-017`           |
  | Incidencia de conducta                                                                                            | Apoderado principal                                             | `RF-018`           |
  | Comunicado publicado                                                                                              | Destinatarios                                                   | este RF            |
  | Alerta de sesión, minutos perdidos o justificación vencida **(v2.0)**                                             | Subdirector y Director (la justificación vencida, al aprobador) | `RF-011`           |
  | Compromiso de mejora registrado, recordatorio o cerrado **(v2.0)**                                                | Docente / Director                                              | `RF-013`           |
  | Observación de aula programada, reprogramada, cancelada, retroalimentada, corregida o con recordatorio **(v2.0)** | Docente / Observador y Director                                 | `RF-023`           |

- **Notificaciones automáticas de seguimiento docente (v2.0).** Detalle de las notificaciones nuevas. Cada una se genera **una sola vez por condición**; la regla de no duplicar es la que define el RF de origen.

  | Notificación                                                                                     | Destinatario                                                         | Momento                                                                                                                     | Enlace                                                                                              | Una sola vez por…                       | RF       |
  | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- |
  | Falta de firma de ingreso (alerta ya vigente desde `RF-011` V2; ahora también como notificación) | Subdirector y Director                                               | La sesión `pendiente` pasa la tolerancia de ingreso                                                                         | Panel "Sesiones de hoy"                                                                             | Sesión                                  | `RF-011` |
  | Sesión `en_curso` sin firma de salida                                                            | Subdirector y Director                                               | Faltan `sesion.alerta_salida_minutos` (supuesto 10) o menos para el fin del bloque y no hay firma de salida                 | Panel "Sesiones de hoy"                                                                             | Sesión                                  | `RF-011` |
  | Minutos perdidos del día                                                                         | Subdirector y Director                                               | El docente supera `sesion.alerta_minutos_perdidos_umbral` (supuesto 45 min) en el día                                       | Panel "Sesiones de hoy"                                                                             | Docente y día                           | `RF-011` |
  | Minutos perdidos de la semana                                                                    | Subdirector y Director                                               | El docente supera `sesion.alerta_minutos_perdidos_umbral_semana` (supuesto 120 min) de lunes a viernes                      | Panel "Sesiones de hoy"                                                                             | Docente y semana                        | `RF-011` |
  | Justificación de sesión vencida sin resolver                                                     | Aprobador de justificaciones (Subdirector; el Director consulta)     | La solicitud supera `sesion.justificacion_aviso_dias` (supuesto 3 días hábiles) sin respuesta                               | Bandeja "Justificaciones de sesiones"                                                               | Solicitud                               | `RF-011` |
  | Compromiso de mejora registrado                                                                  | Docente                                                              | El Director registra el compromiso                                                                                          | "Mi seguimiento" (compromiso)                                                                       | Compromiso                              | `RF-013` |
  | Recordatorio de revisión del compromiso                                                          | Director que lo registró (si ya no está activo, el Director vigente) | El día de la fecha de revisión, con el compromiso `pendiente`                                                               | Compromiso                                                                                          | Compromiso                              | `RF-013` |
  | Compromiso cerrado (`cumplido` o `no_cumplido`)                                                  | Docente                                                              | El Director lo cierra con su observación                                                                                    | "Mi seguimiento" (compromiso)                                                                       | Cierre (es definitivo)                  | `RF-013` |
  | Observación de aula programada (aviso previo)                                                    | Docente                                                              | El observador programa la observación, con la anticipación mínima `observacion.anticipacion_minima_dias` (propuesta 2 días) | Notificación o "Mis observaciones" (fecha, hora, curso, sección y observador; sin notas ni niveles) | Programación                            | `RF-023` |
  | Observación reprogramada o cancelada                                                             | Docente                                                              | Se reprograma o cancela con motivo                                                                                          | "Mis observaciones"                                                                                 | Cambio                                  | `RF-023` |
  | Retroalimentación cerrada: ya puede ver su observación                                           | Docente                                                              | La observación pasa a `retroalimentada`                                                                                     | "Mis observaciones" (detalle de la observación)                                                     | Observación                             | `RF-023` |
  | Corrección de compromisos o de la calificación                                                   | Docente (solo si la observación ya era visible para él)              | El Director corrige con motivo y se crea una versión nueva                                                                  | "Mis observaciones"                                                                                 | Versión                                 | `RF-023` |
  | Recordatorio de revisión del compromiso de la observación                                        | Observador y quien tenga la opción "Observaciones de aula"           | El día de la fecha de revisión, con el compromiso `pendiente`                                                               | "Seguimientos por revisar"                                                                          | Compromiso                              | `RF-023` |
  | Comentario del docente sobre su observación                                                      | Observador                                                           | El docente envía su comentario (solo una vez)                                                                               | Observación                                                                                         | Observación (un comentario por docente) | `RF-023` |

  Todas se entregan solo dentro del sistema (bandeja), sin correo, SMS ni WhatsApp. Si la condición deja de cumplirse (por ejemplo, el docente firma la salida), la notificación ya enviada se conserva en la bandeja.

- **Bandeja.** Cada usuario ve **solo sus** notificaciones, de la más reciente a la más antigua, con contador de no leídas. Al abrir una, se marca como leída y lleva a la pantalla correspondiente. Puede marcar todas como leídas.
- **Conservación.** Las notificaciones y comunicados se conservan durante el año escolar y quedan como historial; no se borran.
- **Operación 100% en línea.** El contador se actualiza sin recargar la página.
- **Auditoría inmutable.** Publicación y archivo de comunicados quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                     | Mensaje                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Comunicado publicado                          | "Comunicado publicado para 64 destinatarios."                                        |
| Falta título o contenido                      | "Ingrese el título y el contenido del comunicado."                                   |
| Fuera de alcance                              | "Solo puede enviar comunicados a su sección."                                        |
| Adjunto inválido                              | "El adjunto debe ser PDF o imagen de hasta 10 MB."                                   |
| Vencimiento inválido                          | "La fecha de vencimiento debe ser posterior a la publicación."                       |
| Publicado no editable                         | "Un comunicado publicado no se puede editar. Archívelo y publique uno nuevo."        |
| Sin destinatarios                             | "No hay destinatarios para el público y alcance elegidos."                           |
| Bandeja vacía                                 | "No tienes notificaciones."                                                          |
| Alerta de salida (v2.0)                       | "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida."     |
| Alerta de minutos perdidos (v2.0)             | "El docente Quispe acumula 60 minutos perdidos hoy (umbral: 45)."                    |
| Justificación vencida (v2.0)                  | "La justificación de Quispe (Matemática – 5.° A, 04/11) lleva 4 días sin respuesta." |
| Recordatorio de compromiso al Director (v2.0) | "Hoy se revisa el compromiso de Quispe: Firmar el ingreso dentro de la tolerancia."  |
| Observación programada (v2.0)                 | "Observación programada para el 18/03/2027 a las 08:30. Se avisó al docente."        |
| Observación reprogramada (v2.0)               | "Observación reprogramada para el 25/03/2027. Se avisó al docente."                  |
| Retroalimentación registrada (v2.0)           | "Retroalimentación registrada. El docente ya puede ver su observación."              |

## Requerimientos fuera de alcance (Out of Scope)

- **Correo electrónico, SMS, WhatsApp o notificaciones push.** Solo dentro del sistema. (La recuperación de contraseña por correo es parte de `RF-001`.)
- **Confirmación "Enterado" o firma del apoderado.** Solo se registra la lectura.
- **Respuestas al comunicado o conversación con el apoderado.** No se contempla.
- **Muro y chat del curso.** Corresponden a `RF-017`.

## Acuerdos y puntos abiertos

- **Publicación por perfil con alcance (acordado).** Por defecto, Director a todo el colegio y tutor solo a su sección.
- **Lectura (acordado).** Basta con abrirlo.
- **Canal (acordado).** Solo dentro del sistema.
- **Canal de las alertas de seguimiento docente (supuesto, P-70, v2.0).** Solo bandeja del sistema; sin correo, SMS ni push, como piden `RF-011` V3 y `RF-013` V2.
- **Destinatarios de las alertas de `RF-011` y de los recordatorios (supuesto, P-71, v2.0).** Alertas de sesión: usuarios con la opción "Sesiones de hoy" (Subdirector y Director). Justificación vencida: el aprobador. Recordatorio de compromiso (`RF-013`): el Director que lo registró; el de `RF-023`: el observador y quien tenga "Observaciones de aula". Dependen de los pendientes P-45, P-46 y P-54 de esos RF.
- **Regla de no duplicar y notificaciones diferidas (supuesto, P-72, v2.0).** Recordatorios y avisos de vencimiento los genera un proceso diario; si el sistema estuvo caído el día de la fecha, el aviso se envía al reanudarse, una sola vez, aunque la fecha ya haya pasado. Una persona con dos roles recibe una sola notificación por condición.

## Historia de Usuario 1: Publicar comunicados

**Como** Director
**Quiero** publicar comunicados para todo el colegio, un grado o una sección
**Para** informar a docentes, estudiantes y apoderados.

### Escenario: Publicar a los apoderados de un grado

**Dado** que tengo `comunicados.publicar` con alcance `colegio`
**Cuando** publico "Reunión de padres – viernes 10:00", público `apoderados`, alcance 5.° grado, prioridad `importante`
**Entonces** el sistema notifica a los apoderados de los estudiantes de 5.° con matrícula vigente y muestra "Comunicado publicado para 64 destinatarios."

### Escenario: Tutor publica a su sección

**Dado** que soy tutor de 5.° A con alcance `tutoria`
**Cuando** publico un comunicado para los estudiantes y apoderados de 5.° A
**Entonces** el sistema lo publica a los destinatarios de 5.° A.

### Escenario: Tutor fuera de su alcance

**Dado** que soy tutor de 5.° A con alcance `tutoria`
**Cuando** intento dirigir un comunicado a todo el colegio o a 4.° B
**Entonces** el sistema rechaza la publicación y muestra "Solo puede enviar comunicados a su sección."

### Escenario: Campos obligatorios

**Dado** que estoy redactando un comunicado
**Cuando** intento publicar sin título o sin contenido
**Entonces** el sistema impide la publicación y muestra "Ingrese el título y el contenido del comunicado."

### Escenario: Adjunto inválido

**Dado** que estoy redactando un comunicado
**Cuando** adjunto un archivo de 20 MB
**Entonces** el sistema lo rechaza y muestra "El adjunto debe ser PDF o imagen de hasta 10 MB."

### Escenario: Guardar como borrador

**Dado** que estoy redactando un comunicado
**Cuando** presiono "Guardar borrador"
**Entonces** el comunicado queda en `borrador`, sin notificar a nadie.

### Escenario: Editar un comunicado publicado

**Dado** que el comunicado ya está publicado
**Cuando** intento editarlo
**Entonces** el sistema lo impide y muestra "Un comunicado publicado no se puede editar. Archívelo y publique uno nuevo."

### Escenario: Archivar un comunicado

**Dado** que un comunicado publicado tenía un error
**Cuando** lo archivo
**Entonces** deja de mostrarse como vigente, pero se conserva en el historial con sus lecturas.

## Historia de Usuario 2: Lectura de comunicados

**Como** autor de un comunicado
**Quiero** saber quiénes lo leyeron
**Para** hacer seguimiento a quienes no se enteraron.

### Escenario: Registro de lectura al abrir

**Dado** que soy apoderado y recibí un comunicado
**Cuando** lo abro por primera vez
**Entonces** el sistema registra la fecha y hora de mi lectura, sin pedirme confirmación.

### Escenario: Ver el avance de lectura

**Dado** que publiqué un comunicado a 64 apoderados
**Cuando** abro su detalle
**Entonces** veo "48 de 64 leído (75 %)" y la lista de quienes aún no lo abren.

## Historia de Usuario 3: Bandeja de notificaciones

**Como** usuario del sistema
**Quiero** ver mis avisos en un solo lugar
**Para** enterarme de lo que me afecta.

### Escenario: Recibir una notificación automática

**Dado** que soy apoderado
**Cuando** se publica la libreta del II Bimestre de mi hijo
**Entonces** la campana muestra una notificación nueva con el contador actualizado, sin recargar la página.

### Escenario: Abrir una notificación

**Dado** que tengo una notificación de libreta publicada
**Cuando** la abro
**Entonces** se marca como leída y me lleva a la libreta.

### Escenario: Marcar todas como leídas

**Dado** que tengo 7 notificaciones sin leer
**Cuando** presiono "Marcar todas como leídas"
**Entonces** el contador queda en 0.

### Escenario: Bandeja vacía

**Dado** que no tengo notificaciones
**Cuando** abro la bandeja
**Entonces** veo "No tienes notificaciones."

### Escenario: Notificaciones de otro usuario

**Dado** que soy un usuario
**Cuando** intento ver las notificaciones de otra persona
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 4: Notificaciones de seguimiento docente (v2.0)

**Como** Subdirector, Director, observador o docente
**Quiero** recibir en mi bandeja los avisos del seguimiento docente que me corresponden
**Para** actuar a tiempo sin revisar cada pantalla.

### Escenario: Alerta por sesión sin firma de salida (v2.0)

**Dado** que la sesión de Matemática – 5.° A de 08:30 a 10:00 está `en_curso`, `sesion.alerta_salida_minutos` es 10 y no hay firma de salida
**Cuando** faltan 10 minutos para el fin del bloque
**Entonces** el Subdirector y el Director reciben la notificación "Matemática – 5.° A (prof. Quispe): faltan 10 minutos y no hay firma de salida."
**Y** la notificación los lleva al panel "Sesiones de hoy".

### Escenario: La alerta de salida no se duplica (v2.0)

**Dado** que ya se envió la alerta de salida de esa sesión
**Cuando** el sistema vuelve a revisar y la sesión sigue sin firma de salida
**Entonces** no envía otra notificación por esa sesión.

### Escenario: La notificación enviada se conserva al firmar (v2.0)

**Dado** que el Director tiene la alerta de salida en su bandeja
**Cuando** el docente firma la salida
**Entonces** la alerta desaparece del panel
**Y** la notificación ya enviada se conserva en la bandeja.

### Escenario: Alerta por minutos perdidos del día (v2.0)

**Dado** que el umbral diario es 45 minutos y el docente Quispe acumula 60 minutos perdidos hoy
**Cuando** su segunda sesión queda `parcial`
**Entonces** el Subdirector y el Director reciben una sola notificación "El docente Quispe acumula 60 minutos perdidos hoy (umbral: 45)." por ese docente y ese día
**Y** si pierde más minutos ese mismo día no reciben otra.

### Escenario: Alerta por minutos perdidos de la semana (v2.0)

**Dado** que el umbral semanal es 120 minutos y el docente Quispe acumula 125 minutos de lunes a viernes
**Cuando** se supera el umbral
**Entonces** el Subdirector y el Director reciben una sola notificación por ese docente y esa semana.

### Escenario: Alerta desactivada no notifica (v2.0)

**Dado** que `sesion.alerta_minutos_perdidos_umbral` es 0
**Cuando** un docente acumula minutos perdidos en el día
**Entonces** no se envía ninguna notificación de minutos perdidos del día.

### Escenario: Aviso por justificación vencida (v2.0)

**Dado** que `sesion.justificacion_aviso_dias` es 3 días hábiles y una solicitud lleva 4 días hábiles sin respuesta
**Cuando** se ejecuta la revisión diaria
**Entonces** el aprobador recibe "La justificación de Quispe (Matemática – 5.° A, 04/11) lleva 4 días sin respuesta." enlazada a la bandeja "Justificaciones de sesiones"
**Y** no se vuelve a enviar aviso por esa misma solicitud.

### Escenario: Aviso al docente de su compromiso de mejora (v2.0)

**Dado** que el Director registra el compromiso "Firmar el ingreso dentro de la tolerancia" para el docente Quispe
**Cuando** lo guarda
**Entonces** el docente recibe una notificación enlazada a su compromiso en "Mi seguimiento"
**Y** el Director no recibe notificación por su propia acción.

### Escenario: Recordatorio de revisión del compromiso al Director (v2.0)

**Dado** que existe un compromiso `pendiente` con fecha de revisión 15/12/2026
**Cuando** llega el 15/12/2026
**Entonces** el Director que lo registró recibe "Hoy se revisa el compromiso de Quispe: Firmar el ingreso dentro de la tolerancia." enlazada al compromiso.

### Escenario: El recordatorio del compromiso no se duplica (v2.0)

**Dado** que ya se envió el recordatorio del compromiso
**Cuando** el sistema vuelve a ejecutar la revisión diaria ese mismo día o los siguientes
**Entonces** no envía otro recordatorio por ese compromiso
**Y** el compromiso sin cerrar figura como vencido en "Pendientes de seguimiento".

### Escenario: Aviso al docente del cierre de su compromiso (v2.0)

**Dado** que el Director marca el compromiso como `cumplido` o `no_cumplido`
**Cuando** guarda el cierre con su observación
**Entonces** el docente recibe una notificación enlazada a su compromiso.

### Escenario: Aviso previo de observación de aula (v2.0)

**Dado** que la Subdirectora Rojas programa una observación en la clase del docente Quispe para el 18/03/2027 a las 08:30
**Cuando** la guarda
**Entonces** el docente recibe una notificación enlazada a "Mis observaciones", con la fecha, la hora, el curso, la sección y el observador, sin ninguna nota ni nivel
**Y** el observador ve "Observación programada para el 18/03/2027 a las 08:30. Se avisó al docente."

### Escenario: Aviso de reprogramación o cancelación de la observación (v2.0)

**Dado** que la observación del docente Quispe está `programada`
**Cuando** la reprogramo para el 25/03/2027 con motivo, o la cancelo con motivo
**Entonces** el docente recibe una notificación del cambio, enlazada a "Mis observaciones"
**Y** en la reprogramación el observador ve "Observación reprogramada para el 25/03/2027. Se avisó al docente."

### Escenario: Aviso al docente cuando ya puede ver su observación (v2.0)

**Dado** que el observador registró la reunión y al menos un compromiso
**Cuando** presiona "Cerrar retroalimentación"
**Entonces** la observación pasa a `retroalimentada` y el docente recibe una notificación enlazada al detalle de su observación
**Y** el docente no recibió ninguna notificación con las notas ni los niveles antes de ese momento.

### Escenario: Aviso al docente por corrección de su observación (v2.0)

**Dado** que la observación ya es visible para el docente
**Cuando** el Director corrige un compromiso o la calificación con motivo y se crea una versión nueva
**Entonces** el docente recibe una notificación enlazada a su observación
**Y** si la observación aún no era visible para el docente, no recibe notificación.

### Escenario: Recordatorio de revisión del compromiso de la observación (v2.0)

**Dado** que un compromiso de observación tiene fecha de revisión 30/04/2027 y sigue `pendiente`
**Cuando** llega esa fecha
**Entonces** el observador y quien tenga la opción "Observaciones de aula" reciben una notificación enlazada a "Seguimientos por revisar"
**Y** no se envía otra por ese compromiso.

### Escenario: Aviso al observador del comentario del docente (v2.0)

**Dado** que el docente deja su comentario dentro del plazo
**Cuando** lo envía
**Entonces** el observador recibe una notificación enlazada a la observación
**Y** el docente no puede enviar un segundo comentario que genere otra notificación.

### Escenario: Una persona con dos roles recibe una sola notificación (v2.0)

**Dado** que una persona es a la vez Director y observador de la misma observación
**Cuando** llega la fecha de revisión del compromiso
**Entonces** recibe una sola notificación por ese compromiso.

### Escenario: Notificación de seguimiento solo para su destinatario (v2.0)

**Dado** que una alerta o aviso de seguimiento docente es para el Director o para el docente Quispe
**Cuando** otro docente abre su bandeja
**Entonces** no ve esa notificación.

---

## Reglas de validación y negocio (resumen)

- **Canal:** solo dentro del sistema; sin correo, SMS ni WhatsApp.
- **Comunicados:** obligatorios Título, Contenido, Público y Alcance; adjunto PDF o imagen de hasta 10 MB; vencimiento posterior a la publicación; alcance dentro del permitido por perfil (`RF-002`).
- **Estados:** `borrador` → `publicado` → `archivado`; publicado no se edita; nada se borra.
- **Destinatarios:** calculados por público y alcance, solo con matrícula vigente.
- **Lectura:** se registra al abrir; sin "Enterado"; el autor ve el avance.
- **Notificaciones:** personales; generadas por los eventos de los demás RF; leída al abrirse; marcar todas.
- **Notificaciones de seguimiento docente (v2.0):** alertas de `RF-011` (ingreso, salida, minutos perdidos del día y de la semana) al Subdirector y al Director, y justificación vencida al aprobador; compromisos de `RF-013` (aviso al docente al registrar y al cerrar, recordatorio al Director en la fecha de revisión); observaciones de `RF-023` (aviso previo, reprogramación, cancelación, retroalimentación cerrada y corrección al docente; recordatorio al observador; comentario al observador).
- **Sin duplicados (v2.0):** una notificación por condición (sesión, docente y día/semana, solicitud, compromiso, observación o versión); la ya enviada se conserva aunque la condición desaparezca; una persona con dos roles recibe una sola.
- **Auditoría:** publicación y archivo de comunicados (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Campana y bandeja de notificaciones · Comunicados (listado, redactar con público y alcance, detalle con avance de lectura). Escenarios: Publicación a un grado · Tutor fuera de alcance · Borrador · Archivado · Avance de lectura · Bandeja vacía. **(v2.0)** Notificaciones de seguimiento docente: alerta de salida y de minutos perdidos · justificación vencida · compromiso (registro, recordatorio, cierre) · observación programada, retroalimentada y comentario.
