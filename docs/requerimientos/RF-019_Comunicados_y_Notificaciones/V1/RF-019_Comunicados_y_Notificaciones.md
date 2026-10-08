# RF-019: Comunicados y Notificaciones

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Comunicación
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Media | **Esfuerzo estimado:** 10 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permisos con alcance), `RF-007` (estudiantes y apoderados), `RF-008` (secciones y tutores), `RF-009` (matrículas vigentes).

## Consideraciones y supuestos de negocio

*   **Propósito.** Comunicar a la comunidad educativa por dos vías:
    1.  **Comunicados:** anuncios que redacta una persona (citaciones, reuniones, avisos) para un grupo.
    2.  **Notificaciones:** avisos personales que el sistema genera solo cuando ocurre algo que afecta al usuario.
*   **Solo dentro del sistema.** Todo se entrega en la **bandeja de notificaciones** del sistema (campana con contador). No se envían correos, SMS ni WhatsApp.
*   **Quién publica comunicados: por perfil con alcance** (`RF-002`). Valores por defecto del permiso `comunicados.publicar`:

    | Perfil | Alcance | Puede dirigir comunicados a… |
    |---|---|---|
    | Director, Subdirector | `colegio` | Todo el colegio, un grado o una sección |
    | Docente (tutor) | `tutoria` | Solo su sección |
    | Secretaria | `colegio` | Todo el colegio, un grado o una sección |

    El Administrador puede cambiarlo en cualquier momento.
*   **Datos del comunicado.** Título, contenido, **público** (`todos`, `docentes`, `estudiantes` o `apoderados`), **alcance** (todo el colegio, un grado o una sección, siempre dentro del alcance del autor), prioridad (`normal`, `importante`, `urgente`), adjunto opcional (PDF o imagen de hasta 10 MB) y fecha de vencimiento opcional.
*   **Destinatarios.** Al publicar, el sistema calcula los destinatarios según público y alcance: en una sección, sus estudiantes con matrícula vigente, sus apoderados y sus docentes, según el público elegido. Cada destinatario recibe una notificación enlazada al comunicado.
*   **Control de lectura.** Basta con que el destinatario **abra** el comunicado: se registra la fecha y hora de la primera lectura. No hay botón de "Enterado". El autor ve cuántos lo leyeron y la lista de quiénes faltan.
*   **Estados del comunicado.** `borrador` → `publicado` → `archivado`. Un comunicado publicado **no se edita**: si hay un error, se archiva y se publica uno nuevo; el archivado queda en el historial (nada se borra). Al vencer, deja de mostrarse como vigente, pero se conserva.
*   **Notificaciones automáticas.** El sistema notifica, entre otros:

    | Evento | A quién | RF |
    |---|---|---|
    | Ausencia registrada en su sesión | Docente | `RF-012` |
    | Justificación de sesión aprobada o rechazada | Docente | `RF-011` |
    | Consolidado generado o solicitud resuelta | Docente | `RF-013` |
    | Solicitud de revisión recibida | Director | `RF-013` |
    | Libreta publicada | Estudiante y apoderado principal | `RF-014` |
    | Material o tarea publicados | Estudiantes de la sección | `RF-015`, `RF-016` |
    | Cambio de fecha de material aprobado o rechazado | Docente | `RF-015` |
    | Entrega calificada o devuelta | Estudiante | `RF-016` |
    | Nueva publicación en el muro | Participantes del curso | `RF-017` |
    | Incidencia de conducta | Apoderado principal | `RF-018` |
    | Comunicado publicado | Destinatarios | este RF |

*   **Bandeja.** Cada usuario ve **solo sus** notificaciones, de la más reciente a la más antigua, con contador de no leídas. Al abrir una, se marca como leída y lleva a la pantalla correspondiente. Puede marcar todas como leídas.
*   **Conservación.** Las notificaciones y comunicados se conservan durante el año escolar y quedan como historial; no se borran.
*   **Operación 100% en línea.** El contador se actualiza sin recargar la página.
*   **Auditoría inmutable.** Publicación y archivo de comunicados quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Comunicado publicado | "Comunicado publicado para 64 destinatarios." |
| Falta título o contenido | "Ingrese el título y el contenido del comunicado." |
| Fuera de alcance | "Solo puede enviar comunicados a su sección." |
| Adjunto inválido | "El adjunto debe ser PDF o imagen de hasta 10 MB." |
| Vencimiento inválido | "La fecha de vencimiento debe ser posterior a la publicación." |
| Publicado no editable | "Un comunicado publicado no se puede editar. Archívelo y publique uno nuevo." |
| Sin destinatarios | "No hay destinatarios para el público y alcance elegidos." |
| Bandeja vacía | "No tienes notificaciones." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Correo electrónico, SMS, WhatsApp o notificaciones push.** Solo dentro del sistema. (La recuperación de contraseña por correo es parte de `RF-001`.)
*   **Confirmación "Enterado" o firma del apoderado.** Solo se registra la lectura.
*   **Respuestas al comunicado o conversación con el apoderado.** No se contempla.
*   **Muro y chat del curso.** Corresponden a `RF-017`.

## Acuerdos y puntos abiertos

*   **Publicación por perfil con alcance (acordado).** Por defecto, Director a todo el colegio y tutor solo a su sección.
*   **Lectura (acordado).** Basta con abrirlo.
*   **Canal (acordado).** Solo dentro del sistema.

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

---

## Reglas de validación y negocio (resumen)

*   **Canal:** solo dentro del sistema; sin correo, SMS ni WhatsApp.
*   **Comunicados:** obligatorios Título, Contenido, Público y Alcance; adjunto PDF o imagen de hasta 10 MB; vencimiento posterior a la publicación; alcance dentro del permitido por perfil (`RF-002`).
*   **Estados:** `borrador` → `publicado` → `archivado`; publicado no se edita; nada se borra.
*   **Destinatarios:** calculados por público y alcance, solo con matrícula vigente.
*   **Lectura:** se registra al abrir; sin "Enterado"; el autor ve el avance.
*   **Notificaciones:** personales; generadas por los eventos de los demás RF; leída al abrirse; marcar todas.
*   **Auditoría:** publicación y archivo de comunicados (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Campana y bandeja de notificaciones · Comunicados (listado, redactar con público y alcance, detalle con avance de lectura). Escenarios: Publicación a un grado · Tutor fuera de alcance · Borrador · Archivado · Avance de lectura · Bandeja vacía.
