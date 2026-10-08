# Casos de prueba — RF-019: Comunicados y Notificaciones

**Fuente:** [`RF-019` V1](../../requerimientos/RF-019_Comunicados_y_Notificaciones/V1/RF-019_Comunicados_y_Notificaciones.md) · **Total de casos:** 15

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF019-01 | HU1 | Publicar a los apoderados de un grado | que tengo `comunicados.publicar` con alcance `colegio` | publico "Reunión de padres – viernes 10:00", público `apoderados`, alcance 5.° grado, prioridad `importante` | el sistema notifica a los apoderados de los estudiantes de 5.° con matrícula vigente y muestra "Comunicado publicado para 64 destinatarios." | Back + Front |
| CP-RF019-02 | HU1 | Tutor publica a su sección | que soy tutor de 5.° A con alcance `tutoria` | publico un comunicado para los estudiantes y apoderados de 5.° A | el sistema lo publica a los destinatarios de 5.° A. | Back + Front |
| CP-RF019-03 | HU1 | Tutor fuera de su alcance | que soy tutor de 5.° A con alcance `tutoria` | intento dirigir un comunicado a todo el colegio o a 4.° B | el sistema rechaza la publicación y muestra "Solo puede enviar comunicados a su sección." | Back + Front |
| CP-RF019-04 | HU1 | Campos obligatorios | que estoy redactando un comunicado | intento publicar sin título o sin contenido | el sistema impide la publicación y muestra "Ingrese el título y el contenido del comunicado." | Back + Front |
| CP-RF019-05 | HU1 | Adjunto inválido | que estoy redactando un comunicado | adjunto un archivo de 20 MB | el sistema lo rechaza y muestra "El adjunto debe ser PDF o imagen de hasta 10 MB." | Back + Front |
| CP-RF019-06 | HU1 | Guardar como borrador | que estoy redactando un comunicado | presiono "Guardar borrador" | el comunicado queda en `borrador`, sin notificar a nadie. | Back + Front |
| CP-RF019-07 | HU1 | Editar un comunicado publicado | que el comunicado ya está publicado | intento editarlo | el sistema lo impide y muestra "Un comunicado publicado no se puede editar. Archívelo y publique uno nuevo." | Back + Front |
| CP-RF019-08 | HU1 | Archivar un comunicado | que un comunicado publicado tenía un error | lo archivo | deja de mostrarse como vigente, pero se conserva en el historial con sus lecturas. | Back + Front |
| CP-RF019-09 | HU2 | Registro de lectura al abrir | que soy apoderado y recibí un comunicado | lo abro por primera vez | el sistema registra la fecha y hora de mi lectura, sin pedirme confirmación. | Back + Front |
| CP-RF019-10 | HU2 | Ver el avance de lectura | que publiqué un comunicado a 64 apoderados | abro su detalle | veo "48 de 64 leído (75 %)" y la lista de quienes aún no lo abren. | Back + Front |
| CP-RF019-11 | HU3 | Recibir una notificación automática | que soy apoderado | se publica la libreta del II Bimestre de mi hijo | la campana muestra una notificación nueva con el contador actualizado, sin recargar la página. | Back + Front |
| CP-RF019-12 | HU3 | Abrir una notificación | que tengo una notificación de libreta publicada | la abro | se marca como leída y me lleva a la libreta. | Back + Front |
| CP-RF019-13 | HU3 | Marcar todas como leídas | que tengo 7 notificaciones sin leer | presiono "Marcar todas como leídas" | el contador queda en 0. | Back + Front |
| CP-RF019-14 | HU3 | Bandeja vacía | que no tengo notificaciones | abro la bandeja | veo "No tienes notificaciones." | Back + Front |
| CP-RF019-15 | HU3 | Notificaciones de otro usuario | que soy un usuario | intento ver las notificaciones de otra persona | el sistema rechaza el acceso. | Back + Front |
