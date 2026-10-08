# RF-017: Interacción y Actividad del Curso

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Aula virtual
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Baja | **Complejidad:** Media | **Esfuerzo estimado:** 10 hh (IA Agéntica)
**Prerrequisitos:** `RF-009` (matrículas vigentes), `RF-015` (aula virtual, materiales), `RF-016` (tareas), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

*   **Propósito.** Que el aula virtual de cada curso sea un espacio de conversación para el reforzamiento: un **muro** para publicar y comentar, un **chat grupal** para dudas rápidas, y un **registro de actividad** para que el docente sepa quién revisó el material.
*   **Quiénes participan.** En el aula de un curso y sección participan el **docente asignado** y los **estudiantes con matrícula vigente** en esa sección. Los apoderados no participan. Un estudiante retirado deja de tener acceso (`RF-009`).
*   **Muro del curso.**
    *   **Todos** (docente y estudiantes) pueden publicar: texto y, opcionalmente, un adjunto (imagen, PDF o enlace; hasta 10 MB).
    *   Todos pueden **comentar** las publicaciones.
    *   Solo el docente puede **fijar** una publicación arriba del muro.
    *   El autor puede editar su publicación o comentario durante **15 minutos**; después ya no.
*   **Chat grupal del curso.** Un **único chat por curso y sección** con todos los participantes. Los mensajes son de texto y, opcionalmente, un adjunto (hasta 10 MB). **No hay mensajes privados**, ni entre estudiantes ni entre docente y estudiante.
*   **Moderación.** El docente puede **ocultar** cualquier publicación, comentario o mensaje inapropiado indicando un motivo. No se borra: queda con **vigencia 0**, con quién lo ocultó, cuándo y por qué. Lo oculto deja de verse para los estudiantes; el docente, el Director y el Subdirector lo pueden ver en el historial de moderación. Un contenido oculto se puede **restaurar**.
*   **Sin borrado por el usuario.** Nadie elimina contenido. El autor puede editarlo dentro de los 15 minutos; después solo el docente lo oculta.
*   **Avisos.** Las nuevas publicaciones del muro generan una notificación a los participantes (`RF-019`). Los mensajes del chat **no** generan notificación; se muestra un contador de mensajes sin leer en el aula.
*   **Registro de actividad.** El sistema registra automáticamente cuando un estudiante **ve** o **descarga** un material, y cuando **abre** o **completa** una tarea. El docente ve, por material y por tarea, quiénes lo revisaron y quiénes no.
*   **Bloqueo.** Al cerrar el año escolar (`RF-005`), el muro y el chat de sus cursos quedan en **solo lectura**.
*   **Operación 100% en línea.** El chat se actualiza en tiempo real mientras la pantalla está abierta.
*   **Auditoría inmutable.** Publicaciones, ediciones, ocultamientos y restauraciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Publicación vacía | "Escriba un texto o agregue un adjunto." |
| Adjunto muy pesado | "El adjunto supera el máximo de 10 MB." |
| Edición fuera de plazo | "Solo puede editar dentro de los 15 minutos de publicado." |
| Ocultar sin motivo | "Indique el motivo para ocultar el contenido." |
| Contenido ocultado | "El contenido se ocultó para los estudiantes." |
| Contenido restaurado | "El contenido volvió a estar visible." |
| Sin acceso al curso | "No participa en esta aula virtual." |
| Año cerrado | "El año escolar está cerrado. El muro y el chat son de solo lectura." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Mensajes privados** entre usuarios. No se contemplan.
*   **Videollamadas o clases en vivo.** No se contemplan.
*   **Participación de apoderados** en el muro o el chat. Se comunican por comunicados (`RF-019`).
*   **Reacciones ("me gusta") o encuestas.** No se contemplan.
*   **Materiales y tareas.** Corresponden a `RF-015` y `RF-016`.

## Acuerdos y puntos abiertos

*   **Chat (acordado).** Solo un chat grupal por curso y sección; sin privados.
*   **Muro (acordado).** Todos publican y comentan.
*   **Moderación (acordado).** El docente oculta; nada se borra (vigencia 0).

## Historia de Usuario 1: Muro del curso

**Como** estudiante o docente del curso
**Quiero** publicar y comentar en el muro
**Para** compartir dudas, avisos y recursos sobre lo que vemos en clase.

### Escenario: Publicar en el muro
**Dado** que soy estudiante de 5.° A
**Cuando** publico "¿Alguien entendió el ejercicio 7?" en el muro de Matemática
**Entonces** la publicación aparece en el muro y los participantes reciben una notificación.

### Escenario: Comentar una publicación
**Dado** que hay una publicación en el muro
**Cuando** escribo un comentario y lo envío
**Entonces** el comentario aparece debajo de la publicación con mi nombre y la hora.

### Escenario: Publicación vacía
**Dado** que estoy publicando
**Cuando** envío sin texto ni adjunto
**Entonces** el sistema impide la publicación y muestra "Escriba un texto o agregue un adjunto."

### Escenario: Adjunto muy pesado
**Dado** que estoy publicando
**Cuando** adjunto un archivo de 25 MB
**Entonces** el sistema lo rechaza y muestra "El adjunto supera el máximo de 10 MB."

### Escenario: Fijar una publicación
**Dado** que soy el docente del curso
**Cuando** fijo la publicación "Examen el viernes"
**Entonces** queda arriba del muro para todos.

### Escenario: Editar fuera de plazo
**Dado** que publiqué hace 30 minutos
**Cuando** intento editar mi publicación
**Entonces** el sistema lo impide y muestra "Solo puede editar dentro de los 15 minutos de publicado."

### Escenario: Usuario ajeno al curso
**Dado** que no soy docente ni estudiante de Matemática de 5.° A
**Cuando** intento abrir su muro
**Entonces** el sistema rechaza el acceso y muestra "No participa en esta aula virtual."

## Historia de Usuario 2: Chat grupal del curso

**Como** estudiante o docente del curso
**Quiero** conversar en el chat del curso
**Para** resolver dudas rápidas con todos.

### Escenario: Enviar un mensaje
**Dado** que estoy en el chat de Matemática de 5.° A
**Cuando** envío "¿La tarea es para el lunes?"
**Entonces** el mensaje aparece al instante para todos los participantes que tienen el chat abierto.

### Escenario: Mensajes sin leer
**Dado** que hay 5 mensajes nuevos desde mi último ingreso
**Cuando** abro el aula virtual
**Entonces** veo el contador "5" en el chat, sin recibir una notificación por cada mensaje.

### Escenario: Sin mensajes privados
**Dado** que estoy en el aula virtual
**Cuando** busco cómo escribir en privado a un compañero o al docente
**Entonces** el sistema no ofrece esa opción.

### Escenario: Estudiante retirado
**Dado** que un estudiante se retiró
**Cuando** intenta abrir el chat del curso
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 3: Moderación

**Como** Docente
**Quiero** ocultar contenido inapropiado del muro y del chat
**Para** mantener un espacio respetuoso, sin perder el registro.

### Escenario: Ocultar un mensaje
**Dado** que un estudiante envió un mensaje ofensivo en el chat
**Cuando** lo oculto con el motivo "Lenguaje inapropiado"
**Entonces** el mensaje deja de verse para los estudiantes, queda con vigencia 0 con quién, cuándo y por qué, y el sistema muestra "El contenido se ocultó para los estudiantes."

### Escenario: Ocultar sin motivo
**Dado** que estoy ocultando un contenido
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo para ocultar el contenido."

### Escenario: Restaurar un contenido
**Dado** que oculté un comentario por error
**Cuando** lo restauro desde el historial de moderación
**Entonces** vuelve a ser visible y el sistema muestra "El contenido volvió a estar visible."

### Escenario: Historial de moderación
**Dado** que soy Director
**Cuando** abro el historial de moderación de un curso
**Entonces** veo todo el contenido ocultado, su autor, quién lo ocultó, cuándo y el motivo.

### Escenario: Un estudiante no puede moderar
**Dado** que soy estudiante
**Cuando** veo una publicación de un compañero
**Entonces** el sistema no me ofrece ocultarla.

## Historia de Usuario 4: Actividad de los estudiantes

**Como** Docente
**Quiero** saber qué estudiantes revisaron cada material y tarea
**Para** identificar quién necesita más apoyo.

### Escenario: Registro automático
**Dado** que soy estudiante
**Cuando** abro y descargo un material
**Entonces** el sistema registra que lo vi y lo descargué, con fecha y hora.

### Escenario: Ver quién revisó un material
**Dado** que publiqué un material
**Cuando** abro "Actividad" de ese material
**Entonces** veo la lista de estudiantes con quién lo vio, quién lo descargó y quién no lo revisó.

### Escenario: Año cerrado
**Dado** que el año escolar está cerrado
**Cuando** intento publicar en el muro o escribir en el chat
**Entonces** el sistema lo impide y muestra "El año escolar está cerrado. El muro y el chat son de solo lectura."

---

## Reglas de validación y negocio (resumen)

*   **Participantes:** docente asignado y estudiantes con matrícula vigente en la sección.
*   **Muro:** todos publican y comentan; texto o adjunto obligatorio; adjuntos de hasta 10 MB; solo el docente fija; edición solo dentro de 15 minutos.
*   **Chat:** uno grupal por curso y sección; sin privados; sin notificaciones por mensaje (contador de no leídos).
*   **Moderación:** solo el docente oculta y restaura, con motivo; lo oculto queda con vigencia 0; nada se borra; Director y Subdirector ven el historial.
*   **Actividad:** registro automático de vista y descarga de materiales, apertura y entrega de tareas.
*   **Bloqueo:** solo lectura al cerrar el año.
*   **Auditoría:** publicaciones, ediciones, ocultamientos y restauraciones (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Aula virtual con pestañas Muro · Chat · Materiales · Tareas · Actividad · Historial de moderación. Escenarios: Publicación con comentarios · Chat en vivo con contador · Ocultar y restaurar · Actividad por material · Solo lectura.
