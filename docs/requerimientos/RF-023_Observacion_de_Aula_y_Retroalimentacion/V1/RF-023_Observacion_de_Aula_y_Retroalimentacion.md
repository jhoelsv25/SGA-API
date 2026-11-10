# RF-023: Observación de Aula y Retroalimentación Docente

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguimiento docente
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 30 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (menú por rol), `RF-003` (bitácora), `RF-005` (bimestres), `RF-007` (docentes y firma), `RF-008` (secciones, carga académica y horario), `RF-011` (sesiones de clase), `RF-013` (consolidado, solo para mostrar un resumen), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

- **Propósito.** Los requerimientos `RF-011`, `RF-012` y `RF-013` responden "¿estuvo el docente y cuánto tiempo?". Este requerimiento responde "**¿cómo enseñó?**": el Director o el Subdirector observan una sesión en el aula, anotan lo que ven, la califican con una **rúbrica** y se reúnen con el docente para acordar **compromisos de mejora**, que luego se revisan y, si hace falta, se vuelve a observar. Sigue el ciclo del monitoreo y acompañamiento pedagógico del MINEDU: observar, analizar las evidencias, plantear la mejora, acompañar y volver a observar.
- **Es una herramienta interna de mejora.** **No** es la Evaluación del Desempeño Docente oficial del MINEDU, **no** genera nota oficial, descuentos, sanciones ni ascensos, y su resultado no se envía a ninguna instancia externa. El colegio es **público** (acordado) y usa los instrumentos del MINEDU como referencia; la finalidad es la autorreflexión y la mejora, no el castigo.
- **Acceso por el menú (`RF-002`).** Se entra por la opción **"Observaciones de aula"**, bajo el grupo **"SEGUIMIENTO DOCENTE"** del menú, junto a Sesiones de hoy, Justificaciones de sesiones, Ausencias docentes, Consolidados docentes e Indicadores. Por defecto la usan el **Director** y el **Subdirector**. El **Docente** ve la opción **"Mis observaciones"** (mismo grupo). No hay permisos ni alcances aparte: quien tiene la opción usa sus pantallas y acciones; quien no la tiene no la ve y el servidor rechaza el acceso por su ruta. El Administrador puede cambiar qué roles ven cada opción.
- **Quién observa (supuesto, P-60).** El **observador** es una persona con la opción "Observaciones de aula" (por defecto, Director y Subdirector). Un usuario **no puede observar a su propia ficha de docente** (una cuenta con dos roles, `RF-002`).
- **Ciclo de una observación (estados).**

  | Estado            | Significado                                                           |
  | ----------------- | --------------------------------------------------------------------- |
  | `programada`      | Está en el cronograma; el docente fue avisado.                        |
  | `en_observacion`  | El observador inició la toma de notas en el aula.                     |
  | `notas_cerradas`  | Terminó la toma de notas; recién ahora se puede calificar.            |
  | `calificada`      | Los 5 desempeños tienen nivel y fundamento.                           |
  | `retroalimentada` | Se registró la reunión y los compromisos; el docente ya la puede ver. |
  | `cancelada`       | Se canceló con motivo; queda en el historial.                         |

- **Instrumento y rúbrica.** La calificación usa los **5 desempeños** de las rúbricas de observación de aula del MINEDU (vinculadas al Dominio 2 del Marco de Buen Desempeño Docente). Fuente de referencia: instructivo vigente, aprobado por Informe 00545-2025-MINEDU/VMGP-DIGEDD-DIED. Los textos oficiales **no se escriben en este documento**: se cargan en un **catálogo configurable "versión del instrumento"**, cuya versión inicial es el instructivo 2025; el Administrador puede agregar versiones nuevas sin cambiar el sistema, y cada observación guarda con qué versión se calificó.

  | #   | Desempeño                                                                         | Qué se observa (resumen)                                                                                             |
  | --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
  | 1   | Involucra activamente a los estudiantes en el proceso de aprendizaje              | Acciones para generar interés, proporción de estudiantes involucrados y que comprendan el sentido de lo que aprenden |
  | 2   | Promueve el razonamiento, la creatividad y/o el pensamiento crítico               | Actividades e interacciones que estimulan ideas propias, relaciones entre conceptos y estrategias                    |
  | 3   | Evalúa el progreso de los aprendizajes para retroalimentar y adecuar su enseñanza | Monitoreo del trabajo de los estudiantes durante la sesión y calidad de la retroalimentación o adaptación            |
  | 4   | Propicia un ambiente de respeto y proximidad                                      | Respeto, cordialidad y calidez; sensibilidad a necesidades de los estudiantes; intervención ante faltas de respeto   |
  | 5   | Regula positivamente el comportamiento                                            | Claridad de las normas de convivencia y mecanismos formativos de prevención y redirección                            |

- **Niveles de logro.** Por cada desempeño se elige un nivel: **I Muy deficiente**, **II En proceso**, **III Suficiente**, **IV Destacado**. Los niveles I y II se agrupan como "insatisfactorio" y los III y IV como "satisfactorio" (solo como etiqueta informativa, según el instructivo). Al elegir un nivel, el sistema **muestra la descripción** de ese nivel del instrumento vigente para que el observador la contraste con sus notas. Se sugiere analizar desde el nivel IV hacia abajo, hasta el que se cumpla (lo indica la ayuda de la pantalla, no se impone).
- **Toma de notas y calificación van separadas (regla del instructivo).** Durante la observación el observador solo escribe **conductas observables** (evidencias, no conclusiones). Ejemplo válido: "De 16 estudiantes, 12 realizan la actividad; 2 juegan con una pelota". Ejemplo no válido: "Muestra buena disposición" o "alcanza el nivel III". El sistema **no habilita la calificación** hasta que se cierre la toma de notas, y la calificación se hace **sin participar el docente**.
- **Aviso previo y duración.** El docente es avisado con anticipación (notificación, `RF-019`); la anticipación mínima es configurable (`observacion.anticipacion_minima_dias`, propuesta **2 días**, P-63). La observación dura entre **45 y 90 minutos** (referencia del instructivo): si la duración registrada queda fuera de ese rango, el sistema avisa, pero **permite guardar**.
- **Cantidad por año.** Cada docente debe tener entre **2 y 3** observaciones por año lectivo (monitoreo del MINEDU). La **cantidad objetivo** es configurable (`observacion.cantidad_objetivo_anual`, propuesta **2**, rango permitido 2 a 3, P-63). Es una meta para el cronograma y el reporte de cobertura; no impide programar más ni menos.
- **Datos de la visita.** Fecha, hora de inicio y fin, **minutos totales** (automático), **estudiantes presentes** y observador (nombre y cargo), además de los datos del colegio y del docente que ya existen (`RF-004`, `RF-007`, `RF-008`).
- **Retroalimentación.** Reunión entre observador y docente con fecha, hora de inicio y fin; el observador registra los **compromisos de mejora** (desempeño por mejorar, compromiso y fecha de revisión). El docente confirma con un **"Enterado"** y su fecha. El sistema imprime el **protocolo de retroalimentación** (PDF) con datos de la visita, matriz de evidencias, niveles, compromisos y **espacio para las firmas físicas** del docente y del observador, para archivarlo como sustento; el escaneo se puede subir como archivo.
- **Seguimiento.** Cada compromiso tiene estado `pendiente`, `cumplido` o `no_cumplido`. En la fecha de revisión el observador recibe un recordatorio (`RF-019`). Si el compromiso no se cumplió o el desempeño sigue bajo, se puede **programar una reobservación** (una nueva observación enlazada a la anterior).
- **Lo que ve el docente.** El docente **solo ve sus observaciones cuando ya están `retroalimentadas`**. Ve niveles, evidencias, fundamentos y compromisos (P-61); puede dejar **un comentario o descargo, una sola vez**, dentro de `observacion.plazo_descargo_dias` (propuesta **7 días calendario** desde la retroalimentación). El comentario no modifica la calificación; queda junto a ella.
- **Historial de versiones (baja lógica).** Igual que `RF-012` y `RF-013`: **nada se elimina**. Una corrección de las notas, la calificación o los compromisos, una vez cerrada la etapa, crea una **versión nueva vigente** y la anterior queda con **vigencia 0**; cada versión guarda quién la hizo, cuándo y el **motivo** (obligatorio). Las observaciones canceladas, los archivos retirados y los comentarios tampoco se borran. El Director y el Subdirector ven el historial completo; el docente solo ve la versión vigente.
- **Quién corrige.** Antes de cerrar la toma de notas o la calificación, el observador edita libremente su borrador (sin versión). Después, solo **el Director** corrige, indicando el motivo, y el docente es notificado si la observación ya era visible para él.
- **Bloqueo por bimestre (`RF-005`).** Cada observación pertenece al bimestre de su fecha. Con el bimestre **cerrado** no se programa, reprograma ni cancela, ni se hace toma de notas en ese bimestre. Las observaciones ya realizadas que aún no cierran su calificación o retroalimentación **se pueden completar** (P-69). Los compromisos de mejora, el enterado y el comentario del docente **no** se bloquean por el cierre.
- **Relación con el consolidado (`RF-013`).** El consolidado del docente puede mostrar un **resumen** de su última observación (niveles por desempeño y fecha). Es solo de lectura: no cambia los totales, la decisión ni la versión del consolidado.
- **Sin nota global (supuesto, P-66).** El resultado es la lista de **cinco niveles**; no se calcula un puntaje ni un promedio.
- **Operación 100% en línea.** La toma de notas puede hacerse desde el celular o la tableta del observador, con la sesión iniciada.
- **Privacidad y auditoría.** Cada docente ve solo lo suyo y solo después de la retroalimentación. Programar, reprogramar, cancelar, iniciar y cerrar notas, calificar, retroalimentar, enterado, comentarios, estados de compromisos, correcciones, descargas del PDF y configuración del instrumento quedan en la bitácora inmutable (`RF-003`).

### Datos que guarda

| Dato                         | Detalle                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observación                  | Docente, curso y sección, fecha, hora programada, observador, bimestre, estado, versión del instrumento, enlace a la sesión (`RF-011`) y a la observación anterior (si es reobservación) |
| Aviso                        | Fecha en que se avisó al docente                                                                                                                                                         |
| Cancelación / reprogramación | Fecha anterior, fecha nueva, motivo, quién y cuándo                                                                                                                                      |
| Datos de la visita           | Hora de inicio y fin, minutos totales, estudiantes presentes                                                                                                                             |
| Nota                         | Desempeño, aspecto, conducta observable (texto), hora aproximada (opcional)                                                                                                              |
| Calificación                 | Desempeño, nivel I a IV, fundamento, versión, vigencia, quién, cuándo, motivo del cambio                                                                                                 |
| Retroalimentación            | Fecha, hora de inicio y fin, resumen del diálogo, enterado del docente (sí/no y fecha), escaneo firmado (archivo opcional)                                                               |
| Compromiso de mejora         | Desempeño, compromiso, fecha de revisión, estado, observación del cierre, vigencia                                                                                                       |
| Comentario del docente       | Texto, fecha, adjunto opcional                                                                                                                                                           |
| Instrumento (catálogo)       | Versión, desempeños, aspectos, niveles y descripciones, vigente sí/no, fuente                                                                                                            |
| Parámetros                   | Cantidad objetivo anual, anticipación mínima, plazo del comentario                                                                                                                       |

## Mensajes del requerimiento

| Situación                               | Mensaje                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Observación programada                  | "Observación programada para el 18/03/2027 a las 08:30. Se avisó al docente."        |
| Anticipación insuficiente               | "La observación debe programarse con al menos 2 días de anticipación."               |
| Observador no válido                    | "No puede observar su propia clase."                                                 |
| Cruce con otra observación              | "El observador ya tiene una observación programada en ese horario."                  |
| Bimestre cerrado                        | "El bimestre está cerrado. No se pueden programar ni modificar observaciones en él." |
| Cancelación o reprogramación sin motivo | "Indique el motivo."                                                                 |
| Observación reprogramada                | "Observación reprogramada para el 25/03/2027. Se avisó al docente."                  |
| Nota sin conducta observable            | "Escriba la conducta observada. No se aceptan calificaciones en las notas."          |
| Duración fuera de rango                 | "La observación duró 30 minutos; lo habitual es entre 45 y 90."                      |
| Calificar antes de cerrar notas         | "Cierre la toma de notas para poder calificar."                                      |
| Notas cerradas                          | "Toma de notas cerrada. Ya puede calificar la observación."                          |
| Nivel sin fundamento                    | "Explique el fundamento del nivel con base en las notas."                            |
| Desempeños incompletos                  | "Califique los 5 desempeños para cerrar la calificación."                            |
| Retroalimentación registrada            | "Retroalimentación registrada. El docente ya puede ver su observación."              |
| Compromiso incompleto                   | "Indique el desempeño, el compromiso y la fecha de revisión."                        |
| Fecha de revisión inválida              | "La fecha de revisión debe ser posterior a la reunión."                              |
| Corrección sin motivo                   | "Indique el motivo del cambio."                                                      |
| Nueva versión                           | "Se generó la versión 2 de la calificación."                                         |
| Enterado registrado                     | "Quedó registrado su enterado."                                                      |
| Comentario enviado                      | "Su comentario fue registrado."                                                      |
| Comentario repetido                     | "Ya dejó su comentario para esta observación."                                       |
| Comentario fuera de plazo               | "El plazo para dejar su comentario venció el 25/03/2027."                            |
| Observación aún no visible              | "Esta observación se mostrará cuando se haya realizado la retroalimentación."        |
| Archivo inválido                        | "El archivo debe ser PDF, PNG o JPG de hasta 5 MB."                                  |
| Compromiso actualizado                  | "Compromiso marcado como cumplido."                                                  |
| Cantidad objetivo fuera de rango        | "La cantidad de observaciones por docente debe estar entre 2 y 3."                   |
| Docente sin observaciones               | "Este docente aún no tiene observaciones en el año."                                 |

## Requerimientos fuera de alcance (Out of Scope)

- **Evaluación del Desempeño Docente oficial del MINEDU** y cualquier calificación numérica que la reemplace. Tampoco genera sanciones, descuentos, ascensos ni se envía a la UGEL u otra instancia.
- **Grabaciones de video o audio** de la sesión. Solo texto y, como sustento, el escaneo del protocolo firmado.
- **Observación entre pares, autoevaluación docente y encuesta a estudiantes.** Se contemplan como **fase 2** (P-65).
- **Firma digital** del docente y del observador. Se usa el "enterado" en el sistema y la firma física en el PDF impreso.
- **Certificación o acreditación de observadores** (el instructivo habla de observador certificado; el sistema no la valida, P-60).
- **Consecuencias de conductas graves** (el instructivo las considera suficientes para el nivel I): el sistema solo las registra en las notas y la calificación; las medidas se toman fuera del sistema (P-64).
- **Ausencias del docente en el aula, firma de sesiones y consolidado de tiempo.** Corresponden a `RF-011`, `RF-012` y `RF-013`; este requerimiento cubre lo pedagógico (`RF-012` V2 se actualizará para aclararlo).
- **Alertas preventivas y reportes de pendientes generales.** Se tratarán en otro requerimiento; aquí solo los recordatorios propios de esta función.

## Acuerdos y puntos abiertos

- **Colegio público (acordado).** Se toman como referencia las rúbricas y el protocolo del MINEDU.
- **La observación de aula entra al alcance (acordado).** Decisión del usuario; reemplaza la nota de `RF-012` V2 que decía que la rúbrica no se contemplaba.
- **Acceso por menú (acordado, `RF-002` V4).** Opción "Observaciones de aula" (Director y Subdirector) y "Mis observaciones" (Docente).
- **Sin notas durante la calificación y sin docente en la calificación (acordado, según el instructivo).**
- **Versiones y baja lógica (acordado, igual que `RF-012` y `RF-013`).**
- **P-60: Quién puede observar (supuesto).** Director y Subdirector; el Administrador puede dar la opción a otros roles. Falta confirmar si podría observar un coordinador o un docente de apoyo, y si se exige constancia de capacitación.
- **P-61: Qué ve el docente (supuesto).** Ve niveles, fundamentos, evidencias y compromisos, solo tras la retroalimentación.
- **P-62: Rúbricas por nivel educativo (supuesto).** Una sola versión del instrumento para todo el colegio; el colegio debe indicar su nivel (Inicial, Primaria o Secundaria) por si el instrumento difiere.
- **P-63: Valores configurables (supuesto).** Cantidad objetivo 2, anticipación mínima 2 días, plazo del comentario 7 días.
- **P-64: Conductas graves (supuesto).** Solo se registran; las medidas son externas.
- **P-65: Fase 2.** Observación entre pares, autoevaluación y encuesta a estudiantes (con su privacidad).
- **P-66: Sin nota global (supuesto).**
- **P-67: "Enterado" en lugar de firma digital (supuesto).**
- **P-68: Uso del resultado (supuesto).** Solo interno; no se comparte con la UGEL.
- **P-69: Cierre de bimestre con observaciones incompletas (supuesto).** Pueden completarse la calificación y la retroalimentación.

## Historia de Usuario 1: Cronograma de observaciones

**Como** Director o Subdirector
**Quiero** programar las observaciones de aula de cada docente en el año
**Para** cubrir a todos los docentes con tiempo y avisarles con anticipación.

### Escenario: Programar una observación

**Dado** que el docente Quispe dicta Matemática en 3.° A los jueves a las 08:30 y el bimestre está abierto
**Cuando** programo una observación para el jueves 18/03/2027 con la Subdirectora Rojas como observadora
**Entonces** el sistema crea la observación `programada` con el bloque del horario (`RF-008`)
**Y** notifica al docente (`RF-019`) y muestra "Observación programada para el 18/03/2027 a las 08:30. Se avisó al docente."

### Escenario: Anticipación insuficiente

**Dado** que la anticipación mínima es de 2 días
**Cuando** intento programar una observación para mañana
**Entonces** el sistema bloquea la acción y muestra "La observación debe programarse con al menos 2 días de anticipación."

### Escenario: Observarse a sí mismo

**Dado** que soy Director y también tengo ficha de docente
**Cuando** intento programarme como observador de mi propia clase
**Entonces** el sistema bloquea la acción y muestra "No puede observar su propia clase."

### Escenario: Observador con otra observación a la misma hora

**Dado** que la Subdirectora Rojas ya tiene una observación el 18/03/2027 a las 08:30
**Cuando** la asigno a otra a esa hora
**Entonces** el sistema bloquea la acción y muestra "El observador ya tiene una observación programada en ese horario."

### Escenario: Ver la cobertura del docente

**Dado** que la cantidad objetivo es 2 y el docente Quispe tiene 1 observación realizada y 1 programada
**Cuando** abro el cronograma
**Entonces** el sistema muestra por docente cuántas observaciones tiene realizadas, programadas y cuántas le faltan para la meta.

### Escenario: Configurar la cantidad objetivo

**Dado** que soy Director
**Cuando** cambio la cantidad objetivo anual a 3
**Entonces** el sistema la guarda
**Y** si intento guardar 4 muestra "La cantidad de observaciones por docente debe estar entre 2 y 3."

### Escenario: Reprogramar con motivo

**Dado** que la observación del docente Quispe está `programada`
**Cuando** la reprogramo para el 25/03/2027 con el motivo "Paseo de la sección"
**Entonces** el sistema guarda la nueva fecha, deja la fecha anterior y el motivo en el historial y notifica al docente con "Observación reprogramada para el 25/03/2027. Se avisó al docente."

### Escenario: Cancelar con motivo

**Dado** que la observación está `programada`
**Cuando** la cancelo con el motivo "Docente con descanso médico"
**Entonces** pasa a `cancelada`, se notifica al docente y deja de contar como programada en la cobertura
**Y** sigue visible en el historial.

### Escenario: Reprogramar o cancelar sin motivo

**Dado** que estoy reprogramando o cancelando una observación
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo."

### Escenario: Bimestre cerrado

**Dado** que el I Bimestre está cerrado (`RF-005`)
**Cuando** intento programar, reprogramar o cancelar una observación con fecha en ese bimestre
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado. No se pueden programar ni modificar observaciones en él."

### Escenario: Programar una reobservación

**Dado** que el docente Quispe tiene una observación `retroalimentada`
**Cuando** presiono "Programar reobservación"
**Entonces** el sistema crea una observación nueva `programada` enlazada a la anterior.

## Historia de Usuario 2: Ficha de toma de notas

**Como** observador
**Quiero** anotar lo que veo en el aula, desempeño por desempeño
**Para** tener evidencias objetivas antes de calificar.

### Escenario: Iniciar la observación

**Dado** que hoy es el día de la observación `programada` del docente Quispe
**Cuando** presiono "Iniciar observación" y registro la hora de inicio 08:32 y 16 estudiantes presentes
**Entonces** la observación pasa a `en_observacion` y se abre la ficha de toma de notas con los 5 desempeños y sus aspectos.

### Escenario: Registrar notas por desempeño

**Dado** que la observación está `en_observacion`
**Cuando** en el desempeño 1 escribo "De 16 estudiantes, 12 realizan la actividad con afán, 2 juegan con una pelota y 1 está echado"
**Entonces** el sistema guarda la nota enlazada a ese desempeño y aspecto
**Y** permite agregar varias notas por desempeño.

### Escenario: Nota con una conclusión

**Dado** que estoy en la ficha
**Cuando** intento guardar una nota vacía
**Entonces** el sistema impide guardarla y muestra "Escriba la conducta observada. No se aceptan calificaciones en las notas."

### Escenario: La ficha no permite calificar

**Dado** que la observación está `en_observacion`
**Cuando** intento abrir la calificación
**Entonces** el sistema la bloquea y muestra "Cierre la toma de notas para poder calificar."

### Escenario: Cerrar la toma de notas

**Dado** que registré la hora de fin 09:25 (53 minutos)
**Cuando** presiono "Cerrar toma de notas"
**Entonces** el sistema calcula los minutos totales, pasa la observación a `notas_cerradas` y muestra "Toma de notas cerrada. Ya puede calificar la observación."

### Escenario: Duración fuera del rango habitual

**Dado** que registré inicio 08:30 y fin 09:00
**Cuando** cierro la toma de notas
**Entonces** el sistema muestra "La observación duró 30 minutos; lo habitual es entre 45 y 90."
**Y** me deja confirmar y guardar.

### Escenario: Tomar notas desde el celular

**Dado** que estoy en el aula con mi celular y sesión iniciada
**Cuando** abro la observación del día
**Entonces** el sistema muestra la ficha adaptada a la pantalla del celular y guarda cada nota al escribirla.

### Escenario: Observación que no se realizó el día programado

**Dado** que la observación sigue `programada` y su fecha ya pasó
**Cuando** abro el cronograma
**Entonces** el sistema la marca como "Vencida" para que el observador la reprograme o la cancele con motivo.

## Historia de Usuario 3: Calificación por rúbrica

**Como** observador
**Quiero** calificar cada desempeño con un nivel fundamentado en mis notas
**Para** dar un resultado claro y sustentado al docente.

### Escenario: Ver la descripción del nivel

**Dado** que la observación está `notas_cerradas` y mi instrumento es el instructivo 2025
**Cuando** elijo el nivel III para el desempeño 3
**Entonces** el sistema muestra la descripción del nivel III de ese desempeño y, al lado, mis notas de ese desempeño.

### Escenario: Calificar los cinco desempeños

**Dado** que estoy calificando
**Cuando** elijo un nivel y escribo el fundamento en cada uno de los 5 desempeños y presiono "Cerrar calificación"
**Entonces** la observación pasa a `calificada`
**Y** el sistema muestra el resumen con los 5 niveles y su etiqueta satisfactorio o insatisfactorio, sin nota global.

### Escenario: Nivel sin fundamento

**Dado** que elegí el nivel II en el desempeño 4
**Cuando** intento guardar sin fundamento
**Entonces** el sistema impide guardar y muestra "Explique el fundamento del nivel con base en las notas."

### Escenario: Calificación incompleta

**Dado** que califiqué solo 4 desempeños
**Cuando** presiono "Cerrar calificación"
**Entonces** el sistema impide la acción y muestra "Califique los 5 desempeños para cerrar la calificación."

### Escenario: Desempeño sin notas

**Dado** que no hay ninguna nota en el desempeño 5
**Cuando** intento calificarlo
**Entonces** el sistema me avisa que no hay evidencias en ese desempeño y me pide el fundamento de todas formas.

### Escenario: Calificar sin participación del docente

**Dado** que soy el docente observado
**Cuando** intento abrir la ficha de calificación de mi observación
**Entonces** el sistema rechaza el acceso.

### Escenario: Versión del instrumento

**Dado** que el Administrador cargó una versión nueva del instrumento
**Cuando** programo una observación posterior
**Entonces** esa observación usa la versión nueva
**Y** las observaciones anteriores conservan la versión con la que se calificaron.

### Escenario: Corregir una calificación cerrada

**Dado** que la observación está `calificada` y el Director detecta un error en el desempeño 2
**Cuando** corrige el nivel con el motivo "Faltaba considerar la nota 3"
**Entonces** el sistema crea la versión 2 vigente, deja la versión 1 con vigencia 0 y muestra "Se generó la versión 2 de la calificación."

### Escenario: Corrección sin motivo

**Dado** que estoy corrigiendo una calificación cerrada
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo del cambio."

## Historia de Usuario 4: Retroalimentación y compromisos de mejora

**Como** observador
**Quiero** registrar la reunión con el docente y los compromisos acordados
**Para** convertir la observación en una mejora concreta y dejar constancia.

### Escenario: Registrar la reunión

**Dado** que la observación está `calificada`
**Cuando** registro la reunión del 19/03/2027 de 10:00 a 10:30 con el resumen del diálogo
**Entonces** el sistema guarda la reunión.

### Escenario: Agregar compromisos de mejora

**Dado** que registré la reunión
**Cuando** agrego el compromiso "Usar preguntas que lleven al estudiante a explicar su razonamiento" para el desempeño 3 con fecha de revisión 30/04/2027
**Entonces** el sistema guarda el compromiso `pendiente`.

### Escenario: Compromiso incompleto

**Dado** que estoy agregando un compromiso
**Cuando** lo guardo sin compromiso o sin fecha
**Entonces** el sistema impide guardarlo y muestra "Indique el desempeño, el compromiso y la fecha de revisión."

### Escenario: Fecha de revisión anterior a la reunión

**Dado** que la reunión fue el 19/03/2027
**Cuando** indico como fecha de revisión el 10/03/2027
**Entonces** el sistema impide guardarlo y muestra "La fecha de revisión debe ser posterior a la reunión."

### Escenario: Cerrar la retroalimentación

**Dado** que registré la reunión y al menos un compromiso
**Cuando** presiono "Cerrar retroalimentación"
**Entonces** la observación pasa a `retroalimentada`, se notifica al docente y se muestra "Retroalimentación registrada. El docente ya puede ver su observación."

### Escenario: Calificación sin compromisos

**Dado** que todos los desempeños quedaron en nivel IV
**Cuando** cierro la retroalimentación sin compromisos y confirmo que no hace falta ninguno
**Entonces** el sistema permite cerrarla.

### Escenario: Descargar el protocolo de retroalimentación

**Dado** que la observación está `retroalimentada`
**Cuando** presiono "Protocolo de retroalimentación (PDF)"
**Entonces** el sistema genera el PDF con los datos del colegio, del docente y de la visita, la reunión, la matriz de evidencias por desempeño, los niveles, los compromisos y un espacio para la firma del docente y del observador
**Y** registra la descarga en la bitácora.

### Escenario: Subir el protocolo firmado

**Dado** que imprimí y firmé el protocolo
**Cuando** subo el escaneo en PDF
**Entonces** el sistema lo guarda como sustento de la observación.

### Escenario: Archivo inválido

**Dado** que estoy subiendo un archivo
**Cuando** elijo uno de otro tipo o de más de 5 MB
**Entonces** el sistema lo rechaza y muestra "El archivo debe ser PDF, PNG o JPG de hasta 5 MB."

### Escenario: Corregir los compromisos

**Dado** que la observación está `retroalimentada`
**Cuando** el Director cambia el texto de un compromiso con el motivo "Precisión de la redacción"
**Entonces** el sistema crea una versión nueva, deja la anterior con vigencia 0 y notifica al docente.

## Historia de Usuario 5: Seguimiento y reobservación

**Como** Director o Subdirector
**Quiero** seguir el cumplimiento de los compromisos y ver la evolución de cada docente
**Para** saber si la mejora ocurrió o hay que volver a observar.

### Escenario: Recordatorio en la fecha de revisión

**Dado** que un compromiso tiene fecha de revisión 30/04/2027 y sigue `pendiente`
**Cuando** llega esa fecha
**Entonces** el sistema notifica al observador y a quien tenga la opción "Observaciones de aula" (`RF-019`)
**Y** el compromiso aparece en "Seguimientos por revisar".

### Escenario: Marcar un compromiso como cumplido

**Dado** que revisé el compromiso con el docente
**Cuando** lo marco `cumplido` con la observación "Se vio en la clase del 28/04"
**Entonces** el sistema guarda el estado, la fecha y mi observación, y muestra "Compromiso marcado como cumplido."

### Escenario: Marcar un compromiso como no cumplido

**Dado** que el compromiso venció sin cumplirse
**Cuando** lo marco `no_cumplido` con una observación
**Entonces** el sistema guarda el estado y sugiere programar una reobservación.

### Escenario: Historial por docente

**Dado** que el docente Quispe tiene 2 observaciones calificadas
**Cuando** abro su historial
**Entonces** el sistema muestra cada observación con fecha, observador y los niveles por desempeño, y la evolución de cada desempeño entre una observación y la siguiente (sube, igual o baja).

### Escenario: Docente sin observaciones

**Dado** que el docente no tiene observaciones en el año
**Cuando** abro su historial
**Entonces** el sistema muestra "Este docente aún no tiene observaciones en el año."

### Escenario: Resumen en el consolidado

**Dado** que el docente Quispe tiene una observación `retroalimentada` en el II Bimestre
**Cuando** abro su consolidado del bimestre (`RF-013`)
**Entonces** el sistema muestra un resumen de solo lectura con la fecha y los 5 niveles
**Y** no cambia los totales ni la decisión del consolidado.

### Escenario: Bimestre cerrado y compromisos

**Dado** que el bimestre de la observación ya está cerrado
**Cuando** marco un compromiso como cumplido
**Entonces** el sistema lo permite, porque el cierre no bloquea el seguimiento de compromisos.

## Historia de Usuario 6: Mis observaciones (docente)

**Como** Docente
**Quiero** ver mis observaciones, mis compromisos y dejar mi comentario
**Para** conocer mi resultado y participar en mi mejora.

### Escenario: Aviso de observación programada

**Dado** que el Director programó una observación en mi clase
**Cuando** abro la notificación o "Mis observaciones"
**Entonces** el sistema me muestra la fecha, la hora, el curso y la sección, y el observador, sin ninguna nota ni nivel.

### Escenario: Ver una observación retroalimentada

**Dado** que mi observación está `retroalimentada`
**Cuando** la abro
**Entonces** el sistema muestra los datos de la visita, las evidencias, mis 5 niveles con su fundamento y mis compromisos, sin el historial de versiones.

### Escenario: Observación aún no retroalimentada

**Dado** que mi observación está `calificada` pero sin retroalimentar
**Cuando** intento abrirla
**Entonces** el sistema muestra "Esta observación se mostrará cuando se haya realizado la retroalimentación."
**Y** no muestra notas ni niveles.

### Escenario: Registrar mi enterado

**Dado** que mi observación está `retroalimentada`
**Cuando** presiono "Enterado"
**Entonces** el sistema guarda mi enterado con la fecha y muestra "Quedó registrado su enterado."

### Escenario: Dejar un comentario

**Dado** que la retroalimentación fue el 19/03/2027 y estoy dentro de los 7 días
**Cuando** envío el comentario "La clase del 18/03 fue la primera después de una semana de evaluaciones"
**Entonces** el sistema lo guarda junto a la observación, notifica al observador y muestra "Su comentario fue registrado."
**Y** no modifica la calificación.

### Escenario: Comentario repetido

**Dado** que ya dejé mi comentario
**Cuando** intento enviar otro
**Entonces** el sistema bloquea el envío y muestra "Ya dejó su comentario para esta observación."

### Escenario: Comentario fuera de plazo

**Dado** que pasaron más de 7 días desde la retroalimentación
**Cuando** intento dejar un comentario
**Entonces** el sistema bloquea el envío y muestra "El plazo para dejar su comentario venció el 25/03/2027."

### Escenario: Docente sin acceso a otros

**Dado** que soy docente
**Cuando** intento ver la observación de otro docente
**Entonces** el sistema rechaza el acceso.

### Escenario: Ver mis compromisos

**Dado** que tengo 2 compromisos de mejora
**Cuando** abro "Mis observaciones"
**Entonces** el sistema muestra cada compromiso con su desempeño, su fecha de revisión y su estado.

## Historia de Usuario 7: Reporte para el Director

**Como** Director
**Quiero** ver la matriz de desempeños de todos los docentes y la cobertura del cronograma
**Para** identificar en qué desempeños necesita reforzar el acompañamiento.

### Escenario: Matriz docente por desempeño

**Dado** que estoy en "Reporte" de Observaciones de aula
**Cuando** elijo el año lectivo
**Entonces** el sistema muestra una tabla con cada docente en filas y los 5 desempeños en columnas, con el **último nivel vigente** de cada uno y la fecha de la observación
**Y** permite ordenar por cualquier columna y filtrar por nivel o por desempeño.

### Escenario: Cobertura del cronograma

**Dado** que hay 24 docentes con meta de 2 observaciones y se realizaron 30 de 48
**Cuando** miro el indicador de cobertura
**Entonces** el sistema muestra por docente y en total las observaciones realizadas frente a las programadas y la meta (por ejemplo, 30 de 48, 62 %).

### Escenario: Exportar a Excel

**Dado** que estoy viendo la matriz
**Cuando** presiono "Exportar a Excel"
**Entonces** el sistema descarga un archivo con la matriz y la cobertura que se ven en pantalla.

### Escenario: Solo se muestran versiones vigentes

**Dado** que una calificación tiene una versión con vigencia 0
**Cuando** se arma la matriz
**Entonces** el sistema usa solo la versión vigente de cada calificación.

### Escenario: Reporte sin acceso

**Dado** que soy docente
**Cuando** intento abrir el reporte
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 8: Configuración del instrumento

**Como** Administrador
**Quiero** administrar las versiones del instrumento de observación
**Para** que el sistema use las rúbricas vigentes sin depender de un cambio de programa.

### Escenario: Versión inicial

**Dado** que se instala el sistema
**Cuando** abro "Instrumento de observación"
**Entonces** el sistema muestra la versión "Instructivo 2025 (Informe 00545-2025-MINEDU)" con los 5 desempeños, los 4 niveles y sus descripciones.

### Escenario: Agregar una versión nueva

**Dado** que el MINEDU publica un instructivo nuevo
**Cuando** cargo la versión con sus desempeños, niveles y descripciones y la marco como vigente
**Entonces** la versión anterior deja de ser la vigente para observaciones nuevas y se conserva para las ya calificadas.

### Escenario: Versión incompleta

**Dado** que estoy cargando una versión
**Cuando** falta la descripción de algún nivel
**Entonces** el sistema impide marcarla como vigente.

---

## Reglas de validación y negocio (resumen)

- **Acceso:** opción "Observaciones de aula" (Director y Subdirector por defecto) y "Mis observaciones" (Docente), en SEGUIMIENTO DOCENTE (`RF-002`).
- **Observador:** no puede observar su propia ficha de docente; sin cruces de horario (P-60).
- **Cronograma:** docente, curso y sección, fecha, observador; anticipación mínima configurable (2 días); cantidad objetivo 2 a 3; reprogramar y cancelar con motivo; bimestre cerrado bloquea programar y modificar.
- **Estados:** `programada` → `en_observacion` → `notas_cerradas` → `calificada` → `retroalimentada`; `cancelada`.
- **Notas:** conductas observables por desempeño; sin calificar durante la observación; duración de 45 a 90 minutos como aviso, no bloqueo.
- **Calificación:** nivel I a IV y fundamento obligatorio por cada uno de los 5 desempeños, solo con la toma de notas cerrada, sin el docente; sin nota global.
- **Instrumento:** catálogo por versión; la observación guarda la versión con la que se calificó.
- **Retroalimentación:** reunión con fecha y horas, compromisos con desempeño, texto y fecha de revisión posterior; PDF del protocolo con espacio para firmas físicas; escaneo opcional como sustento.
- **Compromisos:** `pendiente`, `cumplido` o `no_cumplido`; recordatorio en la fecha de revisión; reobservación opcional enlazada.
- **Docente:** ve solo lo suyo y solo tras la retroalimentación; enterado con fecha; un comentario dentro de 7 días, que no cambia la calificación.
- **Versiones:** correcciones tras cerrar la etapa solo del Director, con motivo; nueva versión vigente y anterior con vigencia 0; nada se elimina.
- **Consolidado:** solo muestra un resumen de lectura (`RF-013`).
- **Reporte:** matriz docente por desempeño con el último nivel vigente, cobertura y exportación a Excel.
- **Auditoría:** todas las acciones relevantes en la bitácora (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas:
  - **Cronograma de observaciones** (Director): tabla por docente con meta, realizadas y programadas; calendario; botón "Programar"; reprogramar y cancelar con motivo.
  - **Ficha de toma de notas** (observador, adaptada al celular): datos de la visita, los 5 desempeños con sus aspectos y cajas de notas, cronómetro de la visita, "Cerrar toma de notas".
  - **Calificación por rúbrica**: notas a la izquierda; a la derecha, selector de nivel I a IV con su descripción y el fundamento, por cada desempeño; resumen.
  - **Retroalimentación**: reunión, compromisos de mejora, enterado y subida del protocolo firmado; botón "Protocolo de retroalimentación (PDF)".
  - **Seguimiento y historial del docente**: compromisos con su estado y evolución de niveles entre observaciones.
  - **Mis observaciones** (docente): próximas observaciones, observaciones retroalimentadas con niveles y compromisos, enterado y comentario.
  - **Reporte**: matriz docente por desempeño, cobertura y exportar a Excel.
  - **Instrumento de observación** (Administrador): versiones, desempeños, niveles y descripciones.
- Escenarios de demostración: programación con aviso · notas sin calificar · calificación con fundamento · retroalimentación con PDF · compromiso cumplido y reobservación · docente con comentario · versión 2 de una calificación.
- Fuentes de referencia (no se copian en este documento): instructivo de rúbricas de observación de aula 2025 (Informe 00545-2025-MINEDU/VMGP-DIGEDD-DIED), protocolo de retroalimentación del MINEDU y lámina "Acompaña, guía y mejora la práctica docente" (Buen Inicio del Año Escolar 2026).
