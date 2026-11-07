# RF-022: Integración con Biométrico ZKTeco (Marcación por Huella)

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Asistencia — Marcación por biométrico
**Versión:** 2.0 (borrador para validar con el colegio)
**Fecha:** actualización v2.0: 2026-11-07
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Alta | **Esfuerzo estimado:** Por estimar (depende del modelo de reloj y de la red del colegio)
**Prerrequisitos:** `RF-003` (bitácora), `RF-004` (equipos de tipo `biometrico`), `RF-005` (días con y sin clases), `RF-007` (personas y credenciales), `RF-009` (matrículas vigentes), `RF-010` (reglas de marcación).

> **Cambios de la versión 2.0 sobre la 1.0 (marcaciones del mismo docente por distintas vías, 2026-11-07):**
>
> - **Misma asistencia por dos vías (P-44):** si el docente ya marcó por kiosko, manual o reloj y llega otra marca por una vía distinta a pocos minutos, se toma como la misma asistencia: no se guarda de nuevo y queda rastro en la auditoría. La ventana se configura con una variable del sistema (30 minutos por defecto).
> - **Entrada y salida por la hora de la marca:** ya no se asignan por el orden de llegada. Si llega una marca anterior a la entrada ya guardada (por ejemplo, un lote atrasado del reloj), esa pasa a ser la entrada y la guardada se convierte en salida.
> - **Las mismas reglas en todas las vías del reloj:** la lectura por app puente, la tabla de marcaciones crudas y la asignación de pendientes usan la misma regla.

## Consideraciones y supuestos de negocio

- **Propósito.** Añadir el reloj biométrico de huella ZKTeco como **otro método de marcación de asistencia al colegio**, junto al kiosko (código/QR + PIN) y la marcación manual (`RF-010`). La persona pone el dedo en el reloj y su marcación aparece en el sistema sin que nadie la registre a mano.
- **Quién marca con el reloj (acordado).** **Solo los docentes** marcan con huella en el reloj. Los estudiantes siguen marcando en el kiosko (`RF-010`). Hay **un solo reloj**.
- **Compatible con la línea ZKTeco (acordado).** El modelo del reloj es un **ZKTeco MB20-VL/ID** (huella + rostro + tarjeta), confirmado por el BA el 2026-11-03. Falta probar la lectura por red con el equipo real (ver P-37). El sistema no debe depender de un modelo: debe funcionar con **cualquier reloj de la línea ZKTeco** que use el protocolo estándar de lectura de marcaciones por red, de modo que si el reloj se **cambia por otro similar**, solo se actualiza su número de serie y su dirección de red. Este RF usa únicamente la **huella**; rostro y tarjeta quedan fuera.
- **Una sola asistencia, tres orígenes.** Las marcaciones del reloj se guardan en el mismo registro que las del kiosko, con origen `biometrico`. Todo lo que ya existe (panel "Marcaciones de hoy", falta al colegio, consultas del apoderado, indicadores) las toma sin cambios.
- **Mismas reglas de `RF-010`.** El reloj solo aporta **quién** marcó y **a qué hora**. El sistema decide lo demás con las reglas de siempre:
  - Docente: **entrada y salida**, asignadas por la **hora de la marca** (la más temprana del día = entrada, la siguiente = salida), no por el orden en que llegan (v2.0).
  - Resultado `puntual`, `tardanza`, `salida_anticipada` o `fuera_de_turno` según el turno del personal (`RF-004`).
  - Una entrada y una salida por día. La persona debe ser un docente activo.
  - **Rebote del dedo:** si el docente marca otra vez dentro de unos minutos de su última marcación (variable `biometrico.minutos_antirrebote`, 5 por defecto), la segunda se ignora para que no cuente como salida (P-42).
  - El botón "entrada/salida" del reloj **se ignora**: el sistema no se fía de él.
- **Misma asistencia por dos vías (v2.0, P-44).** El docente puede marcar por kiosko, a mano o en el reloj, y a veces lo hace por más de un medio (por ejemplo, marca en el kiosko y minutos después pone el dedo). Para no convertir ese doble marcado en una salida falsa:
  - Si ya existe una marcación del docente **de otra vía** a menos de _N_ minutos (variable `marcacion.minutos_duplicado_entre_vias`, **30 por defecto**; 0 la desactiva), la marca nueva se considera **la misma asistencia**: **no se guarda** como entrada ni salida.
  - La marca descartada **queda registrada en la bitácora** (`RF-003`) con la marcación con la que coincide, para que Soporte TI pueda revisarla.
  - Vale en los dos sentidos: kiosko o manual primero y reloj después, o reloj primero y kiosko después. En el kiosko el docente ve "Ya tiene una marcación registrada a las [hora]."
  - Una segunda marca de la **misma vía** no entra en esta regla: sigue la suya (rebote del dedo en el reloj).
  - La **marcación manual** no se descarta por esta regla (es una decisión explícita de Secretaría o del Administrador), pero **sí cuenta** como otra vía para las demás marcas.
- **Entrada y salida por la hora de la marca (v2.0).** Si llega una marca **anterior** a la entrada ya guardada (por ejemplo, un lote atrasado del reloj con una marca de las 07:05 cuando la entrada guardada es de las 09:10), la marca anterior pasa a ser la **entrada** y la que estaba pasa a ser la **salida**, con su resultado recalculado. El cambio queda en la bitácora.
- **Cómo llegan las marcaciones al sistema (acordado).** Una **app puente** instalada en un computador del colegio, **en la misma red local que el reloj**, **lee las marcaciones del reloj** por red (protocolo estándar ZKTeco, puerto 4370) y las **envía al servidor del SGA** por internet (API segura). El servidor **nunca se conecta al reloj**; solo recibe lo que envía la app. Así el reloj no necesita internet ni puertos abiertos, solo la app. _(Descartado: que el reloj envíe solo al servidor — protocolo *push*/ADMS —, porque depende del modelo.)_
- **Vínculo persona ↔ huella.** Cada persona tiene en el reloj un **ID de usuario** (número). En el sistema se le asigna ese mismo ID como **código biométrico** (único por persona). Con ese número se sabe de quién es cada marcación.
- **Enrolamiento (registro de la huella).** La huella se registra **físicamente en el reloj** por Soporte TI o la Secretaria. El sistema **no guarda huellas ni plantillas biométricas**: solo guarda el número de ID y la marcación. Esto reduce el riesgo legal y de seguridad, sobre todo con menores de edad (Ley N.° 29733, Protección de Datos Personales).
- **Equipo autorizado.** El reloj se registra como equipo de tipo `biometrico` con su **número de serie** (`RF-004`). Al registrarlo, el sistema genera la **clave de la app puente**, que se muestra una sola vez y se copia en la app. El sistema solo acepta marcaciones enviadas con una clave válida de un reloj **registrado y activo**; las demás se rechazan y quedan en la bitácora.
- **Hora de la marcación.** El reloj guarda la hora del momento exacto en que se puso el dedo. Si la app no pudo enviarla de inmediato (sin internet), esa hora es la verdadera. Por eso, **para el biométrico, la hora válida es la del reloj**, no la del servidor (excepción a la regla de `RF-010`; se confirma en P-36). Para que sea confiable:
  - La app **pone en hora el reloj** con la hora del servidor (zona horaria de Lima) al conectarse y cada cierto tiempo.
  - Si la hora del reloj difiere más de _N_ minutos de la del servidor, la marcación se acepta pero se **alerta** a Soporte TI.
  - El sistema **sincroniza la hora del reloj** con la del servidor (zona horaria de Lima) cada vez que se conecta.
  - Si la hora del reloj difiere más de _N_ minutos de la del servidor, la marcación se acepta pero se **alerta** a Soporte TI.
- **Marcaciones atrasadas.** El reloj guarda sus marcaciones aunque la app o el internet estén caídos. Cuando la app vuelve, **lee todo lo que falta** (desde su último punto leído) y lo envía. Si falla el internet, la app **guarda en cola** y reintenta. El sistema las procesa **en orden de hora**, con las mismas reglas, aunque lleguen horas después. La app **no borra** las marcaciones del reloj.
- **Sin duplicados.** Si la app reenvía una marcación ya recibida (corte de red, reinicio), el sistema no la guarda dos veces (misma persona, mismo reloj y misma hora). Si el docente pone el dedo varias veces seguidas, solo cuenta la primera entrada y la salida (regla de `RF-010`).
- **Marcaciones que no se pueden asignar.** Si llega una marcación de un ID que no pertenece a ninguna persona, o de una persona que no es docente activo, **no se pierde**: queda en una bandeja de **marcaciones pendientes** para que Secretaria o Soporte TI la resuelvan (asignar a una persona o descartar con motivo).
- **Estado de la app y del reloj.** La app avisa al servidor cada pocos minutos ("latido") e indica si **el reloj le responde**. El sistema muestra la última comunicación y alerta a Soporte TI en dos casos, en horario de marcación: **la app puente no se comunica** o **la app se comunica pero el reloj no responde**.
- **Quién configura (acordado: configuración manual).** Soporte TI y Administrador registran el reloj (la ubicación se escribe a mano en el campo ubicación) y configuran la app a mano con: dirección de red (IP) y puerto del reloj, clave de comunicación del reloj (si la tiene), dirección del servidor SGA y la clave de la app. Asignar códigos biométricos: **Soporte TI**, **Administrador** y **Secretaria**; esta última también resuelve pendientes.
- **Cambio de reloj.** Si el reloj se reemplaza por otro similar, Soporte TI actualiza su número de serie en el sistema y la IP en la app, y vuelve a enrolar las huellas en el reloj nuevo **con los mismos ID**. Las marcaciones anteriores y los códigos biométricos se conservan.
- **Qué NO reemplaza.** El kiosko de código + PIN sigue funcionando (por ejemplo, si el reloj o la app fallan). La marcación manual también. El **kiosko de sesiones** (firma de clases de `RF-011`) no cambia: **el reloj solo registra la asistencia de entrada y salida del colegio** (acordado).
- **Datos personales.** Es información biométrica de empleados: el colegio debe contar con su consentimiento (Ley N.° 29733); ver P-40.
- **Auditoría inmutable.** Quedan en la bitácora (`RF-003`): registro, cambio de serie y desactivación del reloj, asignación y cambio de códigos biométricos, regeneración de la clave de la app, marcaciones rechazadas, resolución de pendientes y desfases de hora.

## Mensajes del requerimiento

| Situación                                                          | Mensaje                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Código biométrico asignado                                         | "Código biométrico asignado a [Nombre]."                                                 |
| Código biométrico repetido                                         | "Ese código biométrico ya pertenece a otra persona."                                     |
| Clave de la app generada                                           | "Reloj biométrico autorizado. Copie la clave de la app puente: no se volverá a mostrar." |
| Número de serie obligatorio                                        | "Debe ingresar el número de serie para equipos biométricos."                             |
| Marcación pendiente resuelta                                       | "Marcación asignada a [Nombre]."                                                         |
| Pendiente descartada                                               | "Marcación descartada."                                                                  |
| Motivo obligatorio al descartar                                    | "Indique el motivo para descartar la marcación."                                         |
| App puente sin conexión (alerta)                                   | "La app puente del reloj [Nombre] no se comunica desde las [hora]."                      |
| Reloj no responde (alerta)                                         | "El reloj [Nombre] no responde a la app puente desde las [hora]."                        |
| Desfase de hora (alerta)                                           | "El reloj [Nombre] tiene la hora desfasada [N] minutos. Se sincronizó con el servidor."  |
| Clave de app inválida                                              | _(solo bitácora)_ "Marcación rechazada: clave de app puente inválida o reloj inactivo."  |
| Marca ya registrada por otra vía (al asignar una pendiente) (v2.0) | "Ya existe una marcación de esta persona en esa franja, hecha por otra vía."             |

## Requerimientos fuera de alcance (Out of Scope)

- **Almacenar huellas, plantillas biométricas o fotos del reloj.** Las huellas viven solo en el reloj.
- **Reconocimiento facial o por tarjeta de proximidad.** Solo huella en esta versión.
- **Control de acceso físico** (abrir puerta, torniquete, cerradura).
- **Marcación de estudiantes y administrativos con el reloj.** Los estudiantes usan el kiosko; los administrativos, por ahora, también.
- **Firma de sesiones de clase con huella (acordado).** El reloj solo registra entrada y salida del colegio; el kiosko de sesiones (`RF-011`) no cambia.
- **Que el servidor se conecte al reloj** o que el reloj envíe solo (_push_/ADMS).
- **Configuración automática** (descubrir el reloj en la red, cargar su ubicación): todo se configura a mano.
- **Funciones propias de un modelo** (rostro, tarjeta, pantallas, alarmas).
- **Registro de huellas desde el sistema web.** El enrolamiento se hace en el reloj.
- **Envío de SMS o WhatsApp** al apoderado por la marcación. Los avisos internos son de `RF-019`.
- **Descuentos por tardanza o planillas.**
- **Instalación del reloj, cableado y red del colegio.** Es labor de soporte técnico. El colegio debe dejar el reloj con IP fija y un computador encendido con internet en su misma red para la app puente.

## Acuerdos y puntos abiertos

- **Acordado con el BA (2026-11-02):** (1) el sistema debe funcionar con la línea ZKTeco, no con un solo modelo (P-37); (2) el reloj solo registra entrada y salida del colegio de los docentes (P-39); (3) un solo reloj y configuración manual (P-41); (4) las marcaciones se leen del reloj por la red local con una app puente y se envían al servidor.
- **Pendiente de validar con el colegio** (ver `PENDIENTES.md`):
  - **P-36.** Hora válida: la del reloj (propuesta) o la del servidor.
  - **P-37 (modelo confirmado: MB20-VL/ID).** Falta la prueba real de lectura por red (puerto 4370) y saber si tiene clave de comunicación.
  - **P-38.** ¿Qué computador del colegio quedará encendido, con internet y en la misma red que el reloj para la app puente? ¿El reloj tendrá IP fija?
  - **P-40.** Consentimiento de los docentes para el uso de su huella.
  - **P-42.** Valores de las variables del biométrico: minutos de rebote (5), desfase máximo de hora (2 min) y minutos sin comunicación antes de alertar (10).
  - **P-44 (v2.0).** Regla acordada en el equipo: la marca de otra vía a pocos minutos es la misma asistencia. Falta confirmar con el colegio cuántos minutos abarca la ventana (hoy 30).
- **Un solo reloj (acordado)**, usado solo por docentes (propósito `marcacion`, permite docentes), con configuración manual.

## Historia de Usuario 1: Registrar el reloj y vincular a las personas

**Como** Soporte TI o Administrador
**Quiero** registrar el reloj biométrico y asignar a cada persona su código biométrico
**Para** que las marcaciones del reloj se reconozcan en el sistema.

### Escenario: Registrar un reloj biométrico

**Dado** que tengo un reloj ZKTeco con número de serie `ABC1234567`
**Cuando** lo registro como equipo de tipo `biometrico` con ese número de serie y marco que lo usan docentes
**Entonces** el sistema lo guarda activo y, al generar su clave, muestra "Reloj biométrico autorizado. Copie la clave de la app puente: no se volverá a mostrar."

### Escenario: Reloj sin número de serie

**Dado** que registro un equipo de tipo `biometrico`
**Cuando** dejo vacío el número de serie
**Entonces** el sistema muestra "Debe ingresar el número de serie para equipos biométricos."

### Escenario: Asignar el código biométrico a una persona

**Dado** que Pedro Quispe ya enroló su huella en el reloj con el ID `152`
**Cuando** asigno el código biométrico `152` a Pedro en el sistema
**Entonces** el sistema muestra "Código biométrico asignado a Pedro Quispe." y sus marcaciones del reloj se le atribuyen.

### Escenario: Código biométrico repetido

**Dado** que el código `152` ya pertenece a otra persona
**Cuando** intento asignarlo a una segunda persona
**Entonces** el sistema muestra "Ese código biométrico ya pertenece a otra persona." y no guarda el cambio.

### Escenario: Configurar la app puente

**Dado** que el reloj está registrado y tengo su clave
**Cuando** configuro la app en el computador del colegio con la IP y el puerto del reloj, la dirección del servidor y la clave
**Entonces** la app lee las marcaciones del reloj, las envía al sistema y el reloj aparece con su última comunicación.

### Escenario: Cambiar el reloj por uno similar

**Dado** que el reloj se dañó y compramos otro de la línea ZKTeco
**Cuando** actualizo el número de serie en el sistema, la IP en la app y enrolo las huellas en el reloj nuevo con los mismos ID
**Entonces** las marcaciones siguen llegando a cada docente y se conserva el historial anterior.

### Escenario: Desactivar un reloj

**Dado** que un reloj se dañó
**Cuando** lo desactivo
**Entonces** el sistema deja de aceptar sus marcaciones y el resto de métodos (kiosko, manual) siguen funcionando.

## Historia de Usuario 2: Marcar con huella

**Como** docente
**Quiero** marcar mi asistencia poniendo el dedo en el reloj
**Para** que quede registrada sin usar código ni PIN.

### Escenario: Docente marca su entrada a tiempo

**Dado** que el turno del personal es a las 07:30 con 10 minutos de tolerancia y mi código biométrico está asignado
**Cuando** pongo el dedo en el reloj a las 07:35
**Entonces** el sistema registra mi entrada como `puntual` con origen `biometrico` y aparece en "Marcaciones de hoy".

### Escenario: Docente llega tarde

**Dado** el mismo turno
**Cuando** marco a las 07:50
**Entonces** el sistema registra mi entrada como `tardanza` con 10 minutos.

### Escenario: Docente marca dos veces la entrada

**Dado** que ya marqué mi entrada hoy
**Cuando** vuelvo a poner el dedo a los pocos minutos
**Entonces** el sistema no registra una segunda entrada.

### Escenario: Docente marca la salida

**Dado** que ya marqué mi entrada hoy
**Cuando** pongo el dedo a las 14:03
**Entonces** el sistema registra mi salida, sin importar si el reloj la envió como "entrada".

### Escenario: Docente marca en el kiosko (o a mano) y luego en el reloj (v2.0)

**Dado** que ya marqué mi entrada hoy a las 07:35 en el kiosko (o la registró Secretaría a mano) y la variable de minutos entre vías es 30
**Cuando** a las 07:55 pongo el dedo en el reloj
**Entonces** el sistema no guarda la marca del reloj como salida porque coincide con mi entrada, y deja el rastro en la bitácora.

### Escenario: Marca atrasada anterior a la entrada ya registrada (v2.0)

**Dado** que mi entrada guardada es de las 09:10 (marcada en el kiosko) y el reloj tenía guardada una marca de las 07:05
**Cuando** la app puente envía esa marca atrasada
**Entonces** el sistema registra mi entrada a las 07:05 y la marca de las 09:10 pasa a ser mi salida, con su resultado recalculado y el cambio en la bitácora.

### Escenario: Salida anticipada

**Dado** que el turno del personal termina a las 15:00
**Cuando** marco mi salida a las 13:00
**Entonces** el sistema registra la salida como `salida_anticipada`.

### Escenario: Marcación en día sin clases

**Dado** que hoy es feriado o día sin clases (`RF-005`)
**Cuando** marco en el reloj
**Entonces** el sistema registra la marcación como `fuera_de_turno`.

### Escenario: Persona que no es docente activo

**Dado** que un ID del reloj pertenece a una persona que no es docente activo
**Cuando** el sistema recibe su marcación
**Entonces** no la registra como asistencia y la deja en la bandeja de marcaciones pendientes.

## Historia de Usuario 3: Lectura, envío y confiabilidad

**Como** Soporte TI
**Quiero** que la app puente lea el reloj y envíe las marcaciones al sistema aunque haya fallas
**Para** no perder asistencia.

### Escenario: La app lee y envía las marcaciones

**Dado** que la app está configurada y el reloj en la misma red
**Cuando** un docente marca en el reloj
**Entonces** en pocos minutos la app lo lee, lo envía y la marcación aparece en "Marcaciones de hoy" con origen `biometrico`.

### Escenario: Marcaciones enviadas con retraso

**Dado** que el computador o el internet estuvieron caídos de 07:30 a 09:00 y el reloj guardó 15 marcaciones
**Cuando** la app se recupera
**Entonces** lee las marcaciones pendientes, las envía y el sistema las registra con la hora en que se marcó, en orden, aplicando puntual/tardanza según esa hora.

### Escenario: Marcación reenviada

**Dado** que la app reenvía una marcación ya recibida
**Cuando** el sistema la recibe
**Entonces** no la duplica.

### Escenario: Clave de la app inválida

**Dado** que una app envía marcaciones con una clave inválida o de un reloj inactivo
**Cuando** el sistema las recibe
**Entonces** las rechaza y deja constancia en la bitácora.

### Escenario: Hora del reloj desfasada

**Dado** que la hora del reloj difiere del servidor más de lo permitido
**Cuando** la app se conecta
**Entonces** pone el reloj en hora, avisa a Soporte TI y el sistema mantiene la marcación.

### Escenario: App puente sin conexión

**Dado** que la app no avisa al servidor desde hace más de _N_ minutos en horario de marcación
**Cuando** reviso el panel de equipos o "Marcaciones de hoy"
**Entonces** veo la alerta "La app puente del reloj [Nombre] no se comunica desde las [hora]."

### Escenario: Reloj no responde a la app

**Dado** que la app avisa pero no logra leer el reloj
**Cuando** reviso el panel de equipos
**Entonces** veo la alerta "El reloj [Nombre] no responde a la app puente desde las [hora]."

## Historia de Usuario 4: Marcaciones pendientes

**Como** Secretaria o Soporte TI
**Quiero** resolver las marcaciones que el sistema no pudo asignar
**Para** que ninguna asistencia se pierda.

### Escenario: Marcación con ID desconocido

**Dado** que el reloj envió una marcación del ID `300` que no pertenece a nadie
**Cuando** abro la bandeja de pendientes
**Entonces** veo la marcación con ID, hora y reloj, y puedo asignarla a una persona.

### Escenario: Asignar una pendiente

**Dado** una marcación pendiente del ID `300`
**Cuando** la asigno a Ana Rojas
**Entonces** el sistema aplica las reglas de asistencia con la hora original, muestra "Marcación asignada a Ana Rojas." y guarda quién la resolvió.

### Escenario: Descartar una pendiente sin motivo

**Dado** una marcación pendiente
**Cuando** intento descartarla sin motivo
**Entonces** el sistema muestra "Indique el motivo para descartar la marcación."

## Historia de Usuario 5: Configurar el reloj desde el sistema

Como Soporte TI, quiero indicar desde el sistema la IP, el puerto y la clave del reloj, y pedir pruebas, para no tener que abrir la pantalla de la app puente en el computador del colegio.

### Escenario: Configurar la conexión del reloj

```gherkin
Dado que existe un reloj biométrico registrado
Cuando guardo su IP, puerto, clave de comunicación e intervalo de lectura en Configuración
Entonces el sistema muestra "Configuración del reloj guardada. La app puente la tomará en su próxima comunicación."
Y la app puente descarga esos datos en su siguiente aviso
```

### Escenario: Probar, leer o sincronizar el reloj desde el sistema

```gherkin
Dado que el reloj tiene IP guardada
Cuando pido "Probar conexión con el reloj"
Entonces el sistema deja una orden para la app puente y muestra su resultado cuando la app lo informa
Y si la app no responde en 3 minutos muestra "La app puente no respondió a tiempo. Verifique que esté encendida y con internet."
```

### Escenario: Probar sin IP guardada

```gherkin
Dado que el reloj no tiene IP guardada
Cuando pido una prueba
Entonces el sistema muestra "Primero guarde la IP del reloj."
```

## Reglas de validación y negocio (resumen)

- **Reloj:** uno solo, tipo `biometrico`, número de serie obligatorio y único, registrado y activo para ser aceptado. Solo docentes.
- **Código biométrico:** único por persona; vincula la marcación del reloj con la persona.
- **Huellas:** nunca se guardan en el sistema.
- **Qué marca cada docente:** entrada y salida automáticas, asignadas por la hora de la marca (se ignora el botón del reloj) (v2.0).
- **Resultado:** igual que `RF-010`, según el turno de su tipo.
- **Lectura:** la app puente lee el reloj por la red local y envía al servidor; el servidor nunca se conecta al reloj.
- **Compatibilidad:** línea ZKTeco (protocolo estándar); el cambio de reloj solo actualiza serie e IP.
- **Hora:** la del reloj para el biométrico, que la app pone en hora con el servidor (Lima); alerta por desfase.
- **Duplicados:** no se guarda dos veces la misma marcación; una entrada por día. Una marca de otra vía (kiosko, manual o reloj) a menos de _N_ minutos de una existente se toma como la misma asistencia y no se guarda; queda en la bitácora (v2.0).
- **Pendientes:** ID desconocido o persona que no es docente activo va a la bandeja; se asignan o descartan con motivo.
- **Estado:** última comunicación de la app y del reloj visible; alerta si alguno no responde.
- **Alcance del reloj:** solo entrada y salida del colegio de docentes; no firma sesiones.
- **Auditoría:** todo cambio y todo rechazo en la bitácora (`RF-003`).

## Anexos y Prototipo Interactivo

- **Esquema de funcionamiento:** Reloj ZKTeco → (red local, puerto 4370) → **App puente** en un computador del colegio → (internet, HTTPS, clave de la app) → **API del SGA** → tabla de marcaciones (origen `biometrico`) y bandeja de pendientes.
- **Qué debe hacer la app puente:** leer marcaciones nuevas desde su último punto leído; enviarlas en lote con reintentos y cola local; ponerlas en hora con el servidor; enviar el latido con el estado del reloj; no borrar las marcaciones del reloj. Debe correr como servicio en el computador (que se inicie solo al encender).
- **Contrato con el servidor (a definir en el diseño técnico):** un envío por lote con el número de serie, el código biométrico y la fecha y hora de cada marcación, y un envío de latido; ambos con la clave de la app; el servidor responde qué marcaciones aceptó para que la app no las reenvíe.
- Pantallas previstas: Equipos (número de serie, clave de la app y estado de la app/reloj) · Personas (código biométrico) · Bandeja de marcaciones pendientes · Alertas en "Marcaciones de hoy".
