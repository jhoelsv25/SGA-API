# RF-001: Acceso al Sistema

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 8 hh (IA Agéntica)
**Prerrequisitos:** Ninguno. Las cuentas y su rol se crean en `RF-002`.

## Consideraciones y supuestos de negocio

- **Propósito.** Permitir que cada miembro de la comunidad educativa (administrador, director, secretaria, docente, estudiante y apoderado) entre al sistema con su propia cuenta y vea solo lo que su rol permite.
- **Una cuenta por persona.** Toda cuenta pertenece a una persona del padrón y tiene un único rol. El inicio de sesión se hace con **Nombre de usuario** y **Contraseña**.
- **Estados de la cuenta.** Solo una cuenta `activo` puede iniciar sesión. Una cuenta `bloqueado` o `inactivo` es rechazada con su propio mensaje.
- **Mensaje genérico ante credenciales incorrectas.** Si el usuario no existe o la contraseña no coincide, el sistema muestra el mismo mensaje, para no revelar qué usuarios existen.
- **Bloqueo por intentos fallidos.** Tras **5 intentos fallidos consecutivos** la cuenta pasa a `bloqueado`. Un inicio de sesión exitoso reinicia el contador. Solo el Administrador puede desbloquear (`RF-002`). _(Supuesto: 5 intentos.)_
- **Cambio obligatorio de contraseña.** Una cuenta nueva o con la contraseña restablecida por el Administrador debe cambiarla en su primer ingreso, antes de usar cualquier otra opción.
- **Política de contraseña.** Mínimo 8 caracteres, con al menos una letra y un número, y distinta de la contraseña actual. _(Supuesto.)_
- **Contraseñas cifradas.** La contraseña se guarda solo como hash; nunca se muestra ni se envía en texto plano.
- **Recuperación de contraseña.** El usuario con correo registrado en su ficha puede pedir un enlace de restablecimiento, válido por **30 minutos** y de un solo uso. Quien no tiene correo debe pedir al Administrador que restablezca su contraseña (`RF-002`). _(Supuesto: 30 minutos.)_
- **Sesiones.** Cada ingreso crea una sesión con fecha y hora de inicio, dirección IP y navegador. La sesión expira tras **30 minutos sin actividad**. _(Supuesto.)_ Un usuario puede tener sesiones abiertas en varios dispositivos.
- **Mis sesiones.** El usuario puede ver sus sesiones abiertas y cerrar cualquiera de ellas, o todas menos la actual.
- **Menú según rol.** Al ingresar, el usuario ve el menú que corresponde a los permisos de su rol (`RF-002`).
- **Operación 100% en línea.** Sin conexión no se puede iniciar sesión.
- **Auditoría inmutable.** Cada inicio de sesión exitoso, cierre de sesión, bloqueo de cuenta y cambio de contraseña queda registrado en la bitácora (`RF-003`) con usuario, IP y la hora del servidor.

## Mensajes del requerimiento

| Situación                        | Mensaje                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Credenciales incorrectas         | "Usuario o contraseña incorrectos."                                                            |
| Cuenta bloqueada                 | "Su cuenta está bloqueada. Comuníquese con el administrador."                                  |
| Cuenta inactiva                  | "Su cuenta está inactiva. Comuníquese con el administrador."                                   |
| Contraseña no cumple la política | "La contraseña debe tener al menos 8 caracteres, con letras y números."                        |
| Confirmación distinta            | "Las contraseñas no coinciden."                                                                |
| Contraseña igual a la actual     | "La nueva contraseña debe ser distinta de la actual."                                          |
| Recuperación solicitada          | "Si el usuario tiene un correo registrado, recibirá un enlace para restablecer su contraseña." |
| Enlace vencido o usado           | "El enlace no es válido o ya venció. Solicite uno nuevo."                                      |
| Sesión expirada                  | "Su sesión expiró por inactividad. Ingrese nuevamente."                                        |

## Requerimientos fuera de alcance (Out of Scope)

- **Creación de cuentas, asignación de rol, desbloqueo y restablecimiento por el Administrador.** Corresponde a `RF-002`.
- **Consulta de la bitácora.** Corresponde a `RF-003`.
- **Inicio de sesión con Google, Microsoft u otros proveedores externos.** No se contempla.
- **Doble factor de autenticación (2FA).** No se contempla.
- **Ingreso al kiosko de marcación con QR/PIN.** No es un inicio de sesión; corresponde a `RF-010`.

## Acuerdos y puntos abiertos

- **Valores por confirmar.** Número de intentos (5), vigencia del enlace (30 min), expiración por inactividad (30 min) y política de contraseña. Si se aprueban, quedan como parámetros del sistema.
- **Formato del nombre de usuario.** Por definir en `RF-002`: se propone el DNI para docentes y personal, y el código SIAGIE para estudiantes.

## Historia de Usuario 1: Inicio de sesión

**Como** miembro de la comunidad educativa (Administrador, Director, Secretaria, Docente, Estudiante o Apoderado)
**Quiero** ingresar con mi usuario y contraseña
**Para** acceder a las opciones que me corresponden.

### Escenario: Ingreso exitoso

**Dado** que tengo una cuenta `activo` y no debo cambiar mi contraseña
**Cuando** ingreso mi nombre de usuario y contraseña correctos y presiono "Ingresar"
**Entonces** el sistema crea mi sesión, reinicia mi contador de intentos fallidos y registra la fecha de último acceso
**Y** me muestra la pantalla de inicio con el menú de mi rol.

### Escenario: Credenciales incorrectas

**Dado** que estoy en la pantalla de inicio de sesión
**Cuando** ingreso un usuario inexistente o una contraseña incorrecta
**Entonces** el sistema rechaza el ingreso y muestra "Usuario o contraseña incorrectos."
**Y** si el usuario existe, suma un intento fallido a su cuenta.

### Escenario: Bloqueo al quinto intento fallido

**Dado** que mi cuenta tiene 4 intentos fallidos consecutivos
**Cuando** vuelvo a ingresar una contraseña incorrecta
**Entonces** el sistema cambia mi cuenta a `bloqueado`, registra el bloqueo en la bitácora y muestra "Su cuenta está bloqueada. Comuníquese con el administrador."

### Escenario: Cuenta bloqueada

**Dado** que mi cuenta está `bloqueado`
**Cuando** intento ingresar, incluso con la contraseña correcta
**Entonces** el sistema rechaza el ingreso y muestra "Su cuenta está bloqueada. Comuníquese con el administrador."

### Escenario: Cuenta inactiva

**Dado** que mi cuenta está `inactivo`
**Cuando** intento ingresar
**Entonces** el sistema rechaza el ingreso y muestra "Su cuenta está inactiva. Comuníquese con el administrador."

### Escenario: Campos vacíos

**Dado** que estoy en la pantalla de inicio de sesión
**Cuando** presiono "Ingresar" sin usuario o sin contraseña
**Entonces** el sistema impide el envío y señala el campo faltante.

### Escenario: Sin conexión

**Dado** que no hay conexión con el servidor
**Cuando** presiono "Ingresar"
**Entonces** el sistema muestra un error de conexión con la opción "Reintentar" y no crea ninguna sesión.

## Historia de Usuario 2: Cambio de contraseña

**Como** usuario del sistema
**Quiero** cambiar mi contraseña
**Para** mantener segura mi cuenta, y cumplir el cambio obligatorio del primer ingreso.

### Escenario: Cambio obligatorio en el primer ingreso

**Dado** que mi cuenta debe cambiar la contraseña
**Cuando** ingreso con mis credenciales correctas
**Entonces** el sistema me lleva directamente a la pantalla "Cambiar contraseña"
**Y** no me permite usar ninguna otra opción hasta completar el cambio.

### Escenario: Cambio exitoso

**Dado** que estoy en "Cambiar contraseña"
**Cuando** ingreso mi contraseña actual, una nueva que cumple la política y su confirmación, y presiono "Guardar"
**Entonces** el sistema guarda la nueva contraseña cifrada, desmarca el cambio obligatorio, registra el cambio en la bitácora y cierra mis demás sesiones abiertas.

### Escenario: Contraseña actual incorrecta

**Dado** que estoy en "Cambiar contraseña"
**Cuando** ingreso una contraseña actual que no coincide
**Entonces** el sistema rechaza el cambio y muestra "Usuario o contraseña incorrectos."

### Escenario: Nueva contraseña débil

**Dado** que estoy en "Cambiar contraseña"
**Cuando** ingreso una nueva contraseña con menos de 8 caracteres o sin letras o sin números
**Entonces** el sistema impide guardar y muestra "La contraseña debe tener al menos 8 caracteres, con letras y números."

### Escenario: Confirmación distinta

**Dado** que estoy en "Cambiar contraseña"
**Cuando** la confirmación no coincide con la nueva contraseña
**Entonces** el sistema impide guardar y muestra "Las contraseñas no coinciden."

### Escenario: Nueva contraseña igual a la actual

**Dado** que estoy en "Cambiar contraseña"
**Cuando** ingreso como nueva la misma contraseña actual
**Entonces** el sistema impide guardar y muestra "La nueva contraseña debe ser distinta de la actual."

## Historia de Usuario 3: Recuperación de contraseña

**Como** usuario que olvidó su contraseña
**Quiero** recibir un enlace para crear una nueva
**Para** recuperar el acceso sin depender del administrador.

### Escenario: Solicitud de recuperación

**Dado** que estoy en la pantalla de inicio de sesión
**Cuando** presiono "¿Olvidó su contraseña?", ingreso mi nombre de usuario y confirmo
**Entonces** el sistema muestra "Si el usuario tiene un correo registrado, recibirá un enlace para restablecer su contraseña."
**Y** si el usuario existe, está `activo` y tiene correo, le envía un enlace válido por 30 minutos.

### Escenario: Usuario sin correo o inexistente

**Dado** que el usuario no existe o no tiene correo registrado
**Cuando** solicito la recuperación
**Entonces** el sistema muestra el mismo mensaje "Si el usuario tiene un correo registrado, recibirá un enlace para restablecer su contraseña."
**Y** no envía ningún correo.

### Escenario: Restablecimiento con enlace válido

**Dado** que abrí un enlace de recuperación vigente y sin usar
**Cuando** ingreso una nueva contraseña que cumple la política y su confirmación
**Entonces** el sistema guarda la contraseña, invalida el enlace, cierra todas mis sesiones abiertas, registra el cambio en la bitácora y me lleva al inicio de sesión.

### Escenario: Enlace vencido o ya usado

**Dado** que el enlace tiene más de 30 minutos o ya fue usado
**Cuando** lo abro
**Entonces** el sistema muestra "El enlace no es válido o ya venció. Solicite uno nuevo."

### Escenario: Recuperación de una cuenta bloqueada

**Dado** que mi cuenta está `bloqueado`
**Cuando** solicito la recuperación
**Entonces** el sistema no envía el enlace
**Y** el desbloqueo queda a cargo del Administrador (`RF-002`).

## Historia de Usuario 4: Sesiones

**Como** usuario del sistema
**Quiero** ver y cerrar mis sesiones abiertas
**Para** proteger mi cuenta si ingresé desde otro equipo.

### Escenario: Cerrar sesión

**Dado** que tengo una sesión abierta
**Cuando** presiono "Cerrar sesión"
**Entonces** el sistema cierra la sesión, registra el cierre en la bitácora y me lleva al inicio de sesión.

### Escenario: Expiración por inactividad

**Dado** que mi sesión lleva 30 minutos sin actividad
**Cuando** intento realizar cualquier acción
**Entonces** el sistema cierra la sesión y muestra "Su sesión expiró por inactividad. Ingrese nuevamente."

### Escenario: Ver mis sesiones abiertas

**Dado** que tengo sesiones abiertas en varios dispositivos
**Cuando** abro "Mis sesiones"
**Entonces** el sistema lista cada sesión con su fecha y hora de inicio, última actividad, navegador y dirección IP
**Y** marca cuál es la sesión actual.

### Escenario: Cerrar otras sesiones

**Dado** que estoy en "Mis sesiones"
**Cuando** presiono "Cerrar las demás sesiones" y confirmo
**Entonces** el sistema cierra todas mis sesiones excepto la actual
**Y** esos dispositivos deben volver a ingresar.

---

## Reglas de validación y negocio (resumen)

- **Campos obligatorios:** Nombre de usuario y Contraseña (inicio de sesión); Contraseña actual, Nueva contraseña y Confirmación (cambio).
- **Política de contraseña:** mínimo 8 caracteres, con al menos una letra y un número, distinta de la actual.
- **Estados de la cuenta:** solo `activo` ingresa; 5 intentos fallidos consecutivos → `bloqueado`; el desbloqueo es exclusivo del Administrador (`RF-002`).
- **Cambio obligatorio:** en el primer ingreso y tras un restablecimiento hecho por el Administrador.
- **Recuperación:** enlace de un solo uso, válido 30 minutos, solo para cuentas `activo` con correo; mensaje idéntico exista o no el usuario.
- **Sesiones:** expiran tras 30 minutos sin actividad; cambiar o restablecer la contraseña cierra las demás sesiones.
- **Seguridad:** contraseña solo como hash; mensaje genérico ante credenciales incorrectas.
- **Auditoría:** inicio y cierre de sesión, bloqueo y cambio de contraseña, con usuario, IP y hora del servidor (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web adaptable a celular. Pantallas: Inicio de sesión · Cambiar contraseña · ¿Olvidó su contraseña? · Restablecer contraseña · Mis sesiones. Escenarios: Estado inicial · Cargando · Éxito · Credenciales incorrectas · Cuenta bloqueada · Sin conexión.
