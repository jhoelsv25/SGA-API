# RF-002: Usuarios, Perfiles y Menú

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguridad
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-10-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 12 hh (IA Agéntica)
**Prerrequisitos:** `RF-001` (inicio de sesión, cambio obligatorio de contraseña), `RF-007` (padrón de personas al que pertenece cada cuenta).

> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
> *   **Varios perfiles por cuenta (P-02):** una cuenta puede tener uno o más perfiles (perfiles), con uno principal. Asignar o retirar un perfil deja historial (vigencia 0).
> *   **Permisos según perfil activo:** el usuario actúa con los permisos del perfil que tiene activo, no con la suma de todos.
> *   **Perfiles y cargos (v2.0):** se distingue **perfil** (acceso al sistema: menú, permisos y alcance) de **cargo** (puesto en el colegio). Los permisos se dan **solo por perfil**. Se agrega el catálogo de cargos con sus perfiles sugeridos.

## Consideraciones y supuestos de negocio

- **Perfil y cargo (v2.0).** El **perfil** define lo que una persona puede hacer en el sistema (menú, permisos y alcance). El **cargo** es el puesto que ocupa en el colegio (Director(a), Docente de aula, Auxiliar…) y sirve para reportes, firmas e historial laboral (`RF-007`). **Los permisos se dan solo por perfil, nunca por cargo.**
- **Perfiles sugeridos por cargo (v2.0).** Cada cargo puede tener perfiles sugeridos. Al asignar un cargo a una persona, el sistema propone esos perfiles y el Administrador decide si los aplica.
- **Propósito.** Que el Administrador controle quién entra al sistema, con qué perfil y qué opciones del menú ve cada perfil.
- **Cuenta ligada a una persona.** Toda cuenta se crea a partir de una persona del padrón (`RF-007`). Una persona tiene como máximo **una** cuenta vigente.
- **Varios perfiles por cuenta (v2.0).** Una cuenta tiene **uno o más perfiles** (perfiles); uno de ellos es el **principal**, con el que inicia sesión. El usuario actúa con los permisos y el menú de su **perfil activo** y puede cambiarlo (`RF-001`). Una cuenta siempre tiene al menos un perfil vigente.
- **Historial de perfiles (v2.0).** Retirar un perfil no lo borra: la asignación queda con **vigencia 0**, con quién y cuándo la retiró. El Administrador ve el historial de perfiles de cada cuenta.
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
- **El Administrador no puede quitarse su propio acceso.** No puede desactivar su propia cuenta ni cambiar su propio perfil.
- **Perfiles del sistema.** Los perfiles Administrador, Director, Subdirector, Soporte TI, Secretaria, Docente, Estudiante y Apoderado vienen precargados y son **perfiles del sistema**: no se eliminan ni se renombran, pero sí se pueden ajustar sus permisos (excepto el Administrador, que siempre tiene todos).
- **Perfiles adicionales.** El Administrador puede crear otros perfiles (por ejemplo, Coordinador o Auxiliar). El nombre del perfil es único. Un perfil con cuentas asignadas no se puede desactivar.
- **Permisos.** Son las acciones del sistema (por ejemplo, `sesiones.registrar` o `libretas.subir`), agrupadas por módulo. El catálogo de permisos lo define el sistema y el Administrador **solo los asigna** a los perfiles; no los crea ni los borra.
- **Alcance de cada permiso (aplica a todo el sistema).** Al asignar un permiso a un perfil, el Administrador indica **sobre qué datos** puede actuar ese perfil. Todos los RF que dicen "quien tenga el permiso…" usan esta regla:

  | Alcance | El usuario puede actuar sobre… | Ejemplo |
  |---|---|---|
  | `propio` | Solo sus propios datos o registros | Un docente ve solo sus sesiones |
  | `tutoria` | La sección de la que es tutor | El tutor sube libretas de su sección |
  | `mis_secciones` | Las secciones donde es tutor o dicta algún curso | Un docente registra conducta en sus salones |
  | `colegio` | Todo el colegio | El Director o un Auxiliar registra conducta de cualquier estudiante |

  Un mismo permiso puede tener alcances distintos según el perfil (por ejemplo, `conducta.registrar` con `mis_secciones` para Docente y `colegio` para Director). El cambio rige desde el siguiente ingreso o al refrescar.
- **Módulos y menú.** Los módulos agrupan las opciones del menú. El menú tiene dos niveles en la misma estructura:
  - **Contenedor:** un grupo dentro de un módulo (por ejemplo, "Operaciones" o "Reportes"). No tiene ruta ni padre.
  - **Opción:** una pantalla. Tiene ruta, pertenece a un contenedor y puede exigir un permiso.
- **Qué ve cada usuario.** Una opción se muestra si el perfil del usuario tiene el permiso que la opción exige, o si no exige ninguno. Un contenedor se muestra si tiene al menos una opción visible. Un módulo, contenedor u opción no vigente no se muestra a nadie. Todo se ordena por el campo Orden.
- **Efecto inmediato.** Los cambios de permisos o de menú se aplican en el siguiente ingreso o al refrescar la página de los usuarios afectados.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear o editar cuentas, cambiar su estado o perfil, restablecer contraseñas, crear o editar perfiles, asignar permisos y editar módulos o menú queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                 | Mensaje                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Persona con cuenta vigente                | "Esta persona ya tiene una cuenta en el sistema."                |
| Nombre de usuario repetido                | "El nombre de usuario ya está en uso."                           |
| Nombre de perfil repetido                    | "Ya existe un perfil con ese nombre."                               |
| Perfil del sistema                           | "Los perfiles del sistema no se pueden eliminar ni renombrar."      |
| Perfil con cuentas                           | "No se puede desactivar un perfil que tiene cuentas asignadas."     |
| Auto-desactivación o cambio de perfil propio | "No puede desactivar su propia cuenta ni cambiar su propio perfil." |
| Opción sin contenedor o sin ruta          | "Una opción del menú debe tener contenedor y ruta."              |
| Código de módulo repetido                 | "Ya existe un módulo con ese código."                            |
| Cuenta sin perfiles (v2.0) | "La cuenta debe tener al menos un perfil." |
| Cargo repetido (v2.0) | "Ya existe un cargo con ese nombre." |
| Cargo en uso (v2.0) | "No se puede desactivar un cargo asignado a personal vigente." |

## Requerimientos fuera de alcance (Out of Scope)

- **Inicio de sesión, cambio y recuperación de contraseña por el propio usuario.** Corresponde a `RF-001`.
- **Registro de los datos de la persona** (DNI, nombres, correo). Corresponde a `RF-007`.
- **Creación de permisos nuevos.** Los permisos nacen con cada funcionalidad desarrollada; no se crean desde la pantalla.
- **Creación masiva de cuentas.** Al importar estudiantes se crean sus cuentas y las de sus apoderados con estas mismas reglas. Corresponde a `RF-007`.
- **Menús de más de dos niveles.**

## Acuerdos y puntos abiertos

*   **Varios perfiles por cuenta (acordado, P-02).** Reemplaza la regla "un perfil por cuenta" de la V1.
- **Formato del nombre de usuario (acordado).** DNI para el personal y los apoderados; código SIAGIE para los estudiantes.
- **Creación masiva de cuentas (acordado).** La importación de estudiantes (`RF-007`) crea también sus cuentas y las de sus apoderados.

## Historia de Usuario 1: Gestión de cuentas de usuario

**Como** Administrador
**Quiero** crear, editar y cambiar el estado de las cuentas
**Para** controlar quién entra al sistema y con qué perfil.

### Escenario: Crear una cuenta

**Dado** que existe una persona en el padrón sin cuenta vigente
**Cuando** la selecciono, elijo un perfil, confirmo el nombre de usuario y presiono "Guardar"
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
**Cuando** intento guardar sin persona, sin perfil o sin nombre de usuario
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Cambiar el perfil de una cuenta

**Dado** que una cuenta tiene el perfil Docente
**Cuando** le asigno el perfil Director y guardo
**Entonces** el sistema guarda el cambio y lo registra en la bitácora
**Y** el usuario ve el menú del nuevo perfil en su siguiente ingreso o al refrescar.

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

### Escenario: Intento de desactivarse o cambiarse el perfil a sí mismo

**Dado** que estoy editando mi propia cuenta
**Cuando** intento desactivarla o cambiar su perfil
**Entonces** el sistema bloquea la acción y muestra "No puede desactivar su propia cuenta ni cambiar su propio perfil."

### Escenario: Listado de cuentas

**Dado** que estoy en "Usuarios"
**Cuando** abro el listado
**Entonces** el sistema muestra nombre de la persona, nombre de usuario, perfil, estado y último acceso, ordenado por apellidos
**Y** permite filtrar por perfil y estado, y buscar por nombre, apellido o nombre de usuario.

### Escenario: Usuario sin permiso

**Dado** que mi perfil no tiene el permiso de gestión de usuarios
**Cuando** intento abrir "Usuarios" por su ruta
**Entonces** el sistema no muestra la opción en el menú y rechaza el acceso a la pantalla.

### Escenario: Asignar un segundo perfil (v2.0)
**Dado** que la cuenta del docente Quispe tiene el perfil Docente
**Cuando** le agrego el perfil Apoderado y guardo
**Entonces** la cuenta queda con dos perfiles, Docente sigue como principal y el cambio queda en la bitácora.

### Escenario: Cambiar el perfil principal (v2.0)
**Dado** que una cuenta tiene los perfiles Docente (principal) y Apoderado
**Cuando** marco Apoderado como principal
**Entonces** el usuario iniciará sesión con el perfil Apoderado desde su siguiente ingreso.

### Escenario: Retirar un perfil con historial (v2.0)
**Dado** que una cuenta tiene los perfiles Docente y Apoderado
**Cuando** retiro el perfil Apoderado y confirmo
**Entonces** la asignación queda con vigencia 0, con quién y cuándo, y aparece en el historial de perfiles de la cuenta.

### Escenario: Dejar una cuenta sin perfiles (v2.0)
**Dado** que una cuenta tiene un solo perfil
**Cuando** intento retirarlo
**Entonces** el sistema bloquea la acción y muestra "La cuenta debe tener al menos un perfil."

## Historia de Usuario 2: Perfiles y permisos

**Como** Administrador
**Quiero** definir qué permisos tiene cada perfil
**Para** que cada perfil haga solo lo que le corresponde.

### Escenario: Asignar permisos a un perfil

**Dado** que estoy en el detalle del perfil Docente
**Cuando** marco o desmarco permisos, agrupados por módulo, elijo el alcance de cada uno y presiono "Guardar"
**Entonces** el sistema guarda los permisos del perfil con su alcance y registra el cambio en la bitácora.

### Escenario: Alcance de un permiso
**Dado** que el perfil Docente tiene `conducta.registrar` con alcance `mis_secciones`
**Cuando** un docente intenta registrar una incidencia de un estudiante de una sección donde no dicta
**Entonces** el sistema rechaza la acción.
**Y** si cambio el alcance a `colegio`, desde su siguiente ingreso podrá registrar incidencias de cualquier estudiante.

### Escenario: Crear un perfil adicional

**Dado** que estoy en "Perfiles"
**Cuando** creo el perfil "Coordinador" con una descripción y guardo
**Entonces** el sistema lo crea activo y sin permisos, listo para asignárselos.

### Escenario: Nombre de perfil repetido

**Dado** que ya existe un perfil con el mismo nombre
**Cuando** intento guardar
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un perfil con ese nombre."

### Escenario: Renombrar o eliminar un perfil del sistema

**Dado** que el perfil es un perfil del sistema
**Cuando** intento renombrarlo o eliminarlo
**Entonces** el sistema no ofrece la acción
**Y** si se intenta por cualquier otra vía, el servidor la rechaza con "Los perfiles del sistema no se pueden eliminar ni renombrar."

### Escenario: Permisos del Administrador

**Dado** que estoy en el detalle del perfil Administrador
**Cuando** visualizo sus permisos
**Entonces** el sistema los muestra todos marcados y de solo lectura.

### Escenario: Desactivar un perfil con cuentas

**Dado** que un perfil adicional tiene cuentas asignadas
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar un perfil que tiene cuentas asignadas."

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
**Y** solo la verán los perfiles que tengan ese permiso.

### Escenario: Opción sin contenedor o sin ruta

**Dado** que estoy creando una opción
**Cuando** intento guardarla sin contenedor o sin ruta
**Entonces** el sistema impide guardar y muestra "Una opción del menú debe tener contenedor y ruta."

### Escenario: Menú visible según el perfil

**Dado** que el perfil Docente tiene `sesiones.registrar` pero no `ausencias.registrar`
**Cuando** un docente ingresa al sistema
**Entonces** ve "Registrar sesión de clase" y no ve "Registrar ausencias"
**Y** un contenedor sin ninguna opción visible para él tampoco se muestra.

### Escenario: Opción no vigente

**Dado** que una opción del menú está no vigente
**Cuando** cualquier usuario ingresa
**Entonces** la opción no aparece en su menú.

## Historia de Usuario 4: Cargos y perfiles sugeridos (v2.0)

**Como** Administrador
**Quiero** mantener el catálogo de cargos del colegio y los perfiles que se sugieren para cada uno
**Para** asignar accesos coherentes con el puesto de cada persona.

### Escenario: Crear un cargo (v2.0)
**Dado** que estoy en "Cargos"
**Cuando** creo el cargo "Coordinador(a) académico" y le asocio el perfil sugerido Subdirector
**Entonces** el cargo queda vigente con su perfil sugerido.

### Escenario: Cargo repetido (v2.0)
**Dado** que ya existe el cargo "Docente de aula"
**Cuando** intento crear otro con el mismo nombre
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un cargo con ese nombre."

### Escenario: El cargo no da permisos (v2.0)
**Dado** que una persona tiene el cargo "Director(a)" pero su cuenta solo tiene el perfil Docente
**Cuando** ingresa al sistema
**Entonces** ve solo el menú y los permisos del perfil Docente.

### Escenario: Desactivar un cargo en uso (v2.0)
**Dado** que el cargo "Auxiliar de educación" está asignado a personas vigentes
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar un cargo asignado a personal vigente."

---

## Reglas de validación y negocio (resumen)

- **Campos obligatorios:** cuenta (Persona, Perfil, Nombre de usuario); perfil (Nombre); módulo (Código, Nombre, Orden); menú (Módulo, Nombre, Orden).
- **Campos condicionalmente obligatorios:** Contenedor y Ruta, obligatorios si y solo si el registro es una opción; un contenedor no tiene ruta ni padre.
- **Unicidad:** una cuenta vigente por persona; Nombre de usuario entre cuentas vigentes; Nombre de perfil; Código de módulo.
- **Estados de la cuenta:** `activo` ↔ `bloqueado` (desbloqueo manual) y `activo`/`bloqueado` ↔ `inactivo`; sin eliminación física.
- **Perfiles del sistema:** no se eliminan ni se renombran; el Administrador siempre tiene todos los permisos.
- **Autoprotección:** el Administrador no puede desactivar su cuenta ni retirarse el perfil Administrador. **(v2.0)**
- **Perfiles por cuenta (v2.0):** uno o más; uno principal; al menos uno vigente; retirar = vigencia 0 con historial.
- **Permisos:** el catálogo lo define el sistema; el Administrador solo los asigna a los perfiles.
- **Visibilidad del menú:** opción visible si el perfil tiene su permiso o si no exige ninguno; contenedor visible si tiene al menos una opción visible; nada no vigente se muestra.
- **Permisos de este RF:** solo el Administrador.
- **Auditoría:** todas las altas, ediciones, cambios de estado, restablecimientos y asignaciones de permisos (`RF-003`).
- **Perfil vs. cargo (v2.0):** permisos solo por perfil; el cargo es informativo; cada cargo puede tener perfiles sugeridos; nombre de cargo único; no se desactiva un cargo con personal vigente.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Usuarios (listado y formulario) · Perfiles (listado y matriz de permisos por módulo) · Módulos · Menú (árbol de contenedores y opciones). Escenarios: Listado · Vacío · Alta · Duplicado · Contraseña temporal · Perfil del sistema · Sin permiso.
