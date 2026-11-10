# Guía de entrevista — Pendientes del SGA Colegio

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Entrevistador:** Hever Lima
**Estado:** 1.ª ronda respondida el 2026-10-09 · **quedan 6 preguntas** (sección A) · **31 preguntas nuevas de seguimiento docente** (sección C, 3.ª ronda)

> Marque una opción (☐ → ☒) o escriba la respuesta. La opción **(propuesta)** es la que el sistema usa hoy; si el colegio la acepta, basta marcarla.
> Todo valor numérico es **configurable** (tabla de variables del sistema) y todo "quién puede" es **configurable por perfil**.
> Al volver, las respuestas se registran en `PENDIENTES.md` y se corrigen los RF en una nueva versión.

---

# A. PREGUNTAS PENDIENTES (2.ª ronda)

**Fecha de la entrevista:** ____ / ____ / ________

## A.1 Subdirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-03 · Jornada escolar (RF-008)

¿Qué jornada tiene el colegio?

- ☐ Jornada Escolar Regular: 7 horas pedagógicas de 45 min al día **(propuesta)**
- ☐ Jornada Escolar Completa: 9 horas pedagógicas de 45 min al día
- ☐ Otra: ____________________________

Hora de inicio de la primera clase: ________ Recreo: de ________ a ________ ¿Hay un segundo recreo? ☐ No ☐ Sí: ________

### P-04 · Bloque doble (RF-008, RF-011)

¿Un curso puede tener dos horas pedagógicas seguidas (90 min)?

- ☐ No
- ☐ Sí, y el docente **firma una sola vez** (ingreso y salida del bloque completo) **(propuesta)**
- ☐ Sí, pero el docente firma **cada hora por separado**

### P-15 · Conversión de la nota a literal (RF-016)

¿Qué rangos se usan para pasar la nota final del aula virtual (0–20) a AD, A, B, C?

| Literal | Propuesta | Rango del colegio |
| ------- | --------- | ----------------- |
| AD      | 18 – 20   | ____ – ____       |
| A       | 14 – 17   | ____ – ____       |
| B       | 11 – 13   | ____ – ____       |
| C       | 0 – 10    | ____ – ____       |

**Y los pesos de la nota final** (P-16 ya respondida: con peso por tipo):
Examen ____ % · Cuestionario ____ % · Trabajo ____ % · Proyecto ____ % (deben sumar 100 %; hoy 25 % cada uno)

**Observaciones:** ________________________________________________________________

## A.2 Dirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-07 · Justificación de sesiones (RF-011)

¿Qué perfil aprueba la justificación de una sesión no dictada (por ejemplo, por descanso médico)? _(será configurable)_

- ☐ Subdirector **(propuesta)**
- ☐ Director
- ☐ Ambos

**Observaciones:** ________________________________________________________________

## A.3 Secretaría (y docentes que manejan el SIAGIE)

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-12 · Libreta del SIAGIE (RF-014)

**Pedir un PDF de ejemplo de una libreta descargada del SIAGIE.** ☐ Se obtuvo el PDF

¿Dónde aparece el código del estudiante?

- ☐ En el **nombre del archivo** **(propuesta)** — Ejemplo de nombre: ______________________________
- ☐ **Impreso dentro** del PDF
- ☐ En ambos

¿Qué código es? ☐ Código del estudiante del SIAGIE ☐ DNI ☐ Otro: ______________
¿El SIAGIE descarga un PDF por estudiante o uno por sección? ☐ Por estudiante ☐ Por sección

**Observaciones:** ________________________________________________________________

## A.4 Asesor de tesis

**Asesor:** ______________________________________

### P-18 · Fórmula del CSP (RF-020)

Confirmar que coincide con el Anexo 03 del proyecto:

> **CSP = (sesiones cumplidas + parciales) ÷ (sesiones planificadas − justificadas) × 100**

- ☐ Aprobada tal cual **(propuesta)**
- ☐ Solo sesiones **cumplidas** como ejecutadas
- ☐ Las **justificadas** cuentan como no ejecutadas (no se excluyen)
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

## Resumen de la 2.ª ronda (para registrar al volver)

| N.°  | Respuesta corta | ¿Cambia el RF? |
| ---- | --------------- | -------------- |
| P-03 |                 | ☐ Sí ☐ No      |
| P-04 |                 | ☐ Sí ☐ No      |
| P-07 |                 | ☐ Sí ☐ No      |
| P-12 |                 | ☐ Sí ☐ No      |
| P-15 |                 | ☐ Sí ☐ No      |
| P-18 |                 | ☐ Sí ☐ No      |

---

# B. PREGUNTAS YA RESPONDIDAS (1.ª ronda, 2026-10-09)

| N.°  | Pregunta                                                        | Respuesta                                                                                                      | Aplicado en                     |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| P-01 | ¿Cómo se registran los apoderados?                              | Uno por uno desde la ficha del estudiante **y** masivo con plantilla Excel                                     | `RF-007` V2                     |
| P-02 | ¿El docente que es apoderado ve también el portal de apoderado? | Sí: un usuario puede tener **varios perfiles** y cambiar entre ellos                                           | `RF-001`, `RF-002`, `RF-007` V2 |
| P-05 | ¿Desde cuándo se firma el ingreso de la sesión?                 | Desde **15 minutos antes** hasta que termina el bloque; configurable                                           | `RF-011` V2                     |
| P-06 | ¿Tolerancia al firmar?                                          | **15 minutos** al ingresar y **15** al salir; configurables                                                    | `RF-011` V2                     |
| P-08 | ¿Si olvida firmar la salida?                                    | **Parcial** con "Sin firma de salida" y **hora de salida automática** (fin del bloque)                         | `RF-011` V2                     |
| P-09 | ¿Quién registra ausencias del docente?                          | Director y Subdirector por defecto; **configurable por perfil**                                                | `RF-012` V2                     |
| P-10 | ¿Plazo del descargo?                                            | **7 días calendario**; configurable (tabla de variables)                                                       | `RF-012`, `RF-004` V2           |
| P-11 | ¿Se puede corregir o borrar una ausencia?                       | Se corrige en 24 h antes del descargo; después solo se anula; cada cambio crea versión nueva (vigencia 0)      | `RF-012`                        |
| P-13 | ¿Días para planificar materiales?                               | **7 días**; configurable                                                                                       | `RF-015` V2                     |
| P-14 | ¿Quién aprueba cambios de fecha de materiales?                  | Subdirector por defecto; **configurable por perfil**                                                           | `RF-015` V2                     |
| P-16 | ¿Cómo se calcula la nota final del aula virtual?                | **Con peso por tipo** (examen, cuestionario, trabajo, proyecto); pesos configurables (faltan los % → ver P-15) | `RF-016` V2                     |
| P-17 | ¿Quién más ve observaciones confidenciales?                     | El **Director** y el **propio estudiante**; configurable por perfil                                            | `RF-018` V2                     |

**Decisión adicional (2026-10-09):** se distinguen **perfil** (acceso al sistema) y **cargo** (puesto en el colegio). Los permisos se dan solo por perfil; el cargo solo sugiere perfiles. → `RF-002`, `RF-007` V2.

---

# C. SEGUIMIENTO DOCENTE (3.ª ronda)

**Origen:** `RF-011` V3, `RF-013` V2, `RF-019` V2, `RF-020` V2, `RF-023` V1, `RF-002` V5, `RF-004` V3 (2026-11-09). Base normativa: Lineamientos MINEDU de seguimiento y control de la labor docente (colegio público), rúbricas de observación de aula 2025 y material de monitoreo y acompañamiento 2026.

> Marque ☐ → ☒ la propuesta o escriba otra respuesta. Todo valor es **configurable**. Las preguntas se agrupan por quién responde; las marcadas «Dirección / Subdirección» las puede responder cualquiera de los dos.

> **Relación con la 2.ª ronda:** P-49 (quién aprueba justificaciones) amplía a P-07. Conviene responderlas juntas.

## C.1 Dirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-45 · Alertas de sesiones (RF-011)

¿con cuántos minutos de anticipación se alerta una sesión `en_curso` sin firma de salida (`sesion.alerta_salida_minutos`) y desde cuántos **minutos perdidos acumulados** se alerta a un docente en el **día** (`sesion.alerta_minutos_perdidos_umbral`) y en la **semana** (`sesion.alerta_minutos_perdidos_umbral_semana`)? ¿Reciben la notificación el Subdirector y el Director?

- ☐ **(propuesta)** Salida: 10 min antes del fin del bloque; minutos perdidos: 45 por día y 120 por semana; avisa al Subdirector y al Director; 0 desactiva la alerta.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-47 · Motivos de justificación y documento (RF-011)

¿el catálogo (descanso médico, permiso personal, comisión de servicio, licencia, caso fortuito o fuerza mayor, otro) es correcto, y en qué motivos el **documento es obligatorio**?

- ☐ **(propuesta)** Documento obligatorio en descanso médico, comisión de servicio y licencia; opcional en el resto; «Otro» exige observación. Configurable.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-48 · Permiso personal (3 días al año) (RF-011)

la norma permite hasta **3 días al año** sin compensación horaria, con justificación y autorización previa. ¿Se cuenta por **días** (no por sesiones) en el año lectivo, y al pasar de 3 basta un **aviso** al aprobador (sin bloqueo)?

- ☐ **(propuesta)** Se cuentan días distintos con sesiones justificadas por permiso personal; al pasar de 3 (`sesion.permisos_personales_max_anio`) se avisa y se pide confirmar, sin bloqueo.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-49 · Quién aprueba o deniega justificaciones (RF-011)

la norma dice que el Director puede **denegar por razones del servicio educativo**. ¿Quién aprueba las justificaciones: el Subdirector (hoy) o el Director? ¿Puede el Director denegar una ya aprobada o solo consultar?

- ☐ **(propuesta)** Aprueba el Subdirector; el Director consulta; una denegación por razones de servicio se registra como rechazo con comentario.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-50 · Compromisos de mejora: enterado o firma (RF-013)

Compromisos de mejora: ¿basta que el docente marque **"Enterado"** (acuse con fecha y hora, no vinculante) o el colegio exige **firma de conformidad** (física en la ficha impresa)? ¿Los compromisos del consolidado (asistencia) y los de la observación de aula (`RF-023`) van en **una sola lista** o separados?

- ☐ **(propuesta)** "Enterado" con fecha y hora, sin firma digital; el compromiso rige aunque el docente no lo marque. Listas separadas por origen.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-51 · Hora pedagógica y horas dictadas (RF-013)

Horas pedagógicas: ¿se confirma que **1 hora pedagógica = 45 minutos** en todos los niveles (parámetro `sesion.minutos_hora_pedagogica`)? ¿Las horas dictadas salen solo de las firmas, sin restar los minutos fuera del aula de supervisión (`RF-012`)?

- ☐ **(propuesta)** 45 min en todos los niveles; un decimal; solo firmas; los minutos fuera del aula se muestran aparte.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-52 · Informe mensual de horas efectivas (RF-013)

Informe mensual de horas efectivas: ¿la UGEL exige el **Formato 02 oficial** exacto o basta una estructura parecida? ¿Las horas programadas se toman de la **calendarización real** o del estándar (22 días × horas diarias por nivel)? ¿`J` = sesiones justificadas e `I` = sesiones no cumplidas? ¿Qué cuenta como tardanza?

- ☐ **(propuesta)** Estructura parecida al Formato 02; programadas según el horario real; `J` = justificada, `I` = no cumplida; tardanza = retraso mayor a la tolerancia. El sistema no envía nada a la UGEL.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-53 · Días de gracia del Director (RF-013)

Pendientes de seguimiento: ¿cuántos **días de gracia** se dan al Director para registrar la decisión de un consolidado antes de que figure como "sin decisión"? ¿Y para generar el consolidado de un bimestre cerrado?

- ☐ **(propuesta)** 0 días de gracia (variable `consolidado.dias_para_decidir`); un consolidado sin generar figura desde el cierre del bimestre.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-54 · Recordatorio del compromiso (RF-013)

Recordatorio del compromiso: ¿basta **un aviso el día** de la fecha de revisión al Director que lo registró, o se desea un aviso previo (ej. 2 días antes) y copia al Subdirector?

- ☐ **(propuesta)** Un solo aviso el día de la revisión, al Director que lo registró (o al vigente si ya no está activo).
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-55 · Meta de los indicadores de apoyo (RF-020)

Los **indicadores de apoyo** del seguimiento docente (jornadas efectivas, minutos perdidos, puntualidad, minutos fuera del aula, tiempo de resolución de justificaciones), ¿tendrán una **meta o valor de referencia** con semáforo (por ejemplo, la referencia de jornadas efectivas del MINEDU para colegios públicos) o solo se muestran como dato?

- ☐ **(propuesta)** Solo informativos, sin meta ni semáforo; si se fija una meta, será configurable.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-57 · Definición de puntualidad (RF-020)

¿se considera puntual al docente que ingresa **dentro de la tolerancia** de `RF-011` (15 min por defecto) o solo al que ingresa **a la hora exacta** del bloque?

- ☐ **(propuesta)** Puntual = ingreso dentro de la tolerancia (retraso 0 minutos perdidos).
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-59 · Minutos fuera del aula en las jornadas (RF-020)

Los **minutos fuera del aula** por supervisión (`RF-012`), ¿se **restan** de las jornadas efectivas del docente o se muestran solo como dato aparte?

- ☐ **(propuesta)** No se restan; se muestran aparte y no afectan las jornadas efectivas.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-60 · Quién observa las clases (RF-023)

¿Quiénes pueden **observar** las clases? ¿Solo el Director y el Subdirector, o también un coordinador o docente de apoyo? ¿Se exige que el observador tenga una capacitación o certificación (el instructivo habla de observador certificado)?

- ☐ **(propuesta)** Observa quien tenga la opción "Observaciones de aula" (por defecto Director y Subdirector); nadie observa su propia clase; el sistema no valida certificación.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-61 · Qué ve el docente de su observación (RF-023)

¿El docente debe poder ver solo la **calificación** de su observación o también las **notas de evidencias** y el fundamento? ¿Desde cuándo?

- ☐ **(propuesta)** Tras la retroalimentación ve niveles, fundamentos, evidencias y compromisos.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-62 · Nivel educativo y rúbricas (RF-023)

¿Qué **nivel educativo** atiende el colegio (Inicial, Primaria, Secundaria)? ¿Se usarán las rúbricas del MINEDU 2025 para todos, o hay rúbricas distintas por nivel? ¿O el colegio prefiere una rúbrica propia?

- ☐ **(propuesta)** Una sola versión del instrumento (instructivo 2025) para todo el colegio; se pueden cargar más versiones.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-63 · Cantidad y plazos de observaciones (RF-023)

Valores por confirmar: **cantidad de observaciones por docente al año** (2 a 3), **anticipación mínima** del aviso y **plazo del comentario** del docente tras la retroalimentación.

- ☐ **(propuesta)** 2 observaciones, 2 días de anticipación y 7 días de plazo; variables `observacion.cantidad_objetivo_anual`, `observacion.anticipacion_minima_dias` y `observacion.plazo_descargo_dias`.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-64 · Conductas graves (RF-023)

El instructivo considera que ciertas **conductas graves** (por ejemplo, maltrato) ubican al docente en el nivel I con consecuencias adicionales. ¿Cómo debe actuar el colegio y el sistema?

- ☐ **(propuesta)** El sistema solo lo registra en las notas y la calificación; las medidas se toman fuera del sistema.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-65 · Observación entre pares, autoevaluación y encuesta (RF-023)

¿se aplicarán **observación entre pares, autoevaluación docente y encuesta a estudiantes**? Si hay encuesta, ¿debe ser anónima y quién ve los resultados?

- ☐ **(propuesta)** Fuera del alcance de la V1; se evalúa en una fase 2.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-66 · Puntaje global (RF-023)

¿Se desea una **nota o puntaje global** de la observación o basta con los cinco niveles por desempeño?

- ☐ **(propuesta)** Solo cinco niveles; sin puntaje ni promedio.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-67 · Enterado y firma (RF-023)

¿Basta el **"Enterado" en el sistema** más la firma física en el PDF impreso, o el colegio requiere firma digital del docente y del observador? ¿Dónde se archiva el protocolo firmado?

- ☐ **(propuesta)** Enterado en el sistema, firma física en el PDF y escaneo opcional como sustento; sin firma digital.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-68 · Reporte a la UGEL (RF-023)

Siendo un colegio público, ¿el resultado de las observaciones debe **reportarse a la UGEL** u otra instancia, o es solo de uso interno?

- ☐ **(propuesta)** Solo uso interno; no se envía a ninguna instancia ni afecta la evaluación oficial.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-69 · Bimestre cerrado con observaciones sin completar (RF-023)

Si al **cerrar el bimestre** hay observaciones realizadas pero sin calificar o sin retroalimentar, ¿se pueden completar después?

- ☐ **(propuesta)** Sí se pueden completar la calificación y la retroalimentación; no la toma de notas ni la programación.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-70 · Canal de las alertas (RF-019)

¿Las alertas y recordatorios de seguimiento docente (sesión sin firma, minutos perdidos, justificación vencida, compromisos, observaciones) deben llegar **solo a la campana del sistema** o también por **correo o notificación push** a Subdirector, Director y docentes?

- ☐ **(propuesta)** Solo dentro del sistema (bandeja), sin correo, SMS ni push, como piden RF-011 V3 y RF-013 V2.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-71 · Destinatarios de justificación vencida y recordatorios (RF-019)

¿Quién debe recibir la **justificación vencida sin resolver**: solo el aprobador (Subdirector) o también el Director? ¿Y el recordatorio de revisión de un compromiso: solo quien lo registró o también el Subdirector?

- ☐ **(propuesta)** Justificación vencida: el aprobador (Subdirector; el Director consulta). Recordatorio de compromiso: el Director que lo registró (RF-013) y el observador más quien tenga "Observaciones de aula" (RF-023).
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-73 · Nombre de la opción del consolidado (RF-002)

`RF-013` V2 llama **"Consolidado del bimestre"** a la opción del menú del consolidado, pero el catálogo del menú (y `RF-023`) la llama **"Consolidados docentes"**. ¿Cómo debe llamarse la opción que ve el Director y el Subdirector?

- ☐ **(propuesta)** Es la misma opción; el catálogo de `RF-002` V5 usa "Consolidados docentes". "Pendientes de seguimiento" e "Informe mensual de horas efectivas" son opciones propias, para Director y Subdirector.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-74 · Indicadores de apoyo como opción de menú (RF-002)

`RF-020` V2 dice que "Indicadores" y su sección **"Indicadores de apoyo"** aparecen solo si el rol los tiene asignados. ¿"Indicadores de apoyo" debe poder asignarse por separado de "Indicadores" (opción propia) o se ve siempre con "Indicadores"?

- ☐ **(propuesta)** Es una sección dentro de "Indicadores", sin opción de menú propia (`RF-002` V5).
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-75 · Mínimos y máximos de las variables nuevas (RF-004)

¿Qué **valores mínimos y máximos** deben tener las variables nuevas de `RF-011` V3, `RF-013` V2 y `RF-023` V1 (minutos, días, umbrales)? Solo `observacion.cantidad_objetivo_anual` tiene rango definido (2 a 3).

- ☐ **(propuesta)** Enteros no negativos y sin máximo; el valor 0 desactiva las alertas de minutos perdidos (`RF-004` V3).
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

## C.2 Subdirección

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-46 · Aviso de justificaciones sin resolver (RF-011)

¿tras cuántos días sin respuesta se avisa al aprobador de una solicitud de justificación (`sesion.justificacion_aviso_dias`), y se cuentan días hábiles?

- ☐ **(propuesta)** 3 días hábiles (sin feriados ni días sin clases); un solo aviso por solicitud.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-58 · Plazo de justificaciones vencidas (RF-020)

¿en cuántos días se debe resolver una justificación antes de considerarla **vencida**, y se cuentan días calendario o hábiles? Depende de la bandeja con vencimientos de `RF-011` V3.

- ☐ **(propuesta)** Plazo configurable de 5 días calendario desde la solicitud.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

### P-72 · Recordatorios con el sistema caído y doble rol (RF-019)

Si el sistema no estuvo disponible el día de una fecha de revisión o de un vencimiento, ¿se envía el recordatorio al día siguiente (una sola vez) o se omite? ¿Una persona con dos roles recibe una o dos notificaciones?

- ☐ **(propuesta)** Se envía al reanudarse, una sola vez; una persona con dos roles recibe una sola notificación por condición.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

## C.3 Asesor de tesis

**Entrevistado:** ______________________________________ **Cargo:** __________________

### P-56 · Indicadores de apoyo y la tesis (RF-020)

¿El **asesor de tesis** desea que alguno de los indicadores de apoyo pase a ser **indicador de la tesis** (con pretest, postest congelado y comparación)? Relación con P-18 (fórmula del CSP).

- ☐ **(propuesta)** No: CSP, ISA e IGM siguen siendo los tres de la tesis; los de apoyo no se congelan ni entran al pretest/postest.
- ☐ Otra: ____________________________

**Observaciones:** ________________________________________________________________

## Resumen de la 3.ª ronda (para registrar al volver)

| N.°  | Respuesta corta | ¿Cambia el RF? |
| ---- | --------------- | -------------- |
| P-45 |                 | ☐ Sí ☐ No      |
| P-46 |                 | ☐ Sí ☐ No      |
| P-47 |                 | ☐ Sí ☐ No      |
| P-48 |                 | ☐ Sí ☐ No      |
| P-49 |                 | ☐ Sí ☐ No      |
| P-50 |                 | ☐ Sí ☐ No      |
| P-51 |                 | ☐ Sí ☐ No      |
| P-52 |                 | ☐ Sí ☐ No      |
| P-53 |                 | ☐ Sí ☐ No      |
| P-54 |                 | ☐ Sí ☐ No      |
| P-55 |                 | ☐ Sí ☐ No      |
| P-56 |                 | ☐ Sí ☐ No      |
| P-57 |                 | ☐ Sí ☐ No      |
| P-58 |                 | ☐ Sí ☐ No      |
| P-59 |                 | ☐ Sí ☐ No      |
| P-60 |                 | ☐ Sí ☐ No      |
| P-61 |                 | ☐ Sí ☐ No      |
| P-62 |                 | ☐ Sí ☐ No      |
| P-63 |                 | ☐ Sí ☐ No      |
| P-64 |                 | ☐ Sí ☐ No      |
| P-65 |                 | ☐ Sí ☐ No      |
| P-66 |                 | ☐ Sí ☐ No      |
| P-67 |                 | ☐ Sí ☐ No      |
| P-68 |                 | ☐ Sí ☐ No      |
| P-69 |                 | ☐ Sí ☐ No      |
| P-70 |                 | ☐ Sí ☐ No      |
| P-71 |                 | ☐ Sí ☐ No      |
| P-72 |                 | ☐ Sí ☐ No      |
| P-73 |                 | ☐ Sí ☐ No      |
| P-74 |                 | ☐ Sí ☐ No      |
| P-75 |                 | ☐ Sí ☐ No      |
