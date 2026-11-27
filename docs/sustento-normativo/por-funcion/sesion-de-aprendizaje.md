# Sesión de aprendizaje y registro de clase (RF-024, RF-011)

Fuente principal: [Cartilla de planificación curricular del MINEDU](../fuentes/01-minedu/Cartilla_planificacion-curricular/documento.pdf) (páginas del PDF). **Es un «documento de trabajo en proceso de validación» de la Dirección de Educación Primaria**; este colegio es de secundaria, así que es una referencia y no una norma obligatoria. Revisado el 2026-11-26, leyendo su texto extraído.

## Concepto (pág. 16)

La sesión de aprendizaje «organiza de manera secuencial y temporal las actividades que se desarrollarán». Muestra cómo se combinan recursos, materiales, estrategias y actividades para lograr los propósitos de aprendizaje.

## Elementos básicos (págs. 17 a 19) y planificación del sistema (RF-024)

«Obligatorio hoy» sale del código: `GuardarPlanificacionDto` (para guardar) y `faltantesParaLista` (para marcarla **lista**).

| Elemento de la cartilla | Campo del sistema | Guardar | Marcar lista | Estado |
|---|---|---|---|---|
| Título | `titulo` | Obligatorio | Obligatorio | ✅ |
| Propósitos: competencias | `competencias` | Opcional | Obligatorio (al menos una) | ✅ |
| Propósitos: desempeños | `competencias[].desempenos` | Opcional | Obligatorio en cada competencia | ✅ |
| Propósitos: enfoques transversales | `enfoques` | Opcional | Opcional | 🟡 La cartilla los incluye entre los propósitos |
| Preparación: materiales y recursos | `materiales` | Opcional | Opcional | 🟡 |
| Preparación: organización de los estudiantes | — | — | — | ❌ No hay un campo propio (puede ir en las actividades) |
| Momentos: inicio, desarrollo y cierre | `momentos` (actividades y minutos) | Opcional | Obligatorios los tres | ✅ |
| Tiempo | `momentos[].minutos` | Opcional | Obligatorio y la suma debe igualar el bloque | 🔵 La suma exacta es decisión propia: la cartilla pide el tiempo según las necesidades (pág. 18) |
| Compartir qué aprenderán y los criterios (criterio 3, pág. 16) | `proposito`, `criterios` | Opcionales | `proposito` obligatorio; `criterios` opcional | 🟡 |
| Retroalimentación prevista (criterio 5, pág. 17) | — | — | — | ❌ No hay un campo propio |
| Atención diferenciada (criterio 6, pág. 17) | — | — | — | ❌ No hay un campo propio |
| — | `evidencia` | Opcional | Obligatorio | 🔵 No figura entre los elementos básicos de esta cartilla; revisar CNEB |
| — | `horarioId`, `fecha` | Obligatorios | — | 🔵 Necesarios para ubicar la sesión |

Los otros campos (competencias transversales, instrumento, referencias, unidad y número) y el formato Word del colegio **no se compararon**. El proyecto ya usa el CNEB y el Programa Curricular como catálogo: ver [planificacion-sesiones](../../planificacion-sesiones/README.md).

## Registro de la sesión dictada (RF-011)

| Punto | Sistema | Estado |
|---|---|---|
| Firmar ingreso y salida de **cada clase** | Kiosko de sesiones con carné o DNI y PIN; tema obligatorio al firmar el ingreso | 🔵 No se encontró en lo revisado una norma que lo exija. La RSG 326-2017 regula el ingreso y salida **del centro de trabajo**, no de cada clase |
| Hora pedagógica de 45 minutos | `sesion.minutos_hora_pedagogica` = 45 | ✅ RSG 326-2017, 5.2.3, pág. 7 |
| Estados, minutos perdidos, justificaciones y reemplazos | `RF-011` | Por revisar contra la RM 501-2025 y el reglamento magisterial |
