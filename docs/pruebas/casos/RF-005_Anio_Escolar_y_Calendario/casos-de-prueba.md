# Casos de prueba — RF-005: Año Escolar y Calendario

**Fuente:** [`RF-005` V1](../../requerimientos/RF-005_Anio_Escolar_y_Calendario/V1/RF-005_Anio_Escolar_y_Calendario.md) · **Total de casos:** 21

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF005-01 | HU1 | Crear el año escolar | que no existe el año 2027 | lo creo del 01/03/2027 al 19/12/2027, completo las fechas de los bimestres I al IV y guardo | el sistema crea el año en estado `planificado` con sus 4 bimestres en `planificado`. | Back + Front |
| CP-RF005-02 | HU1 | Año repetido | que ya existe el año 2027 | intento crearlo de nuevo | el sistema bloquea el guardado y muestra "Ya existe el año escolar 2027." | Back + Front |
| CP-RF005-03 | HU1 | Fechas invertidas | que estoy registrando un año o un bimestre | la fecha de fin es anterior o igual a la de inicio | el sistema impide guardar y muestra "La fecha de fin debe ser posterior a la fecha de inicio." | Back + Front |
| CP-RF005-04 | HU1 | Bimestre fuera del año | que el año va del 01/03/2027 al 19/12/2027 | el bimestre IV termina el 22/12/2027 | el sistema impide guardar y muestra "Las fechas del bimestre deben estar dentro del año escolar." | Back + Front |
| CP-RF005-05 | HU1 | Bimestres superpuestos | que el bimestre I termina el 09/05/2027 | el bimestre II empieza el 05/05/2027 | el sistema impide guardar y muestra "El bimestre no puede empezar antes de que termine el anterior." | Back + Front |
| CP-RF005-06 | HU1 | Iniciar el año | que el año 2027 está `planificado` con sus 4 bimestres y no hay otro año en curso | presiono "Iniciar año" y confirmo | el año pasa a `en_curso` · el sistema lo usa por defecto en todas las pantallas. | Back + Front |
| CP-RF005-07 | HU1 | Iniciar el año sin bimestres completos | que al año le falta la fecha de un bimestre | presiono "Iniciar año" | el sistema bloquea la acción y muestra "Complete las fechas de los 4 bimestres antes de iniciar el año." | Back + Front |
| CP-RF005-08 | HU1 | Otro año en curso | que el año 2026 sigue `en_curso` | intento iniciar el año 2027 | el sistema bloquea la acción y muestra "Ya hay un año escolar en curso. Ciérrelo antes de iniciar otro." | Back + Front |
| CP-RF005-09 | HU1 | Iniciar y cerrar bimestres en orden | que el bimestre I está `cerrado` y el II `planificado` | presiono "Iniciar" en el bimestre II | el bimestre II pasa a `en_curso`. | Back + Front |
| CP-RF005-10 | HU1 | Bimestre fuera de orden | que el bimestre II sigue `en_curso` | intento iniciar el bimestre III | el sistema bloquea la acción y muestra "Debe cerrar el bimestre anterior antes de iniciar este." | Back + Front |
| CP-RF005-11 | HU1 | Cerrar un bimestre | que el bimestre I está `en_curso` | presiono "Cerrar bimestre" y confirmo | el bimestre pasa a `cerrado` · ya no se pueden registrar ni modificar sesiones de clase ni ausencias de sus fechas. | Back + Front |
| CP-RF005-12 | HU1 | Cerrar el año con bimestres abiertos | que el bimestre IV sigue `en_curso` | intento cerrar el año | el sistema bloquea la acción y muestra "No se puede cerrar el año: hay bimestres sin cerrar." | Back + Front |
| CP-RF005-13 | HU1 | Reabrir un año cerrado | que el año 2026 está `cerrado` | presiono "Reabrir", indico el motivo "Corrección de libretas" y la fecha límite 15/01/2027, y confirmo | el año pasa a `reabierto` hasta esa fecha y la reapertura queda en la bitácora. | Back + Front |
| CP-RF005-14 | HU1 | Reapertura sin motivo | que estoy reabriendo un año | confirmo sin motivo o sin fecha límite | el sistema impide la acción y muestra "Indique el motivo y la fecha límite de la reapertura." | Back + Front |
| CP-RF005-15 | HU1 | Vence la reapertura | que el año 2026 está `reabierto` hasta el 15/01/2027 | llega el 16/01/2027 | el sistema lo vuelve a `cerrado` automáticamente. | Back + Front |
| CP-RF005-16 | HU2 | Registrar un feriado | que el año 2027 está en curso | registro "Fiestas Patrias", tipo `feriado`, del 28/07/2027 al 29/07/2027, y guardo | el sistema guarda el evento marcado como "Suspende clases" · en esas fechas no se generan sesiones de clase. | Back + Front |
| CP-RF005-17 | HU2 | Actividad que no suspende clases | que estoy registrando un evento | registro "Reunión de padres", tipo `reunion`, sin marcar "Suspende clases" | el sistema guarda el evento y las sesiones de ese día se generan con normalidad. | Back + Front |
| CP-RF005-18 | HU2 | Suspensión registrada después | que el 10/06/2027 ya tiene sesiones generadas, algunas firmadas | registro una suspensión para el 10/06/2027 | el sistema elimina las sesiones pendientes de esa fecha, conserva las firmadas y muestra "Se eliminaron las sesiones pendientes de esas fechas. Las sesiones ya firmadas se conservan." | Back + Front |
| CP-RF005-19 | HU2 | Fechas del evento invertidas | que estoy registrando un evento | la fecha de fin es anterior a la de inicio | el sistema impide guardar y muestra "La fecha de fin debe ser posterior a la fecha de inicio." | Back + Front |
| CP-RF005-20 | HU2 | Ver el calendario | que soy cualquier usuario del sistema | abro "Calendario" | el sistema muestra los eventos del año en curso en vista mensual, con los días sin clases resaltados. | Back + Front |
| CP-RF005-21 | HU2 | Usuario sin permiso para registrar | que mi perfil no tiene el permiso `calendario.registrar` | abro "Calendario" | puedo ver los eventos, pero el sistema no me ofrece registrar, editar ni eliminar. | Back + Front |
