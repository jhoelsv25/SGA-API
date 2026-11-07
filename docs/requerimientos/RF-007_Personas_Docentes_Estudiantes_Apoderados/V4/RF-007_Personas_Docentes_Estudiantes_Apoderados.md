# RF-007: Personas — Docentes, Estudiantes y Apoderados

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Comunidad educativa
**Versión:** 4.0
**Fecha:** actualización v4.0: 2026-11-07 · v3.0: 2026-10-08
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 22 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (registro único: cargo, cuenta y roles; opción "Corregir datos críticos"), `RF-004` (equipos de marcación donde se usa la credencial).

> **Cambios de la versión 4.0 sobre la 3.0 (acuerdos con el colegio, 2026-11-07):**
>
> - **Una sola ficha académica vigente:** una persona no puede ser docente y estudiante a la vez. Para pasar de una condición a la otra, la ficha anterior se da de baja (docente `cesado`; estudiante `retirado`) con motivo, en el mismo paso de registro.
> - **Baja bloqueada si hay dependencias:** no se da de baja a un docente con cursos asignados en el año académico vigente, ni a un estudiante con matrícula activa.
> - **Reactivación:** una ficha dada de baja puede reactivarse si la persona no tiene la otra ficha vigente.
> - **Padrón:** las fichas dadas de baja se muestran distintas (p. ej. "Docente (baja)") y la acción "Dar de baja ficha" está disponible desde la fila de la persona.
> - Historia de Usuario nueva: **HU7 Cambio de condición docente ↔ estudiante**.
> - **Plantillas Excel estándar:** hojas Datos, Instrucciones y Listas, listas desplegables, los mismos datos de la persona en las 4 plantillas y validación estricta (sin correcciones en silencio).

> **Cambios de la versión 3.0 sobre la 2.0 (acuerdos con el colegio, 2026-10-08):**
>
> - **Un solo término: rol** (ya no "perfil"), según `RF-002` V3.
> - **Persona provisional:** una persona puede registrarse solo con sus datos básicos, sin ficha, cargo ni cuenta, y completarse después desde cualquier ficha.
> - **Búsqueda desde cualquier ficha:** al registrar un estudiante, docente o apoderado se busca la persona por documento o nombre; si existe, se reutiliza y se completan sus datos.
> - **Carga masiva desde cualquier ficha:** Personas, Estudiantes, Docentes y Apoderados tienen su plantilla Excel; cada fila se cruza con el padrón por documento.
> - **Un solo cargo vigente por persona,** asignado automáticamente según la ficha (Estudiante, Docente de aula, Apoderado(a)). Estudiantes y apoderados ahora sí tienen cargo.
> - **Datos críticos:** una vez vinculada a una ficha o cuenta, los datos críticos de la persona solo los cambian los roles con la opción "Corregir datos críticos", con motivo.
> - **Cese con otros cargos o fichas:** al cesar a un docente, solo se le retira el rol Docente si la persona tiene otra ficha o cargo vigente.

## Consideraciones y supuestos de negocio

- **Propósito.** Mantener un padrón único de las personas del colegio y sus fichas como docente, estudiante o apoderado. Al registrarlas, el sistema les crea su cuenta de acceso y, a quienes marcan asistencia, su credencial.
- **Padrón único.** Cada persona se registra una sola vez, identificada por **Tipo de documento + Número de documento**. Si una persona ya existe (por ejemplo, un docente que también es apoderado), se reutiliza su registro; no se duplica.
- **Persona provisional (v3.0).** Desde "Personas" se puede registrar a alguien solo con sus datos obligatorios, sin ficha, cargo ni cuenta, uno por uno o con la plantilla de personas. Queda en el padrón lista para vincularse después.
- **Búsqueda desde cualquier ficha (v3.0).** Al registrar un estudiante, docente o apoderado, primero se busca la persona por **documento o nombre**:
  - **Existe sin esa ficha:** se cargan sus datos, se completan los vacíos y se le agrega la ficha. Muestra "Esta persona ya está registrada. Se usarán sus datos."
  - **Existe con esa ficha:** se bloquea (ya es estudiante, docente o apoderado).
  - **No existe:** se registra con sus datos obligatorios y la ficha.
- **Las fichas se suman (v3.0).** Agregar una ficha no quita las demás: una docente que se registra como apoderada tiene las dos fichas, una sola cuenta y los dos roles.
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

- **Datos críticos y libres (v3.0).**

  | Nivel       | Campos                                                                                                                                            | Quién los cambia                                                                                                                                                                                                                |
  | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Crítico** | Tipo y número de documento, nombres, apellido paterno, apellido materno, fecha de nacimiento, sexo, código SIAGIE (estudiante), código de docente | Mientras la persona es **provisional** (sin ficha ni cuenta), quien la registra. Una vez **vinculada a una ficha o con cuenta**, solo los roles con la opción **"Corregir datos críticos"** (`RF-002`), indicando el **motivo** |
  | **Libre**   | Dirección, distrito, teléfono, celular, correo, foto y los demás datos de las fichas                                                              | Quien tenga acceso a la opción de editar                                                                                                                                                                                        |

  Cada corrección de un dato crítico queda en la bitácora con el valor anterior, el nuevo, el motivo, quién y cuándo (`RF-003`). La regla se valida también en el servidor, no solo en la pantalla.

- **Ficha de docente.** Código de docente (único), especialidad, título profesional, tipo de contrato (`nombrado`, `contratado`, `practicante`), jornada (20, 24, 30 o 40 horas), fecha de ingreso, fecha de cese (posterior al ingreso) y estado (`activo`, `licencia`, `cesado`). Incluye la **imagen de su firma**, que se imprime en la ficha de seguimiento docente (`RF-013`).
- **Ficha de estudiante.** **Código SIAGIE** (único; sirve para asignar las libretas en `RF-014`), fecha de ingreso, lengua materna, religión, discapacidad (el detalle solo si la tiene), grupo sanguíneo, alergias, condiciones médicas y seguro de salud. El estado (`activo`, `retirado`, `trasladado`, `egresado`) lo cambia la matrícula (`RF-009`).
- **Ficha de apoderado.** Ocupación, centro laboral, teléfono laboral y grado de instrucción.
- **Cargo (v3.0).** Toda persona con ficha o cuenta tiene **un solo cargo vigente** del catálogo (`RF-002`), con fecha de inicio y, al terminar, fecha de fin; el anterior queda en el historial con vigencia 0. Es el que se imprime en reportes y firmas (por ejemplo, "Diego Ramos — Director(a)"). Al agregar una ficha, el cargo se asigna solo si la persona **aún no tiene uno vigente**:

  | Ficha      | Cargo automático                                                   |
  | ---------- | ------------------------------------------------------------------ |
  | Estudiante | Estudiante                                                         |
  | Docente    | Docente de aula (el Administrador puede elegir otro cargo docente) |
  | Apoderado  | Apoderado(a)                                                       |

  **Excepción:** si su cargo vigente es Estudiante o Apoderado(a) y se le agrega la ficha de docente, el cargo pasa a Docente de aula, porque el puesto de personal es el que se imprime en reportes y firmas; el anterior queda en el historial. Un cargo de personal (Director(a), Personal de TI…) nunca se reemplaza al agregar una ficha.

  El personal sin ficha (Director(a), Secretario(a), Personal de TI…) se registra desde "Usuarios" (`RF-002`). El cargo no da accesos; solo sugiere roles.

- **Vínculo familiar.** Un estudiante puede tener varios apoderados y un apoderado varios estudiantes. Por cada vínculo se registra:
  - **Parentesco:** padre, madre, abuelo, abuela, hermano, hermana, tío, tía, tutor legal u otro.
  - **Apoderado principal:** uno solo por estudiante; recibe los comunicados y ve la libreta.
  - **Vive con el estudiante**, **autorizado a recogerlo** y **contacto de emergencia**.
- **Apoderados uno por uno y masivo.** Se registran desde la ficha del estudiante, uno por uno, **o en bloque** con una plantilla Excel propia del sistema.
- **Cuenta automática (v3.0).** Al agregar una ficha, el sistema usa el **registro único** de `RF-002` en una sola transacción: persona → ficha → cargo → cuenta → rol.

  | Ficha      | Rol        | Nombre de usuario   |
  | ---------- | ---------- | ------------------- |
  | Docente    | Docente    | Número de documento |
  | Estudiante | Estudiante | Código SIAGIE       |
  | Apoderado  | Apoderado  | Número de documento |

  La contraseña temporal se muestra una sola vez y la cuenta queda marcada para cambiarla en el primer ingreso (`RF-001`). Si la persona ya tiene cuenta, no se crea otra: se le **agrega el rol** y podrá cambiar de rol (`RF-001`). Una persona provisional no tiene cuenta hasta que se le agrega una ficha.

- **Credencial automática.** Al registrar un docente o estudiante, y al crear la cuenta de un administrativo (`RF-002`), el sistema genera su **credencial de marcación**: un código único y un PIN. Los apoderados no marcan y no tienen credencial.
  - El **carné** imprimible muestra foto, nombre, código y un **QR** con el código. **El PIN no se imprime en el carné.**
  - El PIN se muestra una sola vez al registrar y la persona puede cambiarlo después desde "Mi credencial".
  - Si se pierde el carné, se **anula** la credencial (con motivo) y se emite una nueva; la anterior deja de funcionar en los kioskos.
  - Una persona tiene una sola credencial activa.
- **Carga masiva desde cualquier ficha (v3.0).** Personas, Estudiantes, Docentes y Apoderados tienen su **plantilla Excel propia**, que se descarga desde su pantalla:

  | Plantilla   | Columnas                                                                                                            |
  | ----------- | ------------------------------------------------------------------------------------------------------------------- |
  | Personas    | Tipo y número de documento, apellido paterno, apellido materno, nombres, sexo, fecha de nacimiento, celular, correo |
  | Estudiantes | Las de Personas + código SIAGIE, fecha de ingreso                                                                   |
  | Docentes    | Las de Personas + código de docente, especialidad, tipo de contrato, jornada, fecha de ingreso                      |
  | Apoderados  | Código SIAGIE del estudiante + las de Personas + parentesco, es principal                                           |

  Cada fila se **cruza con el padrón** por tipo y número de documento:
  - **La persona existe:** se reutiliza, se completan solo los datos vacíos (**nunca se sobreescriben los críticos**) y se le agrega la ficha.
  - **No existe:** se crea con sus datos obligatorios y la ficha.
  - **Ya tiene esa ficha:** la fila se marca como "ya registrado" y se omite.

  Antes de importar, el sistema muestra una **vista previa** por fila (nueva, se vinculará a una persona existente, ya registrada, o con error y cuál). Al confirmar, importa solo las filas válidas; cada fila es un registro único (`RF-002`). Al final, un resumen descargable y el listado de usuarios, contraseñas temporales, códigos y PIN. Máximo **500 filas** por archivo.

- **Desactivar en vez de eliminar.** Las personas no se borran. Un docente pasa a `cesado`; un estudiante cambia de estado por la matrícula (`RF-009`). Al cesar a un docente: si la persona **no tiene otra ficha ni otro cargo vigente**, se desactivan su cuenta y su credencial y termina su cargo; **si los tiene** (por ejemplo, también es apoderado), solo se le retira el rol Docente y la cuenta sigue activa.
- **Quién registra.** Lo define Roles-Menú (`RF-002`). Por defecto: personas, estudiantes y apoderados, la Secretaria; docentes, el Administrador; el Director y el Subdirector consultan. Corregir datos críticos: solo el Administrador, salvo que se asigne la opción a otro rol.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Altas, ediciones, correcciones de datos críticos (con motivo), cambios de estado, importaciones y emisión o anulación de credenciales quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                                  | Mensaje                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona ya registrada                      | "Esta persona ya está registrada. Se usarán sus datos."                                                                                         |
| DNI inválido                               | "El DNI debe tener 8 dígitos."                                                                                                                  |
| Fecha de nacimiento futura                 | "La fecha de nacimiento no puede ser futura."                                                                                                   |
| Correo repetido                            | "El correo ya está registrado para otra persona."                                                                                               |
| Código de docente repetido                 | "Ya existe un docente con ese código."                                                                                                          |
| Código SIAGIE repetido                     | "Ya existe un estudiante con ese código SIAGIE."                                                                                                |
| Fecha de cese inválida                     | "La fecha de cese debe ser posterior a la fecha de ingreso."                                                                                    |
| Detalle de discapacidad sin marcar         | "Indique el detalle solo si el estudiante tiene discapacidad."                                                                                  |
| Segundo apoderado principal                | "El estudiante ya tiene un apoderado principal. Se cambiará al nuevo."                                                                          |
| Vínculo repetido                           | "Este apoderado ya está vinculado al estudiante."                                                                                               |
| Plantilla incorrecta                       | "El archivo no corresponde a la plantilla de estudiantes. Descárguela de nuevo."                                                                |
| Más de 500 filas                           | "El archivo supera las 500 filas. Divídalo en varios archivos."                                                                                 |
| Importación terminada                      | "Se importaron [N] estudiantes. [M] filas se omitieron; descargue el resumen."                                                                  |
| Credencial anulada                         | "La credencial anterior quedó anulada y se emitió una nueva."                                                                                   |
| Estudiante inexistente en plantilla (v2.0) | "No existe un estudiante con ese código SIAGIE."                                                                                                |
| Dos principales en el archivo (v2.0)       | "El estudiante ya tiene un apoderado principal en el archivo."                                                                                  |
| Fecha de fin de cargo inválida (v2.0)      | "La fecha de fin del cargo debe ser posterior a la de inicio."                                                                                  |
| Persona que ya tiene la ficha (v3.0)       | "Esta persona ya está registrada como [estudiante/docente/apoderado]."                                                                          |
| Dato crítico sin autorización (v3.0)       | "Su rol no está autorizado para modificar datos críticos de la persona."                                                                        |
| Corrección sin motivo (v3.0)               | "Indique el motivo de la corrección."                                                                                                           |
| Ficha académica vigente (v4.0)             | "Esta persona tiene una ficha de [docente/estudiante] activa. Para registrarla como [estudiante/docente] primero debe darse de baja esa ficha." |
| Docente con cursos (v4.0)                  | "No se puede dar de baja: el docente tiene cursos asignados en el año académico vigente. Reasígnelos primero."                                  |
| Estudiante con matrícula (v4.0)            | "No se puede dar de baja: el estudiante tiene una matrícula activa. Retírelo o trasládelo primero desde Matrícula."                             |
| Plantilla incorrecta (v3.0)                | "El archivo no corresponde a la plantilla de [personas/estudiantes/docentes/apoderados]. Descárguela de nuevo."                                 |

## Requerimientos fuera de alcance (Out of Scope)

- **Matrícula, retiro y traslado del estudiante.** Corresponde a `RF-009`.
- **Gestión de cuentas, roles, cargos y restablecimiento de contraseñas, y registro del personal sin ficha.** Corresponde a `RF-002`.
- **Consulta del documento en RENIEC.** No se contempla por ahora.
- **Uso de la credencial en los kioskos.** Corresponde a `RF-010` y `RF-011`.
- **Importación directa del archivo del SIAGIE.** Se usa la plantilla propia.
- **Historia clínica o psicológica.** Solo se registran los datos de salud básicos.

## Acuerdos y puntos abiertos

- **Importación (acordado).** Plantilla Excel propia del sistema.
- **Credencial (acordado).** Se genera automáticamente al registrar.
- **Apoderados (acordado, P-01).** Uno por uno y masivo con plantilla Excel. **(v2.0)**
- **Docente que es apoderado (acordado, P-02).** Se agrega el rol Apoderado a su cuenta. **(v2.0)**
- **Persona provisional, búsqueda y carga masiva desde cualquier ficha (acordado, 2026-10-08).** **(v3.0)**
- **Un cargo vigente por persona; estudiantes y apoderados tienen cargo (acordado, 2026-10-08).** **(v3.0)**
- **Datos críticos con la opción "Corregir datos críticos" (acordado, 2026-10-08).** **(v3.0)**

## Historia de Usuario 1: Docentes

**Como** Administrador
**Quiero** registrar y mantener la ficha de cada docente
**Para** asignarle cursos, controlar su asistencia y hacer su seguimiento.

### Escenario: Registrar un docente

**Dado** que la persona con DNI 45678912 no está en el padrón
**Cuando** completo sus datos personales y su ficha de docente y presiono "Guardar"
**Entonces** el sistema crea la persona, el docente en estado `activo`, su cargo Docente de aula, su cuenta con rol Docente y usuario 45678912, y su credencial de marcación
**Y** me muestra una sola vez su contraseña temporal y su PIN.

### Escenario: Persona ya registrada

**Dado** que la persona con DNI 45678912 ya existe como apoderado
**Cuando** la registro como docente
**Entonces** el sistema muestra "Esta persona ya está registrada. Se usarán sus datos.", agrega la ficha de docente y el rol Docente a su misma cuenta
**Y** como ya tiene el cargo Apoderado(a), lo cambia a Docente de aula (el anterior queda en el historial).

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
**Entonces** el sistema termina su cargo, desactiva su cuenta y anula su credencial.

### Escenario: Cesar a un docente que también es apoderado (v3.0)

**Dado** que la docente Flores también tiene ficha de apoderada y los roles Docente y Apoderado
**Cuando** la cambio a `cesado` y confirmo
**Entonces** el sistema solo le retira el rol Docente; su cuenta sigue activa con el rol Apoderado.

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
**Entonces** el sistema crea la persona, el estudiante en estado `activo`, su cargo Estudiante, su cuenta con rol Estudiante y usuario igual a su código SIAGIE, y su credencial de marcación
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

### Escenario: Plantilla estándar con listas y datos completos (v4.0)

**Dado** que estoy en "Importar" de Personas, Estudiantes, Docentes o Apoderados
**Cuando** descargo y abro la plantilla
**Entonces** veo las hojas «Datos», «Instrucciones» y «Listas»
**Y** las columnas obligatorias llevan `*`, tipo de documento, sexo, contrato, jornada, parentesco y SI/NO se eligen de una lista desplegable, y las fechas tienen formato de fecha
**Y** todas las plantillas traen los mismos datos de la persona (documento, apellidos, nombres, sexo, nacimiento, celular, correo, dirección y distrito) más los datos propios de la ficha (estudiante: lengua materna, religión y discapacidad; docente: especialidad y título profesional).

### Escenario: Fila con un valor fuera de lo permitido (v4.0)

**Dado** que subo un archivo con una fila sin sexo, con un tipo de contrato inválido o sin fecha de ingreso
**Cuando** el sistema arma la vista previa
**Entonces** marca esa fila con error y el motivo, y no la corrige por su cuenta ni la importa.

## Historia de Usuario 4: Apoderados y vínculo familiar

**Como** Secretaria
**Quiero** registrar los apoderados de cada estudiante y su parentesco
**Para** saber quién es responsable del estudiante y quién recibe la información.

### Escenario: Agregar un apoderado

**Dado** que estoy en la ficha de un estudiante
**Cuando** registro a su madre (DNI, nombres, apellidos, celular), parentesco "madre", la marco como apoderado principal y guardo
**Entonces** el sistema crea la persona, la ficha de apoderado, su cargo Apoderado(a), su cuenta con rol Apoderado y el vínculo con el estudiante
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

**Dado** que la docente Flores tiene cuenta con rol Docente
**Cuando** la registro como apoderada de su hijo
**Entonces** el sistema crea el vínculo familiar y **agrega el rol Apoderado** a su misma cuenta, sin crear otra
**Y** ella puede cambiar al rol Apoderado desde la cabecera.

### Escenario: Importar apoderados con plantilla (v2.0)

**Dado** que descargué la plantilla de apoderados (código SIAGIE del estudiante, tipo y número de documento, apellidos, nombres, parentesco, celular, correo y si es principal)
**Cuando** subo el archivo con 60 filas y confirmo la vista previa
**Entonces** el sistema crea o reutiliza cada apoderado, crea su cuenta o le agrega el rol, crea el vínculo con el estudiante y muestra el resumen de filas importadas y omitidas.

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

**Dado** que mi rol es Docente
**Cuando** intento abrir "Estudiantes" o "Docentes" para registrar
**Entonces** el sistema no me ofrece registrar, editar ni importar.

## Historia de Usuario 6: Personas, búsqueda y datos críticos (v3.0)

**Como** Secretaria o Administrador
**Quiero** registrar personas aunque aún no tengan ficha, encontrarlas desde cualquier ficha y proteger sus datos críticos
**Para** no duplicar personas ni cambiar sus datos sin control.

### Escenario: Registrar una persona provisional (v3.0)

**Dado** que el DNI 71234567 no está en el padrón
**Cuando** en "Personas" registro a Luis Quispe Mamani (DNI, nombres, apellidos, sexo) y guardo
**Entonces** el sistema crea la persona sin ficha, sin cargo y sin cuenta.

### Escenario: Completar a una persona desde una ficha (v3.0)

**Dado** que Luis Quispe (DNI 71234567) es una persona provisional
**Cuando** en "Estudiantes" lo busco por DNI o nombre, completo su código SIAGIE y su ficha, y guardo
**Entonces** el sistema reutiliza la persona y crea la ficha de estudiante, el cargo Estudiante, su cuenta con rol Estudiante y su credencial.

### Escenario: Persona que ya tiene esa ficha (v3.0)

**Dado** que Luis Quispe ya tiene ficha de estudiante
**Cuando** intento registrarlo otra vez como estudiante
**Entonces** el sistema bloquea el guardado y muestra "Esta persona ya está registrada como estudiante."

### Escenario: Importar personas con la plantilla (v3.0)

**Dado** que subo la plantilla de personas con 300 filas, 20 de ellas con un documento que ya existe en el padrón
**Cuando** confirmo la vista previa
**Entonces** el sistema crea 280 personas provisionales y en las 20 existentes solo completa los datos vacíos, sin cambiar sus datos críticos.

### Escenario: Editar un dato crítico sin autorización (v3.0)

**Dado** que mi rol no tiene la opción "Corregir datos críticos"
**Cuando** intento cambiar los nombres de un estudiante con ficha
**Entonces** el sistema no me permite editarlos
**Y** si se intenta por otra vía, el servidor lo rechaza con "Su rol no está autorizado para modificar datos críticos de la persona."

### Escenario: Corregir un dato crítico con autorización (v3.0)

**Dado** que mi rol tiene la opción "Corregir datos críticos"
**Cuando** corrijo el apellido materno de un docente, indico el motivo "Error de digitación según DNI" y guardo
**Entonces** el sistema guarda el cambio y lo registra en la bitácora con el valor anterior, el nuevo, el motivo, quién y cuándo.

### Escenario: Corrección sin motivo (v3.0)

**Dado** que estoy corrigiendo un dato crítico
**Cuando** intento guardar sin motivo
**Entonces** el sistema impide guardar y muestra "Indique el motivo de la corrección."

### Escenario: Editar datos de una persona provisional (v3.0)

**Dado** que una persona no tiene ficha ni cuenta
**Cuando** corrijo su número de documento
**Entonces** el sistema lo guarda sin pedir autorización especial.

### Escenario: Editar un dato libre (v3.0)

**Dado** que estoy en la ficha de un apoderado
**Cuando** cambio su celular y guardo
**Entonces** el sistema guarda el cambio sin pedir autorización especial.

### Escenario: Historial de cargos (v3.0)

**Dado** que una persona tuvo los cargos Apoderado(a) y luego Docente de aula
**Cuando** abro su ficha
**Entonces** veo cada cargo con sus fechas y cuál es el vigente.

---

## Reglas de validación y negocio (resumen)

- **Persona:** obligatorios Tipo y Número de documento, Nombres, Apellido paterno y Sexo; documento único (DNI de 8 dígitos); correo único y válido; fecha de nacimiento no futura; foto PNG o JPG de hasta 1 MB.
- **Padrón único:** una persona se reutiliza si ya existe; no se duplica.
- **Docente:** código único; fecha de cese posterior al ingreso; al cesar se desactivan su cuenta y su credencial.
- **Estudiante:** código SIAGIE único; detalle de discapacidad solo si la tiene; el estado lo cambia la matrícula.
- **Vínculo familiar:** un vínculo por par estudiante–apoderado; un solo apoderado principal por estudiante.
- **Registro único (v3.0):** persona → ficha → cargo → cuenta → rol en una transacción (`RF-002`); una cuenta por persona; las fichas se suman.
- **Credencial automática:** docentes, estudiantes y administrativos; código único y PIN cifrado; una activa por persona; el PIN no se imprime.
- **Importación (v3.0):** plantilla propia por Personas, Estudiantes, Docentes y Apoderados; cruce por documento; nunca sobreescribe datos críticos; máximo 500 filas; vista previa; solo filas válidas.
- **Datos críticos (v3.0):** bloqueados al vincular la persona a una ficha o cuenta; solo los corrigen los roles con "Corregir datos críticos", con motivo y bitácora.
- **Acceso:** por Roles-Menú (`RF-002`); por defecto, personas, estudiantes y apoderados, la Secretaria; docentes, el Administrador; consulta, Director y Subdirector.
- **Auditoría:** altas, ediciones, cambios de estado, importaciones y credenciales (`RF-003`).
- **Cargo (v3.0):** uno vigente por persona con ficha o cuenta; automático según la ficha si aún no tiene; fin ≥ inicio; el terminado queda con vigencia 0; no da accesos.
- **Cese (v3.0):** si la persona tiene otra ficha o cargo vigente, solo se retira el rol Docente.
- **Ficha académica única (v4.0):** vigente = docente `activo`/`licencia` o estudiante `activo`; una persona solo puede tener una. La baja exige motivo y se bloquea con dependencias; la reactivación exige que la otra ficha esté de baja.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Personas (listado, registro provisional, corrección de datos críticos) · Docentes (listado y ficha) · Estudiantes (listado, ficha con pestaña de apoderados) · Importar (por ficha: plantilla, vista previa, resumen) · búsqueda de persona por documento o nombre · Carné imprimible · Mi credencial. Escenarios: Alta · Persona ya registrada · Vista previa con errores · Importación terminada · Carné perdido.

## Historia de Usuario 7: Cambio de condición docente ↔ estudiante (v4.0)

**Como** Secretaria o Administrador
**Quiero** que una persona pase de docente a estudiante (o al revés) dando de baja su ficha anterior
**Para** que el padrón no tenga a nadie con dos fichas académicas vigentes.

### Escenario: Registrar como estudiante a un docente activo (v4.0)

**Dado** que Hever tiene ficha de docente `activo` y sin cursos asignados en el año vigente
**Cuando** lo registro como estudiante, confirmo la baja de su ficha de docente e indico el motivo
**Entonces** el sistema cesa su ficha de docente, crea su ficha de estudiante y deja registrado el motivo en la bitácora
**Y** si la creación falla, la ficha de docente vuelve a `activo`.

### Escenario: Registrar como docente a un estudiante activo (v4.0)

**Dado** que una persona tiene ficha de estudiante `activo` y sin matrícula activa
**Cuando** la registro como docente, confirmo la baja de su ficha de estudiante e indico el motivo
**Entonces** el sistema deja su ficha de estudiante en `retirado` y crea su ficha de docente.

### Escenario: Registrar sin confirmar la baja (v4.0)

**Dado** que la persona tiene una ficha académica vigente
**Cuando** intento registrarla en la otra condición sin confirmar la baja
**Entonces** el sistema no guarda nada y muestra "Esta persona tiene una ficha de [docente/estudiante] activa. Para registrarla como [estudiante/docente] primero debe darse de baja esa ficha."

### Escenario: Baja bloqueada por cursos asignados (v4.0)

**Dado** que el docente tiene cursos asignados en el año académico vigente
**Cuando** intento dar de baja su ficha, sola o como parte de un cambio de condición
**Entonces** el sistema lo impide y muestra "No se puede dar de baja: el docente tiene cursos asignados en el año académico vigente. Reasígnelos primero."

### Escenario: Baja bloqueada por matrícula activa (v4.0)

**Dado** que el estudiante tiene una matrícula activa
**Cuando** intento dar de baja su ficha, sola o como parte de un cambio de condición
**Entonces** el sistema lo impide y muestra "No se puede dar de baja: el estudiante tiene una matrícula activa. Retírelo o trasládelo primero desde Matrícula."

### Escenario: Reactivar una ficha dada de baja (v4.0)

**Dado** que una persona tiene su ficha de docente `cesado` (o de estudiante `retirado` o `trasladado`) y no tiene la otra ficha vigente
**Cuando** reactivo la ficha
**Entonces** el sistema la deja `activo` y registra la reactivación en la bitácora
**Y** no permite reactivar a un estudiante `egresado`.

### Escenario: Reactivar con la otra ficha vigente (v4.0)

**Dado** que una persona tiene una ficha de docente `cesado` y otra de estudiante `activo`
**Cuando** intento reactivar la ficha de docente
**Entonces** el sistema lo impide hasta que se dé de baja la ficha de estudiante.
