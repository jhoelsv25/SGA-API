# RF-004: Institución, Turnos y Equipos Autorizados

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Configuración
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 8 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (roles Administrador y Soporte TI, y sus permisos).

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
- **Autorización del equipo.** Registrar un equipo no basta: alguien con el rol Soporte TI o Administrador debe ingresar **desde ese equipo** y presionar "Autorizar este equipo". El sistema guarda en el equipo una clave que lo identifica. Sin esa clave, la pantalla del kiosko no se abre.
- **Equipo de libre uso.** Un kiosko autorizado queda siempre en la pantalla de marcación o de firma, sin que nadie inicie sesión. Cada persona se identifica con su código (o QR) + PIN (`RF-010`, `RF-011`).
- **Desactivar un equipo.** Si se pierde, se daña o se reemplaza, se desactiva y deja de funcionar de inmediato. Se puede volver a autorizar.
- **Biométrico (preparado, no desarrollado).** Un reloj de huella (por ejemplo, ZKTeco) se registra como equipo de tipo `biometrico`. La descarga de sus marcaciones queda para una versión futura.
- **Quién configura.** Institución y turnos: solo el **Administrador**. Equipos: **Soporte TI** y Administrador.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Todo cambio en la institución, turnos y equipos, y cada autorización o desactivación de equipo, queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                          | Mensaje                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Datos guardados                    | "Los datos se guardaron correctamente."                                  |
| Correo inválido                    | "Ingrese un correo válido."                                              |
| Logo inválido                      | "El logo debe ser una imagen PNG o JPG de hasta 1 MB."                   |
| Horas invertidas                   | "La hora de salida debe ser posterior a la hora de entrada."             |
| Hora oficial fuera de su ventana   | "La hora oficial debe estar dentro de su ventana de marcado."            |
| Ventanas superpuestas              | "La ventana de salida debe empezar después de la ventana de entrada."    |
| Tolerancia fuera de rango          | "La tolerancia debe estar entre 0 y 60 minutos."                         |
| Turno repetido                     | "Ya existe un turno para este tipo de persona."                          |
| Sin días laborables                | "Seleccione al menos un día laborable."                                  |
| Equipo con nombre repetido         | "Ya existe un equipo con ese nombre."                                    |
| Equipo sin usuarios                | "Indique quién puede usar este equipo."                                  |
| Kiosko de sesiones mal configurado | "Un equipo de sesiones debe ser un kiosko de uso exclusivo de docentes." |
| Equipo autorizado                  | "Equipo autorizado. Ya puede usarse como kiosko."                        |
| Equipo no autorizado               | "Este equipo no está autorizado. Comuníquese con el área de TI."         |

## Requerimientos fuera de alcance (Out of Scope)

- **Registro de marcaciones y cálculo de tardanzas.** Corresponde a `RF-010`.
- **Firma de las sesiones de clase en el kiosko de sesiones.** Corresponde a `RF-011`.
- **Descarga de marcaciones desde relojes biométricos.** Preparado en el modelo; se desarrollará en una versión futura.
- **Varios turnos para un mismo tipo de persona.** No se contempla.
- **Geolocalización o geocerca.** Descartada por falta de precisión.
- **Horario de clases y feriados.** Corresponden a `RF-008` y `RF-005`.

## Acuerdos y puntos abiertos

- **Sin geolocalización (acordado).** La validez depende del equipo autorizado.
- **Tres equipos iniciales (acordado).** Kiosko Estudiantes (puerta), Kiosko Personal (afuera de secretaría) y Kiosko de Sesiones (subdirección), en PC distintas.
- **Configuración (acordado).** Turnos solo el Administrador; equipos el Soporte TI y el Administrador.
- **Biométrico (acordado).** Queda preparado para una versión futura.

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

**Dado** que mi rol no es Administrador ni Soporte TI
**Cuando** intento abrir "Institución", "Turnos" o "Equipos autorizados" por su ruta
**Entonces** el sistema no muestra esas opciones en el menú y rechaza el acceso.

---

## Reglas de validación y negocio (resumen)

- **Institución:** una sola; obligatorios Nombre, Código modular, Tipo de gestión y Dirección; correo válido; logo PNG o JPG de hasta 1 MB.
- **Sin geolocalización:** la validez la da el equipo autorizado.
- **Turnos:** uno por tipo de persona; hora oficial dentro de su ventana; salida posterior a entrada; ventana de salida después de la de entrada; tolerancia de 0 a 60; al menos un día laborable; sin efecto retroactivo.
- **Equipos:** nombre único; tipo `kiosko` o `biometrico`; propósito `marcacion` o `sesiones`; al menos un tipo de persona; los de `sesiones` son kioskos solo para docentes; número de serie único para biométricos.
- **Autorización:** se hace desde el propio equipo; sin clave válida y equipo activo, el kiosko no funciona.
- **Permisos:** institución y turnos, solo el Administrador; equipos, Soporte TI y Administrador.
- **Auditoría:** cambios en institución, turnos y equipos; autorizaciones y desactivaciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Institución · Turnos (tres tarjetas con ventanas de marcado) · Equipos autorizados (listado, formulario y botón "Autorizar este equipo") · Pantalla de equipo no autorizado. Escenarios: Guardado · Campos faltantes · Turno repetido · Ventanas inválidas · Kiosko de sesiones mal configurado · Equipo autorizado · Equipo no autorizado.
