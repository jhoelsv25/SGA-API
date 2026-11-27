# RF-022: Integración con Biométrico ZKTeco (Marcación por Huella)

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Asistencia — Marcación por biométrico
**Versión:** 4.0
**Fecha:** actualización v4.0: 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Media | **Complejidad:** Media | **Esfuerzo estimado:** Por estimar (depende de la prueba con el reloj real y de la red del colegio)
**Prerrequisitos:** `RF-003` (bitácora), `RF-005` (días con y sin clases), `RF-007` (personas y credenciales), `RF-010` (reglas de marcación), `RF-004` (turnos) y la cuenta de servicio `biometrico` (la crea el seed).

> **Cambios de la versión 4.0 sobre la 3.0 (2026-11-26):**
>
> - **Entrada = primera marca del día; salida = última.** Comprobado con la exportación real del reloj de octubre de 2026: se cumple en 936 de 936 registros diarios por persona.
> - Una marca posterior reemplaza la salida; una intermedia queda rechazada con su motivo. El rebote solo se aplica mientras no hay salida.
> - La pantalla Biométrico explica cómo funciona el marcado.

> **Cambios de la versión 3.0 sobre la 2.0 (2026-11-07):**
>
> - **Programa de escritorio en lugar de la app puente por HTTP.** Un programa de escritorio de Windows (**SGA Biométrico**, proyecto aparte `SGA-NET-BIOMETRICO`) lee el reloj por la red local y **guarda cada marcación cruda directamente en la base de datos** (`marcaciones_biometricas`). Ya no hay envío por API, latido ni órdenes al reloj desde el sistema.
> - **El SGA convierte las marcas crudas en asistencia.** Cuando el programa del reloj termina una sincronización (tarea programada de Windows o botón «Sincronizar») avisa con `NOTIFY biometrico_procesar` y el servidor convierte en ese momento las marcas pendientes con las reglas de `RF-010`. No hay revisión periódica.
> - **Se eliminan** el registro del reloj como equipo de tipo `biometrico`, la clave de la app, la configuración remota del reloj (IP, puerto, órdenes de prueba), el estado y las alertas de la app/reloj, el desfase de hora alertado por el servidor y la bandeja de marcaciones pendientes. Una marca que no se puede convertir queda **rechazada** con su motivo en la misma tabla.
> - **Aprobación del equipo.** El programa usa la cuenta de servicio `biometrico` y queda «Esperando aprobación» hasta que el administrador lo aprueba en Configuración → Biométrico.

## Consideraciones y supuestos de negocio

- **Propósito.** Añadir el reloj biométrico de huella ZKTeco como **otro método de marcación de asistencia al colegio**, junto al kiosko (código/QR + PIN) y la marcación manual (`RF-010`). El docente pone el dedo y su marcación aparece en el sistema sin que nadie la registre a mano.
- **Quién marca con el reloj (acordado).** **Solo los docentes**. Los estudiantes siguen en el kiosko. **Un solo reloj**, solo entrada y salida del colegio.
- **Compatible con la línea ZKTeco.** Modelo confirmado: **ZKTeco MB20-VL/ID**. Falta la prueba real de lectura por red con el equipo (P-37). Este RF usa únicamente la **huella**.
- **Una sola asistencia, varios orígenes.** Las marcaciones del reloj se guardan en `marcaciones` con origen `biometrico`; el panel "Marcaciones de hoy", la falta al colegio, los indicadores, etc. las toman sin cambios.
- **Mismas reglas de `RF-010`.** El reloj solo aporta **quién** y **a qué hora**:
  - Entrada y salida asignadas por la **hora de la marca**: la más temprana del día = entrada y la **última** = salida (v4.0). Una sola marca es entrada. El botón entrada/salida del reloj se ignora.
  - Resultado `puntual`, `tardanza`, `salida_anticipada` o `fuera_de_turno` según el turno del personal.
  - Una entrada y una salida por día; las marcas intermedias no cuentan (v4.0). La persona debe ser personal vigente (docente o administrativo).
  - **Rebote del dedo:** mientras no haya salida, una segunda marca dentro de `biometrico.minutos_antirrebote` (5 por defecto) se ignora (P-42; v4.0).
- **Misma asistencia por dos vías (P-44).** Si ya existe una marcación del docente **de otra vía** a menos de `marcacion.minutos_duplicado_entre_vias` (30 por defecto; 0 la desactiva), la marca nueva es la misma asistencia: no se guarda y queda rastro en la bitácora. La marcación manual no se descarta, pero cuenta como otra vía.
- **Entrada y salida por la hora de la marca.** Si llega una marca anterior a la entrada ya guardada (por ejemplo, un lote atrasado), pasa a ser la entrada y la guardada se convierte en salida; el cambio queda en la bitácora.
- **Cómo llegan las marcaciones.** El programa **SGA Biométrico**, en un computador del colegio **en la misma red que el reloj**, lee las marcaciones por red (SDK de ZKTeco, puerto 4370) y las inserta en `marcaciones_biometricas` (serie del reloj, código de usuario, fecha y hora). Se conecta a la base con un rol de **mínimo privilegio** (solo insertar marcas y pedir la aprobación del equipo) y conexión cifrada. El servidor **nunca se conecta al reloj**.
- **Vínculo persona ↔ huella.** Cada docente tiene en el reloj un **ID de usuario**; en el sistema se le asigna el mismo ID como **código biométrico** (único por persona). El sistema **no guarda huellas ni plantillas**, solo el ID y la marcación (Ley N.° 29733).
- **Hora de la marcación.** La hora válida es la del reloj (P-36). Si el programa no pudo guardar de inmediato (sin internet), conserva la cola y reintenta; el servidor procesa por hora de marca.
- **Sin duplicados.** La misma marca (reloj, código y hora) no se guarda dos veces, aunque el programa la reenvíe.
- **Marcas que no se pueden convertir.** Queda **rechazada**, con su motivo, en `marcaciones_biometricas`: código sin persona, persona no vigente, persona que no es personal (estudiante), rebote, duplicada o intermedia (v4.0). Una marca sin turno configurado **queda pendiente** hasta que exista el turno.
- **Quién configura.** Soporte TI y Administrador configuran el programa a mano (IP y puerto del reloj, clave de comunicación, datos de la base) y aprueban el equipo. Asignar códigos biométricos: **Soporte TI**, **Administrador** y **Secretaria**.
- **Cambio de reloj.** Se enrolan las huellas en el reloj nuevo con los **mismos ID** y se cambia la IP en el programa. Las marcaciones anteriores y los códigos se conservan.
- **Qué NO reemplaza.** El kiosko y la marcación manual siguen funcionando. El kiosko de sesiones (`RF-011`) no cambia.
- **Datos personales.** Es información biométrica de empleados: el colegio debe contar con su consentimiento (P-40).
- **Auditoría inmutable.** Quedan en la bitácora (`RF-003`): asignación y cambio de códigos biométricos y marcas descartadas por coincidir con otra vía. Las marcas crudas conservan su estado, motivo y fecha de proceso.

## Mensajes del requerimiento

| Situación                           | Mensaje                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Código biométrico asignado          | "Código biométrico asignado a [Nombre]."                                     |
| Código biométrico quitado           | "Código biométrico quitado a [Nombre]."                                      |
| Código biométrico repetido          | "Ese código biométrico ya pertenece a otra persona."                         |
| Código con formato inválido         | "El código biométrico solo admite letras y números (máximo 20)."             |
| Rechazo: código sin persona         | "El código del reloj no corresponde a ninguna persona."                      |
| Rechazo: persona no vigente         | "La persona no está vigente como docente o personal administrativo."         |
| Rechazo: persona que no es personal | "El reloj biométrico solo registra personal (docentes y administrativos)."   |
| Rechazo: rebote                     | "Se ignoró: segunda marca seguida del mismo dedo (rebote)."                  |
| Rechazo: duplicada                  | "Ya existe una marcación de esta persona a esa misma hora."                  |
| Rechazo: marca intermedia (v4.0)    | "No cuenta: ya hay una entrada anterior y una salida posterior."             |
| Rechazo: coincide con otra vía      | "Ya existe una marcación de esta persona en esa franja, hecha por otra vía." |

## Requerimientos fuera de alcance (Out of Scope)

- Almacenar huellas, plantillas o fotos del reloj. Reconocimiento facial o por tarjeta.
- Control de acceso físico (puerta, torniquete).
- Marcación de estudiantes con el reloj. Firma de sesiones de clase con huella.
- Que el servidor se conecte al reloj o que el reloj envíe solo (_push_/ADMS).
- **Configurar el reloj o dar órdenes (probar, leer, sincronizar) desde el SGA web.** Se hace en el programa de escritorio.
- **Estado y alertas de la app o del reloj en el SGA** (última comunicación, reloj sin respuesta, desfase de hora).
- **Bandeja de marcaciones pendientes con asignar/descartar.** Las marcas no convertibles quedan rechazadas con su motivo.
- Envío de SMS o WhatsApp por la marcación (`RF-019`). Descuentos por tardanza o planillas.
- Instalación del reloj, cableado y red del colegio: labor de soporte técnico.

## Acuerdos y puntos abiertos

- **Acordado con el BA:** línea ZKTeco (P-37); solo docentes y solo entrada/salida (P-39); un solo reloj y configuración manual (P-41); el programa de escritorio inserta directo en la base de datos (2026-11-07).
- **Pendiente de validar con el colegio** (ver `PENDIENTES.md`): P-36 (hora válida), P-37 (prueba real con el MB20-VL/ID), P-38 (computador del colegio para el programa), P-40 (consentimiento), P-42 (minutos de rebote) y P-44 (ventana entre vías, hoy 30 min).

## Historia de Usuario 1: Vincular a las personas con el reloj

**Como** Soporte TI, Administrador o Secretaria
**Quiero** asignar a cada docente su código biométrico y dejar el programa del reloj funcionando
**Para** que las marcaciones del reloj se reconozcan en el sistema.

### Escenario: Asignar el código biométrico a una persona

**Dado** que Pedro Quispe ya enroló su huella en el reloj con el ID `152`
**Cuando** asigno el código biométrico `152` a Pedro en el sistema
**Entonces** el sistema muestra "Código biométrico asignado a Pedro Quispe." y sus marcaciones del reloj se le atribuyen.

### Escenario: Código biométrico repetido

**Dado** que el código `152` ya pertenece a otra persona
**Cuando** intento asignarlo a una segunda persona
**Entonces** el sistema muestra "Ese código biométrico ya pertenece a otra persona." y no guarda el cambio.

### Escenario: Poner en marcha el programa del reloj

**Dado** que el programa SGA Biométrico está configurado con el reloj y la base de datos
**Cuando** lo inicio por primera vez
**Entonces** queda «Esperando aprobación» y no lee ni guarda marcas hasta que el administrador aprueba el equipo en Configuración → Biométrico.

### Escenario: Cambiar el reloj por uno similar

**Dado** que el reloj se dañó y compramos otro de la línea ZKTeco
**Cuando** enrolo las huellas en el reloj nuevo con los mismos ID y actualizo la IP en el programa
**Entonces** las marcaciones siguen atribuyéndose a cada docente y se conserva el historial anterior.

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

### Escenario: Salida anticipada

**Dado** que el turno del personal termina a las 15:00
**Cuando** marco mi salida a las 13:00
**Entonces** el sistema registra la salida como `salida_anticipada`.

### Escenario: Marcación en día sin clases

**Dado** que hoy es feriado o día sin clases (`RF-005`)
**Cuando** marco en el reloj
**Entonces** el sistema registra la marcación como `fuera_de_turno`.

### Escenario: Persona que no es personal vigente

**Dado** que un ID del reloj pertenece a una persona que no es docente ni administrativo vigente
**Cuando** el sistema procesa su marcación
**Entonces** no la registra como asistencia y la marca cruda queda rechazada con su motivo.

### Escenario: Docente marca en el kiosko (o a mano) y luego en el reloj

**Dado** que ya marqué mi entrada hoy a las 07:35 en el kiosko (o la registró Secretaría a mano) y la variable de minutos entre vías es 30
**Cuando** a las 07:55 pongo el dedo en el reloj
**Entonces** el sistema no guarda la marca del reloj como salida porque coincide con mi entrada, y deja el rastro en la bitácora.

### Escenario: Marca atrasada anterior a la entrada ya registrada

**Dado** que mi entrada guardada es de las 09:10 (marcada en el kiosko) y el reloj tenía guardada una marca de las 07:05
**Cuando** el programa guarda esa marca atrasada
**Entonces** el sistema registra mi entrada a las 07:05 y la marca de las 09:10 pasa a ser mi salida, con su resultado recalculado y el cambio en la bitácora.

### Escenario: La última marca es la salida (v4.0)

**Dado** que el reloj entrega para un docente 07:59, 08:00, 09:49 y 18:10
**Cuando** el sistema las procesa
**Entonces** la entrada es 07:59, la salida 18:10 y las demás no cuentan.

### Escenario: Guía de marcado (v4.0)

**Dado** que entro a una pantalla de Biométrico
**Cuando** abro "¿Cómo funciona el marcado?"
**Entonces** veo las reglas de la asistencia y la diferencia entre el reloj, el kiosko de asistencia y el kiosko de sesiones.

## Historia de Usuario 3: Lectura, guardado y confiabilidad

**Como** Soporte TI
**Quiero** que el programa lea el reloj y guarde las marcaciones aunque haya fallas
**Para** no perder asistencia.

### Escenario: El programa lee y guarda las marcaciones

**Dado** que el programa está aprobado y el reloj en la misma red
**Cuando** un docente marca en el reloj
**Entonces** en pocos minutos la marca queda guardada, el sistema la convierte en asistencia y aparece en "Marcaciones de hoy" con origen `biometrico`.

### Escenario: Marcaciones guardadas con retraso

**Dado** que el computador o el internet estuvieron caídos de 07:30 a 09:00 y el reloj guardó 15 marcaciones
**Cuando** el programa se recupera
**Entonces** guarda las marcas pendientes y el sistema las registra con la hora en que se marcó, en orden, aplicando puntual/tardanza según esa hora.

### Escenario: Marcación reenviada

**Dado** que el programa vuelve a guardar una marca ya recibida (mismo reloj, código y hora)
**Cuando** la base la recibe
**Entonces** no la duplica.

### Escenario: Equipo sin aprobar

**Dado** que el administrador no ha aprobado el equipo
**Cuando** el programa intenta funcionar
**Entonces** no lee ni guarda marcas.

## Historia de Usuario 4: Marcas rechazadas

**Como** Soporte TI
**Quiero** ver por qué una marca del reloj no se convirtió en asistencia
**Para** corregir la causa (por ejemplo, asignar un código que faltaba).

### Escenario: Marca con ID desconocido

**Dado** que el reloj registró una marca del ID `300` que no pertenece a nadie
**Cuando** el sistema procesa las marcas
**Entonces** la marca queda rechazada con el motivo "El código del reloj no corresponde a ninguna persona." y no se pierde.

## Reglas de validación y negocio (resumen)

- **Reloj:** uno solo; solo docentes. El equipo del programa se aprueba en Configuración → Biométrico.
- **Código biométrico:** único por persona; vincula la marca con la persona. **Huellas:** nunca se guardan.
- **Entrada/salida:** automáticas: primera marca = entrada, última = salida (v4.0). **Resultado:** igual que `RF-010`.
- **Lectura:** el programa de escritorio lee el reloj por la red local y escribe en la base; el servidor nunca se conecta al reloj.
- **Hora:** la del reloj.
- **Duplicados:** no se guarda dos veces la misma marca; una marca de otra vía a menos de _N_ minutos es la misma asistencia.
- **Marcas no convertibles:** quedan rechazadas con motivo; sin turno, quedan pendientes.
- **Auditoría:** cambios de código y marcas descartadas por otra vía en la bitácora (`RF-003`).

## Anexos y Prototipo Interactivo

- **Esquema:** Reloj ZKTeco → (red local, puerto 4370) → **SGA Biométrico** (PC del colegio) → (PostgreSQL, TLS, rol de mínimo privilegio) → tabla `marcaciones_biometricas` → `NOTIFY biometrico_procesar` al terminar cada sincronización → proceso del SGA-API → `marcaciones` (origen `biometrico`).
- **Tabla `marcaciones_biometricas`:** serie del reloj, código de usuario, fecha y hora, estado (`pendiente`, `procesada`, `rechazada`), motivo de rechazo y marcación resultante. Índice único por (serie, código, hora).
- **Variables del sistema:** `biometrico.minutos_antirrebote` y `marcacion.minutos_duplicado_entre_vias`. Configuración del proceso: `BIOMETRICO_PROCESADOR_ACTIVO` (no hay intervalo: se procesa con cada sincronización).
- Pantallas: Docentes (código biométrico) · "Marcaciones de hoy" · Configuración → Biométrico (horas de sincronización y aprobar el equipo).
