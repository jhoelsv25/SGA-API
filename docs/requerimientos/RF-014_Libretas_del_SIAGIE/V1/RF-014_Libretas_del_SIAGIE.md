# RF-014: Libretas del SIAGIE

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Libretas
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 14 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permisos configurables), `RF-005` (bimestres), `RF-007` (código del estudiante), `RF-008` (tutor y docentes de la sección), `RF-009` (matrículas vigentes), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

*   **Propósito.** Que cada estudiante y su apoderado vean en el sistema la **libreta oficial** de cada bimestre, descargada del SIAGIE en PDF, y medir si se publicó a tiempo. Es la fuente del **ISA**: libretas publicadas a tiempo ÷ libretas programadas × 100 (`RF-020`).
*   **El sistema no genera notas.** Las notas del aula real no se registran; la libreta es el PDF del SIAGIE tal cual.
*   **Programación.** Para cada bimestre, quien tenga el permiso `libretas.programar` (por defecto, Director y Subdirector) fija la **fecha límite** de publicación. El sistema crea una libreta `pendiente` por cada estudiante con matrícula vigente en ese momento.
    *   Si después se matricula un estudiante, se le crea su libreta `pendiente` con la misma fecha límite.
    *   Si un estudiante se retira o traslada antes de la fecha límite, su libreta pendiente se elimina y no cuenta en el ISA (`RF-009`).
    *   La fecha límite se puede cambiar mientras haya libretas pendientes; el cambio queda en la bitácora.
*   **Quién sube: configurable.** No es fijo. Lo controla el permiso `libretas.subir` con su **alcance por rol** (`RF-002`), que el Administrador puede cambiar en cualquier momento:

    | Alcance | Puede subir libretas de… |
    |---|---|
    | `tutoria` | La sección de la que es tutor |
    | `mis_secciones` **(por defecto para Docente)** | Las secciones donde es tutor o dicta algún curso |
    | `colegio` | Cualquier sección (por ejemplo, para Secretaría o Subdirector) |
*   **Carga en bloque.** Se suben **varios PDF a la vez** (un PDF por estudiante), arrastrándolos o eligiéndolos, para una sección y un bimestre. Máximo **50 archivos** por carga y **5 MB** por archivo.
*   **Asignación automática por código.** El sistema identifica a qué estudiante pertenece cada PDF por su **código SIAGIE** (`RF-007`). Mientras no se confirme dónde viene el código *(P-12)*, se busca en el **nombre del archivo**.
    *   Antes de guardar, muestra una **vista previa**: archivos asignados (con el nombre del estudiante), no reconocidos y de estudiantes que no pertenecen a la sección.
    *   Los no reconocidos se pueden **asignar a mano** eligiendo al estudiante de la lista; quedan marcados como asignación `manual`.
    *   Al confirmar, se publican solo los asignados.
*   **A tiempo o fuera de plazo.** La **primera** publicación fija el estado: `a_tiempo` si fue hasta el final del día de la fecha límite, `fuera_de_plazo` si fue después. Un reemplazo posterior no cambia ese estado.
*   **Reemplazo con historial.** Si se sube otra libreta para un estudiante que ya la tiene (por ejemplo, el SIAGIE corrigió una nota), se debe indicar el **motivo**. El archivo anterior **no se borra**: queda con **vigencia 0** con quién lo subió y cuándo. El estudiante ve solo la vigente; el Director ve el historial.
*   **Aviso.** Al publicar la libreta, el estudiante y su apoderado principal reciben una notificación (`RF-019`).
*   **Consulta.** El estudiante y sus apoderados ven y descargan sus libretas de todos los bimestres del año. La **primera vez** que alguno la abre, se registra la fecha y hora (dato complementario del ISA).
*   **Seguimiento.** El Director, el Subdirector y el tutor ven, por sección y bimestre, cuántas libretas están publicadas a tiempo, fuera de plazo, pendientes y vistas por la familia.
*   **Quién consulta.** Cada estudiante y apoderado ve solo las suyas; los docentes, solo las de sus secciones (según el alcance).
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Programación, cambio de fecha límite, cargas, asignaciones manuales, reemplazos y primera vista quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Libretas programadas | "Se programaron 168 libretas del II Bimestre con fecha límite 26/07/2027." |
| Vista previa | "28 libretas asignadas, 2 sin reconocer, 1 de otra sección." |
| Libretas publicadas | "Se publicaron 30 libretas. Se notificó a los estudiantes y apoderados." |
| Archivo no PDF o pesado | "Solo se aceptan archivos PDF de hasta 5 MB." |
| Demasiados archivos | "Puede subir hasta 50 archivos por carga." |
| Código no reconocido | "No se encontró el código del estudiante en el archivo. Asígnelo manualmente." |
| Estudiante de otra sección | "El estudiante [Nombre] no pertenece a esta sección." |
| Libreta no programada | "El bimestre aún no tiene libretas programadas." |
| Reemplazo sin motivo | "Indique el motivo del reemplazo." |
| Sin permiso para la sección | "No tiene permiso para subir libretas de esta sección." |
| Libreta aún no publicada | "Tu libreta del II Bimestre aún no está disponible." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Registro o cálculo de notas del aula real.** No se contempla.
*   **Descarga automática desde el SIAGIE.** El docente la descarga y la sube.
*   **Lectura de las notas dentro del PDF.** Solo se identifica al estudiante.
*   **Firma o constancia de recepción del apoderado.** Solo se registra la primera vista.
*   **Cálculo y reporte del ISA.** Corresponde a `RF-020`.
*   **Configuración de roles y permisos.** Corresponde a `RF-002`.

## Acuerdos y puntos abiertos

*   **Quién sube (acordado).** Configurable por permiso y alcance; por defecto, el tutor y los docentes que dictan en la sección.
*   **Carga (acordado).** Un PDF por estudiante, subidos en bloque.
*   **Código del estudiante (pendiente, P-12).** Supuesto: en el nombre del archivo; si no se reconoce, asignación manual.
*   **Historial (acordado, criterio general).** Ningún archivo se borra: el reemplazado queda con vigencia 0.

## Historia de Usuario 1: Programar las libretas del bimestre

**Como** Director
**Quiero** fijar la fecha límite de publicación de las libretas del bimestre
**Para** medir si se entregan a tiempo.

### Escenario: Programar las libretas
**Dado** que el II Bimestre está en curso y hay 168 estudiantes con matrícula vigente
**Cuando** fijo la fecha límite 26/07/2027 y confirmo
**Entonces** el sistema crea 168 libretas `pendiente` y muestra "Se programaron 168 libretas del II Bimestre con fecha límite 26/07/2027."

### Escenario: Estudiante matriculado después
**Dado** que las libretas del II Bimestre ya están programadas
**Cuando** se matricula un nuevo estudiante (`RF-009`)
**Entonces** el sistema le crea su libreta `pendiente` con la misma fecha límite.

### Escenario: Estudiante retirado antes de la fecha límite
**Dado** que un estudiante tiene su libreta `pendiente`
**Cuando** se registra su retiro antes de la fecha límite
**Entonces** su libreta pendiente se elimina y deja de contar en el ISA.

### Escenario: Cambiar la fecha límite
**Dado** que hay libretas pendientes del II Bimestre
**Cuando** cambio la fecha límite al 30/07/2027
**Entonces** las libretas pendientes toman la nueva fecha y el cambio queda en la bitácora
**Y** las ya publicadas conservan su estado.

## Historia de Usuario 2: Subir las libretas en bloque

**Como** tutor o docente de la sección
**Quiero** subir de una vez los PDF de las libretas de mis estudiantes
**Para** publicarlas sin cargarlas una por una.

### Escenario: Subir y publicar a tiempo
**Dado** que soy tutor de 5.° A, las libretas del II Bimestre vencen el 26/07/2027 y hoy es 24/07/2027
**Cuando** subo 30 PDF cuyo nombre contiene el código SIAGIE de cada estudiante y confirmo la vista previa
**Entonces** el sistema publica las 30 libretas como `a_tiempo`, notifica a cada estudiante y apoderado principal, y muestra "Se publicaron 30 libretas. Se notificó a los estudiantes y apoderados."

### Escenario: Publicar fuera de plazo
**Dado** que la fecha límite fue el 26/07/2027
**Cuando** publico una libreta el 28/07/2027
**Entonces** la libreta queda `fuera_de_plazo`.

### Escenario: Vista previa con archivos no reconocidos
**Dado** que subí 31 archivos y 2 no tienen un código reconocible y 1 es de un estudiante de 5.° B
**Cuando** el sistema termina de leerlos
**Entonces** muestra "28 libretas asignadas, 2 sin reconocer, 1 de otra sección." sin publicar nada todavía.

### Escenario: Asignar manualmente un archivo
**Dado** que un archivo quedó sin reconocer
**Cuando** elijo al estudiante correspondiente de la lista de la sección
**Entonces** el archivo queda asignado con asignación `manual` y se publica al confirmar.

### Escenario: Archivo inválido
**Dado** que estoy subiendo libretas
**Cuando** incluyo una imagen JPG o un PDF de 8 MB
**Entonces** el sistema rechaza ese archivo y muestra "Solo se aceptan archivos PDF de hasta 5 MB."

### Escenario: Demasiados archivos
**Dado** que estoy subiendo libretas
**Cuando** selecciono 60 archivos
**Entonces** el sistema rechaza la carga y muestra "Puede subir hasta 50 archivos por carga."

### Escenario: Bimestre sin programar
**Dado** que el III Bimestre aún no tiene libretas programadas
**Cuando** intento subir libretas del III Bimestre
**Entonces** el sistema bloquea la carga y muestra "El bimestre aún no tiene libretas programadas."

### Escenario: Sección sin permiso
**Dado** que mi rol tiene `libretas.subir` con alcance `mis_secciones` y no dicto en 4.° B
**Cuando** intento subir libretas de 4.° B
**Entonces** el sistema rechaza la carga y muestra "No tiene permiso para subir libretas de esta sección."

### Escenario: Cambiar el alcance
**Dado** que soy Administrador
**Cuando** cambio el alcance de `libretas.subir` del rol Docente de `mis_secciones` a `tutoria`
**Entonces** desde ese momento solo los tutores pueden subir libretas de su sección, y el cambio queda en la bitácora.

## Historia de Usuario 3: Reemplazar una libreta

**Como** tutor
**Quiero** reemplazar una libreta publicada cuando el SIAGIE la corrige
**Para** que la familia vea la versión correcta sin perder la anterior.

### Escenario: Reemplazar con motivo
**Dado** que la libreta de un estudiante ya está publicada `a_tiempo`
**Cuando** subo un nuevo PDF para él con el motivo "Corrección de nota en el SIAGIE"
**Entonces** el nuevo archivo queda vigente, el anterior queda con vigencia 0 con quién y cuándo, y la libreta sigue `a_tiempo`.

### Escenario: Reemplazo sin motivo
**Dado** que el estudiante ya tiene libreta publicada
**Cuando** subo otro PDF sin motivo
**Entonces** el sistema impide guardar y muestra "Indique el motivo del reemplazo."

### Escenario: Historial de archivos
**Dado** que una libreta fue reemplazada
**Cuando** el Director abre su historial
**Entonces** el sistema lista cada archivo con quién lo subió, cuándo, el motivo del reemplazo y cuál es el vigente.

## Historia de Usuario 4: Consultar la libreta

**Como** estudiante o apoderado
**Quiero** ver y descargar la libreta de cada bimestre
**Para** conocer los resultados oficiales.

### Escenario: Ver la libreta publicada
**Dado** que la libreta del II Bimestre de mi hijo está publicada
**Cuando** la abro por primera vez
**Entonces** el sistema la muestra, permite descargarla y registra la fecha y hora de la primera vista.

### Escenario: Libreta aún no publicada
**Dado** que la libreta del II Bimestre aún está pendiente
**Cuando** el estudiante entra a "Mis libretas"
**Entonces** ve el bimestre con el mensaje "Tu libreta del II Bimestre aún no está disponible."

### Escenario: Libreta de otro estudiante
**Dado** que soy apoderado de un estudiante
**Cuando** intento abrir la libreta de otro estudiante
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 5: Seguimiento de la publicación

**Como** Director
**Quiero** ver el avance de la publicación de libretas por sección
**Para** asegurar que lleguen a tiempo a las familias.

### Escenario: Avance por sección
**Dado** que estoy en "Libretas" y elijo el II Bimestre
**Cuando** veo el resumen
**Entonces** el sistema muestra por sección cuántas libretas están a tiempo, fuera de plazo, pendientes y vistas por la familia, con el porcentaje a tiempo
**Y** permite ver el detalle por estudiante.

---

## Reglas de validación y negocio (resumen)

*   **Programación:** por bimestre, con fecha límite; una libreta por estudiante con matrícula vigente; se agregan nuevos matriculados; se eliminan las pendientes de retirados antes de la fecha límite.
*   **Permisos configurables:** `libretas.programar` (por defecto Director y Subdirector); `libretas.subir` con alcance por rol `tutoria`, `mis_secciones` (por defecto para Docente) o `colegio` (`RF-002`).
*   **Carga:** solo PDF de hasta 5 MB; hasta 50 por carga; vista previa obligatoria; asignación automática por código (P-12) o manual.
*   **Estado:** la primera publicación decide `a_tiempo` (hasta el final del día límite) o `fuera_de_plazo`; los reemplazos no lo cambian.
*   **Reemplazo:** motivo obligatorio; el archivo anterior queda con vigencia 0; nunca se borra.
*   **Aviso:** notificación al estudiante y al apoderado principal.
*   **Consulta:** solo las propias; se registra la primera vista.
*   **Auditoría:** programación, fechas, cargas, asignaciones manuales, reemplazos y primera vista (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Programar libretas · Subir libretas (arrastrar archivos, vista previa con asignados / sin reconocer / otra sección, asignación manual) · Historial de una libreta · Mis libretas (estudiante y apoderado) · Avance por sección. Escenarios: Publicación a tiempo · Fuera de plazo · No reconocidos · Reemplazo · Sin permiso.
