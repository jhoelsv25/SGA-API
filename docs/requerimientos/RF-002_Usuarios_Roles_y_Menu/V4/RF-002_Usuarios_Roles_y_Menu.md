# RF-002: Usuarios, Roles y Menú

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad
**Versión:** 4.0
**Fecha:** actualización v4.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-001` (inicio de sesión, cambio de rol activo), `RF-007` (padrón de personas y fichas).

> **Cambios de la versión 4.0 sobre la 3.0 (revisión de roles, 2026-11-09):**
>
> - **Roles que dependen de una ficha:** Docente, Estudiante y Apoderado solo los tiene quien tiene la ficha vigente de ese tipo. Se obtienen al registrar la ficha en `RF-007`; desde "Usuarios" se rechazan si falta la ficha, y no se retiran mientras la ficha siga vigente.

> **Cambios de la versión 3.0 sobre la 2.0 (acuerdos con el colegio, 2026-10-08):**
>
> - **Un solo término: rol.** Se deja de usar "perfil". El **rol** da los accesos; el **cargo** es el puesto en el colegio.
> - **Acceso solo por menú (Roles-Menú).** Se eliminan los permisos y su alcance. A cada rol se le asignan las opciones del menú que puede ver y usar.
> - **Un solo cargo vigente por persona,** con historial. El cargo es obligatorio para tener cuenta y sugiere los roles.
> - **Registro único:** persona → cargo → cuenta → roles en un solo paso y una sola transacción, desde cualquier opción de registro.
> - **Personal sin ficha:** Director(a), Subdirector(a), Secretario(a), Personal de TI y demás personal administrativo se registran desde "Usuarios".
> - **Opción "Corregir datos críticos":** solo los roles que la tengan asignada pueden cambiar los datos críticos de una persona (`RF-007`).

## Consideraciones y supuestos de negocio

- **Propósito.** Que el Administrador controle quién entra al sistema, con qué roles y qué opciones del menú ve cada rol.
- **Persona, ficha, cargo, cuenta y rol.** Cada concepto tiene un solo propósito:

  | Concepto    | Qué es                                                      | Cuántos                         |
  | ----------- | ----------------------------------------------------------- | ------------------------------- |
  | **Persona** | Datos básicos de alguien del colegio (`RF-007`)             | Una por documento               |
  | **Ficha**   | Datos propios de estudiante, docente o apoderado (`RF-007`) | Cero o más                      |
  | **Cargo**   | Puesto en el colegio; se imprime en reportes y firmas       | **Uno vigente** (con historial) |
  | **Cuenta**  | Acceso al sistema                                           | Una vigente como máximo         |
  | **Rol**     | Lo que puede hacer: las opciones del menú que ve            | Uno o más, uno principal        |

- **Persona sin cuenta.** Una persona puede existir en el padrón sin cargo ni cuenta (registro provisional o carga masiva, `RF-007`). El cargo y la cuenta se crean cuando se le asigna una ficha o se la registra como personal.
- **Cargo obligatorio para tener cuenta.** Toda cuenta pertenece a una persona con cargo vigente. El cargo **no da accesos**; solo **sugiere** roles.
- **Roles que dependen de una ficha (v4.0).** Los roles Docente, Estudiante y Apoderado solo los puede tener una persona con la **ficha vigente** de ese tipo (`RF-007`). Registrar la ficha agrega el rol. Desde "Usuarios" no se puede asignar ese rol si falta la ficha, ni retirarlo o reemplazarlo mientras la ficha siga vigente: primero se da de baja la ficha. Los demás roles no dependen de una ficha.
- **Un solo cargo vigente.** Si la persona cambia de puesto, el cargo anterior termina (fecha de fin, vigencia 0) y queda en su historial laboral. Lo que hace además (por ejemplo, dictar clases) se sabe por su **ficha**, no por un segundo cargo.
- **Cargo según la opción de registro:**

  | Opción                 | Ficha      | Cargo                                                      | Roles por defecto       |
  | ---------------------- | ---------- | ---------------------------------------------------------- | ----------------------- |
  | Estudiantes (`RF-007`) | estudiante | Estudiante (automático)                                    | Estudiante              |
  | Docentes (`RF-007`)    | docente    | Docente de aula u otro cargo docente                       | Docente                 |
  | Apoderados (`RF-007`)  | apoderado  | Apoderado(a) (automático)                                  | Apoderado               |
  | Usuarios (este RF)     | ninguna    | Lo elige el Administrador entre los **cargos de personal** | Los sugeridos del cargo |

  Los cargos Estudiante, Docente de aula y Apoderado(a) no se ofrecen en "Usuarios", porque requieren su ficha.

- **Registro único.** Desde cualquier opción, en un solo paso y una sola transacción (todo o nada):
  1. **Persona:** se busca por tipo y número de documento, o por nombre. Si existe, se reutiliza; si no, se crea con sus datos obligatorios.
  2. **Ficha:** solo en las opciones de `RF-007`.
  3. **Cargo:** si la persona no tiene cargo vigente, se le asigna. Si ya tiene uno, se conserva.
  4. **Cuenta:** si no tiene, se crea; si ya tiene, se reutiliza y **no se crea otra**.
  5. **Roles:** los que indique el Administrador (al menos uno; el primero es el principal). Si no indica ninguno, se asignan los **roles sugeridos del cargo**. A una cuenta existente solo se le agregan los roles que le falten.
- **Ejemplo: personal de TI que también dicta clases.** Carlos (DNI 44556677) se registra en "Usuarios" con cargo Personal de TI y rol Soporte TI. Luego, en "Docentes", se busca su DNI y se le agrega la ficha de docente. Su cargo sigue siendo Personal de TI, su cuenta es la misma y se le agrega el rol Docente. Al ingresar cambia de rol para ver uno u otro menú (`RF-001`).
- **Roles por cuenta.** Una cuenta tiene **uno o más roles**; uno es el **principal**, con el que inicia sesión. El usuario actúa con el menú de su **rol activo** y puede cambiarlo (`RF-001`). Una cuenta siempre tiene al menos un rol vigente.
- **Historial de roles.** Retirar un rol no lo borra: la asignación queda con vigencia 0, con quién y cuándo la retiró.
- **Nombre de usuario único.** No puede repetirse entre cuentas vigentes. Por defecto es el número de documento, o el código SIAGIE para los estudiantes; el Administrador puede cambiarlo antes de guardar.
- **Contraseña inicial.** Al crear la cuenta, el sistema genera una contraseña temporal que se muestra una sola vez. La cuenta queda marcada para cambiarla en el primer ingreso (`RF-001`). Si la persona ya tenía cuenta, no se genera una nueva contraseña.
- **Estados de la cuenta.** `activo`, `bloqueado` e `inactivo`.

  | Acción             | Desde                  | Hacia       | Quién                                                  |
  | ------------------ | ---------------------- | ----------- | ------------------------------------------------------ |
  | Bloqueo automático | `activo`               | `bloqueado` | Sistema, tras 5 intentos fallidos (`RF-001`)           |
  | Desbloquear        | `bloqueado`            | `activo`    | Administrador (reinicia el contador de intentos)       |
  | Desactivar         | `activo` / `bloqueado` | `inactivo`  | Administrador (cierra todas las sesiones de la cuenta) |
  | Reactivar          | `inactivo`             | `activo`    | Administrador                                          |

- **Restablecer contraseña.** El Administrador puede generar una nueva contraseña temporal para cualquier cuenta. La cuenta queda marcada para cambio obligatorio y se cierran sus sesiones abiertas.
- **Sin eliminación física.** Las cuentas no se borran; se desactivan.
- **El Administrador no puede quitarse su propio acceso.** No puede desactivar su propia cuenta ni retirarse el rol Administrador.
- **Roles del sistema.** Administrador, Director, Subdirector, Soporte TI, Secretaria, Docente, Estudiante y Apoderado vienen precargados: no se eliminan ni se renombran, pero sí se pueden ajustar sus menús (excepto el Administrador, que siempre ve todo).
- **Roles adicionales.** El Administrador puede crear otros roles (por ejemplo, Coordinador o Auxiliar). El nombre es único. Un rol con cuentas asignadas no se puede desactivar.
- **Roles-Menú (acceso).** El Administrador marca, por cada rol, las **opciones del menú** que puede ver y usar. No hay permisos ni alcances aparte: si un rol tiene la opción, puede usar esa pantalla y sus acciones; si no la tiene, el menú no la muestra y el servidor rechaza el acceso por su ruta.
- **Módulos y menú.** Los módulos agrupan las opciones. El menú tiene dos niveles:
  - **Contenedor:** un grupo dentro de un módulo (por ejemplo, "Operaciones"). No tiene ruta ni padre.
  - **Opción:** una pantalla. Tiene ruta y pertenece a un contenedor.
- **Qué ve cada usuario.** Una opción se muestra si está asignada a su rol activo. Un contenedor se muestra si tiene al menos una opción visible. Nada no vigente se muestra. Todo se ordena por el campo Orden.
- **Opción "Corregir datos críticos".** Es una opción del menú del módulo Personas. Solo los roles que la tengan asignada pueden cambiar los datos críticos de una persona ya vinculada a una ficha o a una cuenta (`RF-007`). Por defecto la tiene solo el Administrador.
- **Efecto inmediato.** Los cambios de roles o de menú se aplican en el siguiente ingreso o al refrescar.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear o editar cuentas, cambiar su estado o sus roles, restablecer contraseñas, crear o editar roles, asignar menús, editar módulos, menú o cargos, y asignar cargos queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                        | Mensaje                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sin persona                      | "Seleccione una persona del padrón o registre una nueva."                                                                    |
| Persona existente (aviso)        | "Esta persona ya está registrada. Se usarán sus datos."                                                                      |
| Persona con cuenta (aviso)       | "Esta persona ya tiene una cuenta. Se le agregarán los roles indicados."                                                     |
| Correo repetido                  | "El correo ya está registrado para otra persona."                                                                            |
| Nombre de usuario repetido       | "El nombre de usuario ya está en uso."                                                                                       |
| Cargo inexistente o no vigente   | "El cargo seleccionado no existe o no está vigente."                                                                         |
| Cargo sin roles sugeridos        | "El cargo no tiene roles sugeridos. Indique al menos un rol."                                                                |
| Rol inexistente o inactivo       | "El rol seleccionado no existe o no está activo."                                                                            |
| Cuenta sin roles                 | "La cuenta debe tener al menos un rol."                                                                                      |
| Rol sin ficha (v4.0)             | "El rol Docente requiere una ficha vigente. Regístrela desde "Docentes"."                                                    |
| Retiro con ficha (v4.0)          | "No se puede retirar el rol Docente porque la persona tiene una ficha vigente. Primero debe darla de baja desde "Docentes"." |
| Nombre de rol repetido           | "Ya existe un rol con ese nombre."                                                                                           |
| Rol del sistema                  | "Los roles del sistema no se pueden eliminar ni renombrar."                                                                  |
| Rol con cuentas                  | "No se puede desactivar un rol que tiene cuentas asignadas."                                                                 |
| Autoprotección                   | "No puede desactivar su propia cuenta ni cambiar su propio rol."                                                             |
| Opción no asignada al rol        | "Su rol no tiene acceso a esta opción."                                                                                      |
| Opción sin contenedor o sin ruta | "Una opción del menú debe tener contenedor y ruta."                                                                          |
| Código de módulo repetido        | "Ya existe un módulo con ese código."                                                                                        |
| Cargo repetido                   | "Ya existe un cargo con ese nombre."                                                                                         |
| Cargo en uso                     | "No se puede desactivar un cargo asignado a personal vigente."                                                               |

## Requerimientos fuera de alcance (Out of Scope)

- **Inicio de sesión, cambio de contraseña y cambio de rol activo por el propio usuario.** Corresponde a `RF-001`.
- **Fichas de estudiante, docente y apoderado, carga masiva y edición de datos de la persona.** Corresponde a `RF-007` (usa el registro único de este RF).
- **Permisos por acción y alcances.** Eliminados en la v3.0: el acceso es solo por menú. Si un módulo necesita limitar datos (por ejemplo, un docente solo ve sus secciones), lo resuelve su propio RF.
- **Consulta del documento en RENIEC.** No se contempla por ahora.
- **Menús de más de dos niveles.**

## Acuerdos y puntos abiertos

- **Un solo término "rol" (acordado, 2026-10-08).** Reemplaza "perfil" en BD, API, pantallas y documentos.
- **Acceso solo por menú (acordado, 2026-10-08).** Reemplaza permisos y alcances de la v2.0.
- **Un cargo vigente por persona (acordado, 2026-10-08).**
- **Registro único desde cualquier opción (acordado, 2026-10-08).**
- **Datos críticos por opción de menú (acordado, 2026-10-08).** Se descartó guardarlo en Variables del sistema.

## Historia de Usuario 1: Registro único y gestión de cuentas

**Como** Administrador
**Quiero** registrar en un solo paso a la persona, su cargo, su cuenta y sus roles
**Para** que nadie quede a medio registrar y cada uno entre con los accesos que le corresponden.

### Escenario: Registrar personal nuevo

**Dado** que el DNI 09876543 no existe en el padrón
**Cuando** en "Usuarios" registro a Diego Ramos (DNI, nombres, apellido paterno, sexo), elijo el cargo Director(a), no indico roles y presiono "Guardar"
**Entonces** el sistema crea la persona, su cargo Director(a), su cuenta `activo` con usuario 09876543 y el rol sugerido Director como principal
**Y** me muestra una sola vez la contraseña temporal.

### Escenario: Registrar a una persona que ya está en el padrón

**Dado** que el DNI 44556677 ya existe en el padrón sin cuenta
**Cuando** lo busco por DNI o nombre, elijo el cargo Personal de TI y guardo
**Entonces** el sistema reutiliza la persona, muestra "Esta persona ya está registrada. Se usarán sus datos." y crea su cargo, su cuenta y su rol Soporte TI.

### Escenario: Persona que ya tiene cuenta

**Dado** que la persona ya tiene una cuenta con el rol Soporte TI
**Cuando** la registro de nuevo indicando el rol Secretaria
**Entonces** el sistema no crea otra cuenta: le agrega el rol Secretaria a la existente, no genera contraseña y muestra "Esta persona ya tiene una cuenta. Se le agregarán los roles indicados."

### Escenario: Roles indicados por el Administrador

**Dado** que estoy registrando a una persona con el cargo Personal de TI
**Cuando** indico los roles Soporte TI y Administrador
**Entonces** la cuenta queda con esos dos roles y Soporte TI, el primero, como principal.

### Escenario: Cargo sin roles sugeridos

**Dado** que el cargo Psicólogo(a) no tiene roles sugeridos
**Cuando** registro a una persona con ese cargo sin indicar roles
**Entonces** el sistema bloquea el guardado y muestra "El cargo no tiene roles sugeridos. Indique al menos un rol."

### Escenario: Registro incompleto no deja datos a medias

**Dado** que estoy registrando a una persona nueva
**Cuando** el nombre de usuario ya está en uso
**Entonces** el sistema muestra "El nombre de usuario ya está en uso." y no guarda ni la persona, ni el cargo, ni la cuenta.

### Escenario: Campos obligatorios incompletos

**Dado** que estoy registrando una cuenta
**Cuando** intento guardar sin persona o sin cargo
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Desbloquear una cuenta

**Dado** que una cuenta está `bloqueado`
**Cuando** presiono "Desbloquear" y confirmo
**Entonces** el sistema la cambia a `activo` y reinicia su contador de intentos fallidos.

### Escenario: Desactivar una cuenta

**Dado** que una cuenta está `activo`
**Cuando** presiono "Desactivar" y confirmo
**Entonces** el sistema la cambia a `inactivo` y cierra todas sus sesiones abiertas.

### Escenario: Reactivar una cuenta

**Dado** que una cuenta está `inactivo`
**Cuando** presiono "Reactivar" y confirmo
**Entonces** el sistema la cambia a `activo`.

### Escenario: Restablecer la contraseña

**Dado** que un usuario olvidó su contraseña y no tiene correo registrado
**Cuando** presiono "Restablecer contraseña" en su cuenta y confirmo
**Entonces** el sistema genera una nueva contraseña temporal, me la muestra una sola vez, marca la cuenta para cambio obligatorio y cierra sus sesiones abiertas.

### Escenario: Autoprotección

**Dado** que estoy editando mi propia cuenta
**Cuando** intento desactivarla o retirarme el rol Administrador
**Entonces** el sistema bloquea la acción y muestra "No puede desactivar su propia cuenta ni cambiar su propio rol."

### Escenario: Listado de cuentas

**Dado** que estoy en "Usuarios"
**Cuando** abro el listado
**Entonces** el sistema muestra persona, nombre de usuario, cargo, rol principal, estado y último acceso, ordenado por apellidos
**Y** permite filtrar por rol, cargo y estado, y buscar por nombre, apellido, documento o nombre de usuario.

### Escenario: Asignar un segundo rol

**Dado** que la cuenta del docente Quispe tiene el rol Docente y también tiene ficha de apoderado vigente
**Cuando** le agrego el rol Apoderado y guardo
**Entonces** la cuenta queda con dos roles, Docente sigue como principal y el cambio queda en la bitácora.

### Escenario: Cambiar el rol principal

**Dado** que una cuenta tiene los roles Docente (principal) y Apoderado
**Cuando** marco Apoderado como principal
**Entonces** el usuario iniciará sesión con el rol Apoderado desde su siguiente ingreso.

### Escenario: Retirar un rol con historial

**Dado** que una cuenta tiene los roles Secretaria y Soporte TI
**Cuando** retiro el rol Soporte TI y confirmo
**Entonces** la asignación queda con vigencia 0, con quién y cuándo, y aparece en el historial de roles.

### Escenario: Dejar una cuenta sin roles

**Dado** que una cuenta tiene un solo rol
**Cuando** intento retirarlo
**Entonces** el sistema bloquea la acción y muestra "La cuenta debe tener al menos un rol."

### Escenario: Rol que requiere ficha sin ficha vigente (v4.0)

**Dado** que la persona no tiene ficha de docente vigente
**Cuando** en "Usuarios" le asigno el rol Docente y guardo
**Entonces** el sistema rechaza la acción y muestra "El rol Docente requiere una ficha vigente. Regístrela desde "Docentes"."

### Escenario: Rol que requiere ficha con ficha vigente (v4.0)

**Dado** que la persona tiene ficha de apoderado vigente
**Cuando** en "Usuarios" le asigno el rol Apoderado y guardo
**Entonces** la cuenta queda con ese rol y el cambio queda en la bitácora.

### Escenario: Retirar un rol con ficha vigente (v4.0)

**Dado** que una cuenta tiene los roles Secretaria (principal) y Docente, y la persona tiene ficha de docente vigente
**Cuando** retiro el rol Docente y confirmo
**Entonces** el sistema rechaza la acción y muestra "No se puede retirar el rol Docente porque la persona tiene una ficha vigente. Primero debe darla de baja desde "Docentes"."

### Escenario: Reemplazar un rol principal con ficha vigente (v4.0)

**Dado** que el rol principal de la cuenta es Docente y la persona tiene ficha de docente vigente
**Cuando** cambio su rol principal por Secretaria
**Entonces** el sistema rechaza la acción, porque el cambio retiraría el rol Docente.

## Historia de Usuario 2: Roles y Roles-Menú

**Como** Administrador
**Quiero** definir qué opciones del menú tiene cada rol
**Para** que cada rol vea y use solo lo que le corresponde.

### Escenario: Asignar opciones del menú a un rol

**Dado** que estoy en el detalle del rol Docente
**Cuando** marco o desmarco opciones del menú, agrupadas por módulo y contenedor, y presiono "Guardar"
**Entonces** el sistema guarda las opciones del rol y registra el cambio en la bitácora.

### Escenario: Acceso por ruta sin la opción

**Dado** que el rol Docente no tiene la opción "Registrar ausencias"
**Cuando** un docente intenta abrir esa pantalla por su ruta
**Entonces** el sistema rechaza el acceso y muestra "Su rol no tiene acceso a esta opción."

### Escenario: Crear un rol adicional

**Dado** que estoy en "Roles"
**Cuando** creo el rol "Coordinador" con una descripción y guardo
**Entonces** el sistema lo crea activo y sin opciones de menú.

### Escenario: Nombre de rol repetido

**Dado** que ya existe un rol con el mismo nombre
**Cuando** intento guardar
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un rol con ese nombre."

### Escenario: Renombrar o eliminar un rol del sistema

**Dado** que el rol es un rol del sistema
**Cuando** intento renombrarlo o eliminarlo
**Entonces** el sistema no ofrece la acción
**Y** si se intenta por otra vía, el servidor la rechaza con "Los roles del sistema no se pueden eliminar ni renombrar."

### Escenario: Menú del Administrador

**Dado** que estoy en el detalle del rol Administrador
**Cuando** visualizo sus opciones
**Entonces** el sistema las muestra todas marcadas y de solo lectura.

### Escenario: Desactivar un rol con cuentas

**Dado** que un rol adicional tiene cuentas asignadas
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar un rol que tiene cuentas asignadas."

### Escenario: Autorizar la corrección de datos críticos

**Dado** que el rol Secretaria no tiene la opción "Corregir datos críticos"
**Cuando** se la asigno en Roles-Menú y guardo
**Entonces** desde su siguiente ingreso las secretarias pueden corregir datos críticos de las personas (`RF-007`).

## Historia de Usuario 3: Módulos y menú

**Como** Administrador
**Quiero** mantener los módulos y el menú con sus contenedores y opciones
**Para** que la navegación esté ordenada y cada usuario vea solo lo suyo.

### Escenario: Editar un módulo

**Dado** que estoy en "Módulos"
**Cuando** cambio el nombre, el ícono, el orden o la vigencia de un módulo y guardo
**Entonces** el sistema aplica el cambio en el menú de todos los usuarios.

### Escenario: Código de módulo repetido

**Dado** que ya existe un módulo con el mismo código
**Cuando** intento guardar
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un módulo con ese código."

### Escenario: Crear un contenedor

**Dado** que estoy en el menú del módulo "Seguimiento docente"
**Cuando** creo el contenedor "Reportes" con su orden
**Entonces** el sistema lo guarda sin ruta y sin padre.

### Escenario: Crear una opción

**Dado** que existe el contenedor "Operaciones" del módulo "Seguimiento docente"
**Cuando** creo la opción "Registrar sesión de clase" con su ruta y orden
**Entonces** el sistema la guarda dentro del contenedor
**Y** solo la verán los roles a los que se la asigne en Roles-Menú.

### Escenario: Opción sin contenedor o sin ruta

**Dado** que estoy creando una opción
**Cuando** intento guardarla sin contenedor o sin ruta
**Entonces** el sistema impide guardar y muestra "Una opción del menú debe tener contenedor y ruta."

### Escenario: Menú visible según el rol activo

**Dado** que el rol Docente tiene "Registrar sesión de clase" pero no "Registrar ausencias"
**Cuando** un docente ingresa al sistema
**Entonces** ve "Registrar sesión de clase" y no ve "Registrar ausencias"
**Y** un contenedor sin opciones visibles para él tampoco se muestra.

### Escenario: Opción no vigente

**Dado** que una opción del menú está no vigente
**Cuando** cualquier usuario ingresa
**Entonces** la opción no aparece en su menú.

## Historia de Usuario 4: Cargos y roles sugeridos

**Como** Administrador
**Quiero** mantener el catálogo de cargos y los roles que se sugieren para cada uno
**Para** asignar accesos coherentes con el puesto de cada persona.

### Escenario: Crear un cargo

**Dado** que estoy en "Cargos"
**Cuando** creo el cargo "Coordinador(a) académico" con el rol sugerido Subdirector
**Entonces** el cargo queda vigente con su rol sugerido.

### Escenario: Cargo repetido

**Dado** que ya existe el cargo "Docente de aula"
**Cuando** intento crear otro con el mismo nombre
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un cargo con ese nombre."

### Escenario: El cargo no da accesos

**Dado** que una persona tiene el cargo Director(a) pero su cuenta solo tiene el rol Docente
**Cuando** ingresa al sistema
**Entonces** ve solo el menú del rol Docente.

### Escenario: Cambiar el cargo de una persona

**Dado** que una persona tiene el cargo vigente Docente de aula desde el 01/03/2026
**Cuando** le asigno el cargo Subdirector(a) desde el 01/08/2027
**Entonces** el cargo anterior termina con fecha 31/07/2027 y vigencia 0, el nuevo queda vigente
**Y** el sistema sugiere el rol Subdirector sin retirar los roles que ya tiene la cuenta.

### Escenario: Desactivar un cargo en uso

**Dado** que el cargo "Auxiliar de educación" está asignado a personas vigentes
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar un cargo asignado a personal vigente."

---

## Reglas de validación y negocio (resumen)

- **Registro único:** persona (existente o nueva) + cargo + cuenta + roles en una transacción; si algo falla, no se guarda nada.
- **Campos obligatorios:** registro (Persona o datos de persona nueva, Cargo); persona nueva (Tipo y número de documento, Nombres, Apellido paterno, Sexo); rol (Nombre); módulo (Código, Nombre, Orden); menú (Módulo, Nombre, Orden).
- **Opcionales con valor por defecto:** Roles (los sugeridos del cargo); Nombre de usuario (número de documento o código SIAGIE).
- **Unicidad:** una persona por tipo y número de documento; una cuenta vigente por persona; un cargo vigente por persona; nombre de usuario entre cuentas vigentes; nombre de rol; código de módulo; nombre de cargo.
- **Estados de la cuenta:** `activo` ↔ `bloqueado` (desbloqueo manual) y `activo`/`bloqueado` ↔ `inactivo`; sin eliminación física.
- **Roles por cuenta:** uno o más; uno principal; al menos uno vigente; retirar = vigencia 0 con historial.
- **Acceso:** solo por las opciones del menú asignadas al rol activo (Roles-Menú), validado en el menú y en el servidor. El Administrador ve todo.
- **Roles del sistema:** no se eliminan ni se renombran.
- **Cargo:** obligatorio para tener cuenta, uno vigente con historial, no da accesos y sugiere roles.
- **Datos críticos:** solo los roles con la opción "Corregir datos críticos" (`RF-007`).
- **Este RF lo opera:** el Administrador.
- **Auditoría:** todas las altas, ediciones, cambios de estado, restablecimientos y asignaciones (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Usuarios (listado y registro único con búsqueda de persona) · Roles (listado y Roles-Menú por módulo) · Módulos · Menú (árbol) · Cargos. Escenarios: Listado · Vacío · Alta · Persona existente · Cuenta existente · Duplicado · Contraseña temporal · Rol del sistema · Sin acceso.
