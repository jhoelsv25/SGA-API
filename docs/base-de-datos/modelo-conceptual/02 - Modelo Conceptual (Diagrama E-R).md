---
tags: [tesis, sga, base-de-datos, modelo-conceptual, diagrama-er]
fase: 2
estado: en revisión
version: 1.0
fecha: 2026-09-25
autores: [Lima De La Cruz Hever, Silvestre Vargas Jhoel]
---

# Fase 2 · Modelo Conceptual de Datos (Diagrama E-R)

← [[00 - Índice del Diseño de BD]] · Siguiente: [[03 - Modelo Lógico y Normalización]] *(pendiente)*

> **Estado:** v1.0 entregada para revisión e impresión en A3.
> **Imprimir:** [[adjuntos/02-modelo-conceptual-A3.pdf]] (1 hoja A3 horizontal, 420 × 297 mm, sin márgenes; imprimir al 100 %, "tamaño real").

![[adjuntos/02-modelo-conceptual.png]]

---

## 1. ¿Qué es esta fase? (tutorial)

El **modelo conceptual** representa la realidad del colegio **sin pensar todavía en tablas ni en PostgreSQL**. Responde tres preguntas:

| Pregunta | Elemento del diagrama | Ejemplo en el SGA |
|---|---|---|
| ¿De qué cosas necesito guardar datos? | **Entidades** (cajas) | ESTUDIANTE, MATRÍCULA, SESIÓN DE CLASE |
| ¿Qué datos describen a cada cosa? | **Atributos** (filas de la caja) | fecha de ingreso, estado |
| ¿Cómo se relacionan y cuántas veces? | **Relaciones y cardinalidad** (líneas) | un ESTUDIANTE *se matricula* 0..N veces |

**Qué NO va en el modelo conceptual** (se deja para la Fase 3, modelo lógico):
- Claves foráneas (`estudiante_id`, `seccion_id`…): la relación ya se ve en la línea.
- Tablas intermedias: las relaciones muchos a muchos (N:M) se dibujan **directas**, con sus atributos en una nota.
- Tipos de datos, índices y restricciones técnicas.
- Campos técnicos de auditoría (`creado_en`, `actualizado_en`, `registrado_por`).

### Herramientas para esta fase

| Herramienta | Uso recomendado | Costo |
|---|---|---|
| **draw.io / diagrams.net** | Dibujo libre en notación Chen o pata de gallo; exporta PDF A3 | Gratis |
| **Lucidchart** | Colaborativo, plantillas ER | Freemium |
| **ERDPlus** | Notación Chen académica (rombos para relaciones) | Gratis |
| **dbdiagram.io / DBeaver** | Mejores para el modelo **lógico/físico** (Fase 3–4), no para el conceptual | Gratis |
| **Generador propio (usado aquí)** | Script Python → SVG → PDF A3; reproducible y versionable | — |

El diagrama de esta nota se generó con un script propio que está en `adjuntos/fuente-diagrama/`. Si cambia una entidad, se edita `model.py` y se ejecuta `build.ps1`, que regenera el SVG, el PNG y el PDF A3.

### Notación usada

- **Pata de gallo (Crow's Foot)** para la cardinalidad. El símbolo junto a la caja es el máximo (| = uno, pata = muchos) y el que va más afuera es el mínimo (| = obligatorio, ○ = opcional).
- **Marcas Barker** en los atributos: `#` identificador único · `*` obligatorio · `o` opcional · `{ }` multivaluado · `( )` compuesto.
- **Especialización (○)**: PERSONA se especializa en DOCENTE, ESTUDIANTE y APODERADO. Es **solapada** (una misma persona puede ser docente y apoderado) y **parcial** (hay personas que no son ninguno de los tres, por ejemplo la secretaria que solo tiene usuario).
- **Réplica visual** (caja punteada): la misma entidad dibujada de nuevo para evitar líneas que crucen toda la hoja (USUARIO ×2, MATRÍCULA ×1).
- **Insignias CSP / IGM / ISA**: entidades que alimentan los indicadores de la tesis.

---

## 2. Fuentes que se usaron

| Fuente | Qué se tomó | Qué se descartó |
|---|---|---|
| `PROYECTO DE TESIS.pdf` (UNH) | Los 3 indicadores del Anexo 03 (CSP, IGM, ISA) y la muestra de 50 alumnos de 5.° de secundaria | — |
| `02-Diseno-Base-Datos-SQLServe SGA .sql` (tu BD v3, 49 tablas) | Base principal: módulos, entidades y reglas | Tablas técnicas (`parametros_sistema`) |
| `SGA-BACK` (NestJS + TypeORM, 64 entidades) + `req/` (RF-001 a RF-039) | Alcance funcional real y auditorías | Ver errores corregidos en §6 |
| `rosariosis_sqlserver.sql` (RosarioSIS) | Capacidad CNEB bajo competencia, asistencia ligada a la clase dictada y datos de salud del estudiante | Comedor, facturación, contabilidad, elegibilidad y encuestas (fuera del alcance de la tesis) |

---

## 3. Catálogo de entidades (45 en 9 módulos)

### Seguridad
| Entidad | Qué representa |
|---|---|
| PERSONA | Padrón único de todas las personas (docentes, estudiantes, apoderados y personal). Documento + nombres con apellido paterno/materno separados (formato SIAGIE) |
| USUARIO | Cuenta de acceso de una persona (máximo una por persona) |
| ROL | Perfil de acceso: Administrador, Director, Secretaria, Docente, Estudiante, Apoderado |
| PERMISO | Acción concreta del sistema (p. ej. `matriculas.registrar`) |
| SESIÓN DE ACCESO | Inicio de sesión activo (permite verlas y revocarlas, RF-014) |
| BITÁCORA | Registro inmutable de cambios con valor anterior y nuevo (RF-014) |

### Comunidad educativa
| Entidad | Qué representa |
|---|---|
| DOCENTE | Subtipo de PERSONA: contrato, jornada, firma digital (para libretas) |
| ESTUDIANTE | Subtipo de PERSONA: código SIAGIE, lengua materna, datos de salud (compuesto) |
| APODERADO | Subtipo de PERSONA: ocupación, instrucción |
| CREDENCIAL | Carné con QR/PIN para marcar en el kiosko |

### Institución
| Entidad | Qué representa |
|---|---|
| INSTITUCIÓN | Datos de la I.E. y geocerca GPS (latitud, longitud, radio) |
| TURNO | Horario de entrada/salida y tolerancia, por tipo de persona |

### Estructura académica
| Entidad | Qué representa |
|---|---|
| AÑO ACADÉMICO | Año escolar, con estado y reapertura auditada |
| PERIODO ACADÉMICO | Bimestre o trimestre del año |
| ESCALA | Escala AD/A/B/C con su rango numérico, por año |
| EVENTO | Feriados y suspensiones del calendario. Descuentan sesiones en el CSP |
| NIVEL · GRADO | Inicial / Primaria / Secundaria → grados |
| CURSO | Área curricular o taller |
| COMPETENCIA · CAPACIDAD | Competencias CNEB del curso (o transversales) y sus capacidades **(nuevo)** |

### Organización y matrícula
| Entidad | Qué representa |
|---|---|
| SECCIÓN | 5.° "A", 5.° "B"… de un año, con tutor y turno |
| CURSO-SECCIÓN | Carga académica: qué curso se dicta en qué sección y qué docente lo tiene a cargo. Es el eje del aula virtual |
| HORARIO | Bloque semanal (clase o receso) de la sección |
| MATRÍCULA | Inscripción de un estudiante en una sección para un año |

### Evaluación
| Entidad | Qué representa |
|---|---|
| EVALUACIÓN | Instrumento aplicado en un curso-sección, periodo y competencia |
| *NOTA* (relación N:M) | MATRÍCULA ⟷ EVALUACIÓN, con nota numérica o literal |
| CALIFICACIÓN | Resultado por competencia al cierre del periodo (libreta), con conclusión descriptiva |
| ENTREGA DE LIBRETA **[ISA]** | Informe de progreso al apoderado: fecha límite vs. fecha real de entrega |

### Asistencia
| Entidad | Qué representa |
|---|---|
| SESIÓN DE CLASE **[CSP]** | Cada clase programada de un día concreto: si se dictó, a qué hora y quién la dictó |
| ASISTENCIA | Estado del estudiante (P/T/F/J) **en una sesión de clase** |
| MARCACIÓN | Ingreso/salida del colegio (kiosko, intranet con GPS o manual) |

### Convivencia y comunicación
| Entidad | Qué representa |
|---|---|
| INCIDENCIA | Méritos y faltas de convivencia |
| OBSERVACIÓN | Seguimiento tutorial y psicopedagógico (puede ser confidencial) |
| COMUNICADO | Anuncio institucional para todo el colegio, un grado o una sección |
| NOTIFICACIÓN | Aviso personal en la bandeja de un usuario |

### Aula virtual
| Entidad | Qué representa |
|---|---|
| UNIDAD DE APRENDIZAJE | Organización del curso-sección en el aula virtual |
| MATERIAL **[IGM]** | Recurso con **fecha programada** vs. **fecha real de publicación** |
| TAREA · PREGUNTA · OPCIÓN | Tareas (entregables o cuestionarios) y sus preguntas y alternativas |
| ENTREGA DE TAREA | Lo que presenta el estudiante, con nota y retroalimentación |
| PUBLICACIÓN · COMENTARIO | Muro del curso |
| MENSAJE DE CHAT | Chat grupal del curso o privado |
| ACTIVIDAD EN EL AULA | Registro de qué material o tarea revisó cada estudiante (RF-030) |

---

## 4. Relaciones y reglas de negocio que expresan

Lectura: *"Cada A [verbo] ___ B"* / *"Cada B pertenece a ___ A"*.

| A | Relación | B | Cardinalidad (A : B) | Regla de negocio |
|---|---|---|---|---|
| PERSONA | posee cuenta | USUARIO | 1 : 0..1 | Una persona tiene como máximo una cuenta |
| ROL | se asigna a | USUARIO | 1 : 0..N | Cada usuario tiene un solo rol |
| ROL | otorga | PERMISO | N : M | Matriz RBAC |
| ESTUDIANTE | tiene | APODERADO | N : M | Con atributos: parentesco, principal, vive con él, autorizado a recoger |
| AÑO ACADÉMICO | se divide en | PERIODO | 1 : 1..N | |
| GRADO | incluye | CURSO | N : M | Plan de estudios, con horas semanales |
| CURSO | desarrolla | COMPETENCIA | 0..1 : 0..N | Sin curso = competencia transversal |
| SECCIÓN | programa | CURSO-SECCIÓN | 1 : 1..N | |
| DOCENTE | tiene a cargo | CURSO-SECCIÓN | 0..1 : 0..N | Puede quedar sin docente mientras no se asigne |
| DOCENTE | es tutor de | SECCIÓN | 0..1 : 0..N | |
| ESTUDIANTE | se matricula | MATRÍCULA | 1 : 0..N | Una matrícula por año (regla a validar en Fase 3) |
| SECCIÓN | acoge | MATRÍCULA | 1 : 0..N | La sección fija el año de la matrícula |
| HORARIO | se ejecuta en | SESIÓN DE CLASE | 1 : 0..N | Una sesión por bloque y fecha |
| DOCENTE | dicta | SESIÓN DE CLASE | 1 : 0..N | Puede ser un reemplazo, no necesariamente el titular |
| SESIÓN DE CLASE | registra | ASISTENCIA | 1 : 0..N | |
| MATRÍCULA | obtiene nota en | EVALUACIÓN | N : M | La NOTA es una relación con atributos |
| MATRÍCULA / PERIODO | genera / programa | ENTREGA DE LIBRETA | 1 : 0..N | Una entrega por matrícula y periodo |
| APODERADO | recibe | ENTREGA DE LIBRETA | 0..1 : 0..N | Quién recibió la libreta |
| UNIDAD | contiene / propone | MATERIAL / TAREA | 1 : 0..N | |
| EVALUACIÓN | se alimenta de | TAREA | 0..1 : 0..N | La nota de una tarea puede alimentar una evaluación |
| PERSONA | realiza | MARCACIÓN | 1 : 0..N | |

*(El diagrama tiene 69 relaciones. Esta tabla resume las que llevan reglas relevantes.)*

---

## 5. Trazabilidad con los indicadores de la tesis

| Indicador (Anexo 03) | Fórmula | Entidades que lo calculan |
|---|---|---|
| **CSP** · Prácticas pedagógicas | sesiones ejecutadas ÷ sesiones planificadas × 100 | HORARIO (planificado) → SESIÓN DE CLASE (ejecutado, estado) − EVENTO que suspende clases |
| **IGM** · Aula virtual | materiales publicados a tiempo ÷ materiales planificados × 100 | MATERIAL (`fecha programada` vs. `publicado en`) |
| **ISA** · Seguimiento académico | reportes entregados ÷ reportes programados × 100 | ENTREGA DE LIBRETA (`fecha límite` vs. `entregada en`) ajustado por MATRÍCULA retirada |

---

## 6. Errores del sistema actual que este modelo corrige

| Error en SGA-BACK (TypeORM) | Corrección en el modelo |
|---|---|
| Entidad duplicada `grade_level` / `grade_leevel` | Una sola entidad GRADO bajo NIVEL |
| Credenciales repartidas en `student_credentials`, `teacher_credentials` y `access_control_credentials` | Una sola CREDENCIAL ligada a PERSONA |
| Asistencia docente en 3 tablas (`teacher_attendances`, `_intervals`, `_daily_`) | MARCACIÓN (ingreso al colegio) + SESIÓN DE CLASE (cumplimiento, CSP) |
| `materiales` sin fecha programada (brecha de IGM confirmada en la auditoría) | MATERIAL con `fecha programada` y `publicado en` |
| Asistencia de aula separada del dictado real | ASISTENCIA pertenece a una SESIÓN DE CLASE: si hay asistencia, hay evidencia de que la clase se dictó |
| Tablas técnicas mezcladas con el negocio (`entity_colors`, `user_preferences`, `reports`, `push_subscriptions`, `user_import_histories`) | Quedan fuera del modelo conceptual (el color pasa a ser atributo de CURSO) |
| Chat en 3 tablas (salas, participantes, mensajes) | MENSAJE DE CHAT ligado a CURSO-SECCIÓN (la sala es el curso) |
| Nombres de tablas en inglés con errores (`assigments`) | Nombres en español, consistentes con la tesis |
| Tutor de sección y turno como texto libre | Relaciones reales con DOCENTE y TURNO |

---

## 7. Decisiones que necesito que confirmes

> [!question] Pendientes de revisión
> 1. **Un rol por usuario.** Si un docente también es apoderado, necesitaría dos cuentas. ¿Lo dejamos así o pasamos a N:M (un usuario con varios roles)?
> 2. **Alcance de niveles.** El modelo cubre Inicial, Primaria y Secundaria, aunque la muestra es solo de 5.° de secundaria. ¿Mantenemos los tres niveles?
> 3. **Toda tarea pertenece a una unidad.** Así se evita duplicar el curso-sección. Si el docente no organiza por unidades, se usaría una unidad "General". ¿De acuerdo?
> 4. **CAPACIDAD (nueva).** ¿La evaluación se registra por competencia (como ahora) o también por capacidad?
> 5. **Módulos opcionales.** Chat, kiosko con QR y geocerca GPS vienen del sistema actual. ¿Siguen dentro del alcance de la tesis?

---

## 8. Próximo paso

**Fase 3 · Modelo lógico + normalización.** Consiste en:
- Convertir cada entidad en tabla.
- Resolver las relaciones N:M (NOTA, PLAN DE ESTUDIOS, VÍNCULO FAMILIAR, ROL-PERMISO) en tablas intermedias.
- Agregar las claves foráneas.
- Verificar 1FN, 2FN y 3FN.
- Elaborar el diccionario de datos.

La **Fase 1 (levantamiento de requerimientos)** se documentará al final, como se acordó.
