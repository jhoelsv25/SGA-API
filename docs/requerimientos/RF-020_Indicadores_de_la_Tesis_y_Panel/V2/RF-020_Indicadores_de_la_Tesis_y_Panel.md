# RF-020: Indicadores de la Tesis y Panel

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Reportes
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres y días sin clases), `RF-011` (sesiones), `RF-013` (consolidado docente), `RF-014` (libretas), `RF-015` (materiales planificados). **(v2.0)** También `RF-008` (duración de los bloques), `RF-012` (supervisión y ausencias) y `RF-002` V4 (menú por rol).

> **Cambios de la versión 2.0 sobre la 1.0 (2026-11-09):**
>
> - **Indicadores de apoyo del seguimiento docente (v2.0).** Nueva sección "Indicadores de apoyo" en el menú Indicadores, junto al CSP pero **claramente separada** de los indicadores de la tesis: % de jornadas efectivas, minutos perdidos, puntualidad, minutos fuera del aula y tiempo de resolución de justificaciones. Son **informativos** y **no se congelan** ni entran al pretest/postest.
> - **Sin cambios** en CSP, ISA, IGM, pretest, postest congelado, comparación, exportación a Excel/PDF ni panel general. Lo existente se refuerza: los indicadores de apoyo se pueden filtrar y exportar con la misma lógica.
> - **Acceso por menú (v2.0).** El acceso a Indicadores y a la sección de apoyo se otorga desde el menú del rol (Roles–Menú, `RF-002` V4), además del alcance de datos.
> - **Pendientes nuevos:** P-55 a P-59 (ver "Acuerdos y puntos abiertos"), incluida la relación con P-18 (si el asesor quiere que alguno pase a ser indicador de la tesis).

## Consideraciones y supuestos de negocio

- **Propósito.** Calcular y mostrar los tres indicadores de la tesis, comparar el **antes** (pretest, sin sistema) con el **después** (postest, con el sistema) y exportar la evidencia para el informe.
- **Fórmulas.**

  | Indicador                                       | Dimensión             | Fórmula                                                                     | Fuente                       |
  | ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------- | ---------------------------- |
  | **CSP** — Cumplimiento de sesiones planificadas | Prácticas pedagógicas | (cumplidas + parciales) ÷ (planificadas − justificadas) × 100 _(P-18)_      | Sesiones de clase (`RF-011`) |
  | **ISA** — Informes de seguimiento académico     | Seguimiento académico | libretas publicadas a tiempo ÷ libretas programadas × 100                   | Libretas (`RF-014`)          |
  | **IGM** — Gestión de materiales                 | Aula virtual          | materiales planificados publicados a tiempo ÷ materiales planificados × 100 | Materiales (`RF-015`)        |

- **Reglas de cada indicador.**
  - **CSP:** las sesiones planificadas son las generadas en el periodo (los días sin clases no generan sesiones, `RF-005`). Las **justificadas** se excluyen del denominador. Se muestra también el desglose: cumplidas, parciales, no cumplidas y justificadas.
  - **ISA:** cuentan las libretas programadas del periodo; las de estudiantes retirados antes de la fecha límite no existen (`RF-014`). Una libreta pendiente al vencer la fecha cuenta como no publicada a tiempo. Se muestra también el porcentaje de libretas **vistas por la familia** como dato complementario.
  - **IGM:** solo materiales **planificados** y vigentes; los extra no cuentan (`RF-015`).
- **Filtros.** Por año, bimestre o rango de fechas; y por sección (ISA), por docente y curso (CSP, IGM) o todo el colegio.
- **Valores en vivo.** Mientras el periodo está abierto, el panel muestra el valor calculado al momento, marcado como "en curso".
- **Pretest (manual).** El Director o el Administrador registra el valor medido **antes** del sistema: indicador, periodo descrito (ej. "I Bimestre 2026"), fechas, numerador, denominador y **fuente** obligatoria (ej. "Hojas físicas de firma de la subdirección"). El sistema calcula el porcentaje.
- **Postest (congelado).** Al cerrar un bimestre (`RF-005`), quien tenga el permiso `indicadores.medir` presiona "Cerrar medición": el sistema calcula los tres indicadores y los **congela** con su desglose. El valor congelado no cambia aunque luego se corrija algún dato; para actualizarlo se genera una **versión nueva** con motivo, y la anterior queda con **vigencia 0**.
- **Comparación pretest – postest.** El panel muestra, por indicador, el valor pretest, el postest y la **variación en puntos porcentuales**, con un gráfico de barras y la evolución por bimestre.
- **Panel general.** Además de los tres indicadores, muestra un resumen de apoyo: asistencia al colegio del día, tardanzas, sesiones del día y libretas pendientes.
- **Exportación.** Cada reporte se exporta a:
  - **Excel:** datos crudos (detalle por sesión, libreta o material) para el análisis estadístico.
  - **PDF:** reporte formal con logo del colegio, fórmula, periodo, valores, desglose, gráfico, fecha de generación y quién lo generó, para anexar a la tesis.
- **Quién accede.** Por permiso con alcance (`RF-002`): por defecto, Director y Subdirector con alcance `colegio`; un docente con alcance `propio` ve solo su CSP e IGM. **(v2.0)** El acceso a la pantalla se otorga desde el **menú del rol** (Roles–Menú, `RF-002` V4): el ítem **Indicadores** y su sección **Indicadores de apoyo** aparecen solo si el rol los tiene asignados; el alcance de los datos (`colegio` o `propio`) lo sigue definiendo el permiso.
- **Indicadores de apoyo del seguimiento docente (v2.0).** El colegio es **público**: la idea de "jornadas efectivas" se inspira en el Compromiso 3 de Gestión Escolar del MINEDU (cumplimiento de la jornada y del tiempo de aprendizaje). Estos indicadores **no son indicadores de la tesis**: **no cambian** CSP, ISA ni IGM, **no se congelan** al cerrar la medición, **no entran** al pretest/postest ni a la comparación, y se muestran en una sección propia, con otro título y color, para no confundirlos. Sí se pueden **filtrar y exportar**.
  - **Fórmulas exactas.** Todas se calculan sobre las sesiones del periodo con día **ya cerrado** (el día en curso se marca "en curso"), con la misma base que el CSP (`RF-011`): días sin clases no generan sesiones; la sesión cuenta al docente que la dictó (titular o reemplazo).

    | Indicador de apoyo                          | Fórmula                                                                                                                                                                                                         | Fuente                                                              |
    | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
    | **% de jornadas efectivas**                 | minutos efectivos dictados ÷ minutos programados × 100                                                                                                                                                          | Sesiones (`RF-011`) y duración del bloque (`RF-008`)                |
    | **Minutos perdidos**                        | Σ (retraso + salida antes de tiempo) de las sesiones del periodo; **promedio por sesión** = minutos perdidos ÷ sesiones ejecutadas (cumplidas + parciales)                                                      | Sesiones (`RF-011`)                                                 |
    | **Puntualidad**                             | sesiones ejecutadas con ingreso dentro de la tolerancia (retraso 0) ÷ sesiones con firma de ingreso × 100                                                                                                       | Sesiones (`RF-011`)                                                 |
    | **Minutos fuera del aula**                  | Σ minutos de las ausencias de supervisión **vigentes y no anuladas**; se muestra también la cantidad de supervisiones                                                                                           | Ausencias (`RF-012`)                                                |
    | **Tiempo de resolución de justificaciones** | promedio de (fecha de resolución − fecha de solicitud) en días de las solicitudes **resueltas** (aprobadas o rechazadas) en el periodo; **vencidas** = solicitudes sin resolver cuya antigüedad supera el plazo | Justificaciones (`RF-011`; bandeja con vencimientos en `RF-011` V3) |

  - **Jornadas efectivas, con detalle.** _Minutos programados_ = suma de la duración del bloque de las sesiones planificadas, **excluidas las justificadas** (igual que el denominador del CSP). _Minutos efectivos_ = suma de (duración del bloque − minutos perdidos) de las sesiones `cumplida` y `parcial`; una `no_cumplida` aporta 0. Una sesión `parcial` cuenta **sus minutos reales**, no se redondea a completa ni a cero. Si la salida fue automática por olvido de firma (`RF-011` V2, P-08), los minutos perdidos son solo el retraso. Las ausencias de supervisión (`RF-012`) **no se restan** de las horas efectivas: se muestran aparte como "minutos fuera del aula".
  - **Minutos perdidos y puntualidad.** Se respetan la tolerancia y los minutos perdidos tal como los define `RF-011`: un retraso o una salida dentro de la tolerancia suman 0 minutos y la sesión es puntual. Las sesiones `no_cumplida` y `justificada` no tienen firma y quedan fuera de estos dos indicadores.
  - **Minutos fuera del aula.** Solo la **versión vigente** de cada ausencia (vigencia 1); las versiones anteriores (vigencia 0) y las ausencias **anuladas** no suman (`RF-012`).
  - **Justificaciones.** Los días son calendario, con un decimal. Las rechazadas cuentan como resueltas. El plazo de vencimiento y su cómputo los define `RF-011` V3 y la bandeja de justificaciones (P-58).
  - **Filtros.** Año (el elegido en el encabezado), bimestre o rango de fechas, docente, curso y sección (el tiempo de resolución se filtra por docente solicitante y por el curso/sección de la sesión).
  - **Ranking y gráfico.** Un **ranking de docentes**, ordenable por cualquier indicador de apoyo (ascendente o descendente), visible **solo para Director y Subdirector**. El docente ve **únicamente los suyos**, sin ranking ni datos de otros. Un gráfico muestra la **evolución por bimestre** de cada indicador.
  - **Informativos.** No tienen meta ni semáforo; se muestran como dato. Si el colegio fija una meta, será una variable configurable (P-55).
  - **Sin datos, nunca inventados.** Un docente sin sesiones en el periodo y los filtros muestra **"Sin datos"** en cada indicador: no hay división por cero ni se muestra 0 % ni se completa con promedios. Si un indicador tiene datos y otro no (por ejemplo, ninguna supervisión), solo el segundo muestra "Sin datos".
  - **Exportación.** Excel con el resumen y una hoja de **detalle** (por sesión: fecha, docente, curso, sección, estado, minutos programados, efectivos, perdidos, puntual sí/no; por supervisión y por justificación en hojas aparte). El PDF formal de la tesis **no incluye** estos indicadores como parte de la comparación.

- **Operación 100% en línea.**
- **Auditoría inmutable.** Registro de pretest, cierre de medición, nuevas versiones y exportaciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                             | Mensaje                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pretest registrado                    | "Pretest de CSP registrado: 78.50 %."                                                        |
| Pretest sin fuente                    | "Indique la fuente del pretest (de dónde se obtuvo el dato)."                                |
| Numerador mayor                       | "El numerador no puede ser mayor que el denominador."                                        |
| Medición cerrada                      | "Medición del II Bimestre cerrada: CSP 94.20 %, ISA 97.10 %, IGM 88.00 %."                   |
| Bimestre abierto                      | "Solo se puede cerrar la medición de un bimestre cerrado."                                   |
| Medición ya cerrada                   | "Este bimestre ya tiene una medición cerrada. Genere una nueva versión indicando el motivo." |
| Nueva versión sin motivo              | "Indique el motivo de la nueva versión."                                                     |
| Sin datos                             | "No hay datos para el periodo y los filtros elegidos."                                       |
| Sin pretest                           | "Registre el pretest para ver la comparación."                                               |
| Sin datos de apoyo (v2.0)             | "Sin datos"                                                                                  |
| Indicador de apoyo informativo (v2.0) | "Indicadores de apoyo: informativos, no forman parte de los indicadores de la tesis."        |
| Valor en curso de apoyo (v2.0)        | "En curso: el día de hoy aún no se cierra."                                                  |

## Requerimientos fuera de alcance (Out of Scope)

- **Análisis estadístico inferencial** (pruebas t, normalidad, etc.). Se hace fuera del sistema con el Excel exportado.
- **Registro de las sesiones, libretas y materiales.** Corresponden a `RF-011`, `RF-014` y `RF-015`.
- **Consolidado docente individual.** Corresponde a `RF-013`.
- **Envío automático de reportes por correo.** No se contempla.
- **(v2.0) Metas, semáforo y sanciones** sobre los indicadores de apoyo (salvo la meta configurable de P-55), y **descuentos o evaluación de desempeño** del docente: el ranking es informativo.
- **(v2.0) Registro de los datos de apoyo.** Las firmas, ausencias y justificaciones se registran en `RF-011` y `RF-012`; aquí solo se calculan y muestran.

## Acuerdos y puntos abiertos

- **Fórmula del CSP (recomendado, pendiente P-18).** Ejecutadas = cumplidas + parciales; justificadas excluidas del denominador. Validar con el asesor.
- **Pretest y postest (acordado).** Pretest manual con fuente; postest calculado y congelado; comparación con variación.
- **Exportación (acordado).** Excel y PDF.
- **Indicadores de apoyo (v2.0, propuesta del BA, validar).** Los cinco indicadores, sus fórmulas, su separación de la tesis y su ranking solo para dirección están definidos arriba; los puntos dudosos son:
  - **Meta o referencia (P-55).** Hoy sin meta ni semáforo. Supuesto: informativos; si el colegio fija una meta (por ejemplo, la referencia de jornadas efectivas del MINEDU), será configurable.
  - **¿Alguno pasa a ser indicador de la tesis? (P-56, relación con P-18).** Supuesto: no; CSP, ISA e IGM son los tres de la tesis. Preguntar al asesor.
  - **Puntualidad (P-57).** Supuesto: puntual = ingreso dentro de la tolerancia de `RF-011` (15 min por defecto), no a la hora exacta.
  - **Vencimiento de justificaciones (P-58).** Supuesto: plazo configurable de **5 días calendario** desde la solicitud, a la espera de `RF-011` V3.
  - **Ausencias y horas efectivas (P-59).** Supuesto: los minutos fuera del aula no se restan de las jornadas efectivas; se muestran aparte.

## Historia de Usuario 1: Consultar los indicadores

**Como** Director
**Quiero** ver el CSP, el ISA y el IGM con sus filtros
**Para** conocer cómo está el colegio en cada dimensión de la tesis.

### Escenario: Ver el CSP del bimestre

**Dado** que en el II Bimestre hubo 1 200 sesiones planificadas: 1 080 cumplidas, 60 parciales, 40 no cumplidas y 20 justificadas
**Cuando** abro "Indicadores" y elijo el II Bimestre
**Entonces** el CSP es (1 080 + 60) ÷ (1 200 − 20) × 100 = 96.61 %
**Y** se muestra el desglose de las cuatro categorías.

### Escenario: Ver el ISA del bimestre

**Dado** que se programaron 168 libretas y 160 se publicaron a tiempo
**Cuando** consulto el ISA del II Bimestre
**Entonces** el ISA es 95.24 % y se muestra, además, cuántas fueron vistas por la familia.

### Escenario: Ver el IGM del bimestre

**Dado** que se planificaron 250 materiales y 220 se publicaron a tiempo, más 30 materiales extra
**Cuando** consulto el IGM del II Bimestre
**Entonces** el IGM es 88.00 % y los materiales extra no se cuentan.

### Escenario: Filtrar por docente

**Dado** que estoy en "Indicadores"
**Cuando** filtro el CSP y el IGM por el docente Quispe
**Entonces** el sistema muestra sus valores y el detalle por curso.

### Escenario: Valor en curso

**Dado** que el III Bimestre está en curso
**Cuando** consulto sus indicadores
**Entonces** el sistema muestra el valor al momento marcado como "en curso".

### Escenario: Sin datos

**Dado** que el periodo elegido no tiene sesiones, libretas ni materiales
**Cuando** consulto
**Entonces** el sistema muestra "No hay datos para el periodo y los filtros elegidos."

### Escenario: Docente ve solo lo suyo

**Dado** que soy docente con alcance `propio`
**Cuando** abro "Indicadores"
**Entonces** veo solo mi CSP y mi IGM.

## Historia de Usuario 2: Pretest y postest

**Como** Director
**Quiero** registrar el valor anterior al sistema y congelar el valor con el sistema
**Para** comparar el antes y el después en la tesis.

### Escenario: Registrar el pretest

**Dado** que en el I Bimestre 2026, según las hojas físicas, se dictaron 942 de 1 200 sesiones
**Cuando** registro un pretest de CSP con numerador 942, denominador 1 200 y fuente "Hojas físicas de firma de la subdirección"
**Entonces** el sistema guarda el pretest con 78.50 % y muestra "Pretest de CSP registrado: 78.50 %."

### Escenario: Pretest sin fuente

**Dado** que estoy registrando un pretest
**Cuando** guardo sin fuente
**Entonces** el sistema impide guardar y muestra "Indique la fuente del pretest (de dónde se obtuvo el dato)."

### Escenario: Numerador mayor que el denominador

**Dado** que estoy registrando un pretest
**Cuando** ingreso numerador 1 300 y denominador 1 200
**Entonces** el sistema impide guardar y muestra "El numerador no puede ser mayor que el denominador."

### Escenario: Cerrar la medición del bimestre

**Dado** que el II Bimestre está cerrado
**Cuando** presiono "Cerrar medición"
**Entonces** el sistema calcula y congela los tres indicadores como postest, con su desglose, y muestra "Medición del II Bimestre cerrada: CSP 94.20 %, ISA 97.10 %, IGM 88.00 %."

### Escenario: Cerrar la medición con el bimestre abierto

**Dado** que el III Bimestre está en curso
**Cuando** intento cerrar su medición
**Entonces** el sistema bloquea la acción y muestra "Solo se puede cerrar la medición de un bimestre cerrado."

### Escenario: El valor congelado no cambia

**Dado** que la medición del II Bimestre está cerrada con CSP 94.20 %
**Cuando** luego se aprueba una justificación de una sesión de ese bimestre
**Entonces** el postest congelado sigue en 94.20 %.

### Escenario: Nueva versión de la medición

**Dado** que la medición del II Bimestre ya está cerrada
**Cuando** genero una nueva versión con el motivo "Justificaciones aprobadas tarde"
**Entonces** el sistema recalcula, crea la versión 2 vigente y deja la versión 1 con vigencia 0.

### Escenario: Nueva versión sin motivo

**Dado** que estoy generando una nueva versión
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo de la nueva versión."

### Escenario: Comparación pretest – postest

**Dado** que el CSP tiene pretest 78.50 % y postest 94.20 %
**Cuando** abro "Comparación"
**Entonces** el sistema muestra ambos valores, la variación de +15.70 puntos porcentuales y un gráfico de barras, igual para ISA e IGM.

### Escenario: Comparación sin pretest

**Dado** que el IGM no tiene pretest registrado
**Cuando** abro "Comparación"
**Entonces** el IGM muestra solo el postest con el mensaje "Registre el pretest para ver la comparación."

## Historia de Usuario 3: Exportar la evidencia

**Como** Director
**Quiero** exportar los indicadores a Excel y PDF
**Para** analizarlos y anexarlos a la tesis.

### Escenario: Exportar a Excel

**Dado** que estoy viendo el CSP del II Bimestre
**Cuando** presiono "Exportar a Excel"
**Entonces** el archivo trae el resumen y una hoja con el detalle de cada sesión (fecha, docente, curso, sección, estado).

### Escenario: Exportar a PDF

**Dado** que estoy en "Comparación"
**Cuando** presiono "Exportar a PDF"
**Entonces** el sistema genera un reporte con el logo del colegio, las fórmulas, los periodos, los valores pretest y postest, la variación, los gráficos, la fecha de generación y quién lo generó.

## Historia de Usuario 4: Panel general

**Como** Director
**Quiero** un panel con lo más importante del día y los indicadores
**Para** tener una visión rápida del colegio.

### Escenario: Ver el panel

**Dado** que ingreso al sistema como Director
**Cuando** abro el panel
**Entonces** veo los tres indicadores del bimestre en curso, la asistencia al colegio de hoy, las tardanzas, las sesiones de hoy (firmadas y pendientes) y las libretas pendientes.

## Historia de Usuario 5: Indicadores de apoyo del seguimiento docente (v2.0)

**Como** Director
**Quiero** ver, junto al CSP pero separados de la tesis, indicadores de apoyo del seguimiento docente
**Para** detectar con tiempo los problemas de cumplimiento de la jornada, puntualidad y tiempo fuera del aula.

### Escenario: Sección separada de los indicadores de la tesis (v2.0)

**Dado** que mi rol tiene el ítem "Indicadores" en el menú
**Cuando** abro "Indicadores"
**Entonces** veo los tres indicadores de la tesis y, aparte, la sección "Indicadores de apoyo" con el mensaje "Indicadores de apoyo: informativos, no forman parte de los indicadores de la tesis."
**Y** CSP, ISA e IGM no cambian de valor ni de fórmula.

### Escenario: Rol sin el ítem en el menú (v2.0)

**Dado** que mi rol no tiene el ítem "Indicadores" en el menú
**Cuando** intento abrir la pantalla por su dirección
**Entonces** el sistema deniega el acceso, igual que a cualquier opción no asignada al rol.

### Escenario: % de jornadas efectivas (v2.0)

**Dado** que en el II Bimestre el docente Quispe tuvo 40 sesiones planificadas de 45 min: 33 cumplidas, 4 parciales con 20, 30, 15 y 25 minutos perdidos, 1 no cumplida y 2 justificadas
**Cuando** consulto sus jornadas efectivas
**Entonces** los minutos programados son 38 × 45 = 1 710 (las 2 justificadas se excluyen)
**Y** los minutos efectivos son 37 × 45 − 90 = 1 575
**Y** el indicador es 1 575 ÷ 1 710 × 100 = 92.11 %.

### Escenario: La sesión parcial cuenta sus minutos reales (v2.0)

**Dado** que una sesión parcial de 45 min tuvo 20 minutos perdidos
**Cuando** se calculan las jornadas efectivas
**Entonces** esa sesión aporta 25 minutos efectivos y 45 programados.

### Escenario: Salida automática por olvido de firma (v2.0)

**Dado** que una sesión quedó parcial con "Sin firma de salida" y salida automática, con 10 minutos de retraso fuera de la tolerancia
**Cuando** se calculan las jornadas efectivas
**Entonces** los minutos perdidos de esa sesión son 10 y aporta 35 minutos efectivos de 45.

### Escenario: Minutos perdidos y promedio por sesión (v2.0)

**Dado** que el docente Quispe tiene 90 minutos perdidos en 37 sesiones ejecutadas
**Cuando** consulto sus minutos perdidos
**Entonces** veo el total de 90 minutos y el promedio por sesión de 2.43 minutos
**Y** los retrasos o salidas dentro de la tolerancia suman 0.

### Escenario: Puntualidad (v2.0)

**Dado** que de 37 sesiones con firma de ingreso, 3 tuvieron retraso fuera de la tolerancia
**Cuando** consulto la puntualidad
**Entonces** el indicador es 34 ÷ 37 × 100 = 91.89 %
**Y** las sesiones no cumplidas y las justificadas no entran en el cálculo.

### Escenario: Minutos fuera del aula por supervisión (v2.0)

**Dado** que el docente Quispe tiene ausencias de supervisión vigentes de 20, 15 y 30 minutos, y una anulada de 25
**Cuando** consulto sus minutos fuera del aula
**Entonces** veo 65 minutos en 3 supervisiones
**Y** la ausencia anulada y las versiones anteriores (vigencia 0) no suman.

### Escenario: Tiempo de resolución y justificaciones vencidas (v2.0)

**Dado** que en el periodo se resolvieron 3 justificaciones en 1, 2 y 3 días, y hay 2 solicitudes sin resolver con más de 5 días
**Cuando** consulto el tiempo de resolución
**Entonces** veo un promedio de 2.0 días y 2 justificaciones vencidas
**Y** las rechazadas cuentan como resueltas.

### Escenario: Docente sin sesiones en el periodo (v2.0)

**Dado** que el docente Flores no tiene sesiones en el periodo y los filtros elegidos
**Cuando** consulto sus indicadores de apoyo
**Entonces** cada indicador muestra "Sin datos"
**Y** el sistema no divide por cero, no muestra 0 % y no completa el valor con otro dato.

### Escenario: Un indicador con datos y otro sin datos (v2.0)

**Dado** que un docente tiene sesiones pero ninguna supervisión en el periodo
**Cuando** consulto sus indicadores de apoyo
**Entonces** las jornadas efectivas, los minutos perdidos y la puntualidad muestran su valor
**Y** los minutos fuera del aula muestran "Sin datos".

### Escenario: Ranking de docentes ordenable (v2.0)

**Dado** que soy Director o Subdirector
**Cuando** abro el ranking de docentes y ordeno por minutos perdidos de mayor a menor
**Entonces** veo la lista de docentes con cada indicador de apoyo, ordenada por esa columna
**Y** los docentes con "Sin datos" quedan al final.

### Escenario: El docente ve solo los suyos (v2.0)

**Dado** que soy docente con alcance `propio`
**Cuando** abro "Indicadores de apoyo"
**Entonces** veo solo mis indicadores, sin ranking ni datos de otros docentes.

### Escenario: Filtrar por bimestre, curso y sección (v2.0)

**Dado** que estoy en "Indicadores de apoyo"
**Cuando** filtro por el II Bimestre, el curso Matemática y la sección 2.° A
**Entonces** los indicadores y el ranking se recalculan solo con esas sesiones.

### Escenario: Evolución por bimestre (v2.0)

**Dado** que hay bimestres con datos
**Cuando** abro el gráfico de evolución de las jornadas efectivas
**Entonces** veo el valor de cada bimestre y el del bimestre en curso marcado "En curso: el día de hoy aún no se cierra."

### Escenario: Los indicadores de apoyo no se congelan (v2.0)

**Dado** que presiono "Cerrar medición" del II Bimestre
**Cuando** el sistema congela el postest
**Entonces** congela solo CSP, ISA e IGM
**Y** los indicadores de apoyo siguen calculándose en vivo con los datos vigentes
**Y** no aparecen en el pretest, el postest ni la comparación.

### Escenario: Sin meta ni semáforo (v2.0)

**Dado** que consulto un indicador de apoyo
**Cuando** veo su tarjeta
**Entonces** muestra el valor sin meta, semáforo ni calificación.

### Escenario: Exportar los indicadores de apoyo a Excel (v2.0)

**Dado** que estoy viendo los indicadores de apoyo del II Bimestre
**Cuando** presiono "Exportar a Excel"
**Entonces** el archivo trae el resumen por docente y una hoja de detalle por sesión (fecha, docente, curso, sección, estado, minutos programados, efectivos y perdidos, puntual sí o no)
**Y** hojas aparte para las supervisiones y las justificaciones
**Y** la exportación queda en la bitácora (`RF-003`).

---

## Reglas de validación y negocio (resumen)

- **CSP:** (cumplidas + parciales) ÷ (planificadas − justificadas) × 100 (P-18); desglose visible.
- **ISA:** libretas a tiempo ÷ libretas programadas × 100; vistas por la familia como dato complementario.
- **IGM:** materiales planificados a tiempo ÷ planificados × 100; extras excluidos.
- **Pretest:** manual; numerador ≤ denominador; fuente obligatoria.
- **Postest:** solo para bimestres cerrados; congelado; nuevas versiones con motivo; la anterior con vigencia 0.
- **Comparación:** pretest, postest y variación en puntos porcentuales.
- **Exportación:** Excel (detalle) y PDF (reporte formal).
- **Permisos con alcance (`RF-002`):** Director y Subdirector `colegio`; docente `propio`.
- **Auditoría:** pretest, cierres, versiones y exportaciones (`RF-003`).
- **(v2.0) Acceso:** por el menú del rol (`RF-002` V4) más el alcance de datos.
- **(v2.0) Indicadores de apoyo:** separados de la tesis; no se congelan; no entran al pretest/postest; se filtran y exportan.
- **(v2.0) Jornadas efectivas:** minutos efectivos ÷ minutos programados × 100; justificadas fuera del denominador; las parciales cuentan sus minutos reales.
- **(v2.0) Minutos perdidos:** retraso + salida antes de tiempo; promedio = total ÷ sesiones ejecutadas.
- **(v2.0) Puntualidad:** ingresos dentro de la tolerancia ÷ sesiones con firma de ingreso × 100.
- **(v2.0) Fuera del aula:** solo ausencias vigentes y no anuladas.
- **(v2.0) Resolución:** promedio de días entre solicitud y resolución; vencidas aparte.
- **(v2.0) Sin datos:** "Sin datos", sin división por cero; ranking solo para Director y Subdirector.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Panel general · Indicadores (tarjetas CSP, ISA, IGM con filtros y desglose) · Comparación pretest – postest (barras y evolución) · Registrar pretest · Cerrar medición · Exportar. Escenarios: Valor en curso · Medición cerrada · Nueva versión · Sin pretest · Sin datos. **(v2.0)** Sección "Indicadores de apoyo" (tarjetas por indicador, ranking de docentes ordenable, evolución por bimestre, filtros de docente, curso y sección, exportar a Excel) · Docente sin sesiones ("Sin datos").
