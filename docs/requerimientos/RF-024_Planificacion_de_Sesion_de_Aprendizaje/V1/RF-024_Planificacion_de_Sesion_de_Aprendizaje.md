# RF-024: Planificación de la Sesión de Aprendizaje y Catálogo Curricular

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguimiento docente / Gestión curricular
**Versión:** 1.0 (borrador)
**Fecha:** 2026-11-23
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 30 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (menú por rol), `RF-003` (bitácora), `RF-005` (bimestres), `RF-006` (grados, cursos y plan de estudios), `RF-007` (docentes), `RF-008` (horario y carga académica), `RF-011` (sesiones de clase y firma en el kiosko).

## Consideraciones y supuestos de negocio

- **Propósito.** Hoy el docente prepara su sesión de aprendizaje en un documento Word aparte y el sistema solo guarda el tema (`RF-011`). Este requerimiento lleva esa planificación **dentro del sistema**: el docente la llena en un **editor guiado** con el **modelo estándar del colegio**, eligiendo competencias, capacidades y desempeños de un **catálogo curricular** (Currículo Nacional de la Educación Básica, CNEB). El supervisor la ve junto al seguimiento de la sesión.
- **Modelo estándar de la sesión.** Es el del colegio (referencia: «SESIÓN DE APRENDIZAJE 01 U7 1er grado E.F.»). Toda planificación tiene estas partes, y el documento exportado las respeta en este orden:
  1. **Título** de la sesión y su número («SESIÓN DE APRENDIZAJE N.º 01»).
  2. **I. Datos informativos:** institución, director(a), docente, grado y sección, área curricular, fecha (o rango de fechas). **Se llenan solos** desde el sistema; el docente no los escribe.
  3. **II. Acerca de la sesión:** 2.1 **Propósitos de aprendizaje** (propósito; por cada competencia: capacidades, desempeños precisados y campo temático); 2.2 **Evaluación** (evidencia, criterios, instrumento); 2.3 **Competencias transversales** (capacidad y desempeño precisado); 2.4 **Enfoques transversales** (valores y acciones observables).
  4. **III. Secuencia didáctica:** 3.1 **Mediación y materiales** (impresos, manipulativos, digitales); 3.2 **Momentos didácticos** Inicio, Desarrollo y Cierre, cada uno con sus actividades estratégicas y su **tiempo en minutos**.
  5. **IV. Referencias bibliográficas** y espacio de firmas (docente y subdirección).
- **Catálogo curricular.** Jerarquía: **área curricular → competencia → capacidad** y **competencia → desempeño** (por **grado**; el CNEB define los desempeños por competencia y ciclo/grado). Aparte: **competencias transversales** (con sus capacidades) y **enfoques transversales** (con sus valores y acciones observables). Las áreas son los cursos de `RF-006`; se vincula cada curso con su área. Los datos iniciales salen del CNEB y del «Listado de competencias por curso» del colegio; el administrador puede corregirlos.
- **Desempeño precisado.** El docente parte del desempeño del catálogo y lo **precisa** (lo redacta para su sesión). Se guarda el desempeño original y el texto precisado.
- **Quién planifica.** **Solo el docente asignado** crea y edita **sus** planificaciones. El **Director y el Subdirector** (y quien tenga la opción de supervisión) **solo visualizan**, dejan **comentarios** y registran las **horas reales en clase** (`HU 6`); **no editan** la planificación. Se planifica sobre **un bloque del horario** del docente (`RF-008`), es decir, sobre una sesión que `RF-011` genera o generará.
- **Planificar en cualquier momento.** El docente puede planificar **cuando quiera** (por ejemplo, un domingo en la noche toda la semana), para fechas futuras dentro del año lectivo, desde cualquier equipo. **Planificar no es firmar:** la firma del ingreso y la salida sigue siendo **solo en el Kiosko de Sesiones** de la subdirección (`RF-011`), estando el docente presente allí. No se usa geolocalización (descartada en `RF-011`).
- **Estados de la planificación.**

  | Estado | Significado |
  | --- | --- |
  | `borrador` | El docente la está llenando; incompleta |
  | `lista` | Completa y validada; la ve el supervisor |
  | `ejecutada` | La sesión se firmó; ya no se edita (queda de solo lectura) |

- **Planificación semanal.** El docente puede ver la **semana** (sus bloques de lunes a viernes) y planificar cada uno; puede **copiar** una planificación a otras secciones del mismo grado y área, o a otra fecha, y ajustar lo que cambie.
- **Relación con la firma (supuesto, P-90).** Planificar **no bloquea** la firma: el docente firma aunque no haya planificado. El panel «Sesiones de hoy» (`RF-011`) muestra la marca **«Sin planificación»** para que el supervisor lo vea. Se puede volver obligatoria con `sesion.exigir_planificacion_para_firmar`.
- **Reemplazo.** Si `RF-011` asigna un reemplazo a una sesión `pendiente`, la planificación **no se transfiere sola**: el reemplazo puede ver (solo lectura) la del titular y crear la suya.
- **Bloqueo por cierre de bimestre.** Al cerrar el bimestre (`RF-005`), sus planificaciones ya no se modifican.
- **Auditoría.** Creación, cambio de estado, copia y exportación se registran en la bitácora (`RF-003`).
- **Exportación.** El documento se puede **descargar en Word (.docx) y PDF** con el modelo estándar, con los datos informativos llenos. La firma del docente y de subdirección se estampa en papel.

## Mensajes del requerimiento

| Situación | Mensaje |
| --- | --- |
| Planificación guardada | "Planificación guardada como borrador." |
| Planificación lista | "Planificación lista. El supervisor ya puede verla." |
| Faltan datos al marcarla lista | "Complete el propósito, al menos una competencia con su desempeño y los tres momentos didácticos." |
| Tiempos no cuadran | "Los tiempos de Inicio, Desarrollo y Cierre suman 70 min; el bloque dura 90." |
| Sesión ya ejecutada | "La sesión ya se firmó. La planificación no se puede modificar." |
| Bimestre cerrado | "El bimestre está cerrado. La planificación ya no se puede modificar." |
| Sesión de otro docente | "Esta sesión está asignada a otro docente." |
| Sin planificación (panel) | "Sin planificación" |
| Comentario enviado | "Comentario enviado al docente." |
| Horas reales registradas | "Horas reales registradas." |
| Copia hecha | "Planificación copiada a 3 secciones." |

## Requerimientos fuera de alcance (Out of Scope)

- **Firma de la sesión.** Sigue en `RF-011` (Kiosko de Sesiones).
- **Programación anual y unidades didácticas** (planificación curricular anual y por unidad). Esta versión solo cubre la sesión.
- **Editor de texto libre tipo Word** (fuentes, tablas arbitrarias). El editor es **guiado por secciones**; el estilo lo fija el modelo.
- **Evaluación del desempeño docente oficial** y calificación de la planificación (`RF-023` cubre la observación de aula).
- **Aprobación o visto bueno obligatorio** del supervisor sobre la planificación (solo comenta).
- **Fichas de trabajo, rúbricas y listas de cotejo** adjuntas a la sesión; se tratarán como materiales (`RF-015`).
- **Generación de la planificación con IA.**

## Acuerdos y puntos abiertos

- **Planificar no bloquea la firma (pendiente, P-90).** Supuesto: no bloquea; el panel marca «Sin planificación».
- **Origen de los desempeños (pendiente, P-91).** Supuesto: seed desde el CNEB por grado; ajustable por el administrador.
- **Quién administra el catálogo (pendiente, P-92).** Supuesto: Director y Subdirector.
- **Unidad didáctica (pendiente, P-93).** La sesión del ejemplo pertenece a una unidad (U7). Supuesto: el número de unidad es un texto opcional de la sesión.
- **Horas reales vs. ausencias de `RF-012` (pendiente, P-94).** Supuesto: las horas reales se registran sobre la sesión como verificación de aula y no reemplazan las ausencias de `RF-012`.
- **Competencias de áreas con varios cursos** (por ejemplo, Quechua y Arte y Cultura) (pendiente, P-95).

## Historia de Usuario 1: Catálogo curricular

**Como** Director o Subdirector
**Quiero** que exista el catálogo de áreas, competencias, capacidades, desempeños, competencias transversales y enfoques transversales
**Para** que los docentes los elijan al planificar.

### Escenario: Carga inicial desde el CNEB
**Dado** que el sistema se instala
**Cuando** se cargan los datos iniciales
**Entonces** existen las áreas del colegio con sus competencias, las capacidades de cada competencia y los desempeños por grado de 1.° a 5.°.

### Escenario: Corregir un desempeño
**Dado** que el desempeño de una competencia tiene un error
**Cuando** el administrador lo corrige y guarda
**Entonces** las planificaciones **nuevas** usan el texto corregido
**Y** las ya hechas conservan el texto con el que se guardaron.

### Escenario: Vincular curso con área
**Dado** que el curso «Educación Física» de 1.° existe
**Cuando** se vincula con el área «Educación Física»
**Entonces** el docente de ese curso ve solo las competencias de esa área.

### Escenario: Código duplicado
**Dado** que ya existe la competencia con ese código en el área
**Cuando** se intenta crear otra igual
**Entonces** el sistema lo rechaza.

## Historia de Usuario 2: Planificar una sesión en el editor

**Como** Docente
**Quiero** llenar la sesión de aprendizaje en un editor guiado
**Para** no armar el documento a mano y que los datos informativos se completen solos.

### Escenario: Datos informativos automáticos
**Dado** que el docente elige su bloque de Educación Física de 1.° único del 12/10
**Cuando** abre el editor
**Entonces** el sistema llena institución, director(a), docente, grado y sección, área y fecha.

### Escenario: Elegir competencia, capacidades y desempeños
**Dado** que el docente elige la competencia «Se desenvuelve de manera autónoma a través de su motricidad»
**Cuando** abre la lista de capacidades y desempeños
**Entonces** ve las capacidades de esa competencia y los desempeños de 1.° año
**Y** puede marcar los que trabajará y **precisar** el texto del desempeño.

### Escenario: Varias competencias
**Dado** que la sesión trabaja dos competencias
**Cuando** el docente agrega la segunda
**Entonces** ambas figuran en los propósitos con su campo temático.

### Escenario: Evaluación
**Dado** que el docente registra evidencia, criterios e instrumento
**Cuando** guarda
**Entonces** quedan en la sección 2.2.

### Escenario: Enfoques y competencias transversales
**Dado** que el docente elige el enfoque intercultural
**Cuando** guarda
**Entonces** se propone la lista de valores y acciones observables del enfoque para que marque y ajuste.

### Escenario: Secuencia didáctica con tiempos
**Dado** que el bloque dura 90 minutos
**Cuando** el docente pone Inicio 15, Desarrollo 65 y Cierre 10
**Entonces** el sistema acepta los tiempos porque suman 90.

### Escenario: Tiempos que no suman
**Dado** que los tiempos suman 70 en un bloque de 90
**Cuando** marca la planificación como lista
**Entonces** el sistema avisa "Los tiempos de Inicio, Desarrollo y Cierre suman 70 min; el bloque dura 90." y no la deja en `lista`.

### Escenario: Guardar borrador incompleto
**Dado** que faltan secciones
**Cuando** el docente guarda como borrador
**Entonces** se guarda sin validar la completitud.

### Escenario: Marcar lista incompleta
**Dado** que no hay desempeños elegidos
**Cuando** el docente la marca lista
**Entonces** el sistema indica qué falta y la deja en `borrador`.

### Escenario: Planificar para una fecha futura, en cualquier momento
**Dado** que es domingo a las 22:00
**Cuando** el docente planifica sus sesiones del lunes al viernes
**Entonces** el sistema las guarda para esas fechas sin restricción de hora.

### Escenario: Docente ajeno
**Dado** que la sesión es de otro docente
**Cuando** intenta planificarla
**Entonces** el sistema lo impide.

## Historia de Usuario 3: Planificación semanal y copia

**Como** Docente
**Quiero** ver mi semana y copiar una planificación a otras secciones o fechas
**Para** no repetir el trabajo.

### Escenario: Vista semanal
**Dado** que el docente tiene 12 bloques en la semana
**Cuando** abre "Mi planificación"
**Entonces** ve los 12 bloques con el estado de cada uno (`sin planificar`, `borrador`, `lista`, `ejecutada`).

### Escenario: Copiar a otras secciones
**Dado** que la planificación de 1.° único es igual para 2 secciones del mismo grado y área
**Cuando** la copia
**Entonces** se crean las planificaciones en esas secciones como `borrador` con los datos informativos de cada una.

### Escenario: Copiar a otra fecha
**Dado** que el docente repite la sesión la semana siguiente
**Cuando** la copia a esa fecha
**Entonces** se crea un `borrador` para ese bloque.

## Historia de Usuario 4: Documento de la sesión

**Como** Docente
**Quiero** ver la vista previa y descargar el documento con el modelo estándar
**Para** imprimirlo y firmarlo.

### Escenario: Vista previa
**Dado** una planificación con datos
**Cuando** el docente abre la vista previa
**Entonces** ve las secciones I a IV en el orden del modelo.

### Escenario: Descargar Word y PDF
**Dado** una planificación `lista`
**Cuando** el docente descarga
**Entonces** obtiene un .docx y un PDF con el modelo del colegio y los datos informativos llenos.

### Escenario: Descarga de un borrador
**Dado** una planificación `borrador`
**Cuando** el docente la descarga
**Entonces** el documento lleva la marca "BORRADOR".

## Historia de Usuario 5: Vínculo con la sesión y la firma

**Como** Subdirector
**Quiero** ver si cada sesión del día tiene planificación
**Para** hacer seguimiento.

### Escenario: Sesión con planificación lista
**Dado** una sesión de hoy con planificación `lista`
**Cuando** el subdirector abre "Sesiones de hoy"
**Entonces** ve la marca de planificación y puede abrirla en solo lectura.

### Escenario: Sesión sin planificación
**Dado** una sesión de hoy sin planificación
**Cuando** el subdirector abre el panel
**Entonces** ve «Sin planificación».

### Escenario: Firma con planificación
**Dado** una sesión con planificación `lista`
**Cuando** el docente firma el ingreso en el kiosko
**Entonces** la planificación pasa a `ejecutada` y el tema de la sesión se toma de su título.

### Escenario: Firma sin planificación
**Dado** una sesión sin planificación
**Cuando** el docente firma el ingreso con el tema escrito
**Entonces** la firma procede (según P-90) y la sesión queda sin planificación.

### Escenario: Planificación bloqueada tras la firma
**Dado** una planificación `ejecutada`
**Cuando** el docente intenta editarla
**Entonces** el sistema muestra "La sesión ya se firmó. La planificación no se puede modificar."

## Historia de Usuario 6: Supervisión: comentarios y horas reales

**Como** Director o Subdirector
**Quiero** ver la planificación, dejar un comentario y registrar las horas en las que el docente realmente estuvo en clase
**Para** contrastar lo planificado y firmado con lo que pasó en el aula.

### Escenario: Ver sin editar
**Dado** una planificación del docente
**Cuando** el supervisor la abre
**Entonces** la ve completa en solo lectura, sin botones de edición.

### Escenario: Comentar
**Dado** una planificación
**Cuando** el supervisor escribe un comentario y lo envía
**Entonces** el docente lo ve en su planificación y recibe un aviso (`RF-019`)
**Y** queda con autor, fecha y hora.

### Escenario: Registrar horas reales
**Dado** una sesión planificada de 08:00 a 09:30 y firmada
**Cuando** el supervisor registra que el docente estuvo en el aula de 08:10 a 09:00
**Entonces** la sesión guarda las horas reales y 50 minutos reales en el aula de 90 planificados (40 minutos de diferencia).

### Escenario: Docente no estuvo en el aula
**Dado** una sesión firmada en el kiosko
**Cuando** el supervisor registra «no estuvo en el aula» con una observación
**Entonces** la sesión conserva su estado de firma y queda marcada con la verificación.

### Escenario: Comentario o verificación de otro rol
**Dado** un usuario sin la opción de supervisión
**Cuando** intenta comentar o registrar horas reales
**Entonces** el sistema lo impide.

### Escenario: El supervisor intenta editar
**Dado** una planificación
**Cuando** el supervisor intenta modificar su contenido
**Entonces** el sistema lo impide.

## Reglas de validación y negocio (resumen)

- Solo el docente asignado crea y edita sus planificaciones; el supervisor solo ve, comenta y registra horas reales.
- Una planificación por sesión (bloque y fecha).
- `lista` exige: propósito, al menos una competencia con un desempeño, evidencia, criterios, instrumento, los tres momentos con actividades y tiempos que sumen la duración del bloque.
- La planificación `ejecutada` y las de bimestre cerrado no se editan.
- Los textos del catálogo se copian en la planificación al guardarla (los cambios del catálogo no alteran lo ya planificado).
- Toda acción relevante va a la bitácora (`RF-003`).

## Anexos y Prototipo Interactivo

- Modelo: «SESIÓN DE APRENDIZAJE 01 U7 1er grado E.F.docx».
- Catálogo: «LISTADO DE COMPETENCIAS POR CURSO.docx» y `curriculo-nacional-de-la-educacion-basica.pdf`.
