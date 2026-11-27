# RF-005: Año Escolar y Calendario

**Proyecto:** SGA Colegio — Sistema de Gestión Académica
**Módulo:** Portal Web — Estructura académica
**Versión:** 2.0
**Fecha:** actualización v2.0: 2026-11-26
**BA responsable:** Hever Lima
**Prioridad:** Alta | **Complejidad:** Media | **Esfuerzo estimado:** 8 hh (IA Agéntica)
**Prerrequisitos:** `RF-002` (permisos de Administrador y Director).

> **Cambios de la versión 2.0 sobre la 1.0 (aprobado por el responsable, 2026-11-26):**
>
> - Un evento que suspende clases puede indicar **«El personal trabaja»**: separa los días sin clases de los días no laborables para docentes y auxiliares. Sustento: RM 239-2025-MINEDU (semanas de gestión, presenciales o virtuales, dentro de la jornada laboral).

## Consideraciones y supuestos de negocio

- **Propósito.** Definir el año escolar, sus cuatro bimestres y los días sin clases. Todo lo demás depende de esto: las sesiones de clase (`RF-011`), las libretas (`RF-014`), el consolidado docente (`RF-013`) y los indicadores (`RF-020`) se calculan por bimestre.
- **Año escolar.** Se identifica por su año (por ejemplo, 2027), con fecha de inicio, fecha de fin (posterior al inicio) y, opcionalmente, su denominación oficial ("Año del…"). No puede haber dos años escolares con el mismo número.
- **Cuatro bimestres.** Al crear el año, el sistema propone los bimestres **I, II, III y IV** para completar sus fechas. Reglas:
  - Cada bimestre tiene fecha de inicio y de fin, con el fin posterior al inicio.
  - Todos quedan dentro de las fechas del año escolar.
  - Son consecutivos y no se superponen: el II empieza después de que termina el I, y así sucesivamente. Entre bimestres puede haber días de vacaciones.
  - Un año escolar no se puede iniciar sin sus 4 bimestres con fechas.
- **Estados del año.**

  | Acción              | Desde                    | Hacia       | Condición                                          |
  | ------------------- | ------------------------ | ----------- | -------------------------------------------------- |
  | Iniciar             | `planificado`            | `en_curso`  | Tiene sus 4 bimestres y no hay otro año `en_curso` |
  | Cerrar              | `en_curso` / `reabierto` | `cerrado`   | Sus 4 bimestres están cerrados                     |
  | Reabrir             | `cerrado`                | `reabierto` | Motivo y fecha límite obligatorios                 |
  | Vence la reapertura | `reabierto`              | `cerrado`   | Automático al pasar la fecha límite                |

- **Un solo año en curso.** Solo un año puede estar `en_curso` a la vez. Es el que usa el sistema por defecto en todas las pantallas.
- **Estados del bimestre.** `planificado` → `en_curso` → `cerrado`. Solo un bimestre puede estar `en_curso`, y se inician en orden: no se puede iniciar el III sin haber cerrado el II.
- **Qué bloquea el cierre de un bimestre.** Al cerrar un bimestre ya no se pueden registrar ni modificar las sesiones de clase ni las ausencias de sus fechas (`RF-011`, `RF-012`). La carga de libretas y el consolidado docente siguen disponibles hasta que se cierre el año.
- **Reapertura.** Solo el Administrador puede reabrir un año cerrado, indicando el motivo y hasta qué fecha queda abierto. Al vencer esa fecha, el año vuelve a `cerrado` solo.
- **Calendario de eventos.** Feriados, suspensiones, jornadas pedagógicas, reuniones, actividades y exámenes, cada uno con título, tipo, fecha de inicio y fin (fin ≥ inicio) y descripción opcional.
- **Días sin clases.** Un evento marcado como **"Suspende clases"** (por defecto en feriados, suspensiones y jornadas pedagógicas) hace que ese día no se generen sesiones de clase (`RF-011`) y no cuente como sesión planificada en el CSP (`RF-020`).
- **Evento registrado después.** Si se registra una suspensión para una fecha que ya tiene sesiones generadas, el sistema elimina las sesiones **pendientes** de esa fecha. Las que ya tienen firma se conservan.
- **Quién gestiona.** Año y bimestres: el Administrador. Calendario de eventos: la decisión de suspender clases es del Director, pero la registra **cualquier perfil que tenga el permiso** `calendario.registrar` (por defecto, Administrador y Director; el Administrador puede dárselo a otro perfil, como Secretaria o Subdirector, en `RF-002`). Todos los usuarios pueden ver el calendario.
- **Operación 100% en línea.**
- **Auditoría inmutable.** Crear o editar años, bimestres y eventos, y cada cambio de estado, queda en la bitácora (`RF-003`).

## Mensajes del requerimiento

| Situación                        | Mensaje                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Año repetido                     | "Ya existe el año escolar 2027."                                                               |
| Fechas invertidas                | "La fecha de fin debe ser posterior a la fecha de inicio."                                     |
| Bimestre fuera del año           | "Las fechas del bimestre deben estar dentro del año escolar."                                  |
| Bimestres superpuestos           | "El bimestre no puede empezar antes de que termine el anterior."                               |
| Año sin bimestres completos      | "Complete las fechas de los 4 bimestres antes de iniciar el año."                              |
| Otro año en curso                | "Ya hay un año escolar en curso. Ciérrelo antes de iniciar otro."                              |
| Bimestre fuera de orden          | "Debe cerrar el bimestre anterior antes de iniciar este."                                      |
| Año con bimestres abiertos       | "No se puede cerrar el año: hay bimestres sin cerrar."                                         |
| Reapertura incompleta            | "Indique el motivo y la fecha límite de la reapertura."                                        |
| Suspensión con sesiones firmadas | "Se eliminaron las sesiones pendientes de esas fechas. Las sesiones ya firmadas se conservan." |

## Requerimientos fuera de alcance (Out of Scope)

- **Generación de las sesiones de clase.** Corresponde a `RF-011`; este RF solo indica qué días no tienen clase.
- **Cálculo del CSP.** Corresponde a `RF-020`.
- **Trimestres o semestres.** El colegio trabaja con 4 bimestres.
- **Recuperación de clases suspendidas.** No se contempla en esta versión.
- **Sincronización con calendarios externos** (Google Calendar, Outlook). No se contempla.

## Acuerdos y puntos abiertos

- **Periodos (acordado).** 4 bimestres por año.
- **Cierre de bimestre (acordado).** Bloquea las sesiones y ausencias de sus fechas.
- **Registro de eventos (acordado).** El Director ordena; lo registra cualquier perfil con el permiso `calendario.registrar`.

## Historia de Usuario 1: Año escolar y bimestres

**Como** Administrador
**Quiero** crear el año escolar con sus cuatro bimestres y controlar su estado
**Para** que todo el sistema trabaje sobre las fechas correctas.

### Escenario: Crear el año escolar

**Dado** que no existe el año 2027
**Cuando** lo creo del 01/03/2027 al 19/12/2027, completo las fechas de los bimestres I al IV y guardo
**Entonces** el sistema crea el año en estado `planificado` con sus 4 bimestres en `planificado`.

### Escenario: Año repetido

**Dado** que ya existe el año 2027
**Cuando** intento crearlo de nuevo
**Entonces** el sistema bloquea el guardado y muestra "Ya existe el año escolar 2027."

### Escenario: Fechas invertidas

**Dado** que estoy registrando un año o un bimestre
**Cuando** la fecha de fin es anterior o igual a la de inicio
**Entonces** el sistema impide guardar y muestra "La fecha de fin debe ser posterior a la fecha de inicio."

### Escenario: Bimestre fuera del año

**Dado** que el año va del 01/03/2027 al 19/12/2027
**Cuando** el bimestre IV termina el 22/12/2027
**Entonces** el sistema impide guardar y muestra "Las fechas del bimestre deben estar dentro del año escolar."

### Escenario: Bimestres superpuestos

**Dado** que el bimestre I termina el 09/05/2027
**Cuando** el bimestre II empieza el 05/05/2027
**Entonces** el sistema impide guardar y muestra "El bimestre no puede empezar antes de que termine el anterior."

### Escenario: Iniciar el año

**Dado** que el año 2027 está `planificado` con sus 4 bimestres y no hay otro año en curso
**Cuando** presiono "Iniciar año" y confirmo
**Entonces** el año pasa a `en_curso`
**Y** el sistema lo usa por defecto en todas las pantallas.

### Escenario: Iniciar el año sin bimestres completos

**Dado** que al año le falta la fecha de un bimestre
**Cuando** presiono "Iniciar año"
**Entonces** el sistema bloquea la acción y muestra "Complete las fechas de los 4 bimestres antes de iniciar el año."

### Escenario: Otro año en curso

**Dado** que el año 2026 sigue `en_curso`
**Cuando** intento iniciar el año 2027
**Entonces** el sistema bloquea la acción y muestra "Ya hay un año escolar en curso. Ciérrelo antes de iniciar otro."

### Escenario: Iniciar y cerrar bimestres en orden

**Dado** que el bimestre I está `cerrado` y el II `planificado`
**Cuando** presiono "Iniciar" en el bimestre II
**Entonces** el bimestre II pasa a `en_curso`.

### Escenario: Bimestre fuera de orden

**Dado** que el bimestre II sigue `en_curso`
**Cuando** intento iniciar el bimestre III
**Entonces** el sistema bloquea la acción y muestra "Debe cerrar el bimestre anterior antes de iniciar este."

### Escenario: Cerrar un bimestre

**Dado** que el bimestre I está `en_curso`
**Cuando** presiono "Cerrar bimestre" y confirmo
**Entonces** el bimestre pasa a `cerrado`
**Y** ya no se pueden registrar ni modificar sesiones de clase ni ausencias de sus fechas.

### Escenario: Cerrar el año con bimestres abiertos

**Dado** que el bimestre IV sigue `en_curso`
**Cuando** intento cerrar el año
**Entonces** el sistema bloquea la acción y muestra "No se puede cerrar el año: hay bimestres sin cerrar."

### Escenario: Reabrir un año cerrado

**Dado** que el año 2026 está `cerrado`
**Cuando** presiono "Reabrir", indico el motivo "Corrección de libretas" y la fecha límite 15/01/2027, y confirmo
**Entonces** el año pasa a `reabierto` hasta esa fecha y la reapertura queda en la bitácora.

### Escenario: Reapertura sin motivo

**Dado** que estoy reabriendo un año
**Cuando** confirmo sin motivo o sin fecha límite
**Entonces** el sistema impide la acción y muestra "Indique el motivo y la fecha límite de la reapertura."

### Escenario: Vence la reapertura

**Dado** que el año 2026 está `reabierto` hasta el 15/01/2027
**Cuando** llega el 16/01/2027
**Entonces** el sistema lo vuelve a `cerrado` automáticamente.

## Historia de Usuario 2: Calendario de eventos

**Como** usuario con el permiso `calendario.registrar` (por encargo del Director)
**Quiero** registrar feriados, suspensiones y actividades del colegio
**Para** que los días sin clase no cuenten como sesiones planificadas y todos conozcan las fechas importantes.

### Escenario: Registrar un feriado

**Dado** que el año 2027 está en curso
**Cuando** registro "Fiestas Patrias", tipo `feriado`, del 28/07/2027 al 29/07/2027, y guardo
**Entonces** el sistema guarda el evento marcado como "Suspende clases"
**Y** en esas fechas no se generan sesiones de clase.

### Escenario: Actividad que no suspende clases

**Dado** que estoy registrando un evento
**Cuando** registro "Reunión de padres", tipo `reunion`, sin marcar "Suspende clases"
**Entonces** el sistema guarda el evento y las sesiones de ese día se generan con normalidad.

### Escenario: Suspensión registrada después

**Dado** que el 10/06/2027 ya tiene sesiones generadas, algunas firmadas
**Cuando** registro una suspensión para el 10/06/2027
**Entonces** el sistema elimina las sesiones pendientes de esa fecha, conserva las firmadas y muestra "Se eliminaron las sesiones pendientes de esas fechas. Las sesiones ya firmadas se conservan."

### Escenario: Fechas del evento invertidas

**Dado** que estoy registrando un evento
**Cuando** la fecha de fin es anterior a la de inicio
**Entonces** el sistema impide guardar y muestra "La fecha de fin debe ser posterior a la fecha de inicio."

### Escenario: Ver el calendario

**Dado** que soy cualquier usuario del sistema
**Cuando** abro "Calendario"
**Entonces** el sistema muestra los eventos del año en curso en vista mensual, con los días sin clases resaltados.

### Escenario: Usuario sin permiso para registrar

**Dado** que mi perfil no tiene el permiso `calendario.registrar`
**Cuando** abro "Calendario"
**Entonces** puedo ver los eventos, pero el sistema no me ofrece registrar, editar ni eliminar.

---

### Escenario: Semana de gestión sin clases en la que el personal trabaja (v2.0)

**Dado** que registro un evento que suspende clases
**Cuando** marco «El personal trabaja» y guardo
**Entonces** esos días no generan sesiones de clase
**Y** docentes y auxiliares siguen debiendo asistir (`RF-010`, `RF-025`)
**Y** los estudiantes no.

### Escenario: Solo aplica a eventos que suspenden clases (v2.0)

**Dado** un evento que no suspende clases
**Cuando** lo registro o le quito «Suspende clases»
**Entonces** la opción «El personal trabaja» no se ofrece y queda desactivada.

### Escenario: Feriado dentro de una semana de gestión (v2.0)

**Dado** una semana con «El personal trabaja»
**Y** que uno de sus días tiene además un evento que suspende clases sin esa opción
**Cuando** se evalúa la asistencia del personal
**Entonces** ese día no es laborable.


## Reglas de validación y negocio (resumen)

- **Año:** número único; fin posterior al inicio; un solo año `en_curso`; para iniciarlo necesita sus 4 bimestres con fechas.
- **Bimestres:** exactamente 4 (I a IV); dentro del año; consecutivos y sin superponerse; se inician en orden; solo uno `en_curso`.
- **Estados del año:** `planificado` → `en_curso` → `cerrado` ↔ `reabierto` (con motivo y fecha límite; vuelve solo a `cerrado` al vencer).
- **Cierre de bimestre:** bloquea sesiones y ausencias de sus fechas; libretas y consolidado siguen abiertos hasta el cierre del año.
- **Eventos:** fin ≥ inicio; "Suspende clases" activo por defecto en feriados, suspensiones y jornadas pedagógicas.
- **Efecto en sesiones:** los días que suspenden clases no generan sesiones; una suspensión posterior elimina solo las sesiones pendientes.
- **Permisos:** año y bimestres, el Administrador; eventos, cualquier perfil con `calendario.registrar` (por defecto Administrador y Director); consulta del calendario, todos.
- **Auditoría:** altas, ediciones y cambios de estado (`RF-003`).

## Anexos y Prototipo Interactivo

- 👉 **Prototipo interactivo:** Portal web. Pantallas: Años escolares (listado y formulario con los 4 bimestres) · Calendario (vista mensual y formulario de evento). Escenarios: Año planificado · En curso · Cierre de bimestre · Reapertura · Feriado · Suspensión con sesiones firmadas.
