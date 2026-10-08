# RF-013: Consolidado y Ficha de Seguimiento Docente

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguimiento docente
**Versión:** 1.0
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 12 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres), `RF-011` (sesiones de clase), `RF-012` (ausencias del docente), `RF-019` (notificaciones).

## Consideraciones y supuestos de negocio

*   **Propósito.** Al cierre de cada bimestre, mostrar por docente **cuánto tiempo no estuvo en sus clases**, sumando lo que registran las firmas (`RF-011`) y la supervisión (`RF-012`). Es **informativo**: no genera descuentos. El Director lo usa para tomar sus decisiones con autonomía. La **ficha imprimible** reemplaza la hoja física de seguimiento.
*   **Contenido del consolidado** (por docente y bimestre):

    | Dato | Fuente |
    |---|---|
    | Sesiones programadas | Sesiones generadas en el bimestre (`RF-011`) |
    | Cumplidas, parciales, no cumplidas y justificadas | Estado de cada sesión (`RF-011`) |
    | Minutos perdidos por firma | Retrasos y salidas antes de tiempo (`RF-011`) |
    | Ausencias registradas y minutos fuera del aula | Versiones **vigentes** y no anuladas de las ausencias (`RF-012`) |
    | **Total de tiempo fuera de clase** | Minutos perdidos por firma + minutos fuera del aula, mostrado en **horas y minutos** (ej. 5 h 40 min) |
    | Decisión y observación del Director | Opcional: `ninguna`, `llamada_atencion`, `compromiso_mejora`, `derivado` |

*   **Cuándo se genera.** Lo genera el Director, uno por uno o para todos los docentes a la vez, cuando el bimestre está cerrado o en su última semana. Hay **un consolidado vigente** por docente y bimestre.
*   **Efecto del cierre.** Mientras el consolidado está `cerrado`, las sesiones y ausencias de ese docente en ese bimestre no se pueden modificar (`RF-011`, `RF-012`).
*   **Decisión autónoma.** El Director puede registrar o cambiar su decisión y su observación sin que el docente deba aceptarla.
*   **El docente ve su consolidado.** Al generarse, el docente recibe una notificación (`RF-019`) y puede ver su consolidado y su ficha (sin el historial de versiones).
*   **Solicitud de revisión.** Si el docente no está de acuerdo (por ejemplo, una sesión mal calculada o una ausencia que debió anularse), envía una **solicitud** con motivo y, opcionalmente, un adjunto. Solo puede haber una solicitud abierta por consolidado. El Director la **acepta** (reabre el consolidado para corregir) o la **rechaza** con una respuesta. El docente es notificado en ambos casos.
*   **Reabrir y volver a cerrar.**
    *   El Director puede **reabrir** un consolidado (por una solicitud aceptada o por decisión propia). Mientras está `reabierto`, se pueden corregir las sesiones y ausencias de ese docente en ese bimestre.
    *   Al **volver a cerrarlo**, el sistema recalcula los datos y crea una **versión nueva** vigente; la anterior queda con **vigencia 0**. Cada versión guarda quién la generó, cuándo y el motivo del cambio (obligatorio desde la versión 2).
    *   Nada se elimina. El Director ve el historial completo de versiones.
*   **Ficha de seguimiento docente (PDF).** Documento imprimible por docente y bimestre con: datos del colegio y del docente; cada sesión con fecha, curso, sección, tema, horas de ingreso y salida firmadas y estado; debajo de cada sesión, sus ausencias vigentes (tramo, minutos, motivo, observación, miniaturas de las fotos y descargo); y al final los totales y la decisión. Incluye la imagen de la firma del docente (`RF-007`) y un espacio para la firma del Director. Indica la versión del consolidado.
*   **Reporte general.** El Director ve una tabla de todos los docentes del bimestre con sus totales, ordenable por tiempo fuera de clase, y la puede exportar a Excel.
*   **Quién gestiona.** El Director genera, reabre, decide y resuelve solicitudes. El Subdirector consulta. Cada docente ve solo lo suyo.
*   **Operación 100% en línea.**
*   **Auditoría inmutable.** Generación, reapertura, nueva versión, decisión y solicitudes quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación | Mensaje |
|---|---|
| Consolidado generado | "Consolidado del II Bimestre generado para 24 docentes." |
| Ya existe consolidado | "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo." |
| Bimestre aún abierto | "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo." |
| Consolidado reabierto | "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre." |
| Nuevo cierre sin motivo | "Indique el motivo del cambio." |
| Nueva versión | "Se generó la versión 2 del consolidado." |
| Solicitud enviada | "Su solicitud de revisión fue enviada al Director." |
| Solicitud sin motivo | "Indique el motivo de su solicitud." |
| Solicitud repetida | "Ya tiene una solicitud de revisión pendiente para este consolidado." |
| Solicitud rechazada sin respuesta | "Indique la respuesta para el docente." |
| Consolidado cerrado | "El consolidado de este bimestre está cerrado. Solicite su reapertura." |

## Requerimientos fuera de alcance (Out of Scope)

*   **Descuentos de sueldo o sanciones.** El consolidado es solo informativo; la decisión es del Director fuera del sistema.
*   **Firma y estado de las sesiones.** Corresponde a `RF-011`.
*   **Registro de las ausencias.** Corresponde a `RF-012`.
*   **Cálculo del CSP.** Corresponde a `RF-020`; el consolidado lo muestra, pero el indicador se reporta allí.
*   **Envío del consolidado a instancias externas** (UGEL u otras). Se descarga el PDF.
*   **Firma digital certificada del PDF.** Se imprime la imagen de la firma.

## Acuerdos y puntos abiertos

*   **Sin descuentos (acordado).** El consolidado informa el total de horas fuera de clase.
*   **Decisión autónoma del Director (acordado).** El docente puede ver y pedir revisión mediante solicitud.
*   **Reapertura (acordado).** Permitida; cada cierre crea una versión nueva y la anterior queda con vigencia 0.

## Historia de Usuario 1: Generar el consolidado

**Como** Director
**Quiero** generar el consolidado del bimestre de cada docente
**Para** conocer el total de tiempo que no estuvo en sus clases.

### Escenario: Generar para todos los docentes
**Dado** que el II Bimestre está cerrado y hay 24 docentes con sesiones en él
**Cuando** presiono "Generar consolidado" para todos
**Entonces** el sistema crea un consolidado `cerrado`, versión 1, por cada docente, con sus totales
**Y** muestra "Consolidado del II Bimestre generado para 24 docentes." y notifica a cada docente.

### Escenario: Cálculo del total
**Dado** que el docente Quispe tuvo 40 minutos perdidos por firma y 3 ausencias vigentes de 20, 15 y 25 minutos, y una ausencia anulada de 30 minutos
**Cuando** se genera su consolidado
**Entonces** el consolidado muestra 3 ausencias, 60 minutos fuera del aula y un total de 1 h 40 min fuera de clase.

### Escenario: Bimestre todavía en curso
**Dado** que faltan tres semanas para el fin del bimestre
**Cuando** intento generar el consolidado
**Entonces** el sistema bloquea la acción y muestra "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo."

### Escenario: Consolidado ya existente
**Dado** que el docente ya tiene un consolidado vigente del II Bimestre
**Cuando** intento generarlo de nuevo
**Entonces** el sistema bloquea la acción y muestra "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo."

### Escenario: Registrar la decisión
**Dado** que el consolidado del docente Quispe está cerrado
**Cuando** registro la decisión `compromiso_mejora` con la observación "Reunión el 20/07"
**Entonces** el sistema la guarda y la incluye en la ficha.

### Escenario: Sesiones bloqueadas por el consolidado
**Dado** que el consolidado del docente está `cerrado`
**Cuando** alguien intenta corregir una de sus sesiones o ausencias de ese bimestre
**Entonces** el sistema bloquea la acción y muestra "El consolidado de este bimestre está cerrado. Solicite su reapertura."

## Historia de Usuario 2: Reabrir y versionar

**Como** Director
**Quiero** reabrir un consolidado y volver a cerrarlo
**Para** corregir errores sin perder el historial.

### Escenario: Reabrir un consolidado
**Dado** que el consolidado del docente Quispe está `cerrado`
**Cuando** presiono "Reabrir" y confirmo
**Entonces** el consolidado pasa a `reabierto` y el sistema muestra "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre."

### Escenario: Volver a cerrar con una versión nueva
**Dado** que reabrí el consolidado y se anuló una ausencia de 20 minutos
**Cuando** presiono "Cerrar consolidado" con el motivo "Ausencia anulada tras revisión"
**Entonces** el sistema recalcula los totales, crea la versión 2 vigente, deja la versión 1 con vigencia 0 y muestra "Se generó la versión 2 del consolidado."

### Escenario: Nuevo cierre sin motivo
**Dado** que el consolidado está `reabierto`
**Cuando** intento cerrarlo sin motivo del cambio
**Entonces** el sistema impide la acción y muestra "Indique el motivo del cambio."

### Escenario: Ver el historial de versiones
**Dado** que el consolidado tiene 2 versiones
**Cuando** abro "Historial"
**Entonces** el sistema muestra cada versión con sus totales, quién la generó, cuándo y el motivo del cambio, marcando la vigente.

## Historia de Usuario 3: Solicitud de revisión del docente

**Como** Docente
**Quiero** ver mi consolidado y pedir una revisión si no estoy de acuerdo
**Para** que se corrija un error en mi seguimiento.

### Escenario: Ver mi consolidado
**Dado** que se generó mi consolidado del II Bimestre
**Cuando** abro la notificación o "Mi seguimiento"
**Entonces** el sistema muestra mis totales, el detalle por sesión y la decisión del Director, sin el historial de versiones.

### Escenario: Enviar una solicitud de revisión
**Dado** que veo una sesión marcada `no_cumplida` que sí dicté
**Cuando** envío una solicitud con el motivo "El 12/06 firmé en el kiosko; adjunto foto de la pizarra"
**Entonces** el sistema registra la solicitud `solicitada`, notifica al Director y muestra "Su solicitud de revisión fue enviada al Director."

### Escenario: Solicitud sin motivo
**Dado** que estoy creando una solicitud
**Cuando** envío sin motivo
**Entonces** el sistema impide el envío y muestra "Indique el motivo de su solicitud."

### Escenario: Solicitud repetida
**Dado** que ya tengo una solicitud pendiente para ese consolidado
**Cuando** intento enviar otra
**Entonces** el sistema bloquea el envío y muestra "Ya tiene una solicitud de revisión pendiente para este consolidado."

### Escenario: El Director acepta la solicitud
**Dado** que hay una solicitud pendiente
**Cuando** el Director la acepta con la respuesta "Se revisará la sesión del 12/06"
**Entonces** la solicitud queda `aceptada`, el consolidado pasa a `reabierto` y el docente es notificado.

### Escenario: El Director rechaza la solicitud
**Dado** que hay una solicitud pendiente
**Cuando** el Director la rechaza con la respuesta "La sesión no tiene firma de ingreso"
**Entonces** la solicitud queda `rechazada`, el consolidado no cambia y el docente es notificado con la respuesta.

### Escenario: Rechazo sin respuesta
**Dado** que el Director está rechazando una solicitud
**Cuando** confirma sin respuesta
**Entonces** el sistema impide la acción y muestra "Indique la respuesta para el docente."

## Historia de Usuario 4: Ficha y reporte

**Como** Director
**Quiero** imprimir la ficha de seguimiento y ver el resumen de todos los docentes
**Para** reemplazar la hoja física y tener una visión general del bimestre.

### Escenario: Descargar la ficha
**Dado** que el consolidado del docente Quispe está cerrado
**Cuando** presiono "Ficha de seguimiento (PDF)"
**Entonces** el sistema genera el PDF con cada sesión, sus ausencias vigentes con fotos y descargo, los totales, la decisión, la firma del docente, el espacio para la firma del Director y la versión del consolidado.

### Escenario: Reporte de todos los docentes
**Dado** que estoy en "Consolidado del bimestre"
**Cuando** elijo el II Bimestre
**Entonces** el sistema muestra cada docente con sesiones programadas, cumplidas, parciales, no cumplidas, justificadas, ausencias y total de tiempo fuera de clase
**Y** permite ordenar por cualquier columna y exportar a Excel.

### Escenario: Docente sin permiso sobre otros
**Dado** que soy docente
**Cuando** intento ver el consolidado de otro docente
**Entonces** el sistema rechaza el acceso.

---

## Reglas de validación y negocio (resumen)

*   **Cálculo:** sesiones por estado (`RF-011`); minutos perdidos por firma; ausencias vigentes y no anuladas (`RF-012`); total fuera de clase en horas y minutos.
*   **Generación:** en la última semana del bimestre o después de cerrarlo; uno vigente por docente y bimestre.
*   **Cierre:** bloquea sesiones y ausencias del docente en ese bimestre.
*   **Decisión:** opcional, autónoma del Director (`ninguna`, `llamada_atencion`, `compromiso_mejora`, `derivado`); sin descuentos.
*   **Versiones:** reabrir → corregir → cerrar crea versión nueva; la anterior queda con vigencia 0; motivo obligatorio desde la versión 2; nada se elimina.
*   **Solicitudes:** una abierta por consolidado; motivo obligatorio; el Director acepta (reabre) o rechaza (con respuesta); el docente es notificado.
*   **Permisos:** Director genera, reabre, decide y resuelve; Subdirector consulta; el docente ve solo lo suyo y solicita revisión.
*   **Auditoría:** generación, reapertura, versiones, decisiones y solicitudes (`RF-003`).

## Anexos y Prototipo Interactivo

*   👉 **Prototipo interactivo:** Portal web. Pantallas: Consolidado del bimestre (tabla de docentes, generar, exportar) · Detalle del docente (totales, sesiones, ausencias, decisión, historial) · Mi seguimiento (docente, con solicitud de revisión) · Solicitudes de revisión · Ficha PDF. Escenarios: Generación masiva · Cálculo con ausencia anulada · Reapertura y versión 2 · Solicitud aceptada y rechazada.
