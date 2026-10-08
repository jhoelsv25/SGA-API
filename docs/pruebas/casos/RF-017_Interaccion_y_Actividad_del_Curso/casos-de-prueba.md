# Casos de prueba — RF-017: Interacción y Actividad del Curso

**Fuente:** [`RF-017` V1](../../requerimientos/RF-017_Interaccion_y_Actividad_del_Curso/V1/RF-017_Interaccion_y_Actividad_del_Curso.md) · **Total de casos:** 19

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF017-01 | HU1 | Publicar en el muro | que soy estudiante de 5.° A | publico "¿Alguien entendió el ejercicio 7?" en el muro de Matemática | la publicación aparece en el muro y los participantes reciben una notificación. | Back + Front |
| CP-RF017-02 | HU1 | Comentar una publicación | que hay una publicación en el muro | escribo un comentario y lo envío | el comentario aparece debajo de la publicación con mi nombre y la hora. | Back + Front |
| CP-RF017-03 | HU1 | Publicación vacía | que estoy publicando | envío sin texto ni adjunto | el sistema impide la publicación y muestra "Escriba un texto o agregue un adjunto." | Back + Front |
| CP-RF017-04 | HU1 | Adjunto muy pesado | que estoy publicando | adjunto un archivo de 25 MB | el sistema lo rechaza y muestra "El adjunto supera el máximo de 10 MB." | Back + Front |
| CP-RF017-05 | HU1 | Fijar una publicación | que soy el docente del curso | fijo la publicación "Examen el viernes" | queda arriba del muro para todos. | Back + Front |
| CP-RF017-06 | HU1 | Editar fuera de plazo | que publiqué hace 30 minutos | intento editar mi publicación | el sistema lo impide y muestra "Solo puede editar dentro de los 15 minutos de publicado." | Back + Front |
| CP-RF017-07 | HU1 | Usuario ajeno al curso | que no soy docente ni estudiante de Matemática de 5.° A | intento abrir su muro | el sistema rechaza el acceso y muestra "No participa en esta aula virtual." | Back + Front |
| CP-RF017-08 | HU2 | Enviar un mensaje | que estoy en el chat de Matemática de 5.° A | envío "¿La tarea es para el lunes?" | el mensaje aparece al instante para todos los participantes que tienen el chat abierto. | Back + Front |
| CP-RF017-09 | HU2 | Mensajes sin leer | que hay 5 mensajes nuevos desde mi último ingreso | abro el aula virtual | veo el contador "5" en el chat, sin recibir una notificación por cada mensaje. | Back + Front |
| CP-RF017-10 | HU2 | Sin mensajes privados | que estoy en el aula virtual | busco cómo escribir en privado a un compañero o al docente | el sistema no ofrece esa opción. | Back + Front |
| CP-RF017-11 | HU2 | Estudiante retirado | que un estudiante se retiró | intenta abrir el chat del curso | el sistema rechaza el acceso. | Back + Front |
| CP-RF017-12 | HU3 | Ocultar un mensaje | que un estudiante envió un mensaje ofensivo en el chat | lo oculto con el motivo "Lenguaje inapropiado" | el mensaje deja de verse para los estudiantes, queda con vigencia 0 con quién, cuándo y por qué, y el sistema muestra "El contenido se ocultó para los estudiantes." | Back + Front |
| CP-RF017-13 | HU3 | Ocultar sin motivo | que estoy ocultando un contenido | confirmo sin motivo | el sistema impide la acción y muestra "Indique el motivo para ocultar el contenido." | Back + Front |
| CP-RF017-14 | HU3 | Restaurar un contenido | que oculté un comentario por error | lo restauro desde el historial de moderación | vuelve a ser visible y el sistema muestra "El contenido volvió a estar visible." | Back + Front |
| CP-RF017-15 | HU3 | Historial de moderación | que soy Director | abro el historial de moderación de un curso | veo todo el contenido ocultado, su autor, quién lo ocultó, cuándo y el motivo. | Back + Front |
| CP-RF017-16 | HU3 | Un estudiante no puede moderar | que soy estudiante | veo una publicación de un compañero | el sistema no me ofrece ocultarla. | Back + Front |
| CP-RF017-17 | HU4 | Registro automático | que soy estudiante | abro y descargo un material | el sistema registra que lo vi y lo descargué, con fecha y hora. | Back + Front |
| CP-RF017-18 | HU4 | Ver quién revisó un material | que publiqué un material | abro "Actividad" de ese material | veo la lista de estudiantes con quién lo vio, quién lo descargó y quién no lo revisó. | Back + Front |
| CP-RF017-19 | HU4 | Año cerrado | que el año escolar está cerrado | intento publicar en el muro o escribir en el chat | el sistema lo impide y muestra "El año escolar está cerrado. El muro y el chat son de solo lectura." | Back + Front |
