# RF-020: Indicadores de la Tesis y Panel

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Reportes
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 16 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres y días sin clases), `RF-011` (sesiones), `RF-013` (consolidado docente), `RF-014` (libretas), `RF-015` (materiales planificados).

## Consideraciones y supuestos de negocio

*   **Propósito.** Calcular y mostrar los tres indicadores de la tesis, comparar el **antes** (pretest, sin sistema) con el **después** (postest, con el sistema) y exportar la evidencia para el informe.
*   **Fórmulas.**

    | Indicador | Dimensión | Fórmula | Fuente |
    |---|---|---|---|
    | **CSP** — Cumplimiento de sesiones planificadas | Prácticas pedagógicas | (cumplidas + parciales) ÷ (planificadas − justificadas) × 100 *(P-18)* | Sesiones de clase (`RF-011`) |
    | **ISA** — Informes de seguimiento académico | Seguimiento académico | libretas publicadas a tiempo ÷ libretas programadas × 100 | Libretas (`RF-014`) |
    | **IGM** — Gestión de materiales | Aula virtual | materiales planificados publicados a tiempo ÷ materiales planificados × 100 | Materiales (`RF-015`) |

*   **Reglas de cada indicador.**
    *   **CSP:** las sesiones planificadas son las generadas en el periodo (los días sin clases no generan sesiones, `RF-005`). Las **justificadas** se excluyen del denominador. Se muestra también el desglose: cumplidas, parciales, no cumplidas y justificadas.
    *   **ISA:** cuentan las libretas programadas del periodo; las de estudiantes retirados antes de la fecha límite no existen (`RF-014`). Una libreta pendiente al vencer la fecha cuenta como no publicada a tiempo. Se muestra también el porcentaje de libretas **vistas por la familia** como dato complementario.
    *   **IGM:** solo materiales **planificados** y vigentes; los extra no cuentan (`RF-015`).
*   **Filtros.** Por año, bimestre o rango de fechas; y por sección (ISA), por docente y curso (CSP, IGM) o todo el colegio.
*   **Valores en vivo.** Mientras el periodo está abierto, el panel muestra el valor calculado al momento, marcado como "en curso".
*   **Pretest (manual).** El Director o el Administrador registra el valor medido **antes** del sistema: indicador, periodo descrito (ej. "I Bimestre 2026"), fechas, numerador, denominador y **fuente** obligatoria (ej. "Hojas físicas de firma de la subdirección"). El sistema calcula el porcentaje.
*   **Postest (congelado).** Al cerrar un bimestre (`RF-005`), quien tenga el permiso `indicadores.medir` presiona "Cerrar medición": el sistema calcula los tres indicadores y los **congela** con su desglose. El valor congelado no cambia aunque luego se corrija algún dato; para actualizarlo se genera una **versión nueva** con motivo, y la anterior queda con **vigencia 0**.
*   **Comparación pretest – postest.** El panel muestra, por indicador, el valor pretest, el postest y la **variación en puntos porcentuales**, con un gráfico de barras y la evolución por bimestre.
*   **Panel general.** Además de los tres indicadores, muestra un resumen de apoyo: asistencia al colegio del día, tardanzas, sesiones del día y libretas pendientes.
*   **Exportación.** Cada reporte se exporta a:
    *   **Excel:** datos crudos (detalle por sesión, libreta o material) para el análisis estadístico.
    *   **PDF:** reporte formal con logo del colegio, fórmula, periodo, valores, desglose, gráfico, fecha de generación y quién lo generó, para anexar a la tesis.
*   **Quién accede.** Por permiso con alcance (`RF-002`): por defecto, Director y Subdirector con alcance `colegio`; un docente con alcance `propio` ve solo su CSP e IGM.
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Registro de pretest, cierre de medición, nuevas versiones y exportaciones quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Pretest registrado | "Pretest de CSP registrado: 78.50 %." |
| Pretest sin fuente | "Indique la fuente del pretest (de dónde se obtuvo el dato)." |
| Numerador mayor | "El numerador no puede ser mayor que el denominador." |
| Medición cerrada | "Medición del II Bimestre cerrada: CSP 94.20 %, ISA 97.10 %, IGM 88.00 %." |
| Bimestre abierto | "Solo se puede cerrar la medición de un bimestre cerrado." |
| Medición ya cerrada | "Este bimestre ya tiene una medición cerrada. Genere una nueva versión indicando el motivo." |
| Nueva versión sin motivo | "Indique el motivo de la nueva versión." |
| Sin datos | "No hay datos para el periodo y los filtros elegidos." |
| Sin pretest | "Registre el pretest para ver la comparación." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Análisis estadístico inferencial** (pruebas t, normalidad, etc.). Se hace fuera del sistema con el Excel exportado.
*   **Registro de las sesiones, libretas y materiales.** Corresponden a `RF-011`, `RF-014` y `RF-015`.
*   **Consolidado docente individual.** Corresponde a `RF-013`.
*   **Envío automático de reportes por correo.** No se contempla.

## Acuerdos y puntos abiertos

*   **Fórmula del CSP (recomendado, pendiente P-18).** Ejecutadas = cumplidas + parciales; justificadas excluidas del denominador. Validar con el asesor.
*   **Pretest y postest (acordado).** Pretest manual con fuente; postest calculado y congelado; comparación con variación.
*   **Exportación (acordado).** Excel y PDF.

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

---

## Reglas de validación y negocio (resumen)

*   **CSP:** (cumplidas + parciales) ÷ (planificadas − justificadas) × 100 (P-18); desglose visible.
*   **ISA:** libretas a tiempo ÷ libretas programadas × 100; vistas por la familia como dato complementario.
*   **IGM:** materiales planificados a tiempo ÷ planificados × 100; extras excluidos.
*   **Pretest:** manual; numerador ≤ denominador; fuente obligatoria.
*   **Postest:** solo para bimestres cerrados; congelado; nuevas versiones con motivo; la anterior con vigencia 0.
*   **Comparación:** pretest, postest y variación en puntos porcentuales.
*   **Exportación:** Excel (detalle) y PDF (reporte formal).
*   **Permisos con alcance (`RF-002`):** Director y Subdirector `colegio`; docente `propio`.
*   **Auditoría:** pretest, cierres, versiones y exportaciones (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Panel general · Indicadores (tarjetas CSP, ISA, IGM con filtros y desglose) · Comparación pretest – postest (barras y evolución) · Registrar pretest · Cerrar medición · Exportar. Escenarios: Valor en curso · Medición cerrada · Nueva versión · Sin pretest · Sin datos.
