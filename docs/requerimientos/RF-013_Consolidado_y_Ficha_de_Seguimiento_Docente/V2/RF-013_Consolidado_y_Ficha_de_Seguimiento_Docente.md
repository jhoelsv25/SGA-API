# RF-013: Consolidado y Ficha de Seguimiento Docente

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguimiento docente
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Alta | **Esfuerzo estimado:** 12 hh (IA Agéntica)
**Prerrequisitos:** `RF-005` (bimestres), `RF-011` (sesiones de clase), `RF-012` (ausencias del docente), `RF-019` (notificaciones).

> **Cambios de la versión 2.0 sobre la 1.0 (refuerzo del seguimiento, 2026-11-09):**
>
> - **Compromisos de mejora con seguimiento (v2.0).** La decisión `compromiso_mejora` (y, opcionalmente, `llamada_atencion`) deja de ser solo un valor: el Director registra un **compromiso** con descripción, fecha de revisión, estado (`pendiente`, `cumplido`, `no_cumplido`) y observación de cierre; recibe un recordatorio al llegar la fecha; el docente lo ve y da su "enterado" con fecha. Ver Historia de Usuario 5.
> - **Horas pedagógicas e informe mensual (v2.0).** El consolidado muestra, además de minutos, las horas pedagógicas **programadas, dictadas y perdidas** (1 hora pedagógica = 45 min, parámetro `sesion.minutos_hora_pedagogica`) y se agrega la exportación a Excel **"Informe mensual de horas efectivas"** con estructura parecida al Formato 02 de los Lineamientos del MINEDU. Ver Historia de Usuario 6.
> - **Pendientes de seguimiento (v2.0).** Nueva pantalla de reporte con lo que el Director y el Subdirector tienen por atender (justificaciones, descargos vencidos, consolidados sin generar o sin decisión, solicitudes abiertas y compromisos vencidos), con exportación a Excel. Ver Historia de Usuario 7.
> - **Acceso por menú (RF-002 V4).** El acceso a las pantallas se controla por las opciones del menú asignadas a cada rol; ya no hay permisos con alcance.
> - **Sin cambios en las reglas vigentes:** el consolidado sigue siendo informativo y **sin descuentos**, las versiones con vigencia 0, reabrir y volver a cerrar, la solicitud de revisión, la ficha PDF, el reporte general a Excel y la auditoría.
> - **Pendientes nuevos:** P-50 a P-54.

## Consideraciones y supuestos de negocio

- **Propósito.** Al cierre de cada bimestre, mostrar por docente **cuánto tiempo no estuvo en sus clases**, sumando lo que registran las firmas (`RF-011`) y la supervisión (`RF-012`). Es **informativo**: no genera descuentos. El Director lo usa para tomar sus decisiones con autonomía. La **ficha imprimible** reemplaza la hoja física de seguimiento.
- **Contenido del consolidado** (por docente y bimestre):

  | Dato                                              | Fuente                                                                                                                       |
  | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
  | Sesiones programadas                              | Sesiones generadas en el bimestre (`RF-011`)                                                                                 |
  | Cumplidas, parciales, no cumplidas y justificadas | Estado de cada sesión (`RF-011`)                                                                                             |
  | Minutos perdidos por firma                        | Retrasos y salidas antes de tiempo (`RF-011`)                                                                                |
  | Ausencias registradas y minutos fuera del aula    | Versiones **vigentes** y no anuladas de las ausencias (`RF-012`)                                                             |
  | **Total de tiempo fuera de clase**                | Minutos perdidos por firma + minutos fuera del aula, mostrado en **horas y minutos** (ej. 5 h 40 min)                        |
  | Decisión y observación del Director               | Opcional: `ninguna`, `llamada_atencion`, `compromiso_mejora`, `derivado`                                                     |
  | **Horas pedagógicas programadas (v2.0)**          | Suma de la duración de las sesiones programadas (`RF-011`), expresada en horas pedagógicas                                   |
  | **Horas pedagógicas dictadas (v2.0)**             | Sesiones `cumplida` por su duración completa + sesiones `parcial` por sus minutos firmados (duración menos minutos perdidos) |
  | **Horas pedagógicas perdidas (v2.0)**             | Programadas menos dictadas (incluye las sesiones `no_cumplida` y `justificada`)                                              |
  | **Compromisos de mejora (v2.0)**                  | Compromisos del docente en ese consolidado y su estado                                                                       |

- **Horas pedagógicas (v2.0).** Además de minutos, el consolidado y la ficha muestran las horas **programadas, dictadas y perdidas** en **horas pedagógicas**. Una hora pedagógica equivale a **45 minutos** (parámetro `sesion.minutos_hora_pedagogica`, editable en las variables del sistema, `RF-004`). Se muestran con **un decimal** (ej. 12,7 h.p.). Los minutos siguen visibles. Si el parámetro cambia, solo afecta a los consolidados que se generen o cierren después; los ya cerrados conservan sus valores. Las horas dictadas salen **solo de las firmas** (`RF-011`); los minutos fuera del aula registrados por supervisión (`RF-012`) se siguen mostrando aparte y no se restan de las horas dictadas.
- **Cuándo se genera.** Lo genera el Director, uno por uno o para todos los docentes a la vez, cuando el bimestre está cerrado o en su última semana. Hay **un consolidado vigente** por docente y bimestre.
- **Efecto del cierre.** Mientras el consolidado está `cerrado`, las sesiones y ausencias de ese docente en ese bimestre no se pueden modificar (`RF-011`, `RF-012`).
- **Decisión autónoma.** El Director puede registrar o cambiar su decisión y su observación sin que el docente deba aceptarla.
- **El docente ve su consolidado.** Al generarse, el docente recibe una notificación (`RF-019`) y puede ver su consolidado y su ficha (sin el historial de versiones).
- **Solicitud de revisión.** Si el docente no está de acuerdo (por ejemplo, una sesión mal calculada o una ausencia que debió anularse), envía una **solicitud** con motivo y, opcionalmente, un adjunto. Solo puede haber una solicitud abierta por consolidado. El Director la **acepta** (reabre el consolidado para corregir) o la **rechaza** con una respuesta. El docente es notificado en ambos casos.
- **Compromisos de mejora con seguimiento (v2.0).** Inspirado en el protocolo de retroalimentación del MINEDU (desempeño por mejorar y compromiso asumido):
  - Cuando la decisión del Director es `compromiso_mejora` (u opcionalmente `llamada_atencion`), el Director registra uno o varios **compromisos** sobre el consolidado. Con `ninguna` o `derivado` no se registran compromisos.
  - **Datos de un compromiso.**

    | Dato                  | Obligatorio         | Regla                                                                                    |
    | --------------------- | ------------------- | ---------------------------------------------------------------------------------------- |
    | Descripción           | Sí                  | Qué se compromete a mejorar el docente (ej. "Firmar el ingreso dentro de la tolerancia") |
    | Fecha de revisión     | Sí                  | Hoy o posterior; el Director revisa el avance ese día                                    |
    | Estado                | Automático al crear | `pendiente`; luego `cumplido` o `no_cumplido`                                            |
    | Observación de cierre | Condicional         | Obligatoria al marcarlo `cumplido` o `no_cumplido`                                       |
    | Consolidado y versión | Automático          | Queda enlazado al consolidado y a la versión vigente cuando se registró                  |

  - **Recordatorio.** Al llegar la fecha de revisión, el sistema envía una notificación al Director (`RF-019`) enlazada al compromiso. Si pasa la fecha sin cerrarse, el compromiso figura como **vencido** en "Pendientes de seguimiento".
  - **Conformidad del docente: "enterado" (v2.0).** El docente ve su compromiso en "Mi seguimiento" y puede marcar **"Enterado"**; el sistema guarda la fecha y hora. Es un acuse de lectura, **no** una aceptación: el compromiso rige aunque el docente no lo marque. La firma digital certificada queda fuera de alcance; en la ficha PDF hay espacio para firma manual. _(Supuesto, P-50.)_
  - **El docente solo ve lo suyo y sin historial de versiones**, igual que su consolidado.
  - **No se elimina.** Un compromiso mal registrado se **anula** con motivo (baja lógica, queda visible como "Anulado"). Cambiar la fecha o la descripción crea una versión nueva y la anterior queda con vigencia 0; el Director ve el historial.
  - **Reabrir el consolidado** no borra los compromisos: se mantienen enlazados a la versión en que se registraron y siguen su seguimiento.
  - **Coherencia con RF-023.** Los compromisos nacidos de la **observación de aula** (desempeño pedagógico) se atienden en `RF-023`; los de este RF nacen de la **decisión del Director sobre el consolidado** (asistencia y permanencia). _(Ver P-50.)_
- **Informe mensual de horas efectivas (v2.0).** Exportación a **Excel** por mes, que el Director usa para su informe mensual a la UGEL (Lineamientos del MINEDU, art. 3 y 6: el Director informa cada fin de mes las inasistencias y tardanzas y consolida las horas efectivas en el Formato 02). **El sistema no envía nada a la UGEL: solo genera el archivo.** Una fila por docente con:

  | Columna                            | Fuente                                                                          |
  | ---------------------------------- | ------------------------------------------------------------------------------- |
  | Docente (apellidos y nombres, DNI) | Ficha del docente (`RF-007`)                                                    |
  | Nivel                              | Nivel de las secciones donde dicta (`RF-006`); si dicta en varios, uno por fila |
  | Jornada                            | Jornada del nivel o turno (`RF-004`, `RF-008`)                                  |
  | Horas programadas                  | Horas pedagógicas programadas en el mes                                         |
  | Horas efectivas dictadas           | Horas pedagógicas dictadas en el mes                                            |
  | Inasistencias justificadas (`J`)   | Sesiones `justificada`                                                          |
  | Inasistencias injustificadas (`I`) | Sesiones `no_cumplida`                                                          |
  | Tardanzas                          | Sesiones con retraso mayor a la tolerancia (`RF-011`)                           |
  | Minutos                            | Minutos perdidos por firma y minutos fuera del aula del mes                     |

  El informe se calcula **por mes calendario** sobre las sesiones del mes (aunque el bimestre no esté cerrado) y trae el encabezado con colegio, nivel y mes (ej. 11/2026). Es solo informativo: **los descuentos y sanciones siguen fuera de alcance**; el sistema no los calcula. La estructura es **parecida** al Formato 02, no una copia oficial. _(Supuesto, P-52.)_

- **Pendientes de seguimiento (v2.0).** Reporte para el Director y el Subdirector con lo que está por atender en el seguimiento docente. Cada fila enlaza a la pantalla donde se atiende. Tipos:

  | Pendiente                                   | Criterio                                                                                  |
  | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
  | Justificaciones de sesión sin resolver      | Justificaciones `solicitada` (`RF-011`)                                                   |
  | Ausencias con descargo vencido sin descargo | Ausencias vigentes cuyo plazo de descargo venció sin que el docente escribiera (`RF-012`) |
  | Consolidados sin generar                    | Docentes con sesiones en un bimestre cerrado y sin consolidado vigente                    |
  | Consolidados sin decisión                   | Consolidados generados cuyo Director no registró decisión                                 |
  | Solicitudes de revisión abiertas            | Solicitudes `solicitada`                                                                  |
  | Compromisos vencidos                        | Compromisos `pendiente` con fecha de revisión pasada                                      |

  Muestra el **conteo por tipo** y el listado, con filtros por **bimestre** y **docente**, y se exporta a **Excel**. Es solo de consulta; atender cada pendiente se hace en su pantalla. _(Plazo para "sin decisión", P-53.)_

- **Acceso por menú (v2.0).** Cada pantalla es una opción del menú que el Administrador asigna a los roles (`RF-002`): "Consolidado del bimestre", "Mi seguimiento", "Pendientes de seguimiento" e "Informe mensual de horas efectivas". Por defecto: el Director las usa todas; el Subdirector consulta y exporta; el docente ve solo "Mi seguimiento".
- **Reabrir y volver a cerrar.**
  - El Director puede **reabrir** un consolidado (por una solicitud aceptada o por decisión propia). Mientras está `reabierto`, se pueden corregir las sesiones y ausencias de ese docente en ese bimestre.
  - Al **volver a cerrarlo**, el sistema recalcula los datos y crea una **versión nueva** vigente; la anterior queda con **vigencia 0**. Cada versión guarda quién la generó, cuándo y el motivo del cambio (obligatorio desde la versión 2).
  - Nada se elimina. El Director ve el historial completo de versiones.
- **Ficha de seguimiento docente (PDF).** Documento imprimible por docente y bimestre con: datos del colegio y del docente; cada sesión con fecha, curso, sección, tema, horas de ingreso y salida firmadas y estado; debajo de cada sesión, sus ausencias vigentes (tramo, minutos, motivo, observación, miniaturas de las fotos y descargo); y al final los totales y la decisión. Incluye la imagen de la firma del docente (`RF-007`) y un espacio para la firma del Director. Indica la versión del consolidado.
- **Reporte general.** El Director ve una tabla de todos los docentes del bimestre con sus totales, ordenable por tiempo fuera de clase, y la puede exportar a Excel.
- **Quién gestiona.** El Director genera, reabre, decide y resuelve solicitudes. El Subdirector consulta. Cada docente ve solo lo suyo.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Generación, reapertura, nueva versión, decisión y solicitudes quedan en la bitácora (`RF-003`). **(v2.0)** También quedan los compromisos (registro, cambio, cierre, anulación y "enterado") y las exportaciones del informe mensual y de los pendientes.

## Mensajes del requerimiento

| Situación                                   | Mensaje                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Consolidado generado                        | "Consolidado del II Bimestre generado para 24 docentes."                                              |
| Ya existe consolidado                       | "El docente ya tiene un consolidado vigente para este bimestre. Reábralo para actualizarlo."          |
| Bimestre aún abierto                        | "Solo se puede generar el consolidado en la última semana del bimestre o después de cerrarlo."        |
| Consolidado reabierto                       | "Consolidado reabierto. Ya se pueden corregir las sesiones y ausencias del docente en este bimestre." |
| Nuevo cierre sin motivo                     | "Indique el motivo del cambio."                                                                       |
| Nueva versión                               | "Se generó la versión 2 del consolidado."                                                             |
| Solicitud enviada                           | "Su solicitud de revisión fue enviada al Director."                                                   |
| Solicitud sin motivo                        | "Indique el motivo de su solicitud."                                                                  |
| Solicitud repetida                          | "Ya tiene una solicitud de revisión pendiente para este consolidado."                                 |
| Solicitud rechazada sin respuesta           | "Indique la respuesta para el docente."                                                               |
| Consolidado cerrado                         | "El consolidado de este bimestre está cerrado. Solicite su reapertura."                               |
| Compromiso registrado (v2.0)                | "Compromiso registrado. Se le recordará el [fecha de revisión]."                                      |
| Compromiso sin descripción (v2.0)           | "Indique la descripción del compromiso."                                                              |
| Fecha de revisión inválida (v2.0)           | "La fecha de revisión debe ser hoy o posterior."                                                      |
| Decisión sin compromiso (v2.0)              | "Solo se registran compromisos cuando la decisión es compromiso de mejora o llamada de atención."     |
| Cierre de compromiso sin observación (v2.0) | "Indique la observación de cierre."                                                                   |
| Compromiso cerrado (v2.0)                   | "Compromiso marcado como cumplido." / "Compromiso marcado como no cumplido."                          |
| Compromiso ya cerrado (v2.0)                | "El compromiso ya está cerrado. No se puede volver a cerrar."                                         |
| Cambio de decisión con compromisos (v2.0)   | "Hay compromisos pendientes. Ciérrelos o anúlelos antes de cambiar la decisión."                      |
| Anulación sin motivo (v2.0)                 | "Indique el motivo de la anulación."                                                                  |
| Enterado (v2.0)                             | "Gracias. Quedó registrado que está enterado."                                                        |
| Recordatorio al Director (v2.0)             | "Hoy se revisa el compromiso de [docente]: [descripción]."                                            |
| Mes sin sesiones (v2.0)                     | "No hay sesiones en el mes elegido para exportar."                                                    |
| Sin pendientes (v2.0)                       | "No hay pendientes de seguimiento."                                                                   |

## Requerimientos fuera de alcance (Out of Scope)

- **Descuentos de sueldo o sanciones.** El consolidado es solo informativo; la decisión es del Director fuera del sistema.
- **Firma y estado de las sesiones.** Corresponde a `RF-011`.
- **Registro de las ausencias.** Corresponde a `RF-012`.
- **Cálculo del CSP.** Corresponde a `RF-020`; el consolidado lo muestra, pero el indicador se reporta allí.
- **Envío del consolidado a instancias externas** (UGEL u otras). Se descarga el PDF. **(v2.0)** Tampoco se envía el "Informe mensual de horas efectivas": el sistema solo genera el Excel y el Director lo remite fuera del sistema.
- **Descuentos y sanciones a partir de las horas o inasistencias (v2.0).** El informe mensual y los pendientes son informativos; el sistema no calcula descuentos.
- **Firma digital certificada del "enterado" o del compromiso (v2.0).** Solo se guarda la fecha y hora del acuse.
- **Observación de aula y compromisos pedagógicos (v2.0).** Corresponden a `RF-023`.
- **Atender los pendientes desde el reporte (v2.0).** El reporte solo lista y enlaza; cada pendiente se atiende en su pantalla (`RF-011`, `RF-012` y este RF).
- **Recordatorios por correo, SMS o WhatsApp (v2.0).** Solo notificación dentro del sistema (`RF-019`).
- **Firma digital certificada del PDF.** Se imprime la imagen de la firma.

## Acuerdos y puntos abiertos

- **Sin descuentos (acordado).** El consolidado informa el total de horas fuera de clase.
- **Decisión autónoma del Director (acordado).** El docente puede ver y pedir revisión mediante solicitud.
- **Reapertura (acordado).** Permitida; cada cierre crea una versión nueva y la anterior queda con vigencia 0.
- **Colegio público (acordado, v2.0).** Se toman como referencia los Lineamientos del MINEDU para instituciones educativas públicas (control de la labor efectiva); el informe mensual se alinea a su Formato 02.
- **Conformidad del docente (P-50, pendiente, v2.0).** Supuesto: simple "enterado" con fecha y hora, no vinculante; sin firma digital. También se confirma si los compromisos de este RF y los de `RF-023` se unifican en una sola lista.
- **Horas pedagógicas (P-51, pendiente, v2.0).** Supuesto: 1 hora pedagógica = 45 minutos para todos los niveles, con un decimal; las horas dictadas salen solo de las firmas.
- **Informe mensual (P-52, pendiente, v2.0).** Supuesto: estructura parecida al Formato 02 con las columnas indicadas; `J` = sesiones justificadas, `I` = sesiones no cumplidas; falta confirmar con la UGEL si exige el formato oficial exacto y cómo cuentan las horas programadas (calendarización real o 22 días × horas diarias).
- **Consolidado sin decisión (P-53, pendiente, v2.0).** Supuesto: un consolidado cuenta como "sin decisión" desde el día siguiente a su generación, sin días de gracia (variable `consolidado.dias_para_decidir`, por defecto 0).
- **Recordatorio del compromiso (P-54, pendiente, v2.0).** Supuesto: un solo recordatorio el día de la fecha de revisión, dirigido al Director que lo registró; si ese Director ya no está activo, al Director vigente.

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
**Entonces** el sistema la guarda y la incluye en la ficha
**Y** (v2.0) habilita el registro de compromisos de mejora sobre ese consolidado.

### Escenario: Horas pedagógicas en el consolidado (v2.0)

**Dado** que el docente Quispe tuvo 20 sesiones de 45 minutos programadas, 16 `cumplida`, 2 `parcial` con 15 minutos perdidos cada una, 1 `no_cumplida` y 1 `justificada`
**Cuando** se genera su consolidado
**Entonces** muestra 20,0 horas pedagógicas programadas, 17,3 dictadas (16 + 2 × 30/45 = 17,33) y 2,7 perdidas
**Y** muestra también los minutos equivalentes (900 programados, 780 dictados, 120 perdidos).

### Escenario: Parámetro de hora pedagógica modificado (v2.0)

**Dado** que el Administrador cambió `sesion.minutos_hora_pedagogica` de 45 a 60
**Cuando** el Director genera un consolidado nuevo
**Entonces** las horas se calculan con 60 minutos
**Y** los consolidados ya cerrados conservan sus valores.

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

## Historia de Usuario 5: Compromisos de mejora con seguimiento (v2.0)

**Como** Director
**Quiero** registrar compromisos de mejora con fecha de revisión y cerrarlos con su resultado
**Para** dar seguimiento real a lo acordado con el docente y no solo dejar una decisión escrita.

### Escenario: Registrar un compromiso (v2.0)

**Dado** que el consolidado del docente Quispe está cerrado con la decisión `compromiso_mejora`
**Cuando** registro el compromiso "Firmar el ingreso dentro de la tolerancia" con fecha de revisión 15/12/2026
**Entonces** el sistema lo guarda `pendiente`, enlazado al consolidado y a su versión vigente
**Y** muestra "Compromiso registrado. Se le recordará el 15/12/2026." y notifica al docente (`RF-019`).

### Escenario: Compromiso con llamada de atención (v2.0)

**Dado** que la decisión del consolidado es `llamada_atencion`
**Cuando** registro un compromiso con descripción y fecha de revisión
**Entonces** el sistema lo guarda `pendiente`.

### Escenario: Compromiso con decisión que no lo admite (v2.0)

**Dado** que la decisión del consolidado es `ninguna` o `derivado`
**Cuando** intento registrar un compromiso
**Entonces** el sistema impide la acción y muestra "Solo se registran compromisos cuando la decisión es compromiso de mejora o llamada de atención."

### Escenario: Compromiso sin descripción (v2.0)

**Dado** que estoy registrando un compromiso
**Cuando** confirmo sin descripción
**Entonces** el sistema impide la acción y muestra "Indique la descripción del compromiso."

### Escenario: Fecha de revisión pasada (v2.0)

**Dado** que hoy es 09/11/2026
**Cuando** registro un compromiso con fecha de revisión 01/11/2026
**Entonces** el sistema impide la acción y muestra "La fecha de revisión debe ser hoy o posterior."

### Escenario: Recordatorio en la fecha de revisión (v2.0)

**Dado** que existe un compromiso `pendiente` con fecha de revisión 15/12/2026
**Cuando** llega el 15/12/2026
**Entonces** el Director recibe la notificación "Hoy se revisa el compromiso de Quispe: Firmar el ingreso dentro de la tolerancia." enlazada al compromiso.

### Escenario: Cerrar un compromiso como cumplido (v2.0)

**Dado** que el compromiso está `pendiente`
**Cuando** lo marco `cumplido` con la observación "Cumplió las 3 semanas siguientes"
**Entonces** el sistema guarda el estado, la observación, quién lo cerró y cuándo, muestra "Compromiso marcado como cumplido." y notifica al docente.

### Escenario: Cerrar un compromiso como no cumplido (v2.0)

**Dado** que el compromiso está `pendiente`
**Cuando** lo marco `no_cumplido` con la observación "Mantiene retrasos"
**Entonces** el sistema lo guarda y muestra "Compromiso marcado como no cumplido."

### Escenario: Cierre sin observación (v2.0)

**Dado** que voy a cerrar un compromiso
**Cuando** confirmo sin observación de cierre
**Entonces** el sistema impide la acción y muestra "Indique la observación de cierre."

### Escenario: Compromiso ya cerrado (v2.0)

**Dado** que el compromiso está `cumplido`
**Cuando** intento volver a cerrarlo
**Entonces** el sistema bloquea la acción y muestra "El compromiso ya está cerrado. No se puede volver a cerrar."

### Escenario: Reprogramar la fecha de revisión (v2.0)

**Dado** que el compromiso está `pendiente` con revisión el 15/12/2026
**Cuando** cambio la fecha al 20/12/2026
**Entonces** el sistema crea una versión nueva vigente, deja la anterior con vigencia 0 y el Director ve ambas en el historial del compromiso.

### Escenario: Anular un compromiso (v2.0)

**Dado** que registré un compromiso por error
**Cuando** lo anulo con el motivo "Registrado en el docente equivocado"
**Entonces** el compromiso queda "Anulado" y visible, no se elimina y deja de contar como pendiente
**Y** queda en la bitácora (`RF-003`).

### Escenario: Anulación sin motivo (v2.0)

**Dado** que voy a anular un compromiso
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo de la anulación."

### Escenario: Cambiar la decisión con compromisos pendientes (v2.0)

**Dado** que el consolidado tiene un compromiso `pendiente`
**Cuando** cambio la decisión a `ninguna`
**Entonces** el sistema bloquea el cambio y muestra "Hay compromisos pendientes. Ciérrelos o anúlelos antes de cambiar la decisión."

### Escenario: Compromiso tras reabrir el consolidado (v2.0)

**Dado** que el compromiso se registró sobre la versión 1 y el consolidado se reabrió y se cerró como versión 2
**Cuando** abro el compromiso
**Entonces** el sistema lo muestra enlazado al consolidado y a la versión 1 en que se registró, con su seguimiento intacto.

### Escenario: El docente ve su compromiso y da su enterado (v2.0)

**Dado** que tengo un compromiso `pendiente`
**Cuando** abro "Mi seguimiento" y presiono "Enterado"
**Entonces** el sistema guarda la fecha y hora del acuse, muestra "Gracias. Quedó registrado que está enterado." y no cambia el estado del compromiso
**Y** no veo el historial de versiones.

### Escenario: El docente no ve compromisos de otros (v2.0)

**Dado** que soy docente
**Cuando** intento ver el compromiso de otro docente
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 6: Horas pedagógicas e informe mensual de horas efectivas (v2.0)

**Como** Director
**Quiero** ver las horas pedagógicas programadas y dictadas y exportar el informe mensual de horas efectivas
**Para** preparar mi informe mensual a la UGEL sin recalcular a mano.

### Escenario: Exportar el informe mensual (v2.0)

**Dado** que estoy en "Informe mensual de horas efectivas"
**Cuando** elijo noviembre de 2026 y presiono "Exportar a Excel"
**Entonces** el sistema descarga un Excel con el encabezado (colegio, nivel, mes 11/2026) y una fila por docente con nivel, jornada, horas programadas, horas efectivas dictadas, inasistencias justificadas (`J`), injustificadas (`I`), tardanzas y minutos.

### Escenario: Clasificación de inasistencias y tardanzas (v2.0)

**Dado** que en noviembre el docente Quispe tuvo 2 sesiones `justificada`, 1 `no_cumplida` y 3 sesiones con retraso mayor a la tolerancia
**Cuando** exporto el informe de noviembre
**Entonces** su fila muestra `J` = 2, `I` = 1 y tardanzas = 3.

### Escenario: Docente con sesiones en dos niveles (v2.0)

**Dado** que el docente dicta en Primaria y en Secundaria
**Cuando** exporto el informe
**Entonces** aparece una fila por nivel con sus horas.

### Escenario: Mes sin sesiones (v2.0)

**Dado** que elijo un mes sin sesiones (vacaciones)
**Cuando** presiono "Exportar a Excel"
**Entonces** el sistema muestra "No hay sesiones en el mes elegido para exportar." y no genera archivo.

### Escenario: Informe con bimestre abierto (v2.0)

**Dado** que el bimestre sigue abierto
**Cuando** exporto el informe del mes en curso
**Entonces** el sistema lo genera con las sesiones registradas hasta ese momento, sin requerir consolidado.

### Escenario: El informe no se envía ni calcula descuentos (v2.0)

**Dado** que descargué el informe mensual
**Cuando** reviso la pantalla y el archivo
**Entonces** no existe acción de envío a la UGEL ni montos de descuento o sanción.

### Escenario: Acceso restringido al informe (v2.0)

**Dado** que mi rol no tiene la opción "Informe mensual de horas efectivas" en el menú
**Cuando** intento abrir su ruta
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 7: Pendientes de seguimiento (v2.0)

**Como** Director o Subdirector
**Quiero** ver en un solo lugar lo que está pendiente de atender en el seguimiento docente
**Para** no dejar vencer justificaciones, descargos, consolidados, solicitudes ni compromisos.

### Escenario: Ver los conteos y el listado (v2.0)

**Dado** que hay 3 justificaciones sin resolver, 2 ausencias con descargo vencido, 1 consolidado sin generar, 4 consolidados sin decisión, 1 solicitud abierta y 2 compromisos vencidos
**Cuando** abro "Pendientes de seguimiento"
**Entonces** el sistema muestra el conteo de cada tipo y el listado con docente, tipo, bimestre, fecha de origen y días de atraso.

### Escenario: Filtrar por bimestre y docente (v2.0)

**Dado** que estoy en "Pendientes de seguimiento"
**Cuando** elijo el II Bimestre y el docente Quispe
**Entonces** el sistema muestra solo sus pendientes de ese bimestre y recalcula los conteos.

### Escenario: Ir a la pantalla del pendiente (v2.0)

**Dado** que veo una fila "Justificación sin resolver" de la sesión del 12/06
**Cuando** presiono la fila
**Entonces** el sistema abre la pantalla de justificaciones de esa sesión (`RF-011`); las demás filas abren su ausencia (`RF-012`), el docente del bimestre, el detalle del consolidado, la solicitud o el compromiso.

### Escenario: Un pendiente atendido desaparece (v2.0)

**Dado** que había una solicitud de revisión abierta
**Cuando** el Director la acepta o la rechaza
**Entonces** deja de aparecer en el reporte y el conteo baja en 1.

### Escenario: Exportar los pendientes a Excel (v2.0)

**Dado** que filtré por el II Bimestre
**Cuando** presiono "Exportar a Excel"
**Entonces** el sistema descarga el listado filtrado con tipo, docente, bimestre, fecha de origen y días de atraso.

### Escenario: Sin pendientes (v2.0)

**Dado** que no hay nada pendiente
**Cuando** abro la pantalla
**Entonces** el sistema muestra "No hay pendientes de seguimiento." con los conteos en cero.

### Escenario: Rol sin acceso (v2.0)

**Dado** que soy docente
**Cuando** intento abrir "Pendientes de seguimiento"
**Entonces** el sistema rechaza el acceso.

---

## Reglas de validación y negocio (resumen)

- **Cálculo:** sesiones por estado (`RF-011`); minutos perdidos por firma; ausencias vigentes y no anuladas (`RF-012`); total fuera de clase en horas y minutos.
- **Generación:** en la última semana del bimestre o después de cerrarlo; uno vigente por docente y bimestre.
- **Cierre:** bloquea sesiones y ausencias del docente en ese bimestre.
- **Decisión:** opcional, autónoma del Director (`ninguna`, `llamada_atencion`, `compromiso_mejora`, `derivado`); sin descuentos.
- **Versiones:** reabrir → corregir → cerrar crea versión nueva; la anterior queda con vigencia 0; motivo obligatorio desde la versión 2; nada se elimina.
- **Solicitudes:** una abierta por consolidado; motivo obligatorio; el Director acepta (reabre) o rechaza (con respuesta); el docente es notificado.
- **Acceso (v2.0):** por opciones del menú asignadas al rol (`RF-002`). Por defecto, Director genera, reabre, decide, resuelve y registra compromisos; Subdirector consulta y exporta; el docente ve solo lo suyo, solicita revisión y da su "enterado".
- **Compromisos (v2.0):** solo con decisión `compromiso_mejora` o `llamada_atencion`; descripción y fecha de revisión (hoy o posterior) obligatorias; estados `pendiente`, `cumplido`, `no_cumplido`; observación de cierre obligatoria; un cierre es definitivo; recordatorio al Director en la fecha; enlazado al consolidado y a su versión; sin eliminación (anulación con motivo y versiones con vigencia 0); no se cambia la decisión con compromisos pendientes.
- **"Enterado" (v2.0):** acuse con fecha y hora, no vinculante; sin firma digital.
- **Horas pedagógicas (v2.0):** 1 h.p. = `sesion.minutos_hora_pedagogica` (45 min); programadas, dictadas (cumplidas + parciales por minutos firmados) y perdidas, con un decimal; los cerrados conservan sus valores.
- **Informe mensual (v2.0):** Excel por mes y docente (nivel, jornada, horas programadas y dictadas, `J`, `I`, tardanzas, minutos); solo se genera, no se envía a la UGEL; sin descuentos.
- **Pendientes (v2.0):** seis tipos, conteos y listado con filtros por bimestre y docente, enlace a cada pantalla y exportación a Excel; solo para Director y Subdirector.
- **Auditoría:** generación, reapertura, versiones, decisiones y solicitudes (`RF-003`); **(v2.0)** compromisos y exportaciones.

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Consolidado del bimestre (tabla de docentes, generar, exportar) · Detalle del docente (totales, sesiones, ausencias, decisión, historial) · Mi seguimiento (docente, con solicitud de revisión) · Solicitudes de revisión · Ficha PDF. Escenarios: Generación masiva · Cálculo con ausencia anulada · Reapertura y versión 2 · Solicitud aceptada y rechazada. **(v2.0)** Pantallas nuevas: Compromisos del consolidado (registro, seguimiento, historial) · Informe mensual de horas efectivas · Pendientes de seguimiento. Escenarios nuevos: Compromiso con recordatorio y cierre · "Enterado" del docente · Horas pedagógicas con parciales · Exportación mensual · Filtro y exportación de pendientes.
