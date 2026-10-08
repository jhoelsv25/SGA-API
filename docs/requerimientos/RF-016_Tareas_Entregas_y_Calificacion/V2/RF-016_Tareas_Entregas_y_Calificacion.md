# RF-016: Tareas, Entregas y Calificación

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Aula virtual
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-10-09
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres), `RF-009` (matrículas vigentes), `RF-015` (aula virtual y unidades), `RF-019` (notificaciones).

> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
> *   **Nota final con peso por tipo (P-16):** la nota final del aula virtual es un promedio ponderado por tipo de tarea; los pesos son configurables y suman 100 %.

## Consideraciones y supuestos de negocio

*   **Propósito.** Que el docente proponga actividades de reforzamiento en el aula virtual y las califique. Es la **única nota que genera el sistema**; no reemplaza ni se mezcla con las notas oficiales del aula real. Funciona como una guía inspirada en Google Classroom, no como una copia completa.
*   **Tipos de tarea (configurables).**

    | Tipo | Qué entrega el estudiante | Intentos | Calificación |
    |---|---|---|---|
    | `trabajo` | Archivo, texto o enlace | Una entrega, **editable** hasta la fecha límite | Manual |
    | `proyecto` | Archivo, texto o enlace | Una entrega, **editable** hasta la fecha límite | Manual |
    | `cuestionario` | Respuestas a preguntas | **Configurable** (1 a 10) | Automática si todas las preguntas son cerradas; si hay abiertas, manual |
    | `examen` | Respuestas a preguntas, con **tiempo límite** opcional | **Configurable** (1 a 10) | Igual que cuestionario |

*   **Datos de la tarea.** Título, instrucciones, tipo, unidad (opcional), clase que refuerza (opcional), fecha límite y, según el tipo: formatos de archivo permitidos, intentos, cómo cuenta la nota con varios intentos, cuándo se muestran los resultados, tiempo límite y si acepta entregas tardías.
*   **Nota numérica de 0 a 20.** Todas las notas del aula virtual son numéricas, con hasta dos decimales.
*   **Preguntas** (cuestionario y examen).
    *   **Cerradas:** `opcion_unica` u `opcion_multiple`, con las opciones correctas marcadas. El sistema las corrige.
    *   **Abiertas:** `respuesta_corta`. Las califica el docente.
    *   Cada pregunta tiene un puntaje. La nota se lleva a la escala 0–20: *puntos obtenidos ÷ puntos posibles × 20*.
*   **Calificación automática.** Si **todas** las preguntas son cerradas, al terminar cada intento el sistema califica y la entrega queda `calificada` sin intervención del docente. Si hay alguna abierta, el sistema suma las cerradas y la entrega queda `entregada` hasta que el docente califique las abiertas.
*   **Intentos.** El sistema cuenta los intentos usados y bloquea al llegar al máximo. La nota de la tarea con varios intentos se toma según la configuración: la **más alta** (por defecto), la **última** o el **promedio**.
*   **No revelar respuestas.** Con varios intentos, el estudiante ve su puntaje pero **no las respuestas correctas** hasta que se cumpla la condición configurada: `al_terminar_intentos` (por defecto), `despues_fecha_limite`, `inmediato` o `nunca`.
*   **Trabajos y proyectos editables.** El estudiante puede modificar su entrega hasta la fecha límite. Una vez calificada, ya no la puede editar salvo que el docente la **devuelva** para corregir.
*   **Entregas tardías.** Por defecto **no se aceptan**; el docente puede permitirlas en cada tarea. Una entrega tardía queda marcada como tal.
*   **Calificación manual.** El docente pone la nota (0–20) y una retroalimentación. Puede devolver una entrega para que el estudiante la corrija.
*   **Nota final del aula virtual.** Por curso, sección y bimestre, es un **promedio ponderado por tipo** de tarea **(v2.0, P-16)**: se promedian las notas de cada tipo (examen, cuestionario, trabajo, proyecto) y se aplica su peso configurable (`nota.peso_*`, por defecto 25 % cada uno, deben sumar 100 %). Si en el bimestre no hay tareas de un tipo, su peso se reparte proporcionalmente entre los demás. Una tarea sin entrega cuenta como 0 solo si su fecha límite ya pasó y el docente lo indica al cerrar la tarea.
*   **Conversión a literal solo al exportar.** Dentro del sistema todo se ve en números. Al **exportar** las notas finales a Excel, el sistema agrega la columna literal (AD, A, B, C) según los rangos configurados del año *(P-15)*.
*   **Estados de la tarea.** `borrador` (no visible) → `publicada` → `cerrada` (ya no recibe entregas). Al publicarla, los estudiantes reciben una notificación (`RF-019`).
*   **Quién ve qué.** El estudiante ve solo sus entregas y notas; el apoderado, las de su hijo; el docente, las de sus secciones.
*   **Bloqueo.** Al cerrar el bimestre (`RF-005`) no se califican ni modifican las entregas de sus tareas.
*   **Operación 100% en línea.** Si se pierde la conexión durante un examen, las respuestas marcadas hasta ese momento se conservan y el intento continúa al volver, mientras no venza el tiempo límite.
*   **Auditoría inmutable.** Publicación, cambios de configuración, calificaciones, cambios de nota y devoluciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Tarea publicada | "Tarea publicada. Se notificó a los estudiantes." |
| Fecha límite pasada | "La fecha límite debe ser posterior a la fecha de publicación." |
| Cuestionario sin preguntas | "Agregue al menos una pregunta antes de publicar." |
| Pregunta cerrada sin respuesta correcta | "Marque al menos una opción correcta en cada pregunta cerrada." |
| Entrega enviada | "Tu entrega fue enviada." |
| Intento calificado | "Obtuviste 16.00 de 20. Te quedan 2 intentos." |
| Sin intentos | "Ya usaste todos tus intentos." |
| Fuera de plazo | "La fecha límite ya pasó. Esta tarea no acepta entregas tardías." |
| Entrega tardía | "Tu entrega fue enviada fuera de plazo." |
| Formato no permitido | "Formato de archivo no permitido para esta tarea." |
| Nota fuera de rango | "La nota debe estar entre 0 y 20." |
| Tiempo agotado | "Se agotó el tiempo. Tu intento se envió con las respuestas marcadas." |
| Entrega calificada | "La entrega ya fue calificada. Pide al docente que te la devuelva para corregir." |
| Bimestre cerrado | "El bimestre está cerrado. Las notas ya no se pueden modificar." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Notas oficiales y libretas.** Las notas del aula real no se registran; la libreta es el PDF del SIAGIE (`RF-014`).
*   **Materiales de reforzamiento.** Corresponde a `RF-015`.
*   **Muro, comentarios y chat.** Corresponde a `RF-017`.
*   **Rúbricas de evaluación, banco de preguntas y preguntas aleatorias.** No se contemplan en esta versión.
*   **Detección de plagio o supervisión del examen con cámara.** No se contempla.
*   **Envío de la nota final al SIAGIE.** No se contempla; se exporta a Excel.

## Acuerdos y puntos abiertos

*   **Nota numérica (acordado).** 0–20 en todo el sistema; literal solo al exportar la nota final.
*   **Tipos configurables (acordado).** Trabajo y proyecto editables sin intentos; cuestionario y examen con intentos y calificación automática cuando es posible; sin revelar respuestas mientras queden intentos.
*   **Entregas tardías (acordado).** Por defecto no; configurable por tarea.
*   **Rangos de conversión (pendiente, P-15).** Supuesto: C 0–10, B 11–13, A 14–17, AD 18–20.
*   **Cálculo de la nota final (acordado, P-16).** Ponderado por tipo con pesos configurables; el colegio fijará los porcentajes (por defecto 25 % cada uno). **(v2.0)**

## Historia de Usuario 1: Crear y publicar tareas

**Como** Docente
**Quiero** crear tareas de distintos tipos y configurarlas
**Para** reforzar lo que enseñé en clase.

### Escenario: Crear un trabajo
**Dado** que estoy en el aula virtual de Matemática de 5.° A
**Cuando** creo un `trabajo` "Resolver 10 ecuaciones", con fecha límite 20/05/2027 23:59 y formatos PDF o imagen, y lo publico
**Entonces** la tarea queda `publicada` y el sistema muestra "Tarea publicada. Se notificó a los estudiantes."

### Escenario: Crear un cuestionario con intentos
**Dado** que estoy creando un `cuestionario`
**Cuando** agrego 10 preguntas de opción única con su respuesta correcta, configuro 3 intentos, nota "la más alta" y resultados "al terminar los intentos", y lo publico
**Entonces** el cuestionario queda publicado con esa configuración.

### Escenario: Crear un examen con tiempo límite
**Dado** que estoy creando un `examen`
**Cuando** configuro 1 intento y 40 minutos de tiempo límite
**Entonces** el examen se guarda con esa configuración.

### Escenario: Intentos en un trabajo
**Dado** que estoy creando un `trabajo`
**Cuando** busco la opción de intentos
**Entonces** el sistema no la ofrece, porque un trabajo tiene una sola entrega editable.

### Escenario: Cuestionario sin preguntas
**Dado** que creé un cuestionario sin preguntas
**Cuando** intento publicarlo
**Entonces** el sistema impide la publicación y muestra "Agregue al menos una pregunta antes de publicar."

### Escenario: Pregunta cerrada sin respuesta correcta
**Dado** que una pregunta de opción única no tiene opción correcta marcada
**Cuando** intento publicar
**Entonces** el sistema impide la publicación y muestra "Marque al menos una opción correcta en cada pregunta cerrada."

### Escenario: Fecha límite inválida
**Dado** que estoy publicando una tarea
**Cuando** la fecha límite es anterior a hoy
**Entonces** el sistema impide la publicación y muestra "La fecha límite debe ser posterior a la fecha de publicación."

### Escenario: Permitir entregas tardías
**Dado** que una tarea no acepta entregas tardías (valor por defecto)
**Cuando** activo "Permitir entregas tardías"
**Entonces** los estudiantes podrán entregar después de la fecha límite y esas entregas quedarán marcadas como tardías.

## Historia de Usuario 2: Entregar trabajos y proyectos

**Como** Estudiante
**Quiero** entregar mis trabajos y corregirlos antes de la fecha límite
**Para** presentar mi mejor versión.

### Escenario: Entregar un trabajo
**Dado** que tengo pendiente "Resolver 10 ecuaciones"
**Cuando** subo mi PDF y presiono "Entregar"
**Entonces** la entrega queda `entregada` y el sistema muestra "Tu entrega fue enviada."

### Escenario: Editar antes de la fecha límite
**Dado** que ya entregué y la fecha límite no ha pasado y aún no fue calificada
**Cuando** reemplazo el archivo y presiono "Actualizar entrega"
**Entonces** el sistema guarda la nueva versión de mi entrega.

### Escenario: Editar una entrega calificada
**Dado** que mi entrega ya fue calificada
**Cuando** intento modificarla
**Entonces** el sistema bloquea la acción y muestra "La entrega ya fue calificada. Pide al docente que te la devuelva para corregir."

### Escenario: Entregar fuera de plazo sin permiso
**Dado** que la fecha límite pasó y la tarea no acepta entregas tardías
**Cuando** intento entregar
**Entonces** el sistema bloquea la entrega y muestra "La fecha límite ya pasó. Esta tarea no acepta entregas tardías."

### Escenario: Entrega tardía permitida
**Dado** que la fecha límite pasó y la tarea acepta entregas tardías
**Cuando** entrego
**Entonces** la entrega queda marcada como tardía y el sistema muestra "Tu entrega fue enviada fuera de plazo."

### Escenario: Formato no permitido
**Dado** que la tarea acepta solo PDF
**Cuando** subo un archivo DOCX
**Entonces** el sistema rechaza el archivo y muestra "Formato de archivo no permitido para esta tarea."

## Historia de Usuario 3: Resolver cuestionarios y exámenes

**Como** Estudiante
**Quiero** resolver cuestionarios y exámenes y conocer mi resultado
**Para** practicar y medir lo que aprendí.

### Escenario: Calificación automática
**Dado** que el cuestionario tiene solo preguntas cerradas y 3 intentos
**Cuando** termino mi primer intento con 8 de 10 respuestas correctas
**Entonces** el sistema califica automáticamente con 16.00 y muestra "Obtuviste 16.00 de 20. Te quedan 2 intentos."

### Escenario: No se revelan las respuestas con intentos pendientes
**Dado** que me quedan 2 intentos y los resultados se muestran "al terminar los intentos"
**Cuando** reviso mi intento
**Entonces** veo mi puntaje, pero no cuáles respuestas eran correctas.

### Escenario: Se revelan al agotar los intentos
**Dado** que usé mis 3 intentos
**Cuando** reviso el cuestionario
**Entonces** veo las respuestas correctas y mi nota final según la configuración (la más alta).

### Escenario: Sin intentos disponibles
**Dado** que ya usé todos mis intentos
**Cuando** intento empezar otro
**Entonces** el sistema lo impide y muestra "Ya usaste todos tus intentos."

### Escenario: Examen con preguntas abiertas
**Dado** que el examen tiene 8 preguntas cerradas y 2 abiertas
**Cuando** lo envío
**Entonces** el sistema califica las cerradas y la entrega queda `entregada`, pendiente de que el docente califique las abiertas.

### Escenario: Tiempo agotado
**Dado** que el examen tiene 40 minutos
**Cuando** se cumplen los 40 minutos
**Entonces** el sistema envía el intento con las respuestas marcadas y muestra "Se agotó el tiempo. Tu intento se envió con las respuestas marcadas."

### Escenario: Pérdida de conexión durante el examen
**Dado** que estoy resolviendo un examen y pierdo la conexión
**Cuando** vuelvo antes de que venza el tiempo
**Entonces** el intento continúa con las respuestas que ya había marcado.

## Historia de Usuario 4: Calificar y exportar

**Como** Docente
**Quiero** calificar las entregas y exportar las notas finales
**Para** dar retroalimentación y tener el resultado del aula virtual.

### Escenario: Calificar un trabajo
**Dado** que hay una entrega pendiente de calificar
**Cuando** pongo la nota 15.50 con la retroalimentación "Revisa el ejercicio 7" y guardo
**Entonces** la entrega queda `calificada` y el estudiante es notificado.

### Escenario: Nota fuera de rango
**Dado** que estoy calificando
**Cuando** ingreso 21
**Entonces** el sistema impide guardar y muestra "La nota debe estar entre 0 y 20."

### Escenario: Devolver una entrega
**Dado** que una entrega está calificada
**Cuando** la devuelvo con el comentario "Corrige el ejercicio 7"
**Entonces** la entrega queda `devuelta` y el estudiante puede editarla nuevamente.

### Escenario: Calificar preguntas abiertas
**Dado** que un examen tiene 2 preguntas abiertas sin calificar
**Cuando** asigno el puntaje de cada una
**Entonces** el sistema calcula la nota final 0–20 y la entrega queda `calificada`.

### Escenario: Libro de notas del curso
**Dado** que estoy en "Notas" de Matemática 5.° A
**Cuando** elijo el II Bimestre
**Entonces** el sistema muestra por estudiante la nota de cada tarea y su nota final (promedio), todo en números.

### Escenario: Exportar con conversión a literal
**Dado** que estoy en el libro de notas del II Bimestre
**Cuando** presiono "Exportar a Excel"
**Entonces** el archivo incluye, por estudiante, la nota final numérica y su literal según los rangos del año (por ejemplo, 15.50 → A).

### Escenario: Bimestre cerrado
**Dado** que el II Bimestre está cerrado
**Cuando** intento cambiar una nota de ese bimestre
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado. Las notas ya no se pueden modificar."

### Escenario: Apoderado consulta las notas
**Dado** que soy apoderado
**Cuando** abro "Aula virtual" de mi hijo
**Entonces** veo sus tareas, entregas y notas numéricas de cada curso.

### Escenario: Nota final ponderada (v2.0)
**Dado** que los pesos son examen 40 %, cuestionario 20 %, trabajo 20 % y proyecto 20 %, y un estudiante tiene promedio 16 en exámenes, 18 en cuestionarios, 14 en trabajos y 15 en proyectos
**Cuando** abro el libro de notas
**Entonces** su nota final es 16 × 0.40 + 18 × 0.20 + 14 × 0.20 + 15 × 0.20 = 15.80.

### Escenario: Tipo sin tareas en el bimestre (v2.0)
**Dado** que en el bimestre no hubo proyectos y los pesos son 40 / 20 / 20 / 20
**Cuando** se calcula la nota final
**Entonces** el 20 % del proyecto se reparte proporcionalmente: examen 50 %, cuestionario 25 % y trabajo 25 %.

---

## Reglas de validación y negocio (resumen)

*   **Tipos:** `trabajo` y `proyecto` (una entrega editable, calificación manual); `cuestionario` y `examen` (intentos 1–10, tiempo límite opcional en examen, calificación automática si todas las preguntas son cerradas).
*   **Publicación:** fecha límite futura; cuestionario y examen con al menos una pregunta; cada pregunta cerrada con al menos una opción correcta.
*   **Nota:** numérica 0–20 con dos decimales; preguntas: puntos obtenidos ÷ posibles × 20.
*   **Intentos:** se cuentan y se bloquean al máximo; nota con varios intentos: más alta (por defecto), última o promedio.
*   **Resultados:** las respuestas correctas no se muestran mientras queden intentos (por defecto).
*   **Edición:** trabajos y proyectos editables hasta la fecha límite y mientras no estén calificados; el docente puede devolverlos.
*   **Tardías:** por defecto no; configurable por tarea; quedan marcadas.
*   **Nota final:** promedio ponderado por tipo con pesos configurables que suman 100 %; los pesos de tipos sin tareas se redistribuyen **(v2.0)**.
*   **Exportación:** agrega el literal según los rangos del año (P-15); dentro del sistema solo números.
*   **Bloqueo:** al cerrar el bimestre.
*   **Auditoría:** publicación, configuración, calificaciones, cambios de nota y devoluciones (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Crear tarea (selector de tipo que muestra solo las opciones que aplican) · Editor de preguntas · Entrega del estudiante · Resolver cuestionario/examen (con contador de tiempo e intentos) · Calificar entregas · Libro de notas con exportación. Escenarios: Trabajo editable · Calificación automática · Intentos agotados · Respuestas ocultas · Tiempo agotado · Entrega tardía · Exportación con literal.
