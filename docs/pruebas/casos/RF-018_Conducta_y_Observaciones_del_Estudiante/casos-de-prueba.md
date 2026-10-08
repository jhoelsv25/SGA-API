# Casos de prueba — RF-018: Conducta y Observaciones del Estudiante

**Fuente:** [`RF-018` V2](../../requerimientos/RF-018_Conducta_y_Observaciones_del_Estudiante/V2/RF-018_Conducta_y_Observaciones_del_Estudiante.md) · **Total de casos:** 18 · **Nuevos en V2:** 1

> Generados desde los escenarios Gherkin. Los IDs de la V1 se conservan; los casos marcados `(v2.0)` son nuevos o cambiaron. Las ejecuciones anteriores se conservan.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF018-01 | HU1 | Registrar una falta | que dicto en 5.° A y tengo `conducta.registrar` con alcance `mis_secciones` | registro una `falta` de gravedad `leve`, categoría "Uniforme", con descripción, para un estudiante de 5.° A | el sistema guarda la incidencia, notifica al apoderado principal y muestra "Incidencia registrada. Se notificó al apoderado." | Back + Front |
| CP-RF018-02 | HU1 | Registrar un mérito | que estoy registrando una incidencia | registro un `merito` de categoría "Participación" | el sistema la guarda sin gravedad y notifica al apoderado. | Back + Front |
| CP-RF018-03 | HU1 | Falta sin gravedad | que estoy registrando una `falta` | intento guardar sin gravedad | el sistema impide guardar y muestra "Indique la gravedad de la falta." | Back + Front |
| CP-RF018-04 | HU1 | Fecha futura | que estoy registrando una incidencia | pongo una fecha posterior a hoy | el sistema impide guardar y muestra "La fecha no puede ser posterior a hoy." | Back + Front |
| CP-RF018-05 | HU1 | Estudiante fuera de mi alcance | que mi alcance es `mis_secciones` y no dicto en 4.° B | intento registrar una incidencia de un estudiante de 4.° B | el sistema rechaza la acción y muestra "No tiene permiso para registrar sobre estudiantes de esta sección." | Back + Front |
| CP-RF018-06 | HU1 | Director registra en todo el colegio | que soy Director con alcance `colegio` | registro una incidencia de cualquier estudiante | el sistema la guarda. | Back + Front |
| CP-RF018-07 | HU1 | Corregir dentro del plazo | que registré una incidencia hace 3 horas | corrijo su descripción y guardo | el sistema crea una versión nueva y deja la anterior con vigencia 0, con quién y cuándo. | Back + Front |
| CP-RF018-08 | HU1 | Corrección fuera de plazo | que la incidencia se registró hace 2 días | intento corregirla | el sistema lo impide y muestra "Ya no se puede corregir. Puede anularla indicando el motivo." | Back + Front |
| CP-RF018-09 | HU1 | Anular sin motivo | que estoy anulando una incidencia | confirmo sin motivo | el sistema impide la acción y muestra "Indique el motivo de la anulación." | Back + Front |
| CP-RF018-10 | HU2 | Registrar una observación confidencial | que soy tutor de 5.° A | registro una observación `familiar`, marcada como confidencial, derivada a psicología | el sistema la guarda y solo la podrán ver quien la registró, el tutor, los apoderados del estudiante y el Director. | Back + Front |
| CP-RF018-11 | HU2 | Otro docente intenta ver una confidencial | que soy docente de 5.° A pero no registré la observación ni soy tutor | intento abrir una observación confidencial de un estudiante de 5.° A | el sistema no la muestra y, si se intenta por otra vía, muestra "No tiene acceso a esta observación." | Back + Front |
| CP-RF018-12 | HU2 | Observación no confidencial | que se registró una observación `academica` no confidencial | un docente de la sección abre la ficha del estudiante | puede verla. | Back + Front |
| CP-RF018-13 | HU3 | Apoderado recibe y ve una incidencia | que se registró una falta de mi hijo | abro la notificación | veo la fecha, el tipo, la categoría, la gravedad, la descripción y las medidas tomadas. | Back + Front |
| CP-RF018-14 | HU3 | Apoderado ve las observaciones | que mi hijo tiene observaciones, algunas confidenciales | abro "Seguimiento" de mi hijo | veo sus observaciones, incluidas las confidenciales. | Back + Front |
| CP-RF018-15 | HU3 | Información de otro estudiante | que soy apoderado | intento ver incidencias u observaciones de un estudiante que no es mi hijo | el sistema rechaza el acceso. | Back + Front |
| CP-RF018-16 | HU3 | Estudiante consulta su conducta | que soy estudiante | abro "Mi conducta" | veo mis méritos y faltas y también mis observaciones, incluidas las confidenciales. **(v2.0)** | Back + Front |
| CP-RF018-17 | HU3 | Resumen en la ficha | que soy tutor | abro la ficha de un estudiante | veo el total de méritos y faltas por bimestre y por gravedad. | Back + Front |
| CP-RF018-18 | HU2 | Configurar quién ve confidenciales (v2.0) | que el Administrador da a la Psicóloga el permiso `observaciones.ver_confidenciales` con alcance `colegio` | la Psicóloga abre una observación confidencial | el sistema se la muestra. | Back + Front |
