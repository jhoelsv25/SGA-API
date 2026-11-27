# RF-025: Reporte de Asistencia para la UGEL

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Asistencia
**Versión:** 1.0
**Fecha:** 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media
**Prerrequisitos:** `RF-004` (turnos, institución y variables), `RF-005` (calendario), `RF-007` (docentes y cargos), `RF-010` (marcaciones).

## Consideraciones y supuestos de negocio

- **Sustento.** [RSG 326-2017-MINEDU](../../../sustento-normativo/fuentes/01-minedu/RSG-326-2017_asistencia-docente/documento.pdf) (páginas del PDF): el director remite cada mes a la UGEL el Anexo 03 y el Anexo 04, dentro de los 3 primeros días hábiles del mes siguiente, aun sin incidencias (6.2.1 y 6.2.2, pág. 10). Los formatos y su llenado están en las páginas 18 a 21. Detalle de la comparación: [asistencia docente](../../../sustento-normativo/por-funcion/asistencia-docente.md).
- **El colegio es público** (confirmado por el responsable, 2026-11-26).
- **A quién incluye.** Profesores (sin practicantes) con vínculo en el mes y personas con cargo vigente «Auxiliar de educación». El resto del personal no entra: la norma no lo alcanza.
- **Quién lo usa.** Quien tiene acceso a "Control diario".
- **El sistema no envía nada a la UGEL.** Genera los documentos; el director los revisa, los firma y los presenta.
- **No calcula descuentos de dinero:** eso corresponde a la UGEL (6.4).
- **Fuera de esta versión:** plan de recuperación de horas (6.2.3), visto bueno de IE unidocente (6.2.4) y la inclusión de sábado y domingo por 5 días de inasistencia (6.3.1.2; ver `P-99`).

---

## Historia de Usuario 1: Armar el reporte del mes

**Como** Director
**Quiero** ver el reporte de asistencia del mes antes de enviarlo
**Para** revisar y corregir lo que afecta los descuentos

### Escenario: Vista previa del mes

**Dado** que soy Director, Subdirector o Secretaria
**Cuando** abro "Control diario → Reporte UGEL" y elijo un mes
**Entonces** veo por cada docente y auxiliar de educación un código por día, sus días de inasistencia, su tardanza y su permiso sin goce
**Y** el mes propuesto es el anterior al actual.

### Escenario: Códigos del día

**Dado** un día laborable ya transcurrido
**Cuando** el docente tiene entrada y salida a tiempo
**Entonces** el día sale como `A`
**Y** si no tiene ninguna marca sale como `I`
**Y** los fines de semana, los días sin clases del calendario, hoy y los días futuros quedan en blanco.

### Escenario: Tardanza

**Dado** que la entrada es posterior a la hora del turno más la tolerancia, aunque esté fuera de la ventana del reloj
**Cuando** se arma el reporte
**Entonces** el día sale como `T` y suma sus minutos
**Y** si la tardanza está justificada sale como `A` y no suma.

### Escenario: Tercera tardanza

**Dado** que `asistencia.tardanzas_para_inasistencia` es 3
**Cuando** un docente acumula su tercera tardanza del mes
**Entonces** ese día sale como `3T`
**Y** cuenta como día de inasistencia en el Anexo 04
**Y** sus minutos siguen sumando en las tardanzas.

### Escenario: Marca incompleta o salida anticipada

**Dado** que `asistencia.marca_incompleta_es_inasistencia` está activada
**Cuando** falta el ingreso o la salida, o la salida es anterior a la hora sin justificación
**Entonces** el día sale como `I`
**Y** la observación indica los días para que dirección los revise.

### Escenario: Mes sin terminar

**Dado** que el mes elegido no ha terminado
**Cuando** veo o exporto el reporte
**Entonces** queda marcado como BORRADOR
**Y** un mes que aún no empieza se rechaza.

### Escenario: Avisos antes de enviar

**Dado** que faltan datos o hay situaciones que cambian descuentos
**Cuando** veo la vista previa
**Entonces** el sistema avisa: datos de la institución en blanco, días en que nadie marcó, personas sin ninguna marca, fichas sin cargo o condición, tolerancia mayor que cero y 5 o más días de inasistencia o huelga.


---

## Historia de Usuario 2: Justificaciones

**Como** Secretaria
**Quiero** registrar licencias, permisos, vacaciones, huelgas y omisiones justificadas
**Para** que nadie figure como inasistente cuando tiene sustento

### Escenario: Registrar una justificación

**Dado** un docente o auxiliar de educación
**Cuando** registro licencia con goce, permiso con goce o vacaciones con su documento
**Entonces** esos días laborables salen como `J`
**Y** licencia sin goce sale como `L` y huelga o paro como `H`.

### Escenario: Permiso sin goce

**Dado** un permiso sin goce de remuneraciones
**Cuando** lo registro con sus minutos y su papeleta
**Entonces** el día sale como `P` y el Anexo 04 suma sus horas y minutos
**Y** sin minutos no se guarda.

### Escenario: Omisión justificada

**Dado** que a un docente le faltó la salida un día
**Cuando** registro la omisión con el documento y la fecha y hora en que presentó el sustento, dentro del plazo
**Entonces** ese día deja de ser inasistencia y se evalúa como laborado.

### Escenario: Omisión fuera de plazo o sobre el límite

**Dado** los valores por defecto de 24 horas y una omisión al mes
**Cuando** el sustento se presentó después del plazo, o ya se usó la omisión del mes
**Entonces** el sistema la rechaza y explica el motivo.

### Escenario: Justificaciones que se cruzan

**Dado** que una persona ya tiene una justificación en esas fechas
**Cuando** registro otra
**Entonces** el sistema la rechaza.

### Escenario: Anular una justificación

**Dado** una justificación registrada por error
**Cuando** la anulo indicando el motivo
**Entonces** deja de contar en el reporte pero queda visible como anulada
**Y** el registro y la anulación quedan en la bitácora.


---

## Historia de Usuario 3: Exportar los anexos

**Como** Director
**Quiero** descargar los Anexos 03 y 04
**Para** firmarlos y remitirlos a la UGEL

### Escenario: Exportar en PDF para firma

**Dado** el reporte de un mes
**Cuando** descargo el PDF
**Entonces** obtengo el Anexo 03 y el Anexo 04 con las columnas, la leyenda, el lugar y fecha y la firma del director
**Y** si hay muchas personas, cada página repite el encabezado.

### Escenario: Exportar en Excel

**Dado** el reporte de un mes
**Cuando** descargo el Excel
**Entonces** obtengo un libro editable con una hoja por anexo.

### Escenario: Mes sin incidencias

**Dado** un mes sin inasistencias, tardanzas, permisos ni huelgas
**Cuando** exporto el reporte
**Entonces** los anexos se generan igual, porque la remisión es obligatoria.

### Escenario: Sin sesión

**Dado** una persona sin sesión iniciada
**Cuando** pide el reporte o sus archivos
**Entonces** el sistema lo rechaza.


---

## Reglas de validación y negocio (resumen)

- Justificación: obligatorios persona, tipo, fechas y documento. Permisos y omisión son de un solo día. Minutos obligatorios en el permiso sin goce.
- El plazo de una omisión se cuenta desde la hora de salida del turno de ese día, porque el sistema no sabe a qué hora ocurrió (ver `P-99`).
- Los minutos de tardanza son los que exceden la tolerancia del turno. Para contar desde el primer minuto, como dice la norma (5.3.1), la tolerancia debe ser 0.
