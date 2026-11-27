# Casos de prueba — RF-006: Grados, Cursos y Plan de Estudios

**Fuente:** [`RF-006` V1](../../../requerimientos/RF-006_Grados_Cursos_y_Plan_de_Estudios/V1/RF-006_Grados_Cursos_y_Plan_de_Estudios.md) · **Total de casos:** 18

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF006-01 | HU1 | Ver los grados | que estoy en "Grados" | abro la pantalla | el sistema muestra los grados 1.° a 5.° en orden. | Back + Front |
| CP-RF006-02 | HU1 | Editar el nombre de un grado | que estoy en "Grados" | cambio el nombre de 5.° a "5.° de secundaria" y guardo | el sistema muestra ese nombre en todas las pantallas. | Back + Front |
| CP-RF006-03 | HU1 | Crear o eliminar grados | que estoy en "Grados" | busco cómo agregar o eliminar un grado | el sistema no ofrece esas acciones. | Back + Front |
| CP-RF006-04 | HU2 | Crear un curso | que estoy en "Cursos" | registro el código "TCOMP", nombre "Taller de Computación", área Taller, color azul, y guardo | el sistema crea el curso activo. | Back + Front |
| CP-RF006-05 | HU2 | Código repetido | que ya existe un curso con código "MAT" | intento crear otro con el mismo código | el sistema bloquea el guardado y muestra "Ya existe un curso con ese código." | Back + Front |
| CP-RF006-06 | HU2 | Campos obligatorios incompletos | que estoy registrando un curso | intento guardar sin código, nombre o área | el sistema impide guardar y señala los campos faltantes. | Back + Front |
| CP-RF006-07 | HU2 | Color inválido | que estoy registrando un curso | ingreso un color con formato no válido | el sistema impide guardar y muestra "Elija un color válido." | Back + Front |
| CP-RF006-08 | HU2 | Desactivar un curso sin uso | que un curso no tiene carga académica en el año en curso | lo desactivo y confirmo | el curso deja de ofrecerse en el plan de estudios y en la carga académica · sigue apareciendo en los registros pasados. | Back + Front |
| CP-RF006-09 | HU2 | Desactivar un curso en uso | que un curso tiene carga académica en el año en curso | intento desactivarlo | el sistema bloquea la acción y muestra "No se puede desactivar: el curso tiene carga académica en el año en curso." | Back + Front |
| CP-RF006-10 | HU2 | Listado de cursos | que estoy en "Cursos" | abro el listado | el sistema muestra código, nombre, área, color y estado, agrupado por área · permite filtrar por estado y buscar por nombre o código. | Back + Front |
| CP-RF006-11 | HU3 | Agregar un curso al plan | que estoy en el plan de estudios de 5.° | agrego Matemática con 6 horas semanales y guardo | el sistema lo agrega al plan y actualiza el total de horas del grado. | Back + Front |
| CP-RF006-12 | HU3 | Curso repetido en el plan | que Matemática ya está en el plan de 5.° | intento agregarla otra vez | el sistema bloquea el guardado y muestra "El curso ya está en el plan de estudios de este grado." | Back + Front |
| CP-RF006-13 | HU3 | Horas inválidas | que estoy agregando un curso al plan | ingreso 0 horas semanales | el sistema impide guardar y muestra "Las horas semanales deben ser mayores que 0." | Back + Front |
| CP-RF006-14 | HU3 | Copiar el plan de otro grado | que el plan de 4.° está completo y el de 5.° está vacío | en 5.° elijo "Copiar plan de" 4.° | el sistema carga los mismos cursos y horas en 5.° y muestra "Se copió el plan de estudios. Revise las horas antes de guardar." | Back + Front |
| CP-RF006-15 | HU3 | Quitar un curso sin uso | que Inglés está en el plan de 3.° y ninguna sección de 3.° lo tiene en su carga académica | lo quito y confirmo | el sistema lo retira del plan y actualiza el total de horas. | Back + Front |
| CP-RF006-16 | HU3 | Quitar un curso en uso | que Inglés tiene carga académica en 3.° A en el año en curso | intento quitarlo del plan de 3.° | el sistema bloquea la acción y muestra "No se puede quitar: el curso tiene carga académica en secciones de este grado." | Back + Front |
| CP-RF006-17 | HU3 | Solo cursos activos | que un curso está inactivo | busco cursos para agregar al plan | el sistema no lo ofrece. | Back + Front |
| CP-RF006-18 | HU3 | Usuario sin permiso | que mi perfil no es Administrador | abro "Cursos" o "Plan de estudios" | puedo consultar, pero el sistema no me ofrece crear, editar ni desactivar. | Back + Front |
