# Asistencia docente (RF-004, RF-010, RF-022)

Fuente principal: [RSG 326-2017-MINEDU](../fuentes/01-minedu/RSG-326-2017_asistencia-docente/documento.pdf) (páginas del PDF). Las páginas 7, 8, 10, 11 y 18 a 21 se confirmaron mirando el PDF; lo citado de las páginas 6 y 9 sale del texto reconocido por OCR. Revisado el 2026-11-26.

**Alcance:** profesores y auxiliares de educación de instituciones **públicas** en el marco de la Ley de Reforma Magisterial (pág. 6, numeral 5.1). No cubre al resto del personal administrativo. No se verificó si la norma tiene modificatorias.

## Concepto

- **Registro de asistencia (6.1.1, pág. 9):** el profesor deja constancia de su hora de ingreso y de salida; es personal y obligatorio.
- **Control de asistencia (6.1.3, pág. 10):** verifica asistencia, puntualidad y permanencia según su jornada y horario.
- **Horario de trabajo (5.2.7, pág. 7):** distribución diaria de la jornada, con una hora de ingreso y una de salida; se establece en el **Reglamento Interno**.

## ⚠️ Hallazgo del 2026-11-26: la RSG 326-2017 fue modificada

La **RSG 121-2018-MINEDU** modificó el numeral 6.3.1.2 y los Anexos 1 y 3 (según resultados de búsqueda; **no se obtuvo el texto de la resolución**).

- Comprobado mirando el PDF: el [Anexo 03 con sello 121-2018](../fuentes/01-minedu/RSG-121-2018_anexos_copia-UGEL07-2025/documento.pdf) (págs. 3 y 4) **no tiene el código 3T**. La UGEL 07 pedía en 2025 usar la 326-2017 «y su modificatoria».
- En contra: el Anexo 04 que adjunta ese oficio es el de 2017 y aún menciona 3T; la [plantilla 2026 de la UGEL Huanta](https://ugelhuanta.gob.pe/portal/index.php/areas/gestion-administrativa/personal/formato-asistencia) también usa 3T y no menciona la 121-2018.
- **Resuelto en `RF-025` V2** (aprobado el 2026-11-26): 3T desactivado por defecto y fuera de la leyenda. Falta la confirmación de la UGEL (P-99).

Semanas de gestión: la [RM 239-2025](../fuentes/01-minedu/RM-239-2025_semanas-de-gestion/documento.pdf) (págs. 12 y 28) dice que son presenciales o virtuales, dentro de la jornada laboral, y que la UGEL aplica descuentos a quien no esté laborando; el bloque de medio año sigue el art. 147 del DS 004-2013-ED. Desde `RF-005` V2 el reporte solo deja en blanco los días en que el personal no trabaja (hay que marcar «El personal trabaja» en las semanas de gestión).

## Comparación con el sistema (después de RF-025)

El responsable confirmó el 2026-11-26 que **el colegio es público**, que vale el **horario del Reglamento Interno** (configurable) y que el sistema debe **exportar el documento para la UGEL**.

| Norma | Dice | Sistema hoy | Estado |
|---|---|---|---|
| 5.3.1, pág. 8 | Es tardanza ingresar después de la hora, «independientemente del (los) minuto(s) que sean» | Tolerancia configurable en Turnos. Con 0 cumple la norma; si es mayor, el reporte avisa | 🟡 Depende de la configuración |
| 5.2.7, pág. 7 | El horario (ingreso y salida) se establece en el Reglamento Interno | Por defecto vale el turno de docentes. Calcularlo por clases es una opción apagada (`RF-010` V5) | ✅ Falta cargar el horario real |
| 5.2.8, pág. 7 | Debe permanecer durante el horario de trabajo | Registra entrada y salida del día | 🟡 Parcial |
| 5.2.2, pág. 7 | Jornada de lunes a viernes, con excepciones | Días laborables del turno; el calendario separa «sin clases» de «el personal trabaja» (V2) | ✅ Falta cargar el calendario |
| 5.2.3 y 5.2.4, pág. 7 | Hora pedagógica de 45 minutos | `sesion.minutos_hora_pedagogica` = 45 | ✅ |
| 6.1.1, pág. 9 | Registrar ingreso y salida es obligatorio | Registra ambos y muestra la marca faltante | ✅ |
| 5.3.2 a, c y d, pág. 8 | No concurrir, retirarse antes o no registrar una marca, sin justificación, es inasistencia | El reporte lo marca `I` (configurable) y avisa para revisarlo | ✅ En el reporte |
| 5.3.2 b, pág. 8 | No desempeñar funciones habiendo concurrido es inasistencia | No se evalúa | ❌ Falta |
| 6.1.4, pág. 10 | Reloj, código de barras, biométrico o registro manual, con la hora oficial; se oficializa con documento interno | Reloj, kiosko y registro manual | ✅ Falta comprobar la hora del reloj y el documento interno |
| 6.1.5, pág. 10 | Una omisión al mes, justificada dentro de 24 horas con documento | Se indica la marca que faltó; el plazo corre desde su hora programada y cubre solo esa marca (V2). Límite y plazo configurables | ✅ La hora de inicio del plazo es interpretación propia |
| 6.3.1.2, pág. 11 | La tercera tardanza del mes es inasistencia injustificada (texto de 2017, modificado en 2018) | Código `3T` desactivado por defecto (V2) | ⚠️ Por confirmar |
| 6.3.1.2, pág. 11 | Por 5 días de inasistencia se incluyen sábado y domingo | Solo se avisa | ❌ Falta (P-99) |
| 5.4.1 y 5.4.2, págs. 8 y 9 | Licencias y permisos (con papeleta) acreditan las ausencias | Se registran con su documento y cambian el código del día. No administra el trámite ni sus tipos legales | 🟡 Parcial |
| 6.2.1 y 6.2.2, pág. 10 | Reporte mensual a la UGEL, aun sin incidencias | Anexos 03 y 04 en PDF y Excel (`RF-025`). La presentación la hace el director | ✅ |
| 6.2.3, pág. 10 | Registrar el plan de recuperación de horas | No existe | ❌ Falta |
| — | Primera marca = entrada, última = salida | `RF-010` V3 | 🔵 Decisión propia |
| — | Margen entre vías, voz del kiosko, estados del control diario | Sistema | 🔵 Decisión propia |

## Campos del reporte (Anexos 03 y 04, págs. 18 a 21, confirmados mirando el PDF)

| Campo | De dónde sale | Si falta |
|---|---|---|
| DRE/UGEL, I.E., lugar, director | Institución | En blanco, con aviso |
| Nivel/Modalidad, Turno | Variables `asistencia.reporte_*` | Valor por defecto |
| Periodo, días e iniciales | Mes elegido | — |
| DNI, apellidos y nombres | Persona | — |
| Cargo (según el CAP) | Cargo vigente | En blanco, con aviso |
| Condición: nombrado, destacado, encargado o contratado | Ficha docente | En blanco para auxiliares, con aviso |
| Jornada laboral | Ficha docente | En blanco para auxiliares |
| Códigos A, I, J, L, P, T, H (3T solo si se activa) | Marcaciones y justificaciones | — |
| Inasistencias (incluye 3T), tardanzas y permisos sin goce en horas y minutos cronológicos, huelga en días | Cálculo del mes | 0 |
| Observaciones | Documentos de las justificaciones y marcas incompletas | — |
| Firma del director | Se firma a mano | — |

El Anexo 03 y el 04 reproducen las columnas del formato; no copian los sellos ni el número de resolución estampados en el documento escaneado. **No se ha comprobado si la UGEL usa hoy un formato o sistema distinto** (P-99).

## Qué falta confirmar

**P-99** en [PENDIENTES.md](../../requerimientos/PENDIENTES.md).

## Otras fuentes

Las tesis de [I.E. 36214 Albert Einstein (2025)](../fuentes/03-tesis/UDEA-2025_asistencia-docente_IE-36214-Lircay/documento.md), [I.E. Mariano Melgar (2023)](../fuentes/03-tesis/UDEA-2023_asistencia_IE-Mariano-Melgar-Congalla/documento.md) y [biométrico UDEA (2021)](../fuentes/03-tesis/UDEA-2021_biometrico-asistencia/documento.md) tratan el mismo problema. Están descargadas; **todavía no se han analizado**.
