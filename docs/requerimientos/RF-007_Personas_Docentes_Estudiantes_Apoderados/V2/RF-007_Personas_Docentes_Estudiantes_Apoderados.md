# RF-007: Personas — Docentes, Estudiantes y Apoderados

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Comunidad educativa
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-10-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (creación de cuentas y nombre de usuario), `RF-004` (equipos de marcación donde se usa la credencial).

> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
> *   **Apoderados masivos (P-01):** además del registro uno por uno, se pueden importar con una plantilla Excel.
> *   **Docente que es apoderado (P-02):** si la persona ya tiene cuenta, se le **agrega el perfil Apoderado** a su misma cuenta (varios perfiles).
> *   **Cargo del personal (v2.0):** cada persona del personal (docentes y administrativos) tiene uno o más cargos con fecha de inicio y fin; al asignarlo, el sistema sugiere sus perfiles (`RF-002`). El cargo terminado queda en el historial (vigencia 0).

## Consideraciones y supuestos de negocio

- **Propósito.** Mantener un padrón único de las personas del colegio y sus fichas como docente, estudiante o apoderado. Al registrarlas, el sistema les crea su cuenta de acceso y, a quienes marcan asistencia, su credencial.
- **Padrón único.** Cada persona se registra una sola vez, identificada por **Tipo de documento + Número de documento**. Si una persona ya existe (por ejemplo, un docente que también es apoderado), se reutiliza su registro; no se duplica.
- **Datos de la persona.**

  | Dato                                   | Obligatorio | Regla                                                          |
  | -------------------------------------- | ----------- | -------------------------------------------------------------- |
  | Tipo de documento                      | Sí          | `dni`, `carne_extranjeria`, `pasaporte` o `partida_nacimiento` |
  | Número de documento                    | Sí          | DNI: 8 dígitos. Único junto con el tipo                        |
  | Nombres                                | Sí          |                                                                |
  | Apellido paterno                       | Sí          |                                                                |
  | Apellido materno                       | No          | Formato SIAGIE: apellidos por separado                         |
  | Sexo                                   | Sí          | `M` o `F`                                                      |
  | Fecha de nacimiento                    | No          | No puede ser futura                                            |
  | Dirección, distrito, teléfono, celular | No          |                                                                |
  | Correo                                 | No          | Formato válido; único entre personas                           |
  | Foto                                   | No          | PNG o JPG de hasta 1 MB                                        |

- **Ficha de docente.** Código de docente (único), especialidad, título profesional, tipo de contrato (`nombrado`, `contratado`, `practicante`), jornada (20, 24, 30 o 40 horas), fecha de ingreso, fecha de cese (posterior al ingreso) y estado (`activo`, `licencia`, `cesado`). Incluye la **imagen de su firma**, que se imprime en la ficha de seguimiento docente (`RF-013`).
- **Ficha de estudiante.** **Código SIAGIE** (único; sirve para asignar las libretas en `RF-014`), fecha de ingreso, lengua materna, religión, discapacidad (el detalle solo si la tiene), grupo sanguíneo, alergias, condiciones médicas y seguro de salud. El estado (`activo`, `retirado`, `trasladado`, `egresado`) lo cambia la matrícula (`RF-009`).
- **Ficha de apoderado.** Ocupación, centro laboral, teléfono laboral y grado de instrucción.
- **Cargo del personal (v2.0).** Docentes y administrativos tienen uno o más **cargos** del catálogo (`RF-002`), cada uno con fecha de inicio y, al terminar, fecha de fin; uno es el **principal** y es el que se imprime en reportes y firmas (por ejemplo, "Diego Ramos — Director(a)"). Un cargo terminado queda con **vigencia 0** (historial laboral). El cargo **no da permisos**: al asignarlo, el sistema **sugiere** los perfiles del cargo y el Administrador decide si los aplica. Estudiantes y apoderados no tienen cargo.
- **Vínculo familiar.** Un estudiante puede tener varios apoderados y un apoderado varios estudiantes. Por cada vínculo se registra:
  - **Parentesco:** padre, madre, abuelo, abuela, hermano, hermana, tío, tía, tutor legal u otro.
  - **Apoderado principal:** uno solo por estudiante; recibe los comunicados y ve la libreta.
  - **Vive con el estudiante**, **autorizado a recogerlo** y **contacto de emergencia**.
- **Apoderados uno por uno y masivo (v2.0).** Se registran desde la ficha del estudiante, uno por uno, **o en bloque** con una plantilla Excel propia del sistema.
- **Cuenta automática.** Al registrar un docente, estudiante o apoderado, el sistema le crea su cuenta (`RF-002`):

  | Persona    | Perfil        | Nombre de usuario |
  | ---------- | ---------- | ----------------- |
  | Docente    | Docente    | DNI               |
  | Estudiante | Estudiante | Código SIAGIE     |
  | Apoderado  | Apoderado  | DNI               |

  La contraseña temporal se muestra una sola vez y la cuenta queda marcada para cambiarla en el primer ingreso (`RF-001`). Si la persona ya tiene cuenta (por ejemplo, un docente que también es apoderado), no se crea otra. **Precisión (v2.0):** se le **agrega el perfil** correspondiente a su cuenta existente y podrá cambiar de perfil (`RF-001`, `RF-002`).

- **Credencial automática.** Al registrar un docente o estudiante, y al crear la cuenta de un administrativo (`RF-002`), el sistema genera su **credencial de marcación**: un código único y un PIN. Los apoderados no marcan y no tienen credencial.
  - El **carné** imprimible muestra foto, nombre, código y un **QR** con el código. **El PIN no se imprime en el carné.**
  - El PIN se muestra una sola vez al registrar y la persona puede cambiarlo después desde "Mi credencial".
  - Si se pierde el carné, se **anula** la credencial (con motivo) y se emite una nueva; la anterior deja de funcionar en los kioskos.
  - Una persona tiene una sola credencial activa.
- **Importación masiva de estudiantes.** Desde una **plantilla Excel propia** del sistema, que se descarga desde la pantalla:
  - **Columnas:** Tipo de documento, Número de documento, Apellido paterno, Apellido materno, Nombres, Sexo, Fecha de nacimiento, Código SIAGIE, Fecha de ingreso.
  - Antes de importar, el sistema muestra una **vista previa** con el resultado de cada fila: válida, con error (y cuál) o ya existente.
  - Al confirmar, importa solo las filas válidas. Las filas con error o ya existentes se omiten y se listan en un resumen descargable.
  - Por cada estudiante importado se crean su cuenta y su credencial. Al final se puede descargar un listado con usuario, contraseña temporal, código y PIN para entregarlos.
  - Máximo **500 filas** por archivo.
- **Desactivar en vez de eliminar.** Las personas no se borran. Un docente pasa a `cesado`; un estudiante cambia de estado por la matrícula (`RF-009`). Al cesar a un docente se desactivan su cuenta y su credencial.
- **Quién registra.** Estudiantes y apoderados: la Secretaria. Docentes: el Administrador. El Director y el Subdirector consultan.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Altas, ediciones, cambios de estado, importaciones y emisión o anulación de credenciales quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                          | Mensaje                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Persona ya registrada              | "Esta persona ya está registrada. Se usarán sus datos."                          |
| DNI inválido                       | "El DNI debe tener 8 dígitos."                                                   |
| Fecha de nacimiento futura         | "La fecha de nacimiento no puede ser futura."                                    |
| Correo repetido                    | "El correo ya está registrado para otra persona."                                |
| Código de docente repetido         | "Ya existe un docente con ese código."                                           |
| Código SIAGIE repetido             | "Ya existe un estudiante con ese código SIAGIE."                                 |
| Fecha de cese inválida             | "La fecha de cese debe ser posterior a la fecha de ingreso."                     |
| Detalle de discapacidad sin marcar | "Indique el detalle solo si el estudiante tiene discapacidad."                   |
| Segundo apoderado principal        | "El estudiante ya tiene un apoderado principal. Se cambiará al nuevo."           |
| Vínculo repetido                   | "Este apoderado ya está vinculado al estudiante."                                |
| Plantilla incorrecta               | "El archivo no corresponde a la plantilla de estudiantes. Descárguela de nuevo." |
| Más de 500 filas                   | "El archivo supera las 500 filas. Divídalo en varios archivos."                  |
| Importación terminada              | "Se importaron [N] estudiantes. [M] filas se omitieron; descargue el resumen."   |
| Credencial anulada                 | "La credencial anterior quedó anulada y se emitió una nueva."                    |
| Estudiante inexistente en plantilla (v2.0) | "No existe un estudiante con ese código SIAGIE." |
| Dos principales en el archivo (v2.0) | "El estudiante ya tiene un apoderado principal en el archivo." |
| Fecha de fin de cargo inválida (v2.0) | "La fecha de fin del cargo debe ser posterior a la de inicio." |

## Requerimientos fuera de alcance (Out of Scope)

- **Matrícula, retiro y traslado del estudiante.** Corresponde a `RF-009`.
- **Gestión de cuentas, perfiles y restablecimiento de contraseñas.** Corresponde a `RF-002`.
- **Uso de la credencial en los kioskos.** Corresponde a `RF-010` y `RF-011`.
- **Importación masiva de docentes.** No se contempla.
- **Importación directa del archivo del SIAGIE.** Se usa la plantilla propia.
- **Historia clínica o psicológica.** Solo se registran los datos de salud básicos.

## Acuerdos y puntos abiertos

- **Importación (acordado).** Plantilla Excel propia del sistema.
- **Credencial (acordado).** Se genera automáticamente al registrar.
- **Apoderados (acordado, P-01).** Uno por uno y masivo con plantilla Excel. **(v2.0)**
- **Docente que es apoderado (acordado, P-02).** Se agrega el perfil Apoderado a su cuenta. **(v2.0)**

## Historia de Usuario 1: Docentes

**Como** Administrador
**Quiero** registrar y mantener la ficha de cada docente
**Para** asignarle cursos, controlar su asistencia y hacer su seguimiento.

### Escenario: Registrar un docente

**Dado** que la persona con DNI 45678912 no está en el padrón
**Cuando** completo sus datos personales y su ficha de docente y presiono "Guardar"
**Entonces** el sistema crea la persona, el docente en estado `activo`, su cuenta con perfil Docente y usuario 45678912, y su credencial de marcación
**Y** me muestra una sola vez su contraseña temporal y su PIN.

### Escenario: Persona ya registrada

**Dado** que la persona con DNI 45678912 ya existe como apoderado
**Cuando** la registro como docente
**Entonces** el sistema muestra "Esta persona ya está registrada. Se usarán sus datos." y solo agrega la ficha de docente.

### Escenario: DNI inválido

**Dado** que estoy registrando una persona con tipo de documento DNI
**Cuando** ingreso un número de 7 dígitos
**Entonces** el sistema impide guardar y muestra "El DNI debe tener 8 dígitos."

### Escenario: Código de docente repetido

**Dado** que ya existe un docente con código "DOC015"
**Cuando** intento registrar otro con el mismo código
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un docente con ese código."

### Escenario: Subir la firma del docente

**Dado** que estoy en la ficha del docente
**Cuando** subo la imagen de su firma y guardo
**Entonces** el sistema la guarda para imprimirla en la ficha de seguimiento docente.

### Escenario: Cesar a un docente

**Dado** que un docente está `activo`
**Cuando** registro su fecha de cese, cambio su estado a `cesado` y confirmo
**Entonces** el sistema desactiva su cuenta y anula su credencial.

### Escenario: Fecha de cese inválida

**Dado** que el docente ingresó el 01/03/2027
**Cuando** registro como fecha de cese el 15/02/2027
**Entonces** el sistema impide guardar y muestra "La fecha de cese debe ser posterior a la fecha de ingreso."

## Historia de Usuario 2: Estudiantes

**Como** Secretaria
**Quiero** registrar y mantener la ficha de cada estudiante
**Para** matricularlo y que pueda usar el sistema.

### Escenario: Registrar un estudiante

**Dado** que el estudiante no está en el padrón
**Cuando** completo sus datos personales, su código SIAGIE y su ficha, y presiono "Guardar"
**Entonces** el sistema crea la persona, el estudiante en estado `activo`, su cuenta con perfil Estudiante y usuario igual a su código SIAGIE, y su credencial de marcación
**Y** me muestra una sola vez su contraseña temporal y su PIN.

### Escenario: Código SIAGIE repetido

**Dado** que ya existe un estudiante con ese código SIAGIE
**Cuando** intento registrar otro con el mismo código
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un estudiante con ese código SIAGIE."

### Escenario: Detalle de discapacidad sin marcarla

**Dado** que estoy registrando un estudiante sin marcar "Tiene discapacidad"
**Cuando** escribo un detalle de discapacidad
**Entonces** el sistema impide guardar y muestra "Indique el detalle solo si el estudiante tiene discapacidad."

### Escenario: Fecha de nacimiento futura

**Dado** que estoy registrando una persona
**Cuando** ingreso una fecha de nacimiento posterior a hoy
**Entonces** el sistema impide guardar y muestra "La fecha de nacimiento no puede ser futura."

### Escenario: Listado de estudiantes

**Dado** que estoy en "Estudiantes"
**Cuando** abro el listado
**Entonces** el sistema muestra código SIAGIE, apellidos y nombres, documento, sección actual y estado, ordenado por apellidos
**Y** permite filtrar por grado, sección y estado, y buscar por nombre, documento o código.

## Historia de Usuario 3: Importación masiva de estudiantes

**Como** Secretaria
**Quiero** cargar la lista de estudiantes desde la plantilla Excel del sistema
**Para** no registrarlos uno por uno al inicio del año.

### Escenario: Descargar la plantilla

**Dado** que estoy en "Importar estudiantes"
**Cuando** presiono "Descargar plantilla"
**Entonces** el sistema descarga un Excel con las columnas requeridas y una fila de ejemplo.

### Escenario: Vista previa con errores

**Dado** que subo una plantilla con 120 filas, 3 con DNI inválido y 2 de estudiantes ya registrados
**Cuando** el sistema termina de leerla
**Entonces** muestra 115 filas válidas, 3 con su error y 2 marcadas como ya existentes, sin guardar nada todavía.

### Escenario: Confirmar la importación

**Dado** que la vista previa tiene 115 filas válidas
**Cuando** presiono "Importar"
**Entonces** el sistema crea los 115 estudiantes con su cuenta y su credencial, y muestra "Se importaron 115 estudiantes. 5 filas se omitieron; descargue el resumen."
**Y** permite descargar el listado de usuarios, contraseñas temporales, códigos y PIN.

### Escenario: Archivo que no es la plantilla

**Dado** que estoy en "Importar estudiantes"
**Cuando** subo un Excel con otras columnas
**Entonces** el sistema rechaza el archivo y muestra "El archivo no corresponde a la plantilla de estudiantes. Descárguela de nuevo."

### Escenario: Archivo demasiado grande

**Dado** que estoy en "Importar estudiantes"
**Cuando** subo una plantilla con 650 filas
**Entonces** el sistema rechaza el archivo y muestra "El archivo supera las 500 filas. Divídalo en varios archivos."

## Historia de Usuario 4: Apoderados y vínculo familiar

**Como** Secretaria
**Quiero** registrar los apoderados de cada estudiante y su parentesco
**Para** saber quién es responsable del estudiante y quién recibe la información.

### Escenario: Agregar un apoderado

**Dado** que estoy en la ficha de un estudiante
**Cuando** registro a su madre (DNI, nombres, apellidos, celular), parentesco "madre", la marco como apoderado principal y guardo
**Entonces** el sistema crea la persona, la ficha de apoderado, su cuenta con perfil Apoderado y el vínculo con el estudiante
**Y** me muestra una sola vez su contraseña temporal.

### Escenario: Apoderado que ya existe

**Dado** que el padre ya está registrado como apoderado de otro hijo
**Cuando** lo agrego a este estudiante por su DNI
**Entonces** el sistema reutiliza su registro y su cuenta y solo crea el nuevo vínculo.

### Escenario: Cambiar el apoderado principal

**Dado** que la madre es la apoderada principal
**Cuando** marco al padre como apoderado principal
**Entonces** el sistema muestra "El estudiante ya tiene un apoderado principal. Se cambiará al nuevo." y, al confirmar, deja al padre como principal.

### Escenario: Vínculo repetido

**Dado** que la madre ya está vinculada al estudiante
**Cuando** intento vincularla otra vez
**Entonces** el sistema bloquea el guardado y muestra "Este apoderado ya está vinculado al estudiante."

### Escenario: Quitar un vínculo

**Dado** que un tío figura como contacto de emergencia
**Cuando** quito el vínculo y confirmo
**Entonces** el sistema lo retira de la ficha del estudiante, sin borrar a la persona.

### Escenario: Docente que también es apoderado (v2.0)
**Dado** que la docente Flores tiene cuenta con perfil Docente
**Cuando** la registro como apoderada de su hijo
**Entonces** el sistema crea el vínculo familiar y **agrega el perfil Apoderado** a su misma cuenta, sin crear otra
**Y** ella puede cambiar al perfil Apoderado desde la cabecera.

### Escenario: Importar apoderados con plantilla (v2.0)
**Dado** que descargué la plantilla de apoderados (código SIAGIE del estudiante, tipo y número de documento, apellidos, nombres, parentesco, celular, correo y si es principal)
**Cuando** subo el archivo con 60 filas y confirmo la vista previa
**Entonces** el sistema crea o reutiliza cada apoderado, crea su cuenta o le agrega el perfil, crea el vínculo con el estudiante y muestra el resumen de filas importadas y omitidas.

### Escenario: Estudiante no encontrado en la plantilla (v2.0)
**Dado** que una fila tiene un código SIAGIE que no existe
**Cuando** el sistema lee la plantilla
**Entonces** marca esa fila con el error "No existe un estudiante con ese código SIAGIE." y no la importa.

### Escenario: Dos apoderados principales en la plantilla (v2.0)
**Dado** que la plantilla marca a la madre y al padre como principales del mismo estudiante
**Cuando** el sistema lee la plantilla
**Entonces** marca la segunda fila con el error "El estudiante ya tiene un apoderado principal en el archivo." y no la importa.

## Historia de Usuario 5: Credencial de marcación

**Como** Secretaria o Administrador
**Quiero** imprimir el carné y reemplazar credenciales perdidas
**Para** que cada persona pueda marcar en los kioskos.

### Escenario: Imprimir el carné

**Dado** que un estudiante tiene su credencial activa
**Cuando** presiono "Imprimir carné"
**Entonces** el sistema genera el carné con foto, nombre, código y QR, sin el PIN.

### Escenario: Carné perdido

**Dado** que un docente perdió su carné
**Cuando** presiono "Anular y emitir nueva", indico el motivo y confirmo
**Entonces** la credencial anterior deja de funcionar en los kioskos, se emite una nueva con otro código y PIN, y el sistema muestra "La credencial anterior quedó anulada y se emitió una nueva."

### Escenario: Cambiar mi PIN

**Dado** que soy docente con sesión iniciada
**Cuando** en "Mi credencial" ingreso un nuevo PIN y lo confirmo
**Entonces** el sistema guarda el nuevo PIN cifrado y lo usa en las siguientes marcaciones.

### Escenario: Usuario sin permiso

**Dado** que mi perfil es Docente
**Cuando** intento abrir "Estudiantes" o "Docentes" para registrar
**Entonces** el sistema no me ofrece registrar, editar ni importar.

## Historia de Usuario 6: Cargos del personal (v2.0)

**Como** Administrador
**Quiero** registrar el cargo de cada persona del personal y su historial
**Para** saber qué puesto ocupa cada uno y usarlo en reportes y firmas.

### Escenario: Asignar un cargo con perfiles sugeridos (v2.0)
**Dado** que la persona Diego Ramos está en el padrón
**Cuando** le asigno el cargo "Director(a)" desde el 01/03/2027
**Entonces** el sistema guarda el cargo como principal y me sugiere agregar el perfil Director a su cuenta
**Y** solo lo agrega si yo lo confirmo.

### Escenario: Terminar un cargo (v2.0)
**Dado** que una persona tiene el cargo "Docente de aula" vigente
**Cuando** registro su fecha de fin y le asigno el cargo "Subdirector(a)"
**Entonces** el cargo anterior queda con vigencia 0 en su historial y el nuevo pasa a ser el principal
**Y** sus perfiles no cambian hasta que el Administrador los ajuste.

### Escenario: Fecha de fin anterior al inicio (v2.0)
**Dado** que estoy terminando un cargo que empezó el 01/03/2027
**Cuando** registro como fecha de fin el 15/02/2027
**Entonces** el sistema impide guardar y muestra "La fecha de fin del cargo debe ser posterior a la de inicio."

### Escenario: Historial laboral (v2.0)
**Dado** que una persona tuvo varios cargos
**Cuando** abro su ficha
**Entonces** veo cada cargo con sus fechas y cuál es el principal vigente.

### Escenario: Cargo en reportes (v2.0)
**Dado** que el Director tiene el cargo principal "Director(a)"
**Cuando** se imprime la ficha de seguimiento docente (`RF-013`)
**Entonces** el espacio de firma muestra su nombre y su cargo.

---

## Reglas de validación y negocio (resumen)

- **Persona:** obligatorios Tipo y Número de documento, Nombres, Apellido paterno y Sexo; documento único (DNI de 8 dígitos); correo único y válido; fecha de nacimiento no futura; foto PNG o JPG de hasta 1 MB.
- **Padrón único:** una persona se reutiliza si ya existe; no se duplica.
- **Docente:** código único; fecha de cese posterior al ingreso; al cesar se desactivan su cuenta y su credencial.
- **Estudiante:** código SIAGIE único; detalle de discapacidad solo si la tiene; el estado lo cambia la matrícula.
- **Vínculo familiar:** un vínculo por par estudiante–apoderado; un solo apoderado principal por estudiante.
- **Cuenta automática:** al registrar docente, estudiante o apoderado; una cuenta por persona.
- **Credencial automática:** docentes, estudiantes y administrativos; código único y PIN cifrado; una activa por persona; el PIN no se imprime.
- **Importación:** solo plantilla propia; máximo 500 filas; vista previa; se importan solo las filas válidas.
- **Permisos:** estudiantes y apoderados, la Secretaria; docentes, el Administrador; consulta, Director y Subdirector.
- **Auditoría:** altas, ediciones, cambios de estado, importaciones y credenciales (`RF-003`).
- **Cargos (v2.0):** solo personal; uno principal vigente; fin ≥ inicio; un cargo terminado queda con vigencia 0; el cargo no da permisos, solo sugiere perfiles.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Docentes (listado y ficha) · Estudiantes (listado, ficha con pestaña de apoderados) · Importar estudiantes (descarga de plantilla, vista previa, resumen) · Carné imprimible · Mi credencial. Escenarios: Alta · Persona ya registrada · Vista previa con errores · Importación terminada · Carné perdido.
