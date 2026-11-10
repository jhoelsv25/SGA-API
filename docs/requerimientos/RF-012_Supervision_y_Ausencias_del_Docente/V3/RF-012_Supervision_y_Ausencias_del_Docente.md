# RF-012: Supervisión y Ausencias del Docente

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Seguimiento docente
**Versión:** 3.0
**Fecha:** actualización v3.0: 2026-11-09
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 10 hh (IA Agéntica)
**Prerrequisitos:** `RF-011` (sesiones de clase), `RF-019` (notificación al docente).

> **Cambios de la versión 3.0 sobre la 2.0 (solo aclaración de alcance, 2026-11-09):**
>
> - **Lo pedagógico pasa a `RF-023`.** La observación de aula con rúbricas, la retroalimentación y los compromisos de mejora se atienden en `RF-023` (Observación de aula y retroalimentación docente). Este RF sigue registrando solo **ausencias** (tiempo fuera del aula) y no cambia ninguna regla, escenario ni mensaje.
>
> **Cambios de la versión 2.0 sobre la 1.0 (respuestas de la entrevista al colegio, 2026-10-09):**
>
> - **Quién registra (P-09):** configurable por perfil con el permiso `ausencias.registrar`; por defecto Director y Subdirector.
> - **Plazos configurables (P-10):** plazo del descargo (`ausencia.plazo_descargo_dias`, 7 días) y de corrección (`ausencia.plazo_correccion_horas`, 24 horas).

## Consideraciones y supuestos de negocio

- **Propósito.** Dejar evidencia de los momentos en que el docente **no estaba enseñando** durante su sesión (fuera del aula, desayunando, en el celular…). El director recorre las aulas de vez en cuando; lo que encuentra se registra aquí, con fotos, para sustentar el consolidado del bimestre (`RF-013`) y responder a los reclamos.
- **Supervisión ocasional.** No todas las sesiones se supervisan. Una sesión puede tener ninguna, una o varias ausencias.
- **Quién registra.** Quien tenga el permiso `ausencias.registrar` con su alcance (`RF-002`); por defecto, el **Director** y el **Subdirector**. **(v2.0, P-09)**
- **Desde dónde.** Desde el portal, en la computadora o el celular del supervisor (con sesión iniciada). Las fotos se pueden tomar con la cámara del celular o subirse desde la galería.
- **Datos de una ausencia.**

  | Dato               | Obligatorio | Regla                                                                                        |
  | ------------------ | ----------- | -------------------------------------------------------------------------------------------- |
  | Sesión             | Sí          | Sesión de hoy o anterior, de un bimestre abierto, con firma de ingreso o en horario de clase |
  | Hora desde – hasta | Sí          | Hasta posterior a desde; dentro del horario de la sesión                                     |
  | Minutos            | Automático  | Hasta − desde                                                                                |
  | Motivo             | Sí          | `fuera_del_aula`, `desayunando`, `servicios_higienicos`, `uso_celular`, `otro`               |
  | Observación        | Condicional | Obligatoria si el motivo es `otro`                                                           |
  | Fotos              | No          | Varias; PNG o JPG de hasta 5 MB cada una, con fecha y hora en que se tomó                    |

- **No cambia el estado de la sesión.** La sesión sigue `cumplida` o `parcial` según sus firmas (`RF-011`). La ausencia es evidencia aparte y suma minutos en el consolidado (`RF-013`); no afecta el CSP.
- **Varios tramos.** Se pueden registrar varios tramos en la misma sesión, pero no se superponen entre sí.
- **Aviso al docente.** Al registrar una ausencia, el docente recibe una notificación en el sistema enlazada a la sesión (`RF-019`).
- **Descargo.** El docente puede escribir su versión una sola vez, dentro de los **7 días calendario** siguientes al registro. **(v2.0, P-10: configurable en `ausencia.plazo_descargo_dias`.)** El descargo no borra ni modifica la ausencia; queda junto a ella.
- **Corrección y anulación (acordado, P-11):**
  - **Corregir** (horas, motivo, observación, fotos): solo quien la registró, dentro de las **24 horas** (configurable en `ausencia.plazo_correccion_horas`, **v2.0**) y si el docente aún no dejó su descargo. Se debe indicar el **motivo del cambio**.
  - **Anular:** después de ese plazo, el Director puede anularla indicando el motivo. La ausencia queda visible como "Anulada" y no suma minutos.
  - **Nunca se elimina.**
- **Historial de cambios (baja lógica).** Una corrección **no sobrescribe** la ausencia: el sistema crea una **nueva versión** vigente y la anterior queda con **vigencia 0**. Cada versión guarda quién la registró, cuándo y el motivo del cambio. Lo mismo con las fotos: una foto retirada queda con vigencia 0. Los minutos, el consolidado y el docente solo ven la versión vigente; el **Director y el Subdirector ven el historial completo** de cada ausencia.
- **Bloqueo.** Al cerrar el bimestre (`RF-005`) o generar su consolidado (`RF-013`), las ausencias de ese bimestre ya no se registran, corrigen, anulan ni reciben descargos.
- **Privacidad.** Cada docente ve solo sus ausencias. El Director y el Subdirector ven las de todos.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Registro, corrección, anulación, descargo y fotos quedan en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                      | Mensaje                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Ausencia registrada            | "Ausencia registrada: 20 minutos. Se notificó al docente."                         |
| Horas invertidas               | "La hora final debe ser posterior a la hora inicial."                              |
| Fuera del horario de la sesión | "El tramo debe estar dentro del horario de la sesión (08:30 a 10:00)."             |
| Tramos superpuestos            | "El tramo se cruza con otra ausencia registrada en esta sesión."                   |
| Falta observación              | "Describa la situación cuando el motivo es «Otro»."                                |
| Foto inválida                  | "Las fotos deben ser PNG o JPG de hasta 5 MB."                                     |
| Corrección fuera de plazo      | "Ya no se puede corregir esta ausencia. Puede anularla indicando el motivo."       |
| Anulación sin motivo           | "Indique el motivo de la anulación."                                               |
| Corrección sin motivo          | "Indique el motivo del cambio."                                                    |
| Descargo enviado               | "Su descargo fue registrado."                                                      |
| Descargo fuera de plazo        | "El plazo para presentar su descargo venció el 20/05/2027."                        |
| Descargo repetido              | "Ya presentó su descargo para esta ausencia."                                      |
| Bimestre cerrado               | "El bimestre está cerrado o consolidado. Las ausencias ya no se pueden modificar." |

## Requerimientos fuera de alcance (Out of Scope)

- **Firma de las sesiones y su estado.** Corresponde a `RF-011`.
- **Consolidado, decisión y ficha imprimible.** Corresponde a `RF-013`.
- **Rúbrica o ficha de monitoreo pedagógico** (niveles de logro por desempeño). **(v3.0)** Corresponde a `RF-023`; este RF solo registra ausencias.
- **Video o audio como evidencia.** Solo fotos.

## Acuerdos y puntos abiertos

- **Quién registra (acordado, P-09).** Configurable por perfil; por defecto Director y Subdirector. **(v2.0)**
- **Plazo del descargo (acordado, P-10).** 7 días calendario, configurable. **(v2.0)**
- **Corrección y anulación (acordado, P-11).** Se corrige en 24 horas antes del descargo; después solo se anula con motivo. Cada cambio genera una nueva versión y la anterior queda con vigencia 0; el Director ve todo el historial con quién hizo cada cambio.

## Historia de Usuario 1: Registrar una ausencia

**Como** Director
**Quiero** registrar el tramo en que encontré al docente fuera de clase, con fotos
**Para** tener evidencia en el seguimiento docente.

### Escenario: Registrar una ausencia con fotos

**Dado** que la sesión de Matemática de 5.° A es de 08:30 a 10:00 y el docente firmó el ingreso
**Cuando** registro una ausencia de 08:50 a 09:10, motivo `desayunando`, observación "En la cafetería", con 2 fotos, y guardo
**Entonces** el sistema guarda la ausencia con 20 minutos y sus fotos, notifica al docente y muestra "Ausencia registrada: 20 minutos. Se notificó al docente."

### Escenario: Varios tramos en la misma sesión

**Dado** que la sesión ya tiene una ausencia de 08:50 a 09:10
**Cuando** registro otra de 09:30 a 09:40, motivo `fuera_del_aula`
**Entonces** el sistema la guarda y la sesión suma 30 minutos de ausencia.

### Escenario: Tramos superpuestos

**Dado** que la sesión ya tiene una ausencia de 08:50 a 09:10
**Cuando** registro otra de 09:00 a 09:20
**Entonces** el sistema impide guardar y muestra "El tramo se cruza con otra ausencia registrada en esta sesión."

### Escenario: Tramo fuera del horario de la sesión

**Dado** que la sesión es de 08:30 a 10:00
**Cuando** registro un tramo de 10:05 a 10:15
**Entonces** el sistema impide guardar y muestra "El tramo debe estar dentro del horario de la sesión (08:30 a 10:00)."

### Escenario: Horas invertidas

**Dado** que estoy registrando una ausencia
**Cuando** la hora final es anterior o igual a la inicial
**Entonces** el sistema impide guardar y muestra "La hora final debe ser posterior a la hora inicial."

### Escenario: Motivo «Otro» sin observación

**Dado** que elegí el motivo `otro`
**Cuando** intento guardar sin observación
**Entonces** el sistema impide guardar y muestra "Describa la situación cuando el motivo es «Otro»."

### Escenario: Foto inválida

**Dado** que estoy adjuntando fotos
**Cuando** adjunto un archivo de 8 MB o un PDF
**Entonces** el sistema lo rechaza y muestra "Las fotos deben ser PNG o JPG de hasta 5 MB."

### Escenario: Tomar la foto desde el celular

**Dado** que ingresé al portal desde mi celular
**Cuando** presiono "Agregar foto"
**Entonces** el sistema me permite usar la cámara o elegir de la galería y guarda la fecha y hora de la foto.

### Escenario: Usuario sin permiso

**Dado** que mi perfil es Docente
**Cuando** intento registrar una ausencia
**Entonces** el sistema no muestra la opción y rechaza la acción.

### Escenario: Otro perfil con permiso de registro (v2.0)

**Dado** que el Administrador dio a un Coordinador el permiso `ausencias.registrar` con alcance `colegio`
**Cuando** el Coordinador registra una ausencia
**Entonces** el sistema la guarda igual que si la registrara el Director.

## Historia de Usuario 2: Corregir o anular una ausencia

**Como** Director
**Quiero** corregir un error al registrar una ausencia o anularla con motivo
**Para** que la evidencia sea correcta sin perder el historial.

### Escenario: Corregir dentro del plazo

**Dado** que registré una ausencia hace 2 horas y el docente no presentó descargo
**Cuando** cambio la hora final de 09:10 a 09:05, indico el motivo "Error al anotar la hora" y guardo
**Entonces** el sistema crea la versión 2 vigente con 15 minutos y deja la versión 1 con vigencia 0, con quién y cuándo hizo el cambio.

### Escenario: Corrección sin motivo del cambio

**Dado** que estoy corrigiendo una ausencia dentro del plazo
**Cuando** guardo sin indicar el motivo del cambio
**Entonces** el sistema impide guardar y muestra "Indique el motivo del cambio."

### Escenario: Ver el historial de una ausencia

**Dado** que una ausencia fue corregida dos veces
**Cuando** el Director abre "Historial" en esa ausencia
**Entonces** el sistema muestra las 3 versiones, de la más reciente a la más antigua, con tramo, minutos, motivo, fotos, quién registró cada versión, cuándo y el motivo del cambio
**Y** marca cuál es la versión vigente.

### Escenario: El docente solo ve la versión vigente

**Dado** que una ausencia tiene versiones anteriores
**Cuando** el docente la consulta
**Entonces** el sistema muestra solo la versión vigente.

### Escenario: Corregir fuera del plazo

**Dado** que la ausencia se registró hace 2 días o el docente ya presentó su descargo
**Cuando** intento corregirla
**Entonces** el sistema bloquea la acción y muestra "Ya no se puede corregir esta ausencia. Puede anularla indicando el motivo."

### Escenario: Corregir la ausencia de otro supervisor

**Dado** que la ausencia la registró el Subdirector
**Cuando** el Director intenta corregirla
**Entonces** el sistema no ofrece la acción de corregir.

### Escenario: Anular una ausencia

**Dado** que una ausencia ya no se puede corregir
**Cuando** la anulo con el motivo "Se confirmó que estaba en reunión con un apoderado"
**Entonces** la ausencia queda marcada como "Anulada", con quién y cuándo, y deja de sumar minutos.

### Escenario: Anular sin motivo

**Dado** que estoy anulando una ausencia
**Cuando** confirmo sin motivo
**Entonces** el sistema impide la acción y muestra "Indique el motivo de la anulación."

### Escenario: Bimestre cerrado o consolidado

**Dado** que el bimestre de la ausencia ya se cerró o consolidó
**Cuando** intento registrar, corregir o anular una ausencia de ese bimestre
**Entonces** el sistema bloquea la acción y muestra "El bimestre está cerrado o consolidado. Las ausencias ya no se pueden modificar."

## Historia de Usuario 3: Descargo del docente

**Como** Docente
**Quiero** ver las ausencias que me registraron y dejar mi descargo
**Para** que también conste mi versión.

### Escenario: Ver mis ausencias

**Dado** que me registraron una ausencia
**Cuando** abro la notificación o "Mis ausencias"
**Entonces** el sistema muestra la sesión, el tramo, los minutos, el motivo, la observación, las fotos y la fecha límite para mi descargo.

### Escenario: Presentar el descargo

**Dado** que la ausencia se registró hace 3 días
**Cuando** escribo "Fui a la dirección a recoger material para la clase" y envío
**Entonces** el sistema guarda el descargo con la fecha y muestra "Su descargo fue registrado."

### Escenario: Descargo fuera de plazo

**Dado** que la ausencia se registró el 13/05/2027
**Cuando** intento presentar el descargo el 21/05/2027
**Entonces** el sistema bloquea el envío y muestra "El plazo para presentar su descargo venció el 20/05/2027."

### Escenario: Descargo repetido

**Dado** que ya presenté mi descargo para esa ausencia
**Cuando** intento enviar otro
**Entonces** el sistema bloquea el envío y muestra "Ya presentó su descargo para esta ausencia."

### Escenario: Ausencias de otro docente

**Dado** que soy docente
**Cuando** intento ver las ausencias de otro docente
**Entonces** el sistema rechaza el acceso.

## Historia de Usuario 4: Consulta del supervisor

**Como** Director
**Quiero** consultar las ausencias registradas
**Para** revisar la situación de cada docente antes del consolidado.

### Escenario: Listado de ausencias

**Dado** que estoy en "Ausencias docentes"
**Cuando** filtro por el bimestre II y el docente Quispe
**Entonces** el sistema lista cada ausencia con fecha, curso, sección, tramo, minutos, motivo, si tiene fotos, si tiene descargo y si está anulada
**Y** muestra el total de minutos, sin contar las anuladas.

---

## Reglas de validación y negocio (resumen)

- **Registro:** perfiles con `ausencias.registrar` (por defecto Director y Subdirector) **(v2.0)**; sesión de un bimestre abierto; tramo dentro del horario de la sesión; hasta > desde; sin superponerse con otros tramos de la sesión.
- **Campos:** obligatorios Sesión, Desde, Hasta y Motivo; Observación obligatoria si el motivo es `otro`; minutos automáticos.
- **Fotos:** varias; PNG o JPG de hasta 5 MB.
- **Efecto:** no cambia el estado de la sesión ni el CSP; suma minutos en el consolidado; notifica al docente.
- **Descargo:** uno por ausencia; dentro de 7 días calendario, configurable **(v2.0)**.
- **Corrección:** solo quien registró, dentro de 24 horas, antes del descargo y con motivo del cambio; **anulación** con motivo después; nunca se elimina.
- **Historial:** cada corrección crea una versión nueva; la anterior queda con vigencia 0 (baja lógica) con quién y cuándo; los cálculos usan solo la versión vigente; Director y Subdirector ven el historial completo.
- **Bloqueo:** al cerrar o consolidar el bimestre.
- **Privacidad:** el docente ve solo las suyas.
- **Auditoría:** registro, corrección, anulación, descargo y fotos (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web adaptable a celular. Pantallas: Sesiones de hoy → Registrar ausencia (tramo, motivo, cámara/galería) · Ausencias docentes (listado con filtros y total) · Mis ausencias (docente, con descargo). Escenarios: Registro con fotos · Superposición · Fuera de plazo · Anulación · Descargo · Descargo vencido.
