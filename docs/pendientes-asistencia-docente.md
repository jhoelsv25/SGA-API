# Asistencia docente: fallos pendientes (para retomar)

Anotado el 2026-11-26. Origen: prueba de vías mezcladas (kiosko, manual y reloj) contra una base desechable, con el reloj del servidor simulado y las marcas del reloj insertadas en la tabla (sin el aparato).

## Estado de lo corregido (sin commit ni despliegue)

| Fallo | Estado |
|---|---|
| Kiosko y reloj a la vez creaban dos entradas | Corregido: 5 de 5 con una sola entrada |
| Dos envíos simultáneos al kiosko | **Corregido** (RF-010 V7): 60 de 60 pares con 0 a 55 ms de diferencia dejan una sola entrada; las repeticiones antes de 60 s se ignoran (P-100). En una corrida posterior un envío de un par respondió 404 (quedó una sola entrada); no se repitió en 6 corridas ni con 600 pares; origen sin determinar |
| Salida manual anterior a la entrada | Corregido: se rechaza |
| Marca posterior a una salida sin entrada quedaba como entrada | Corregido: se rechaza |
| La justificación de la tardanza pasaba a la salida | Corregido: se quita. La bitácora guarda los valores anteriores (revisado en el código, no comprobado en la prueba) |
| Marca del reloj tras otra vía se descartaba como rebote, sin rastro | Corregido: queda como duplicada entre vías, con rastro |
| Cualquier usuario veía el carné o la credencial de otra persona | Corregido: solo su dueño, Administrador, Secretaria, Director y Subdirector. Probado con unitarias, no por HTTP con sesión. Un rol personalizado que usara el carné desde Docentes o Estudiantes ya no podrá |
| Reordenar marcas no era atómico | Corregido por la transacción (no se forzó un fallo para probarlo) |
| Límite del kiosko mal nombrado (`default`) | Cambiado a `long` (60 por minuto) en marcación y sesiones. **Sin comprobar** el límite de 60: en una ráfaga actúa antes el de 10 por segundo |

Verificación: TypeScript y ESLint sin errores en lo tocado. Prueba de mezclas 25/25 y `marcaciones-vias` 12/12 (los casos límite solo registran lo que ocurre). Unitarias: en la última corrida completa, 1454 de 1455; la que falló (plantilla Excel de importación) superó 5 s de espera y sola pasa (17/17).

## Corregido después (2026-11-26)

- **PIN:** solo Soporte TI lo cambia (API y web; se quitó "Mi credencial"). RF-007 V5. Falta: probar con un usuario real de Soporte TI y darle en Roles y Permisos las listas de Docentes o Estudiantes. Atención: con ese permiso también puede usar las demás acciones de esas pantallas. Reemitir un carné (Administrador, Secretaria) sigue generando un PIN nuevo: confirmar si debe seguir así.
- **Límite de inicio de sesión y de las demás rutas con `default`:** corregido. En acceso y recuperación cuenta por IP y usuario. Probada la función con unitarias; no se probó el límite por HTTP. Con IP detrás de un proxy sigue pendiente revisar `trust proxy` (afecta a los límites generales).
- **e2e:** ya arrancan con la configuración del repositorio (`test/helpers/ia-falsa.ts`).
- **Táctil:** pestañas, ruta de navegación y eventos del calendario agrandados en pantallas táctiles.

## Regla de marcado (resuelta el 2026-11-26)

Programada: primera marca = entrada, última = salida, una sola marca = entrada, intermedias sin efecto. RF-010 V3 y RF-022 V4. En el kiosko, una doble lectura de menos de 60 s ya no crea salida (RF-010 V7). El reloj conserva su propia regla de rebote.

**Turnos (P-96, resuelto y programado el 2026-11-26):** el docente con clases se evalúa con su horario; los demás con el turno general. RF-010 V4 y RF-004 V4. Falta confirmar los detalles de P-97.

**Control diario:** `Asistencia → Control diario` (`/admin/marcaciones-hoy`): por fecha, marcas, horario esperado y clases firmadas, con el mes de cada persona. Endpoints `GET /marcaciones/control-diario` y `/control-diario/:personaId`, con el permiso de siempre. El nombre del menú en Roles y Permisos sigue siendo "Marcaciones de hoy" (viene de la base).

**Voz:** los dos kioskos dicen el nombre. Probado con voz simulada; falta oírla en el equipo del colegio.

## Reporte a la UGEL y horario del Reglamento Interno (2026-11-26)

- Programado (`RF-025` V1, `RF-004` V5, `RF-010` V5, `RF-007` V6). **Reemplaza la regla de turnos por clases**, que ahora es la variable `asistencia.docente_horario_segun_clases`, apagada.
- Migración `0036_reporte_asistencia_ugel`: aplicada en la base desechable (dos veces) y en Supabase de pruebas. **Falta en cualquier otra base.**
- Verificado: unitarias 1507/1507; e2e en base desechable 48/48; lectura en Supabase de pruebas (octubre: 54 personas en 2,8 s); PDF revisado a la vista; web en Chrome con datos simulados.
- Falta: horario real del Reglamento Interno y tolerancia; completar DRE, UGEL, director y distrito en Institución, y cargo y condición en las fichas; registrar feriados en el calendario; P-99. (La sesión real se probó después, ver abajo.)

## RF-025 V2 (aprobado y programado el 2026-11-26)

- 3T desactivado; «El personal trabaja» en el calendario y justificación de trabajo virtual; omisión por marca.
- Migración `0037_reporte_ugel_v2`: probada desde el estado anterior en la base desechable y aplicada en Supabase de pruebas. **Falta en cualquier otra base.**
- Verificado: unitarias 1514/1514; e2e en base desechable 49/49; lectura en Supabase (octubre 54 personas, noviembre 56); web con datos simulados en escritorio y móvil, claro y oscuro.
- **Antes de usar el reporte:** marcar «El personal trabaja» en las semanas de gestión; tolerancia y horario del Reglamento Interno; respuesta de la UGEL (P-99).

## Recorrido real del reporte (2026-11-26)

- Pasó con Administrador en Supabase de pruebas: semana de gestión, justificaciones, rechazos, anulación, Excel y PDF. Datos de prueba borrados.
- **Corregido:** faltaba el menú `/admin/calendario` y solo el Administrador podía registrar eventos. Migración `0039_menu_calendario`: aplicada en Supabase de pruebas; **falta en cualquier otra base**. Probado como Director (antes 403, después crea, edita y quita) y como Secretaria (sigue en 403).

## Pruebas pendientes ejecutadas (2026-11-26)

- Pasan: marcación en semana de gestión (kiosko, manual y reloj), límite de 60 por minuto del kiosko, permisos de PIN y reporte por rol, y vista móvil en tema oscuro.
- **Fallo sin corregir, conexiones:** con peticiones simultáneas la API respondió 500 (11 de 40 en una ráfaga). Causa: `EMAXCONNSESSION`, el pooler de Supabase en modo sesión admite 15 y la API abre hasta 20 (`DB_POOL_MAX` sin configurar). Una prueba aparte con tope 10 atendió 40 consultas sin errores. Falta aplicarlo y repetir la ráfaga contra la API. Contar también la conexión que escucha al reloj y otras instancias o programas conectados.
- **Sin corregir, Soporte TI:** no puede cambiar el PIN desde la web porque no tiene las listas de Docentes o Estudiantes. Asignárselas le abre otras acciones de esas pantallas: falta decidir.
- **Por revisar:** el límite del kiosko es por IP. Si todos los kioskos salen por la misma, comparten 60 por minuto.
- Siguen pendientes: kiosko, carné, voz y reloj físicos; impresión y firma.

## Falta decidir con el colegio

- Cómo corregir una entrada olvidada: si solo marcó a las 14:03, queda como entrada y no se puede registrar la de las 07:30 ni editar la marca.
- Bloqueo por PIN incorrecto (P-31): tras 15 errores, el PIN correcto funciona.
- Margen entre vías (P-44): a los 29 min es la misma asistencia; a los 30 es una salida.
- Sin turno: RF-004 dice guardar sin calcular tardanza y RF-022 dejar pendiente. El kiosko hoy rechaza.

## Sospechas revisadas (2026-11-26)

| Sospecha | Resultado |
|---|---|
| Docente con ficha de estudiante | **Confirmada y corregida.** Con la ficha de baja no podía marcar y quedaba fuera del control diario y del reporte a la UGEL. Con las dos fichas activas no puede ocurrir: la base lo impide. En Supabase de pruebas no había ningún caso |
| Dos instancias procesando el reloj | **Confirmada y corregida:** una marca registrada quedaba como «rechazada». Simulada en un solo proceso |
| Quien solo tiene salida aparece en «marcaron» y «faltan» | **No se ve en la web:** el panel antiguo solo lo usa la pestaña de estudiantes y a un estudiante no se le puede registrar salida. Por la lectura del código, `GET /marcaciones/hoy` aún podría devolverlo así para el personal (no se reprodujo). Sin cambios |
| El código del reloj se busca también en credencial, código de docente y DNI | Es el orden documentado en el código. En Supabase de pruebas no hay códigos de docente que coincidan con el DNI o código biométrico de otra persona, pero **nadie tiene código biométrico asignado**. Antes de usar el reloj real hay que asignarlos o confirmar que sus códigos son los DNI |
| 404 en un envío doble del kiosko | Sin determinar (ver la tabla de arriba) |

## Al retomar

- Los cambios están sin commit en `fix/e2e-seguimiento-docente`, mezclados con los de aprobación de kiosko. Separar por rama antes de subir (por ejemplo `fix/rf-022-marcas-simultaneas`, en SGA-API).
- La prueba de mezclas y el entorno desechable están en la carpeta temporal de la sesión (puede borrarse al reiniciar); no está incorporada al repositorio.

## Análisis del Excel del reloj (octubre 2026, recibido el 2026-11-26)

El archivo tiene datos personales: no se copia al repositorio.

- 83 personas, 74 con marcas; 936 días-persona y 1537 marcas.
- **El reloj empareja así:** entrada = primera marca del día y salida = última (comprobado en 936 de 936, incluidos los 27 días con 3 o más marcas). Las marcas intermedias no cuentan.
- Marcas por día: 40 % una sola, 57 % dos, 3 % tres o más.
- 294 días con una sola marca antes de las 11:00. 61 días con una sola marca desde las 13:00: el reloj la pone como entrada y nuestra regla actual también.
- La salida que elige hoy el sistema no es la última marca en 23 días.
- Llegada (primera marca): 567 entre 07:00 y 08:15; 139 entre 09:16 y 10:00; 68 entre 10:01 y 11:30; 97 después de las 11:30.
- Turnos del reloj: del 1 al 9 son bloques de 45 a 75 minutos entre 08:00 y 15:35 (parecen horas de clase); el resto dice 09:00-18:00. **Ninguna persona tiene turno asignado** (hoja de horarios vacía).

**Confirmado:** primera marca = entrada y última = salida; una sola marca por la tarde es entrada.

## Pruebas de extremo a extremo (2026-11-26)

- Base desechable: mezclas 28/28, vías 12/12, app 1/1.
- Supabase de pruebas (autorizado por el responsable): vías 12/12 y recorrido real desde Chrome 11/11. Se borraron los datos propios del recorrido. La API generó las sesiones de ese día para los horarios existentes (154) y se dejaron.

## Pruebas tras turnos y control diario (2026-11-26)

- Unitarias de la API 1486/1486; API y web compilan.
- Base desechable: mezclas 32/32 (T1–T4 nuevos), vías 12/12, app 1/1.
- Supabase de pruebas: vías 12/12 y lectura del control diario sin escribir: 65 personas sin repetidos, 52 con horario de clases, 13 con turno general, 154 sesiones; día 2,5 s y mes de una persona 1,1 s (desde esta máquina).
- Pantalla en Chrome con datos simulados: escritorio y móvil, claro y oscuro, sin errores ni desbordes. Falta revisarla con sesión real.
