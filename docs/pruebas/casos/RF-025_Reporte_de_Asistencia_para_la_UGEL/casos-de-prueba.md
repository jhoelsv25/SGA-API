# Casos de prueba — RF-025: Reporte de Asistencia para la UGEL

**Fuente:** [`RF-025` V2](../../../requerimientos/RF-025_Reporte_de_Asistencia_para_la_UGEL/V2/RF-025_Reporte_de_Asistencia_para_la_UGEL.md) · **Total de casos:** 25

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado | Back verificado con |
|---|---|---|---|---|---|---|
| CP-RF025-01 | HU1 | Vista previa del mes | que soy Director, Subdirector o Secretaria | abro "Control diario → Reporte UGEL" y elijo un mes | veo por cada docente y auxiliar de educación un código por día, sus días de inasistencia, su tardanza y su permiso sin goce el mes propuesto es el anterior al actual. | e2e en base desechable y Chrome simulado |
| CP-RF025-02 | HU1 | Códigos del día | un día laborable ya transcurrido | el docente tiene entrada y salida a tiempo | el día sale como `A` si no tiene ninguna marca sale como `I` los fines de semana, los días sin clases del calendario, hoy y los días futuros quedan en blanco. | unitarias y e2e |
| CP-RF025-03 | HU1 | Tardanza | que la entrada es posterior a la hora del turno más la tolerancia, aunque esté fuera de la ventana del reloj | se arma el reporte | el día sale como `T` y suma sus minutos si la tardanza está justificada sale como `A` y no suma. | unitarias y e2e |
| CP-RF025-04 (con 3T activado, V2) | HU1 | Tercera tardanza | que `asistencia.tardanzas_para_inasistencia` es 3 | un docente acumula su tercera tardanza del mes | ese día sale como `3T` cuenta como día de inasistencia en el Anexo 04 sus minutos siguen sumando en las tardanzas. | unitarias y e2e |
| CP-RF025-05 | HU1 | Marca incompleta o salida anticipada | que `asistencia.marca_incompleta_es_inasistencia` está activada | falta el ingreso o la salida, o la salida es anterior a la hora sin justificación | el día sale como `I` la observación indica los días para que dirección los revise. | unitarias y e2e |
| CP-RF025-06 | HU1 | Mes sin terminar | que el mes elegido no ha terminado | veo o exporto el reporte | queda marcado como BORRADOR un mes que aún no empieza se rechaza. | lectura en Supabase de pruebas (mes en curso) y e2e (mes futuro) |
| CP-RF025-07 | HU1 | Avisos antes de enviar | que faltan datos o hay situaciones que cambian descuentos | veo la vista previa | el sistema avisa: datos de la institución en blanco, días en que nadie marcó, personas sin ninguna marca, fichas sin cargo o condición, tolerancia mayor que cero y 5 o más días de inasistencia o huelga. | e2e y lectura en Supabase de pruebas |
| CP-RF025-08 | HU2 | Registrar una justificación | un docente o auxiliar de educación | registro licencia con goce, permiso con goce o vacaciones con su documento | esos días laborables salen como `J` licencia sin goce sale como `L` y huelga o paro como `H`. | unitarias y e2e |
| CP-RF025-09 | HU2 | Permiso sin goce | un permiso sin goce de remuneraciones | lo registro con sus minutos y su papeleta | el día sale como `P` y el Anexo 04 suma sus horas y minutos sin minutos no se guarda. | unitarias y e2e |
| CP-RF025-10 | HU2 | Omisión justificada | que a un docente le faltó la salida un día | registro la omisión con el documento y la fecha y hora en que presentó el sustento, dentro del plazo | ese día deja de ser inasistencia y se evalúa como laborado. | e2e |
| CP-RF025-11 | HU2 | Omisión fuera de plazo o sobre el límite | los valores por defecto de 24 horas y una omisión al mes | el sustento se presentó después del plazo, o ya se usó la omisión del mes | el sistema la rechaza y explica el motivo. | e2e |
| CP-RF025-12 | HU2 | Justificaciones que se cruzan | que una persona ya tiene una justificación en esas fechas | registro otra | el sistema la rechaza. | e2e |
| CP-RF025-13 | HU2 | Anular una justificación | una justificación registrada por error | la anulo indicando el motivo | deja de contar en el reporte pero queda visible como anulada el registro y la anulación quedan en la bitácora. | e2e, incluida la bitácora |
| CP-RF025-14 | HU3 | Exportar en PDF para firma | el reporte de un mes | descargo el PDF | obtengo el Anexo 03 y el Anexo 04 con las columnas, la leyenda, el lugar y fecha y la firma del director si hay muchas personas, cada página repite el encabezado. | e2e; PDF revisado a la vista (3 y 70 filas) |
| CP-RF025-15 | HU3 | Exportar en Excel | el reporte de un mes | descargo el Excel | obtengo un libro editable con una hoja por anexo. | e2e (celdas) |
| CP-RF025-16 | HU3 | Mes sin incidencias | un mes sin inasistencias, tardanzas, permisos ni huelgas | exporto el reporte | los anexos se generan igual, porque la remisión es obligatoria. | e2e |
| CP-RF025-17 | HU3 | Sin sesión | una persona sin sesión iniciada | pide el reporte o sus archivos | el sistema lo rechaza. | e2e (HTTP 401) |

## Ejecución 2026-11-26

- Back: los 17 casos pasan (`test/features/asistencia-ugel/`, y un e2e temporal que no está en el repositorio).
- Front: en Chrome con datos simulados se probaron vista previa, avisos, borrador, registro (permiso sin goce y omisión), anulación y las dos descargas (que se pide el archivo). **Falta probarlo con sesión real.**

## Casos de la versión 2.0 (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| 3T desactivado por defecto | unitarias y e2e (reporte y Excel) | Pasa |
| Aviso si se activa 3T | e2e | Pasa |
| Semanas de gestión en el reporte | e2e | Pasa |
| Registrar trabajo virtual | e2e | Pasa |
| Trabajo virtual en días que no corresponden | e2e | Pasa |
| La omisión cubre solo la marca indicada | unitarias | Pasa |
| Ingreso olvidado con una sola marca al salir | unitarias | Pasa |
| Plazo según la marca omitida | e2e | Pasa |

## Recorrido con sesión real (2026-11-26)

Web y API locales contra Supabase de pruebas, en Chrome de escritorio y tema claro, con una cuenta de Administrador temporal y datos etiquetados que se borraron al terminar.

| Comprobación | Resultado |
|---|---|
| Registrar la semana de gestión con «El personal trabaja» desde el calendario | Pasa; no cambió el número de sesiones |
| Vista previa: marca incompleta (I), tardanza (T) y semana de gestión sin marcas (I) | Pasa |
| Omisión de salida y trabajo virtual cambian el día a A | Pasa |
| Rechazos con mensaje: trabajo virtual en día con clases, omisión sin elegir marca y segunda omisión del mes | Pasa |
| Descargar Excel y PDF; Excel igual a la pantalla en los días revisados; PDF revisado a la vista (págs. 1 y 4) | Pasa |
| Anular una justificación devuelve el día a I | Pasa |

No se probó: sesión de Director u otro rol, móvil ni tema oscuro con sesión real, impresión y firma.

## Roles y móvil con sesión real (2026-11-26)

| Comprobación | Resultado |
|---|---|
| Director, Subdirector, Secretaria y Administrador consultan el reporte y las justificaciones | 200 |
| Descarga de PDF y Excel (probada por la API con Secretaria) | 200 |
| Docente y Soporte TI | 403 en reporte y justificaciones (descargas probadas con ambos: 403) |
| Director en móvil 390×844, tema oscuro: reporte, formulario y calendario | Sin desborde horizontal; los botones del formulario se alcanzan al desplazar |

No se probó registrar una justificación con un rol distinto de Administrador, ni un teléfono físico.
