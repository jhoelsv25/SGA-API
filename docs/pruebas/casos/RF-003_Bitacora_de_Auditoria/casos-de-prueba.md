# Casos de prueba — RF-003: Bitácora de Auditoría

**Fuente:** [`RF-003` V1](../../requerimientos/RF-003_Bitacora_de_Auditoria/V1/RF-003_Bitacora_de_Auditoria.md) · **Total de casos:** 10

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF003-01 | HU1 | Consulta inicial | que tengo el permiso de consulta de la bitácora | abro "Auditoría" | el sistema lista los registros de los últimos 7 días, del más reciente al más antiguo, de 50 en 50 · cada fila muestra fecha y hora, usuario, acción, entidad y dirección IP. | Back + Front |
| CP-RF003-02 | HU1 | Filtrar por usuario y acción | que estoy en "Auditoría" | filtro por un usuario y la acción `actualizar` | el sistema muestra solo los cambios hechos por ese usuario en el rango de fechas elegido. | Back + Front |
| CP-RF003-03 | HU1 | Ver el detalle de un cambio | que estoy en el listado | abro un registro de acción `actualizar` | el sistema muestra cada campo modificado con su valor anterior y su valor nuevo, uno al lado del otro. | Back + Front |
| CP-RF003-04 | HU1 | Cambio de contraseña en el detalle | que abro el registro de un cambio de contraseña | veo su detalle | el sistema indica que la contraseña cambió, sin mostrar ningún valor de la contraseña. | Back + Front |
| CP-RF003-05 | HU1 | Acción hecha por el sistema | que una cuenta se bloqueó por intentos fallidos | veo ese registro | el usuario aparece como "Sistema". | Back + Front |
| CP-RF003-06 | HU1 | Rango de fechas invertido | que estoy en "Auditoría" | elijo una fecha final anterior a la inicial | el sistema impide la consulta y muestra "La fecha final no puede ser anterior a la fecha inicial." | Back + Front |
| CP-RF003-07 | HU1 | Rango mayor a 31 días | que estoy en "Auditoría" | elijo un rango de más de 31 días | el sistema impide la consulta y muestra "El rango de consulta no puede superar los 31 días." | Back + Front |
| CP-RF003-08 | HU1 | Sin resultados | que no hay registros para los filtros elegidos | consulto | el sistema muestra "No hay registros de auditoría para los filtros seleccionados." | Back + Front |
| CP-RF003-09 | HU1 | Intento de modificar o eliminar un registro | que estoy viendo un registro de la bitácora | busco cómo editarlo o eliminarlo | el sistema no ofrece esas acciones · si se intenta por cualquier otra vía, el servidor lo rechaza. | Back + Front |
| CP-RF003-10 | HU1 | Usuario sin permiso | que mi rol no tiene el permiso de consulta de la bitácora | intento abrir "Auditoría" por su ruta | el sistema no muestra la opción en el menú y rechaza el acceso a la pantalla. | Back + Front |
