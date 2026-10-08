# RF-015: Unidades y Materiales de Reforzamiento

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Aula virtual
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres), `RF-008` (carga académica y horario), `RF-011` (sesiones de clase), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

*   **Propósito.** El aula virtual es un espacio de **reforzamiento** de lo enseñado en el aula. Aquí el docente organiza su curso por unidades y publica materiales de repaso. Es la fuente del **IGM**: materiales planificados publicados a tiempo ÷ materiales planificados × 100 (`RF-020`).
*   **Aula virtual por curso y sección.** Cada curso de la carga académica (`RF-008`) tiene su aula virtual. Solo el docente asignado administra su contenido; los estudiantes con matrícula vigente en la sección lo consultan.
*   **Unidades.** El docente organiza el curso en unidades, cada una con título, descripción opcional, bimestre, fechas de inicio y fin (fin ≥ inicio) y orden. Una unidad se puede ocultar mientras se prepara.
*   **Planificar antes de publicar.** Un material **planificado** se registra primero sin archivo: título, tipo, unidad y **fecha programada** (hasta cuándo debe estar publicado).
    *   Si el material refuerza una clase, el docente elige el **bloque del horario**; la fecha programada se toma de la fecha de esa clase. Cuando la sesión se genera (`RF-011`), el sistema la enlaza al material.
    *   Si no está ligado a una clase, el docente indica la fecha programada dentro del bimestre.
*   **Ventana de planificación.** Los materiales del bimestre se planifican en los primeros **7 días** del bimestre *(P-13)*. Al terminar ese plazo, sus **fechas quedan congeladas**. Después se pueden seguir agregando materiales planificados, pero con fecha programada de **al menos 7 días después** del registro, y quedan congelados al guardarse.
*   **Cambio de fecha por solicitud.** Con la fecha congelada, el docente solicita el cambio con un motivo. El **Subdirector** la aprueba o la rechaza con una respuesta *(P-14)*. Al aprobarse, el material toma la nueva fecha y la anterior queda en el **historial de cambios**; nada se borra. Una sola solicitud abierta por material.
*   **Publicar.** El docente sube el archivo o pega el enlace y publica.

    | Tipo | Formatos |
    |---|---|
    | `documento` | PDF, Word |
    | `presentacion` | PowerPoint, PDF |
    | `hoja_calculo` | Excel |
    | `imagen` | PNG, JPG |
    | `audio` | MP3 |
    | `video` | MP4 |
    | `enlace` | URL (YouTube, Google Drive u otra página) |

    Los archivos pesan como máximo **50 MB**. Los enlaces deben empezar con `http://` o `https://`.
*   **A tiempo.** Un material planificado está **a tiempo** si se publica hasta el final del día de su fecha programada; **fuera de plazo** si se publica después; **no publicado** si la fecha pasó sin publicarse. Se mide con la **primera** publicación.
*   **Materiales extra.** El docente puede publicar materiales **no planificados** en cualquier momento. Se muestran a los estudiantes igual que los demás, pero **no cuentan en el IGM**.
*   **Retirar o reemplazar.** Un material publicado se puede reemplazar (nuevo archivo o enlace) u ocultar; no se elimina: un material retirado queda con **vigencia 0** y sigue contando en el IGM según su primera publicación.
*   **Aviso.** Al publicar, los estudiantes de la sección reciben una notificación (`RF-019`).
*   **Seguimiento del Subdirector.** Ve por docente y curso los materiales planificados, publicados a tiempo, fuera de plazo y no publicados del bimestre, y las solicitudes de cambio pendientes.
*   **Bloqueo.** Al cerrar el bimestre (`RF-005`) no se planifican ni se cambian fechas de sus materiales; sí se pueden seguir consultando.
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Planificación, congelamiento, solicitudes de cambio, publicaciones, reemplazos y retiros quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Material planificado | "Material planificado para el 15/05/2027." |
| Fecha fuera del bimestre | "La fecha programada debe estar dentro del bimestre." |
| Fecha muy cercana | "Fuera de la semana de planificación, la fecha programada debe ser al menos 7 días después de hoy." |
| Fecha congelada | "La fecha programada está congelada. Solicite el cambio al Subdirector." |
| Solicitud enviada | "Su solicitud de cambio de fecha fue enviada al Subdirector." |
| Solicitud sin motivo | "Indique el motivo del cambio de fecha." |
| Solicitud repetida | "Ya tiene una solicitud pendiente para este material." |
| Rechazo sin respuesta | "Indique la respuesta para el docente." |
| Publicado a tiempo | "Material publicado a tiempo." |
| Publicado fuera de plazo | "Material publicado fuera de plazo (fecha programada: 15/05/2027)." |
| Archivo muy pesado | "El archivo supera el máximo de 50 MB." |
| Formato no permitido | "Formato no permitido para el tipo de material elegido." |
| Enlace inválido | "Ingrese un enlace válido que empiece con http:// o https://." |
| Fechas de unidad invertidas | "La fecha de fin de la unidad debe ser igual o posterior a la de inicio." |
| Curso ajeno | "Solo el docente asignado puede administrar esta aula virtual." |
| Bimestre cerrado | "El bimestre está cerrado. Ya no se pueden planificar materiales ni cambiar fechas." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Tareas, cuestionarios y su calificación.** Corresponde a `RF-016`.
*   **Muro, comentarios, chat y registro de actividad.** Corresponde a `RF-017`.
*   **Cálculo y reporte del IGM.** Corresponde a `RF-020`.
*   **Edición de documentos en línea** o reproductor de video propio. Los archivos se descargan o se abren en el navegador.
*   **Materiales compartidos entre secciones automáticamente.** Cada sección tiene su aula; el docente puede publicar el mismo material en varias.

## Acuerdos y puntos abiertos

*   **Planificación congelada (acordado).** El docente planifica, las fechas se congelan y solo cambian por solicitud aprobada, con historial.
*   **A tiempo (acordado).** Publicado hasta la fecha programada.
*   **Tamaño (acordado).** Máximo 50 MB por archivo; enlaces permitidos.
*   **Ventana de planificación (pendiente, P-13).** Supuesto: 7 días.
*   **Aprobación de cambios de fecha (pendiente, P-14).** Supuesto: Subdirector.

## Historia de Usuario 1: Unidades del curso

**Como** Docente
**Quiero** organizar mi aula virtual en unidades
**Para** que los estudiantes encuentren el reforzamiento ordenado como en clase.

### Escenario: Crear una unidad
**Dado** que dicto Matemática en 5.° A
**Cuando** creo la unidad "Ecuaciones" del II Bimestre, del 12/05 al 06/06, y la guardo visible
**Entonces** la unidad aparece en el aula virtual de Matemática de 5.° A.

### Escenario: Fechas de unidad invertidas
**Dado** que estoy creando una unidad
**Cuando** la fecha de fin es anterior a la de inicio
**Entonces** el sistema impide guardar y muestra "La fecha de fin de la unidad debe ser igual o posterior a la de inicio."

### Escenario: Aula de otro docente
**Dado** que no dicto Inglés en 5.° A
**Cuando** intento crear una unidad en esa aula virtual
**Entonces** el sistema rechaza la acción y muestra "Solo el docente asignado puede administrar esta aula virtual."

## Historia de Usuario 2: Planificar materiales

**Como** Docente
**Quiero** planificar los materiales de reforzamiento del bimestre con su fecha
**Para** comprometer cuándo los tendrán mis estudiantes.

### Escenario: Planificar ligado a una clase
**Dado** que estoy en la semana de planificación del II Bimestre
**Cuando** planifico "Video de repaso de ecuaciones" ligado a mi bloque del jueves 15/05 de 08:30
**Entonces** el material queda planificado con fecha programada 15/05/2027 y el sistema muestra "Material planificado para el 15/05/2027."

### Escenario: Planificar sin clase
**Dado** que estoy en la semana de planificación
**Cuando** planifico "Separata de práctica" con fecha programada 30/05/2027
**Entonces** el material queda planificado con esa fecha.

### Escenario: Fecha fuera del bimestre
**Dado** que el II Bimestre termina el 25/07/2027
**Cuando** planifico un material con fecha 10/08/2027
**Entonces** el sistema impide guardar y muestra "La fecha programada debe estar dentro del bimestre."

### Escenario: Congelamiento al cerrar la ventana
**Dado** que la semana de planificación terminó
**Cuando** intento editar la fecha programada de un material
**Entonces** el sistema impide la edición y muestra "La fecha programada está congelada. Solicite el cambio al Subdirector."

### Escenario: Planificar fuera de la ventana con fecha cercana
**Dado** que la semana de planificación terminó y hoy es 02/06/2027
**Cuando** planifico un material nuevo con fecha 05/06/2027
**Entonces** el sistema impide guardar y muestra "Fuera de la semana de planificación, la fecha programada debe ser al menos 7 días después de hoy."

### Escenario: Enlace con la sesión real
**Dado** que un material está ligado al bloque del jueves 15/05
**Cuando** se genera la sesión de ese día (`RF-011`)
**Entonces** el sistema enlaza el material con esa sesión.

## Historia de Usuario 3: Solicitar un cambio de fecha

**Como** Docente
**Quiero** pedir un cambio de fecha de un material congelado
**Para** ajustar mi plan cuando hay una razón válida.

### Escenario: Enviar la solicitud
**Dado** que el material "Separata de práctica" tiene fecha congelada 30/05/2027
**Cuando** solicito cambiarla al 06/06/2027 con el motivo "Se suspendieron clases el 28/05"
**Entonces** la solicitud queda `solicitada` y el sistema muestra "Su solicitud de cambio de fecha fue enviada al Subdirector."

### Escenario: Solicitud sin motivo
**Dado** que estoy solicitando un cambio de fecha
**Cuando** envío sin motivo
**Entonces** el sistema impide el envío y muestra "Indique el motivo del cambio de fecha."

### Escenario: Solicitud repetida
**Dado** que el material ya tiene una solicitud pendiente
**Cuando** intento enviar otra
**Entonces** el sistema bloquea el envío y muestra "Ya tiene una solicitud pendiente para este material."

### Escenario: El Subdirector aprueba
**Dado** que hay una solicitud pendiente del 30/05 al 06/06
**Cuando** el Subdirector la aprueba
**Entonces** el material toma la fecha 06/06/2027, la fecha anterior queda en el historial con quién aprobó y cuándo, y el docente es notificado.

### Escenario: El Subdirector rechaza
**Dado** que hay una solicitud pendiente
**Cuando** el Subdirector la rechaza con la respuesta "La suspensión no afecta tu curso"
**Entonces** el material conserva su fecha y el docente es notificado con la respuesta.

### Escenario: Rechazo sin respuesta
**Dado** que el Subdirector está rechazando una solicitud
**Cuando** confirma sin respuesta
**Entonces** el sistema impide la acción y muestra "Indique la respuesta para el docente."

## Historia de Usuario 4: Publicar materiales

**Como** Docente
**Quiero** subir y publicar mis materiales de reforzamiento
**Para** que mis estudiantes repasen lo visto en clase.

### Escenario: Publicar a tiempo
**Dado** que "Video de repaso de ecuaciones" tiene fecha programada 15/05/2027 y hoy es 14/05/2027
**Cuando** pego el enlace de YouTube y publico
**Entonces** el material queda publicado a tiempo, los estudiantes de 5.° A reciben una notificación y el sistema muestra "Material publicado a tiempo."

### Escenario: Publicar fuera de plazo
**Dado** que la fecha programada fue 15/05/2027
**Cuando** publico el material el 17/05/2027
**Entonces** el material queda publicado fuera de plazo y el sistema muestra "Material publicado fuera de plazo (fecha programada: 15/05/2027)."

### Escenario: Material no publicado
**Dado** que la fecha programada fue 15/05/2027
**Cuando** termina ese día sin publicación
**Entonces** el material queda como no publicado para el IGM y el Subdirector lo ve en su seguimiento.

### Escenario: Material extra
**Dado** que quiero compartir un material que no planifiqué
**Cuando** lo publico como material extra
**Entonces** los estudiantes lo ven, pero no cuenta en el IGM.

### Escenario: Archivo muy pesado
**Dado** que estoy subiendo un video
**Cuando** el archivo pesa 80 MB
**Entonces** el sistema rechaza el archivo y muestra "El archivo supera el máximo de 50 MB."

### Escenario: Formato no permitido
**Dado** que elegí el tipo `documento`
**Cuando** subo un archivo MP3
**Entonces** el sistema rechaza el archivo y muestra "Formato no permitido para el tipo de material elegido."

### Escenario: Enlace inválido
**Dado** que elegí el tipo `enlace`
**Cuando** ingreso "www.youtube.com/abc" sin http
**Entonces** el sistema impide guardar y muestra "Ingrese un enlace válido que empiece con http:// o https://."

### Escenario: Reemplazar un material publicado
**Dado** que un material ya está publicado
**Cuando** subo un archivo corregido
**Entonces** el nuevo archivo queda visible, el anterior queda con vigencia 0 en el historial y la medición del IGM no cambia.

### Escenario: Estudiante consulta el material
**Dado** que soy estudiante de 5.° A
**Cuando** abro el aula virtual de Matemática
**Entonces** veo las unidades visibles y sus materiales publicados, con el enlace a la clase que refuerzan cuando corresponde.

## Historia de Usuario 5: Seguimiento de materiales

**Como** Subdirector
**Quiero** ver el cumplimiento de los materiales planificados
**Para** asegurar que el reforzamiento llegue a tiempo.

### Escenario: Resumen por docente
**Dado** que estoy en "Materiales del bimestre" y elijo el II Bimestre
**Cuando** veo el resumen
**Entonces** el sistema muestra por docente y curso los materiales planificados, publicados a tiempo, fuera de plazo y no publicados, con el porcentaje a tiempo, y las solicitudes de cambio pendientes.

### Escenario: Bimestre cerrado
**Dado** que el II Bimestre está cerrado
**Cuando** un docente intenta planificar un material o solicitar un cambio de fecha en ese bimestre
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado. Ya no se pueden planificar materiales ni cambiar fechas."

---

## Reglas de validación y negocio (resumen)

*   **Aula virtual:** una por curso y sección; la administra solo el docente asignado; la consultan los estudiantes con matrícula vigente.
*   **Unidades:** bimestre; fin ≥ inicio; se pueden ocultar.
*   **Planificación:** fecha programada dentro del bimestre; ligada a un bloque del horario (fecha de esa clase) o libre; ventana de 7 días (P-13); fuera de la ventana, fecha al menos 7 días después de hoy.
*   **Congelamiento:** al cerrar la ventana o al guardar fuera de ella; cambios solo por solicitud aprobada por el Subdirector (P-14); una solicitud abierta por material; historial sin borrado.
*   **Publicación:** archivos de hasta 50 MB con formato según el tipo; enlaces `http://` o `https://`.
*   **IGM:** cuenta solo materiales planificados y vigentes; a tiempo si la primera publicación es hasta el día programado; extras no cuentan.
*   **Reemplazo y retiro:** el anterior queda con vigencia 0; no cambia la medición.
*   **Bloqueo:** al cerrar el bimestre.
*   **Auditoría:** planificación, congelamiento, solicitudes, publicaciones, reemplazos y retiros (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Aula virtual del curso (unidades y materiales) · Planificar material (con selector de bloque del horario) · Publicar material (archivo o enlace) · Solicitudes de cambio de fecha (docente y Subdirector) · Materiales del bimestre (seguimiento). Escenarios: Planificado · Congelado · Solicitud aprobada y rechazada · A tiempo · Fuera de plazo · No publicado · Extra.
