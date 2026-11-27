# RF-004: Institución, Turnos y Equipos Autorizados

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Configuración
**Versión:** 5.0
**Fecha:** actualización v5.0: 2026-11-26 · actualización v4.0: 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 8 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (perfiles Administrador y Soporte TI, y sus permisos).

> **Cambios de la versión 5.0 sobre la 4.0 (2026-11-26):**
>
> - **El turno de docentes es el horario del Reglamento Interno** y se aplica a todos los docentes, salvo que se active el horario según clases (`RF-010` V5). Esto reemplaza la regla de la versión 4.0.
> - **Siete variables nuevas** del módulo Asistencia (Historia de Usuario 4), sustentadas en la RSG 326-2017-MINEDU.

> **Cambios de la versión 4.0 sobre la 3.0 (2026-11-26):**
>
> - **No se configura un turno por docente:** el docente con clases se evalúa con su horario (`RF-010` V4). El turno de docentes queda como turno general: aporta la tolerancia y los márgenes de las ventanas, y es el horario del docente sin clases ese día.

> **Cambios de la versión 3.0 sobre la 2.0 (variables de los requerimientos nuevos, 2026-11-09):**
>
> - **Nuevas variables del sistema (v3.0):** se dan de alta once variables con su valor por defecto, que definen `RF-011` V3 (alertas y justificaciones de sesiones), `RF-013` V2 (horas pedagógicas y consolidado) y `RF-023` V1 (observación de aula). Ver el catálogo en la Historia de Usuario 4.
> - **Sin cambios en lo demás:** institución, turnos, equipos, reglas de las variables (historial, motivo, sin efecto retroactivo) y auditoría.
> - **Pendiente nuevo:** P-75.

> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
>
> - **Variables del sistema (P-10):** nueva historia para administrar todos los valores configurables (tolerancias, plazos, límites, pesos) en una sola tabla, con historial de cambios.

## Consideraciones y supuestos de negocio

- **Propósito.** Registrar los datos del colegio, los horarios de entrada y salida con los que se calculan las tardanzas (`RF-010`) y los equipos autorizados donde se marca la asistencia y se firman las sesiones de clase (`RF-011`).
- **Un solo colegio.** El sistema atiende a una sola institución. Sus datos se editan; no se crean ni se eliminan colegios.
- **Datos de la institución.**

  | Dato                                | Obligatorio | Observación                           |
  | ----------------------------------- | ----------- | ------------------------------------- |
  | Nombre                              | Sí          | Aparece en la cabecera y los reportes |
  | Código modular                      | Sí          | Código del MINEDU                     |
  | Código de local                     | No          |                                       |
  | Tipo de gestión                     | Sí          | `publica`, `privada` o `convenio`     |
  | UGEL / DRE                          | No          |                                       |
  | Director                            | No          | Nombre que firma los reportes         |
  | Dirección                           | Sí          |                                       |
  | Distrito / Provincia / Departamento | No          |                                       |
  | Teléfono / Correo                   | No          | Correo con formato válido             |
  | Logo                                | No          | Imagen PNG o JPG de hasta 1 MB        |

- **Sin geolocalización.** La ubicación del celular no es confiable en el colegio. La validez de una marcación o de una firma de sesión depende de que se haga en un **equipo autorizado** dentro del colegio, no del GPS.
- **Turnos: uno por tipo de persona.** Hay exactamente tres turnos posibles: **Estudiantes**, **Docentes** y **Administrativos**. No se puede crear un segundo turno para el mismo tipo.
- **Datos del turno.**

  | Dato                               | Ejemplo (Docentes) | Regla                                                                                                 |
  | ---------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
  | Hora oficial de entrada            | 07:45              |                                                                                                       |
  | Ventana de entrada (desde – hasta) | 06:30 – 09:30      | La hora oficial debe estar dentro de la ventana                                                       |
  | Hora oficial de salida             | 13:15              | Posterior a la hora de entrada                                                                        |
  | Ventana de salida (desde – hasta)  | 12:30 – 15:00      | La hora oficial debe estar dentro de la ventana; empieza después de que termina la ventana de entrada |
  | Tolerancia                         | 10 minutos         | De 0 a 60                                                                                             |
  | Días laborables                    | Lunes a viernes    | Al menos uno                                                                                          |

- **Cómo se usa el turno** (`RF-010`). Entrada hasta _hora oficial + tolerancia_: **A tiempo**. Después: **Tardanza**, con sus minutos. Salida antes de la hora oficial: **Salida anticipada**. Marcación fuera de las ventanas: **Fuera de horario**.
- **Cambios sin efecto retroactivo.** Cambiar un turno afecta solo a las marcaciones nuevas; las ya registradas conservan su resultado.
- **Turno inactivo.** Si el turno de un tipo está inactivo o no existe, las marcaciones de ese tipo se guardan sin calcular tardanza.
- **Equipos autorizados.** Solo en un equipo registrado y autorizado se puede marcar o firmar sesiones. Cada equipo tiene:

  | Dato               | Valores                                                                              |
  | ------------------ | ------------------------------------------------------------------------------------ |
  | Nombre y ubicación | Ej. "Kiosko Estudiantes" — Puerta principal                                          |
  | Tipo               | `kiosko` (PC o tablet con la pantalla del sistema) o `biometrico` (reloj de huella)  |
  | Propósito          | `marcacion` (entrada y salida del colegio) o `sesiones` (firma de sesiones de clase) |
  | Quién puede usarlo | Estudiantes, Docentes y/o Administrativos                                            |
  | Número de serie    | Solo para biométricos                                                                |

- **Equipos del colegio.** La configuración inicial prevista es:

  | Equipo             | Ubicación                          | Propósito   | Quién lo usa               |
  | ------------------ | ---------------------------------- | ----------- | -------------------------- |
  | Kiosko Estudiantes | Puerta principal                   | `marcacion` | Estudiantes                |
  | Kiosko Personal    | Afuera de la oficina de secretaría | `marcacion` | Docentes y administrativos |
  | Kiosko de Sesiones | Subdirección                       | `sesiones`  | Solo docentes              |

- **Kiosko de sesiones.** Un equipo con propósito `sesiones` es siempre de tipo `kiosko` y solo lo usan los docentes.
- **Autorización del equipo.** Registrar un equipo no basta: alguien con el perfil Soporte TI o Administrador debe ingresar **desde ese equipo** y presionar "Autorizar este equipo". El sistema guarda en el equipo una clave que lo identifica. Sin esa clave, la pantalla del kiosko no se abre.
- **Equipo de libre uso.** Un kiosko autorizado queda siempre en la pantalla de marcación o de firma, sin que nadie inicie sesión. Cada persona se identifica con su código (o QR) + PIN (`RF-010`, `RF-011`).
- **Desactivar un equipo.** Si se pierde, se daña o se reemplaza, se desactiva y deja de funcionar de inmediato. Se puede volver a autorizar.
- **Biométrico (preparado, no desarrollado).** Un reloj de huella (por ejemplo, ZKTeco) se registra como equipo de tipo `biometrico`. La descarga de sus marcaciones queda para una versión futura.
- **Quién configura.** Institución y turnos: solo el **Administrador**. Equipos: **Soporte TI** y Administrador.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Todo cambio en la institución, turnos y equipos, y cada autorización o desactivación de equipo, queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                       | Mensaje                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Datos guardados                                 | "Los datos se guardaron correctamente."                                  |
| Correo inválido                                 | "Ingrese un correo válido."                                              |
| Logo inválido                                   | "El logo debe ser una imagen PNG o JPG de hasta 1 MB."                   |
| Horas invertidas                                | "La hora de salida debe ser posterior a la hora de entrada."             |
| Hora oficial fuera de su ventana                | "La hora oficial debe estar dentro de su ventana de marcado."            |
| Ventanas superpuestas                           | "La ventana de salida debe empezar después de la ventana de entrada."    |
| Tolerancia fuera de rango                       | "La tolerancia debe estar entre 0 y 60 minutos."                         |
| Turno repetido                                  | "Ya existe un turno para este tipo de persona."                          |
| Sin días laborables                             | "Seleccione al menos un día laborable."                                  |
| Equipo con nombre repetido                      | "Ya existe un equipo con ese nombre."                                    |
| Equipo sin usuarios                             | "Indique quién puede usar este equipo."                                  |
| Kiosko de sesiones mal configurado              | "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes." |
| Equipo autorizado                               | "Equipo autorizado. Ya puede usarse como kiosko."                        |
| Equipo no autorizado                            | "Este equipo no está autorizado. Comuníquese con el área de TI."         |
| Valor fuera de rango (v2.0)                     | "El valor debe estar entre 0 y 60."                                      |
| Tipo inválido (v2.0)                            | "Ingrese un número entero."                                              |
| Cambio sin motivo (v2.0)                        | "Indique el motivo del cambio."                                          |
| Pesos que no suman 100 (v2.0)                   | "Los pesos de la nota deben sumar 100 %."                                |
| Cantidad de observaciones fuera de rango (v3.0) | "El valor debe estar entre 2 y 3."                                       |

## Requerimientos fuera de alcance (Out of Scope)

- **Registro de marcaciones y cálculo de tardanzas.** Corresponde a `RF-010`.
- **Firma de las sesiones de clase en el kiosko de sesiones.** Corresponde a `RF-011`.
- **Descarga de marcaciones desde relojes biométricos.** Preparado en el modelo; se desarrollará en una versión futura.
- **Varios turnos para un mismo tipo de persona.** No se contempla.
- **Geolocalización o geocerca.** Descartada por falta de precisión.
- **Horario de clases y feriados.** Corresponden a `RF-008` y `RF-005`.

## Acuerdos y puntos abiertos

- **Variables del sistema (acordado, P-10).** Todo valor configurable se administra en la tabla de variables, con historial.
- **P-75 (v3.0, pendiente).** Mínimos y máximos de las variables nuevas (salvo `observacion.cantidad_objetivo_anual`, de 2 a 3). Supuesto: enteros no negativos, sin máximo.

* **Sin geolocalización (acordado).** La validez depende del equipo autorizado.
* **Tres equipos iniciales (acordado).** Kiosko Estudiantes (puerta), Kiosko Personal (afuera de secretaría) y Kiosko de Sesiones (subdirección), en PC distintas.
* **Configuración (acordado).** Turnos solo el Administrador; equipos el Soporte TI y el Administrador.
* **Biométrico (acordado).** Queda preparado para una versión futura.

## Historia de Usuario 1: Datos de la institución

**Como** Administrador
**Quiero** registrar y actualizar los datos del colegio
**Para** que aparezcan correctamente en el sistema y en los reportes.

### Escenario: Actualizar los datos

**Dado** que estoy en "Institución"
**Cuando** completo los datos obligatorios y presiono "Guardar"
**Entonces** el sistema guarda los cambios, los registra en la bitácora y muestra "Los datos se guardaron correctamente."

### Escenario: Campos obligatorios incompletos

**Dado** que estoy en "Institución"
**Cuando** intento guardar sin nombre, código modular, tipo de gestión o dirección
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Correo inválido

**Dado** que estoy en "Institución"
**Cuando** ingreso un correo sin formato válido
**Entonces** el sistema impide guardar y muestra "Ingrese un correo válido."

### Escenario: Subir el logo

**Dado** que estoy en "Institución"
**Cuando** subo una imagen PNG de 300 KB y guardo
**Entonces** el sistema usa el logo en la cabecera y en los reportes.

### Escenario: Logo inválido

**Dado** que estoy en "Institución"
**Cuando** subo un archivo PDF o una imagen de más de 1 MB
**Entonces** el sistema rechaza el archivo y muestra "El logo debe ser una imagen PNG o JPG de hasta 1 MB."

## Historia de Usuario 2: Turnos de marcación

**Como** Administrador
**Quiero** definir la hora oficial, las ventanas de marcado y la tolerancia de estudiantes, docentes y administrativos
**Para** que el sistema calcule tardanzas, salidas anticipadas y marcaciones fuera de horario.

### Escenario: Registrar el turno de docentes

**Dado** que no existe turno para Docentes
**Cuando** registro entrada 07:45 (ventana 06:30 – 09:30), salida 13:15 (ventana 12:30 – 15:00), tolerancia 10 minutos, de lunes a viernes, y guardo
**Entonces** el sistema crea el turno activo de Docentes.

### Escenario: Turno repetido

**Dado** que ya existe el turno de Docentes
**Cuando** intento crear otro turno para Docentes
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un turno para este tipo de persona."

### Escenario: Horas invertidas

**Dado** que estoy registrando un turno
**Cuando** ingreso una hora de salida anterior o igual a la de entrada
**Entonces** el sistema impide guardar y muestra "La hora de salida debe ser posterior a la hora de entrada."

### Escenario: Hora oficial fuera de su ventana

**Dado** que estoy registrando un turno
**Cuando** ingreso entrada 07:45 con una ventana de entrada de 08:00 a 09:30
**Entonces** el sistema impide guardar y muestra "La hora oficial debe estar dentro de su ventana de marcado."

### Escenario: Ventanas superpuestas

**Dado** que estoy registrando un turno
**Cuando** la ventana de salida empieza antes de que termine la ventana de entrada
**Entonces** el sistema impide guardar y muestra "La ventana de salida debe empezar después de la ventana de entrada."

### Escenario: Tolerancia fuera de rango

**Dado** que estoy registrando un turno
**Cuando** ingreso una tolerancia de 90 minutos
**Entonces** el sistema impide guardar y muestra "La tolerancia debe estar entre 0 y 60 minutos."

### Escenario: Sin días laborables

**Dado** que estoy registrando un turno
**Cuando** desmarco todos los días
**Entonces** el sistema impide guardar y muestra "Seleccione al menos un día laborable."

### Escenario: Cambiar un turno

**Dado** que el turno de Estudiantes tiene entrada a las 07:45
**Cuando** la cambio a las 08:00 y guardo
**Entonces** las marcaciones nuevas se calculan con 08:00
**Y** las marcaciones ya registradas conservan su resultado.

### Escenario: El turno de docentes como turno general (v4.0)

**Dado** que el turno de docentes es 07:45 a 13:30 con ventana de entrada desde las 06:00
**Cuando** un docente tiene su primera clase a las 11:00
**Entonces** su ventana de entrada empieza a las 09:15
**Y** la pantalla de turnos explica que es el horario del Reglamento Interno y cómo activar el horario según clases (v5.0).

### Escenario: Desactivar un turno

**Dado** que el turno de Administrativos está activo
**Cuando** lo desactivo y confirmo
**Entonces** las marcaciones de administrativos se registran sin calcular tardanza hasta que se reactive.

## Historia de Usuario 3: Equipos autorizados

**Como** Soporte TI
**Quiero** registrar y autorizar los equipos donde se marca la asistencia y se firman las sesiones
**Para** que solo se pueda marcar o firmar dentro del colegio, en equipos controlados.

### Escenario: Registrar un kiosko de marcación

**Dado** que estoy en "Equipos autorizados"
**Cuando** registro "Kiosko Estudiantes", ubicación "Puerta principal", tipo `kiosko`, propósito `marcacion`, usado por Estudiantes, y guardo
**Entonces** el sistema crea el equipo activo y pendiente de autorizar.

### Escenario: Registrar el kiosko de sesiones

**Dado** que estoy en "Equipos autorizados"
**Cuando** registro "Kiosko de Sesiones", ubicación "Subdirección", tipo `kiosko`, propósito `sesiones`, usado por Docentes, y guardo
**Entonces** el sistema crea el equipo activo y pendiente de autorizar.

### Escenario: Kiosko de sesiones mal configurado

**Dado** que estoy registrando un equipo con propósito `sesiones`
**Cuando** marco que también lo usan los estudiantes, o elijo el tipo `biometrico`
**Entonces** el sistema impide guardar y muestra "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes."

### Escenario: Equipo sin usuarios

**Dado** que estoy registrando un equipo
**Cuando** no marco a nadie en "Quién puede usarlo"
**Entonces** el sistema impide guardar y muestra "Indique quién puede usar este equipo."

### Escenario: Nombre de equipo repetido

**Dado** que ya existe un equipo llamado "Kiosko Estudiantes"
**Cuando** intento registrar otro con el mismo nombre
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un equipo con ese nombre."

### Escenario: Autorizar un equipo

**Dado** que inicié sesión como Soporte TI en la PC de la subdirección
**Cuando** elijo el equipo "Kiosko de Sesiones" y presiono "Autorizar este equipo"
**Entonces** el sistema guarda en esa PC su clave de autorización, registra quién y cuándo la autorizó, y muestra "Equipo autorizado. Ya puede usarse como kiosko."
**Y** cierra mi sesión, dejando la PC en la pantalla del kiosko de sesiones.

### Escenario: Abrir el kiosko en un equipo no autorizado

**Dado** que una PC no tiene la clave de un equipo autorizado y activo
**Cuando** alguien abre la pantalla del kiosko
**Entonces** el sistema no permite marcar ni firmar y muestra "Este equipo no está autorizado. Comuníquese con el área de TI."

### Escenario: Desactivar un equipo

**Dado** que el "Kiosko Personal" está activo y autorizado
**Cuando** lo desactivo y confirmo
**Entonces** el equipo deja de funcionar de inmediato y muestra "Este equipo no está autorizado. Comuníquese con el área de TI."

### Escenario: Registrar un reloj biométrico

**Dado** que estoy en "Equipos autorizados"
**Cuando** registro un equipo de tipo `biometrico` con su número de serie
**Entonces** el sistema lo guarda como equipo de marcación
**Y** queda listo para la integración de una versión futura.

### Escenario: Usuario sin permiso

**Dado** que mi perfil no es Administrador ni Soporte TI
**Cuando** intento abrir "Institución", "Turnos" o "Equipos autorizados" por su ruta
**Entonces** el sistema no muestra esas opciones en el menú y rechaza el acceso.

## Historia de Usuario 4: Variables del sistema (v2.0)

**Como** Administrador
**Quiero** cambiar los valores configurables del sistema desde una sola pantalla
**Para** adaptar tolerancias, plazos y límites sin modificar el sistema.

> **Reglas (v2.0).** Cada variable tiene código, descripción, módulo, tipo (`texto`, `entero`, `decimal`, `booleano`, `fecha`, `hora`, `lista`), valor, unidad y, si aplica, mínimo y máximo. Un cambio **no sobrescribe**: crea un valor nuevo vigente y el anterior queda con **vigencia 0**, con quién, cuándo y el motivo. Hay variables de solo lectura. Los cambios rigen desde ese momento, sin efecto retroactivo. Ejemplos: `sesion.tolerancia_ingreso_min` (15), `ausencia.plazo_descargo_dias` (7), `material.dias_planificacion` (7), `nota.peso_examen` (25 %).

> **Variables nuevas (v3.0).** Se dan de alta con estos valores por defecto, tomados de los requerimientos que las definen. Todas son editables, con historial y sin efecto retroactivo.
>
> | Variable                                       | Módulo              | Tipo     | Valor por defecto                                     | Unidad                                  | Descripción                                                                                                  | Origen      |
> | ---------------------------------------------- | ------------------- | -------- | ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
> | `sesion.alerta_salida_minutos`                 | Sesiones            | `entero` | 10                                                    | minutos                                 | Minutos antes del fin del bloque en que se alerta una sesión `en_curso` sin firma de salida                  | `RF-011` V3 |
> | `sesion.alerta_minutos_perdidos_umbral`        | Sesiones            | `entero` | 45                                                    | minutos                                 | Minutos perdidos en el día a partir de los cuales se alerta al docente; 0 desactiva la alerta                | `RF-011` V3 |
> | `sesion.alerta_minutos_perdidos_umbral_semana` | Sesiones            | `entero` | 120                                                   | minutos                                 | Minutos perdidos en la semana (lunes a viernes) a partir de los cuales se alerta; 0 desactiva la alerta      | `RF-011` V3 |
> | `sesion.justificacion_aviso_dias`              | Sesiones            | `entero` | 3                                                     | días hábiles                            | Días sin respuesta tras los cuales una solicitud de justificación se marca "Vencida" y se avisa al aprobador | `RF-011` V3 |
> | `sesion.justificacion_motivos_con_documento`   | Sesiones            | `lista`  | `descanso_medico`, `comision_de_servicio`, `licencia` | —                                       | Motivos de justificación que exigen adjuntar documento                                                       | `RF-011` V3 |
> | `sesion.permisos_personales_max_anio`          | Sesiones            | `entero` | 3                                                     | días por año lectivo                    | Tope de días de permiso personal por docente; al superarlo se avisa y se pide confirmar, sin bloquear        | `RF-011` V3 |
> | `sesion.minutos_hora_pedagogica`               | Sesiones            | `entero` | 45                                                    | minutos                                 | Duración de una hora pedagógica para mostrar horas programadas, dictadas y perdidas                          | `RF-013` V2 |
> | `consolidado.dias_para_decidir`                | Consolidado         | `entero` | 0                                                     | días                                    | Días de gracia para que el Director decida un consolidado antes de contarlo "sin decisión"                   | `RF-013` V2 |
> | `observacion.anticipacion_minima_dias`         | Observación de aula | `entero` | 2                                                     | días                                    | Anticipación mínima con que se avisa al docente de una observación                                           | `RF-023` V1 |
> | `observacion.cantidad_objetivo_anual`          | Observación de aula | `entero` | 2 (mínimo 2, máximo 3)                                | observaciones por docente y año lectivo | Meta de observaciones por docente; no impide programar más ni menos                                          | `RF-023` V1 |
> | `observacion.plazo_descargo_dias`              | Observación de aula | `entero` | 7                                                     | días calendario                         | Plazo del docente para dejar su comentario tras la retroalimentación                                         | `RF-023` V1 |
>
> `RF-020` V2 no define variables nuevas (sus metas y plazos de los indicadores de apoyo quedan pendientes en su P-55 y P-58). Las variables de `RF-011` V2 (`sesion.minutos_antes_firma_ingreso`, `sesion.tolerancia_ingreso_min`, `sesion.tolerancia_salida_min`, `sesion.salida_automatica_sin_firma`) siguen como estaban. Mínimos y máximos de las nuevas, salvo `observacion.cantidad_objetivo_anual`: _P-75_.

### Escenario: Ver las variables (v2.0)

**Dado** que soy Administrador
**Cuando** abro "Variables del sistema"
**Entonces** veo las variables agrupadas por módulo con su valor vigente, unidad y última modificación.

### Escenario: Cambiar una variable (v2.0)

**Dado** que la tolerancia de ingreso a la sesión es 15 minutos
**Cuando** la cambio a 10 con el motivo "Acuerdo de dirección" y guardo
**Entonces** el valor 10 queda vigente, el 15 queda con vigencia 0 en el historial con quién y cuándo, y se aplica a las firmas nuevas.

### Escenario: Valor fuera de rango (v2.0)

**Dado** que la tolerancia admite de 0 a 60 minutos
**Cuando** ingreso 90
**Entonces** el sistema impide guardar y muestra "El valor debe estar entre 0 y 60."

### Escenario: Tipo de dato inválido (v2.0)

**Dado** que la variable es de tipo `entero`
**Cuando** ingreso "diez"
**Entonces** el sistema impide guardar y muestra "Ingrese un número entero."

### Escenario: Cambio sin motivo (v2.0)

**Dado** que estoy cambiando una variable
**Cuando** guardo sin motivo
**Entonces** el sistema impide guardar y muestra "Indique el motivo del cambio."

### Escenario: Pesos que no suman 100 (v2.0)

**Dado** que los pesos de la nota del aula virtual suman 100 %
**Cuando** cambio el peso de examen a 40 sin ajustar los demás
**Entonces** el sistema impide guardar y muestra "Los pesos de la nota deben sumar 100 %."

### Escenario: Variables nuevas con su valor por defecto (v3.0)

**Dado** que soy Administrador y el sistema tiene la carga inicial
**Cuando** abro "Variables del sistema"
**Entonces** veo `sesion.alerta_salida_minutos` en 10, `sesion.alerta_minutos_perdidos_umbral` en 45, `sesion.alerta_minutos_perdidos_umbral_semana` en 120, `sesion.justificacion_aviso_dias` en 3, `sesion.permisos_personales_max_anio` en 3, `sesion.minutos_hora_pedagogica` en 45, `consolidado.dias_para_decidir` en 0, `observacion.anticipacion_minima_dias` en 2, `observacion.cantidad_objetivo_anual` en 2 y `observacion.plazo_descargo_dias` en 7
**Y** `sesion.justificacion_motivos_con_documento` con `descanso_medico`, `comision_de_servicio` y `licencia`.

### Escenario: Cambiar una variable nueva (v3.0)

**Dado** que `sesion.minutos_hora_pedagogica` es 45
**Cuando** la cambio a 60 con el motivo "Cambio de jornada" y guardo
**Entonces** el valor 60 queda vigente y el 45 queda con vigencia 0 en el historial
**Y** solo afecta a los consolidados que se generen o cierren después.

### Escenario: Umbral en 0 desactiva la alerta (v3.0)

**Dado** que `sesion.alerta_minutos_perdidos_umbral` es 45
**Cuando** lo cambio a 0 con su motivo y guardo
**Entonces** el sistema acepta el valor y deja de generar la alerta de minutos perdidos del día.

### Escenario: Cantidad de observaciones fuera de rango (v3.0)

**Dado** que `observacion.cantidad_objetivo_anual` admite de 2 a 3
**Cuando** ingreso 4
**Entonces** el sistema impide guardar y muestra "El valor debe estar entre 2 y 3."

### Escenario: Variable nueva con tipo inválido (v3.0)

**Dado** que `sesion.alerta_salida_minutos` es de tipo `entero`
**Cuando** ingreso "diez"
**Entonces** el sistema impide guardar y muestra "Ingrese un número entero."

### Escenario: Historial de una variable (v2.0)

**Dado** que una variable cambió varias veces
**Cuando** abro su historial
**Entonces** veo cada valor con quién lo cambió, cuándo, el motivo y cuál es el vigente.

### Escenario: Variable de solo lectura (v2.0)

**Dado** que una variable está marcada como no editable
**Cuando** la abro
**Entonces** el sistema la muestra sin opción de editar.

---

### Escenario: Variables de asistencia docente con su valor por defecto (v5.0)

> | Variable | Tipo | Valor por defecto | Para qué | Sustento (RSG 326-2017) |
> | --- | --- | --- | --- | --- |
> | `asistencia.docente_horario_segun_clases` | `booleano` | `false` | Horario del docente según sus clases en lugar del Reglamento Interno | 5.2.7 |
> | `asistencia.tardanzas_para_inasistencia` | `entero` (0 a 31) | 3 | Tardanza del mes que sale como 3T; 0 lo desactiva | 6.3.1.2 |
> | `asistencia.marca_incompleta_es_inasistencia` | `booleano` | `true` | Sin ingreso, sin salida o salida anticipada sin justificar cuenta como inasistencia en el reporte | 5.3.2 |
> | `asistencia.omisiones_justificables_mes` | `entero` (0 a 31) | 1 | Omisiones justificables por persona al mes | 6.1.5 |
> | `asistencia.horas_para_justificar_omision` | `entero` (1 a 720) | 24 | Plazo para presentar el sustento de una omisión | 6.1.5 |
> | `asistencia.reporte_nivel_modalidad` | `texto` | EBR - Secundaria | Encabezado de los Anexos 03 y 04 | Anexos 03 y 04 |
> | `asistencia.reporte_turno` | `texto` | Mañana | Encabezado de los Anexos 03 y 04 | Anexos 03 y 04 |

**Dado** que se actualiza una instalación existente
**Cuando** se aplica la actualización de la base de datos, incluso más de una vez
**Entonces** cada variable de la tabla existe una sola vez con su valor por defecto.

## Reglas de validación y negocio (resumen)

- **Institución:** una sola; obligatorios Nombre, Código modular, Tipo de gestión y Dirección; correo válido; logo PNG o JPG de hasta 1 MB.
- **Sin geolocalización:** la validez la da el equipo autorizado.
- **Turnos:** uno por tipo de persona; hora oficial dentro de su ventana; salida posterior a entrada; ventana de salida después de la de entrada; tolerancia de 0 a 60; al menos un día laborable; sin efecto retroactivo.
- **Equipos:** nombre único; tipo `kiosko` o `biometrico`; propósito `marcacion` o `sesiones`; al menos un tipo de persona; los de `sesiones` son kioskos solo para docentes; número de serie único para biométricos.
- **Autorización:** se hace desde el propio equipo; sin clave válida y equipo activo, el kiosko no funciona.
- **Permisos:** institución y turnos, solo el Administrador; equipos, Soporte TI y Administrador.
- **Variables del sistema (v3.0):** once variables nuevas con su valor por defecto (`sesion.*` de `RF-011` V3 y `RF-013` V2, `consolidado.dias_para_decidir`, `observacion.*` de `RF-023` V1); valor del tipo de la variable; `observacion.cantidad_objetivo_anual` solo de 2 a 3; motivo obligatorio; historial con vigencia 0.
- **Auditoría:** cambios en institución, turnos y equipos; autorizaciones y desactivaciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Institución · Turnos (tres tarjetas con ventanas de marcado) · Equipos autorizados (listado, formulario y botón "Autorizar este equipo") · Pantalla de equipo no autorizado. Escenarios: Guardado · Campos faltantes · Turno repetido · Ventanas inválidas · Kiosko de sesiones mal configurado · Equipo autorizado · Equipo no autorizado.
