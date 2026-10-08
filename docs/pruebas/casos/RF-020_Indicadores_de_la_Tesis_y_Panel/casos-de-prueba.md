# Casos de prueba — RF-020: Indicadores de la Tesis y Panel

**Fuente:** [`RF-020` V1](../../requerimientos/RF-020_Indicadores_de_la_Tesis_y_Panel/V1/RF-020_Indicadores_de_la_Tesis_y_Panel.md) · **Total de casos:** 20

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID | HU | Escenario | Precondición (Dado) | Acción (Cuando) | Resultado esperado (Entonces) | Capa |
|---|---|---|---|---|---|---|
| CP-RF020-01 | HU1 | Ver el CSP del bimestre | que en el II Bimestre hubo 1 200 sesiones planificadas: 1 080 cumplidas, 60 parciales, 40 no cumplidas y 20 justificadas | abro "Indicadores" y elijo el II Bimestre | el CSP es (1 080 + 60) ÷ (1 200 − 20) × 100 = 96.61 % · se muestra el desglose de las cuatro categorías. | Back + Front |
| CP-RF020-02 | HU1 | Ver el ISA del bimestre | que se programaron 168 libretas y 160 se publicaron a tiempo | consulto el ISA del II Bimestre | el ISA es 95.24 % y se muestra, además, cuántas fueron vistas por la familia. | Back + Front |
| CP-RF020-03 | HU1 | Ver el IGM del bimestre | que se planificaron 250 materiales y 220 se publicaron a tiempo, más 30 materiales extra | consulto el IGM del II Bimestre | el IGM es 88.00 % y los materiales extra no se cuentan. | Back + Front |
| CP-RF020-04 | HU1 | Filtrar por docente | que estoy en "Indicadores" | filtro el CSP y el IGM por el docente Quispe | el sistema muestra sus valores y el detalle por curso. | Back + Front |
| CP-RF020-05 | HU1 | Valor en curso | que el III Bimestre está en curso | consulto sus indicadores | el sistema muestra el valor al momento marcado como "en curso". | Back + Front |
| CP-RF020-06 | HU1 | Sin datos | que el periodo elegido no tiene sesiones, libretas ni materiales | consulto | el sistema muestra "No hay datos para el periodo y los filtros elegidos." | Back + Front |
| CP-RF020-07 | HU1 | Docente ve solo lo suyo | que soy docente con alcance `propio` | abro "Indicadores" | veo solo mi CSP y mi IGM. | Back + Front |
| CP-RF020-08 | HU2 | Registrar el pretest | que en el I Bimestre 2026, según las hojas físicas, se dictaron 942 de 1 200 sesiones | registro un pretest de CSP con numerador 942, denominador 1 200 y fuente "Hojas físicas de firma de la subdirección" | el sistema guarda el pretest con 78.50 % y muestra "Pretest de CSP registrado: 78.50 %." | Back + Front |
| CP-RF020-09 | HU2 | Pretest sin fuente | que estoy registrando un pretest | guardo sin fuente | el sistema impide guardar y muestra "Indique la fuente del pretest (de dónde se obtuvo el dato)." | Back + Front |
| CP-RF020-10 | HU2 | Numerador mayor que el denominador | que estoy registrando un pretest | ingreso numerador 1 300 y denominador 1 200 | el sistema impide guardar y muestra "El numerador no puede ser mayor que el denominador." | Back + Front |
| CP-RF020-11 | HU2 | Cerrar la medición del bimestre | que el II Bimestre está cerrado | presiono "Cerrar medición" | el sistema calcula y congela los tres indicadores como postest, con su desglose, y muestra "Medición del II Bimestre cerrada: CSP 94.20 %, ISA 97.10 %, IGM 88.00 %." | Back + Front |
| CP-RF020-12 | HU2 | Cerrar la medición con el bimestre abierto | que el III Bimestre está en curso | intento cerrar su medición | el sistema bloquea la acción y muestra "Solo se puede cerrar la medición de un bimestre cerrado." | Back + Front |
| CP-RF020-13 | HU2 | El valor congelado no cambia | que la medición del II Bimestre está cerrada con CSP 94.20 % | luego se aprueba una justificación de una sesión de ese bimestre | el postest congelado sigue en 94.20 %. | Back + Front |
| CP-RF020-14 | HU2 | Nueva versión de la medición | que la medición del II Bimestre ya está cerrada | genero una nueva versión con el motivo "Justificaciones aprobadas tarde" | el sistema recalcula, crea la versión 2 vigente y deja la versión 1 con vigencia 0. | Back + Front |
| CP-RF020-15 | HU2 | Nueva versión sin motivo | que estoy generando una nueva versión | confirmo sin motivo | el sistema impide la acción y muestra "Indique el motivo de la nueva versión." | Back + Front |
| CP-RF020-16 | HU2 | Comparación pretest – postest | que el CSP tiene pretest 78.50 % y postest 94.20 % | abro "Comparación" | el sistema muestra ambos valores, la variación de +15.70 puntos porcentuales y un gráfico de barras, igual para ISA e IGM. | Back + Front |
| CP-RF020-17 | HU2 | Comparación sin pretest | que el IGM no tiene pretest registrado | abro "Comparación" | el IGM muestra solo el postest con el mensaje "Registre el pretest para ver la comparación." | Back + Front |
| CP-RF020-18 | HU3 | Exportar a Excel | que estoy viendo el CSP del II Bimestre | presiono "Exportar a Excel" | el archivo trae el resumen y una hoja con el detalle de cada sesión (fecha, docente, curso, sección, estado). | Back + Front |
| CP-RF020-19 | HU3 | Exportar a PDF | que estoy en "Comparación" | presiono "Exportar a PDF" | el sistema genera un reporte con el logo del colegio, las fórmulas, los periodos, los valores pretest y postest, la variación, los gráficos, la fecha de generación y quién lo generó. | Back + Front |
| CP-RF020-20 | HU4 | Ver el panel | que ingreso al sistema como Director | abro el panel | veo los tres indicadores del bimestre en curso, la asistencia al colegio de hoy, las tardanzas, las sesiones de hoy (firmadas y pendientes) y las libretas pendientes. | Back + Front |
