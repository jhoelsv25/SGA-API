# RF-002: Usuarios, Roles y Menú

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 12 hh (IA Agéntica)
**Prerrequisitos:** `RF-001` (inicio de sesión, cambio obligatorio de contraseña), `RF-007` (padrón de personas al que pertenece cada cuenta).

## Consideraciones y supuestos de negocio

- **Propósito.** Que el Administrador controle quién entra al sistema, con qué rol y qué opciones del menú ve cada rol.
- **Cuenta ligada a una persona.** Toda cuenta se crea a partir de una persona del padrón (`RF-007`). Una persona tiene como máximo **una** cuenta vigente.
- **Un rol por cuenta.** Cada cuenta tiene un solo rol. El rol define los permisos y, con ellos, el menú.
- **Nombre de usuario único.** No puede repetirse entre cuentas vigentes. Por defecto se usa el DNI para el personal y los apoderados, y el código SIAGIE para los estudiantes; el Administrador puede cambiarlo antes de guardar.
- **Contraseña inicial.** Al crear la cuenta, el sistema genera una contraseña temporal que se muestra una sola vez al Administrador. La cuenta queda marcada para cambiar la contraseña en el primer ingreso (`RF-001`).
- **Estados de la cuenta.** `activo`, `bloqueado` e `inactivo`.

  | Acción             | Desde                  | Hacia       | Quién                                                  |
  | ------------------ | ---------------------- | ----------- | ------------------------------------------------------ |
  | Bloqueo automático | `activo`               | `bloqueado` | Sistema, tras 5 intentos fallidos (`RF-001`)           |
  | Desbloquear        | `bloqueado`            | `activo`    | Administrador (reinicia el contador de intentos)       |
  | Desactivar         | `activo` / `bloqueado` | `inactivo`  | Administrador (cierra todas las sesiones de la cuenta) |
  | Reactivar          | `inactivo`             | `activo`    | Administrador                                          |

- **Restablecer contraseña.** El Administrador puede generar una nueva contraseña temporal para cualquier cuenta. La cuenta queda marcada para cambio obligatorio y se cierran sus sesiones abiertas.
- **Sin eliminación física.** Las cuentas no se borran; se desactivan. La bitácora siempre conserva quién hizo cada acción.
- **El Administrador no puede quitarse su propio acceso.** No puede desactivar su propia cuenta ni cambiar su propio rol.
- **Roles del sistema.** Los roles Administrador, Director, Subdirector, Soporte TI, Secretaria, Docente, Estudiante y Apoderado vienen precargados y son **roles del sistema**: no se eliminan ni se renombran, pero sí se pueden ajustar sus permisos (excepto el Administrador, que siempre tiene todos).
- **Roles adicionales.** El Administrador puede crear otros roles (por ejemplo, Coordinador o Auxiliar). El nombre del rol es único. Un rol con cuentas asignadas no se puede desactivar.
- **Permisos.** Son las acciones del sistema (por ejemplo, `sesiones.registrar` o `libretas.subir`), agrupadas por módulo. El catálogo de permisos lo define el sistema y el Administrador **solo los asigna** a los roles; no los crea ni los borra.
- **Alcance de cada permiso (aplica a todo el sistema).** Al asignar un permiso a un rol, el Administrador indica **sobre qué datos** puede actuar ese rol. Todos los RF que dicen "quien tenga el permiso…" usan esta regla:

  | Alcance | El usuario puede actuar sobre… | Ejemplo |
  |---|---|---|
  | `propio` | Solo sus propios datos o registros | Un docente ve solo sus sesiones |
  | `tutoria` | La sección de la que es tutor | El tutor sube libretas de su sección |
  | `mis_secciones` | Las secciones donde es tutor o dicta algún curso | Un docente registra conducta en sus salones |
  | `colegio` | Todo el colegio | El Director o un Auxiliar registra conducta de cualquier estudiante |

  Un mismo permiso puede tener alcances distintos según el rol (por ejemplo, `conducta.registrar` con `mis_secciones` para Docente y `colegio` para Director). El cambio rige desde el siguiente ingreso o al refrescar.
- **Módulos y menú.** Los módulos agrupan las opciones del menú. El menú tiene dos niveles en la misma estructura:
  - **Contenedor:** un grupo dentro de un módulo (por ejemplo, "Operaciones" o "Reportes"). No tiene ruta ni padre.
  - **Opción:** una pantalla. Tiene ruta, pertenece a un contenedor y puede exigir un permiso.
- **Qué ve cada usuario.** Una opción se muestra si el rol del usuario tiene el permiso que la opción exige, o si no exige ninguno. Un contenedor se muestra si tiene al menos una opción visible. Un módulo, contenedor u opción no vigente no se muestra a nadie. Todo se ordena por el campo Orden.
- **Efecto inmediato.** Los cambios de permisos o de menú se aplican en el siguiente ingreso o al refrescar la página de los usuarios afectados.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear o editar cuentas, cambiar su estado o rol, restablecer contraseñas, crear o editar roles, asignar permisos y editar módulos o menú queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                 | Mensaje                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Persona con cuenta vigente                | "Esta persona ya tiene una cuenta en el sistema."                |
| Nombre de usuario repetido                | "El nombre de usuario ya está en uso."                           |
| Nombre de rol repetido                    | "Ya existe un rol con ese nombre."                               |
| Rol del sistema                           | "Los roles del sistema no se pueden eliminar ni renombrar."      |
| Rol con cuentas                           | "No se puede desactivar un rol que tiene cuentas asignadas."     |
| Auto-desactivación o cambio de rol propio | "No puede desactivar su propia cuenta ni cambiar su propio rol." |
| Opción sin contenedor o sin ruta          | "Una opción del menú debe tener contenedor y ruta."              |
| Código de módulo repetido                 | "Ya existe un módulo con ese código."                            |

## Requerimientos fuera de alcance (Out of Scope)

- **Inicio de sesión, cambio y recuperación de contraseña por el propio usuario.** Corresponde a `RF-001`.
- **Registro de los datos de la persona** (DNI, nombres, correo). Corresponde a `RF-007`.
- **Creación de permisos nuevos.** Los permisos nacen con cada funcionalidad desarrollada; no se crean desde la pantalla.
- **Varios roles por cuenta.** No se contempla en esta versión.
- **Creación masiva de cuentas.** Al importar estudiantes se crean sus cuentas y las de sus apoderados con estas mismas reglas. Corresponde a `RF-007`.
- **Menús de más de dos niveles.**

## Acuerdos y puntos abiertos

- **Formato del nombre de usuario (acordado).** DNI para el personal y los apoderados; código SIAGIE para los estudiantes.
- **Creación masiva de cuentas (acordado).** La importación de estudiantes (`RF-007`) crea también sus cuentas y las de sus apoderados.

## Historia de Usuario 1: Gestión de cuentas de usuario

**Como** Administrador
**Quiero** crear, editar y cambiar el estado de las cuentas
**Para** controlar quién entra al sistema y con qué rol.

### Escenario: Crear una cuenta

**Dado** que existe una persona en el padrón sin cuenta vigente
**Cuando** la selecciono, elijo un rol, confirmo el nombre de usuario y presiono "Guardar"
**Entonces** el sistema crea la cuenta en estado `activo`, marcada para cambio de contraseña en el primer ingreso
**Y** me muestra una sola vez la contraseña temporal generada.

### Escenario: Persona que ya tiene cuenta

**Dado** que la persona seleccionada ya tiene una cuenta vigente
**Cuando** intento crearle otra
**Entonces** el sistema bloquea el guardado y muestra "Esta persona ya tiene una cuenta en el sistema."

### Escenario: Nombre de usuario repetido

**Dado** que otra cuenta vigente usa el mismo nombre de usuario
**Cuando** intento guardar
**Entonces** el sistema bloquea el guardado y muestra "El nombre de usuario ya está en uso."

### Escenario: Campos obligatorios incompletos

**Dado** que estoy creando una cuenta
**Cuando** intento guardar sin persona, sin rol o sin nombre de usuario
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Cambiar el rol de una cuenta

**Dado** que una cuenta tiene el rol Docente
**Cuando** le asigno el rol Director y guardo
**Entonces** el sistema guarda el cambio y lo registra en la bitácora
**Y** el usuario ve el menú del nuevo rol en su siguiente ingreso o al refrescar.

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

### Escenario: Intento de desactivarse o cambiarse el rol a sí mismo

**Dado** que estoy editando mi propia cuenta
**Cuando** intento desactivarla o cambiar su rol
**Entonces** el sistema bloquea la acción y muestra "No puede desactivar su propia cuenta ni cambiar su propio rol."

### Escenario: Listado de cuentas

**Dado** que estoy en "Usuarios"
**Cuando** abro el listado
**Entonces** el sistema muestra nombre de la persona, nombre de usuario, rol, estado y último acceso, ordenado por apellidos
**Y** permite filtrar por rol y estado, y buscar por nombre, apellido o nombre de usuario.

### Escenario: Usuario sin permiso

**Dado** que mi rol no tiene el permiso de gestión de usuarios
**Cuando** intento abrir "Usuarios" por su ruta
**Entonces** el sistema no muestra la opción en el menú y rechaza el acceso a la pantalla.

## Historia de Usuario 2: Roles y permisos

**Como** Administrador
**Quiero** definir qué permisos tiene cada rol
**Para** que cada perfil haga solo lo que le corresponde.

### Escenario: Asignar permisos a un rol

**Dado** que estoy en el detalle del rol Docente
**Cuando** marco o desmarco permisos, agrupados por módulo, elijo el alcance de cada uno y presiono "Guardar"
**Entonces** el sistema guarda los permisos del rol con su alcance y registra el cambio en la bitácora.

### Escenario: Alcance de un permiso
**Dado** que el rol Docente tiene `conducta.registrar` con alcance `mis_secciones`
**Cuando** un docente intenta registrar una incidencia de un estudiante de una sección donde no dicta
**Entonces** el sistema rechaza la acción.
**Y** si cambio el alcance a `colegio`, desde su siguiente ingreso podrá registrar incidencias de cualquier estudiante.

### Escenario: Crear un rol adicional

**Dado** que estoy en "Roles"
**Cuando** creo el rol "Coordinador" con una descripción y guardo
**Entonces** el sistema lo crea activo y sin permisos, listo para asignárselos.

### Escenario: Nombre de rol repetido

**Dado** que ya existe un rol con el mismo nombre
**Cuando** intento guardar
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un rol con ese nombre."

### Escenario: Renombrar o eliminar un rol del sistema

**Dado** que el rol es un rol del sistema
**Cuando** intento renombrarlo o eliminarlo
**Entonces** el sistema no ofrece la acción
**Y** si se intenta por cualquier otra vía, el servidor la rechaza con "Los roles del sistema no se pueden eliminar ni renombrar."

### Escenario: Permisos del Administrador

**Dado** que estoy en el detalle del rol Administrador
**Cuando** visualizo sus permisos
**Entonces** el sistema los muestra todos marcados y de solo lectura.

### Escenario: Desactivar un rol con cuentas

**Dado** que un rol adicional tiene cuentas asignadas
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar un rol que tiene cuentas asignadas."

## Historia de Usuario 3: Módulos y menú

**Como** Administrador
**Quiero** mantener los módulos y el menú con sus contenedores y opciones
**Para** que la navegación del sistema esté ordenada y cada usuario vea solo lo suyo.

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
**Cuando** creo la opción "Registrar sesión de clase" con su ruta, orden y el permiso `sesiones.registrar`
**Entonces** el sistema la guarda dentro del contenedor
**Y** solo la verán los roles que tengan ese permiso.

### Escenario: Opción sin contenedor o sin ruta

**Dado** que estoy creando una opción
**Cuando** intento guardarla sin contenedor o sin ruta
**Entonces** el sistema impide guardar y muestra "Una opción del menú debe tener contenedor y ruta."

### Escenario: Menú visible según el rol

**Dado** que el rol Docente tiene `sesiones.registrar` pero no `ausencias.registrar`
**Cuando** un docente ingresa al sistema
**Entonces** ve "Registrar sesión de clase" y no ve "Registrar ausencias"
**Y** un contenedor sin ninguna opción visible para él tampoco se muestra.

### Escenario: Opción no vigente

**Dado** que una opción del menú está no vigente
**Cuando** cualquier usuario ingresa
**Entonces** la opción no aparece en su menú.

---

## Reglas de validación y negocio (resumen)

- **Campos obligatorios:** cuenta (Persona, Rol, Nombre de usuario); rol (Nombre); módulo (Código, Nombre, Orden); menú (Módulo, Nombre, Orden).
- **Campos condicionalmente obligatorios:** Contenedor y Ruta, obligatorios si y solo si el registro es una opción; un contenedor no tiene ruta ni padre.
- **Unicidad:** una cuenta vigente por persona; Nombre de usuario entre cuentas vigentes; Nombre de rol; Código de módulo.
- **Estados de la cuenta:** `activo` ↔ `bloqueado` (desbloqueo manual) y `activo`/`bloqueado` ↔ `inactivo`; sin eliminación física.
- **Roles del sistema:** no se eliminan ni se renombran; el Administrador siempre tiene todos los permisos.
- **Autoprotección:** el Administrador no puede desactivar su cuenta ni cambiar su propio rol.
- **Permisos:** el catálogo lo define el sistema; el Administrador solo los asigna a los roles.
- **Visibilidad del menú:** opción visible si el rol tiene su permiso o si no exige ninguno; contenedor visible si tiene al menos una opción visible; nada no vigente se muestra.
- **Permisos de este RF:** solo el Administrador.
- **Auditoría:** todas las altas, ediciones, cambios de estado, restablecimientos y asignaciones de permisos (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Usuarios (listado y formulario) · Roles (listado y matriz de permisos por módulo) · Módulos · Menú (árbol de contenedores y opciones). Escenarios: Listado · Vacío · Alta · Duplicado · Contraseña temporal · Rol del sistema · Sin permiso.
