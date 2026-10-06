# RF-006: Grados, Cursos y Plan de Estudios

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Estructura académica
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 6 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permiso de Administrador).

## Consideraciones y supuestos de negocio

- **Propósito.** Definir qué cursos dicta el colegio y cuántas horas semanales tiene cada uno en cada grado. Con esto se arma la carga académica y el horario de cada sección (`RF-008`).
- **Grados fijos.** El colegio es solo de secundaria: los grados **1.° a 5.°** vienen precargados. No se crean ni se eliminan; solo se puede editar su nombre visible (por ejemplo, "5.° de secundaria").
- **Cursos.** Cada curso tiene código (único), nombre, área curricular, descripción opcional y un color que lo identifica en el horario y en el aula virtual.
- **Áreas curriculares.** Las del currículo nacional de secundaria, más los talleres propios del colegio:

  | Área                                            | Ejemplo de curso          |
  | ----------------------------------------------- | ------------------------- |
  | Matemática                                      | Matemática                |
  | Comunicación                                    | Comunicación              |
  | Inglés                                          | Inglés                    |
  | Arte y Cultura                                  | Arte y Cultura            |
  | Ciencias Sociales                               | Ciencias Sociales         |
  | Desarrollo Personal, Ciudadanía y Cívica (DPCC) | DPCC                      |
  | Educación Física                                | Educación Física          |
  | Educación Religiosa                             | Educación Religiosa       |
  | Ciencia y Tecnología                            | Ciencia y Tecnología      |
  | Educación para el Trabajo (EPT)                 | EPT                       |
  | Tutoría                                         | Tutoría                   |
  | Taller                                          | **Taller de Computación** |

- **Cursos precargados.** El sistema trae un curso por cada área del currículo y el Taller de Computación. El Administrador puede editarlos o crear más (por ejemplo, otro taller).
- **Desactivar en vez de eliminar.** Un curso no se borra; se desactiva. Un curso inactivo no se ofrece para nuevos planes de estudio ni para nueva carga académica, pero sigue visible en los registros pasados.
- **No se desactiva un curso en uso.** Si el curso tiene carga académica en el año en curso (`RF-008`), no se puede desactivar.
- **Plan de estudios.** Para cada grado se indica qué cursos lleva y cuántas horas semanales (mayor que 0). Un curso aparece una sola vez por grado.
- **Total de horas.** La pantalla muestra la suma de horas semanales del grado, como referencia para armar el horario. No bloquea.
- **Copiar plan.** Se puede copiar el plan de un grado a otro para no empezar de cero.
- **No se quita un curso en uso.** Si un curso del plan ya tiene carga académica en alguna sección de ese grado en el año en curso (`RF-008`), no se puede quitar del plan; primero se retira de la carga académica.
- **Quién gestiona.** Solo el Administrador. Todos los roles internos pueden consultar.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear, editar o desactivar cursos y cambiar el plan de estudios queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                 | Mensaje                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| Código de curso repetido  | "Ya existe un curso con ese código."                                             |
| Color inválido            | "Elija un color válido."                                                         |
| Curso en uso              | "No se puede desactivar: el curso tiene carga académica en el año en curso."     |
| Curso repetido en el plan | "El curso ya está en el plan de estudios de este grado."                         |
| Horas inválidas           | "Las horas semanales deben ser mayores que 0."                                   |
| Quitar curso en uso       | "No se puede quitar: el curso tiene carga académica en secciones de este grado." |
| Plan copiado              | "Se copió el plan de estudios. Revise las horas antes de guardar."               |

## Requerimientos fuera de alcance (Out of Scope)

- **Asignación de docentes y horario de cada sección.** Corresponde a `RF-008`.
- **Competencias y capacidades del currículo.** Se retiraron del modelo porque el sistema no registra notas del aula real.
- **Creación de grados o de niveles (Inicial, Primaria).** El colegio es solo de secundaria.
- **Planes de estudio distintos por año escolar.** El plan vigente aplica al año en curso.

## Acuerdos y puntos abiertos

- **Áreas (acordado).** Las del currículo nacional de secundaria más el Taller de Computación.

## Historia de Usuario 1: Grados

**Como** Administrador
**Quiero** ver los grados de secundaria y ajustar su nombre
**Para** que se muestren como los conoce el colegio.

### Escenario: Ver los grados

**Dado** que estoy en "Grados"
**Cuando** abro la pantalla
**Entonces** el sistema muestra los grados 1.° a 5.° en orden.

### Escenario: Editar el nombre de un grado

**Dado** que estoy en "Grados"
**Cuando** cambio el nombre de 5.° a "5.° de secundaria" y guardo
**Entonces** el sistema muestra ese nombre en todas las pantallas.

### Escenario: Crear o eliminar grados

**Dado** que estoy en "Grados"
**Cuando** busco cómo agregar o eliminar un grado
**Entonces** el sistema no ofrece esas acciones.

## Historia de Usuario 2: Cursos

**Como** Administrador
**Quiero** mantener el catálogo de cursos del colegio
**Para** usarlos en el plan de estudios y en la carga académica.

### Escenario: Crear un curso

**Dado** que estoy en "Cursos"
**Cuando** registro el código "TCOMP", nombre "Taller de Computación", área Taller, color azul, y guardo
**Entonces** el sistema crea el curso activo.

### Escenario: Código repetido

**Dado** que ya existe un curso con código "MAT"
**Cuando** intento crear otro con el mismo código
**Entonces** el sistema bloquea el guardado y muestra "Ya existe un curso con ese código."

### Escenario: Campos obligatorios incompletos

**Dado** que estoy registrando un curso
**Cuando** intento guardar sin código, nombre o área
**Entonces** el sistema impide guardar y señala los campos faltantes.

### Escenario: Color inválido

**Dado** que estoy registrando un curso
**Cuando** ingreso un color con formato no válido
**Entonces** el sistema impide guardar y muestra "Elija un color válido."

### Escenario: Desactivar un curso sin uso

**Dado** que un curso no tiene carga académica en el año en curso
**Cuando** lo desactivo y confirmo
**Entonces** el curso deja de ofrecerse en el plan de estudios y en la carga académica
**Y** sigue apareciendo en los registros pasados.

### Escenario: Desactivar un curso en uso

**Dado** que un curso tiene carga académica en el año en curso
**Cuando** intento desactivarlo
**Entonces** el sistema bloquea la acción y muestra "No se puede desactivar: el curso tiene carga académica en el año en curso."

### Escenario: Listado de cursos

**Dado** que estoy en "Cursos"
**Cuando** abro el listado
**Entonces** el sistema muestra código, nombre, área, color y estado, agrupado por área
**Y** permite filtrar por estado y buscar por nombre o código.

## Historia de Usuario 3: Plan de estudios

**Como** Administrador
**Quiero** indicar qué cursos lleva cada grado y cuántas horas semanales
**Para** armar después la carga académica y el horario de cada sección.

### Escenario: Agregar un curso al plan

**Dado** que estoy en el plan de estudios de 5.°
**Cuando** agrego Matemática con 6 horas semanales y guardo
**Entonces** el sistema lo agrega al plan y actualiza el total de horas del grado.

### Escenario: Curso repetido en el plan

**Dado** que Matemática ya está en el plan de 5.°
**Cuando** intento agregarla otra vez
**Entonces** el sistema bloquea el guardado y muestra "El curso ya está en el plan de estudios de este grado."

### Escenario: Horas inválidas

**Dado** que estoy agregando un curso al plan
**Cuando** ingreso 0 horas semanales
**Entonces** el sistema impide guardar y muestra "Las horas semanales deben ser mayores que 0."

### Escenario: Copiar el plan de otro grado

**Dado** que el plan de 4.° está completo y el de 5.° está vacío
**Cuando** en 5.° elijo "Copiar plan de" 4.°
**Entonces** el sistema carga los mismos cursos y horas en 5.° y muestra "Se copió el plan de estudios. Revise las horas antes de guardar."

### Escenario: Quitar un curso sin uso

**Dado** que Inglés está en el plan de 3.° y ninguna sección de 3.° lo tiene en su carga académica
**Cuando** lo quito y confirmo
**Entonces** el sistema lo retira del plan y actualiza el total de horas.

### Escenario: Quitar un curso en uso

**Dado** que Inglés tiene carga académica en 3.° A en el año en curso
**Cuando** intento quitarlo del plan de 3.°
**Entonces** el sistema bloquea la acción y muestra "No se puede quitar: el curso tiene carga académica en secciones de este grado."

### Escenario: Solo cursos activos

**Dado** que un curso está inactivo
**Cuando** busco cursos para agregar al plan
**Entonces** el sistema no lo ofrece.

### Escenario: Usuario sin permiso

**Dado** que mi rol no es Administrador
**Cuando** abro "Cursos" o "Plan de estudios"
**Entonces** puedo consultar, pero el sistema no me ofrece crear, editar ni desactivar.

---

## Reglas de validación y negocio (resumen)

- **Grados:** fijos (1.° a 5.°); solo se edita el nombre.
- **Cursos:** obligatorios Código, Nombre y Área; código único; color con formato válido; se desactivan, no se eliminan; no se desactiva uno con carga académica en el año en curso.
- **Áreas:** las del currículo nacional de secundaria más Taller.
- **Plan de estudios:** un curso una vez por grado; horas semanales > 0; solo cursos activos; no se quita un curso con carga académica en el grado; total de horas solo informativo.
- **Permisos:** gestión, solo el Administrador; consulta, roles internos.
- **Auditoría:** cursos y cambios del plan (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Grados · Cursos (listado por área y formulario con selector de color) · Plan de estudios (pestañas 1.° a 5.°, tabla de cursos y horas con total). Escenarios: Listado · Alta · Código repetido · Curso en uso · Copiar plan · Quitar curso en uso.
