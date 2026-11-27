# Casos de prueba — RF-010: Marcación y Asistencia de Estudiantes

**Fuente:** [`RF-010` V7](../../../requerimientos/RF-010_Marcacion_y_Asistencia_de_Estudiantes/V7/RF-010_Marcacion_y_Asistencia_de_Estudiantes.md) · **Total de casos:** 26

> Generados desde los escenarios Gherkin. Si el RF cambia de versión, regenerar y conservar las ejecuciones anteriores.

| ID          | HU  | Escenario                                                            | Precondición (Dado)                                                                                                                                       | Acción (Cuando)                                                                                         | Resultado esperado (Entonces)                                                                                                                                      | Capa         |
| ----------- | --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| CP-RF010-01 | HU1 | Estudiante marca su entrada a tiempo                                 | que el turno de estudiantes es a las 07:45 con 10 minutos de tolerancia y estoy en el Kiosko Estudiantes                                                  | leo mi QR e ingreso mi PIN a las 07:52                                                                  | el sistema registra mi entrada como `puntual` y muestra "Bienvenido(a), [Nombre]. Entrada registrada a las 07:52."                                                 | Back + Front |
| CP-RF010-02 | HU1 | Estudiante llega tarde                                               | el mismo turno                                                                                                                                            | marco a las 08:05                                                                                       | el sistema registra mi entrada como `tardanza` con 10 minutos y muestra "[Nombre], entrada registrada a las 08:05 con 10 minutos de tardanza."                     | Back + Front |
| CP-RF010-03 | HU1 | Estudiante marca dos veces                                           | que ya marqué mi entrada hoy a las 07:52                                                                                                                  | vuelvo a marcar                                                                                         | el sistema no registra nada y muestra "Ya registró su entrada hoy a las 07:52."                                                                                    | Back + Front |
| CP-RF010-04 | HU1 | Docente marca entrada y salida                                       | que soy docente y ya marqué mi entrada hoy                                                                                                                | marco a las 14:03 en el Kiosko Personal                                                                 | el sistema registra mi salida y muestra "Hasta luego, [Nombre]. Salida registrada a las 14:03."                                                                    | Back + Front |
| CP-RF010-05 | HU1 | Salida anticipada                                                    | que la salida oficial de docentes es 14:00                                                                                                                | marco mi salida a las 12:45                                                                             | el sistema la registra como `salida_anticipada`.                                                                                                                   | Back + Front |
| CP-RF010-06 | HU1 | Marcación fuera de horario                                           | que la ventana de entrada de estudiantes termina a las 09:30                                                                                              | un estudiante marca a las 10:15                                                                         | el sistema la registra como `fuera_de_turno` y muestra "Marcación registrada fuera del horario permitido."                                                         | Back + Front |
| CP-RF010-07 | HU1 | PIN incorrecto                                                       | que estoy en un kiosko                                                                                                                                    | leo mi QR e ingreso un PIN equivocado                                                                   | el sistema no registra nada y muestra "Código o PIN incorrecto."                                                                                                   | Back + Front |
| CP-RF010-08 | HU1 | Credencial anulada                                                   | que mi credencial fue anulada por pérdida del carné                                                                                                       | intento marcar con ella                                                                                 | el sistema no registra nada y muestra "Su credencial no está activa. Acérquese a secretaría."                                                                      | Back + Front |
| CP-RF010-09 | HU1 | Kiosko equivocado                                                    | que soy estudiante                                                                                                                                        | intento marcar en el Kiosko Personal                                                                    | el sistema no registra nada y muestra "Este kiosko no es para su tipo de usuario."                                                                                 | Back + Front |
| CP-RF010-10 | HU1 | Estudiante sin matrícula vigente                                     | que el estudiante fue retirado                                                                                                                            | intenta marcar                                                                                          | el sistema no registra nada y muestra "No tiene matrícula vigente. Acérquese a secretaría."                                                                        | Back + Front |
| CP-RF010-11 | HU1 | Sin conexión                                                         | que el kiosko perdió la conexión con el servidor                                                                                                          | alguien intenta marcar                                                                                  | el kiosko no registra nada y muestra "Sin conexión. Avise a secretaría para registrar su marcación."                                                               | Back + Front |
| CP-RF010-12 | HU2 | Registrar una marcación manual                                       | que el Kiosko Estudiantes falló de 07:40 a 08:00                                                                                                          | registro la entrada de un estudiante con hora 07:50 y la observación "Kiosko sin conexión"              | el sistema la guarda como `manual`, calcula su resultado con esa hora y la registra en la bitácora.                                                                | Back + Front |
| CP-RF010-13 | HU2 | Marcación manual sin observación                                     | que estoy registrando una marcación manual                                                                                                                | intento guardar sin observación                                                                         | el sistema impide guardar y muestra "Indique el motivo de la marcación manual."                                                                                    | Back + Front |
| CP-RF010-14 | HU2 | Justificar una tardanza                                              | que un docente tiene una tardanza hoy                                                                                                                     | el Subdirector la justifica con el motivo "Cita médica con constancia"                                  | la marcación conserva el resultado `tardanza`, queda marcada como justificada con quién y cuándo la justificó.                                                     | Back + Front |
| CP-RF010-15 | HU2 | Panel del día                                                        | que soy Subdirector                                                                                                                                       | abro "Marcaciones de hoy"                                                                               | el sistema muestra en vivo quién marcó, a qué hora y con qué resultado, el total de tardanzas, y quiénes aún no han marcado, separados por estudiantes y personal. | Back + Front |
| CP-RF010-16 | HU3 | Tomar asistencia                                                     | que firmé el ingreso de mi sesión de Matemática en 5.° A                                                                                                  | abro "Asistencia", marco a 2 estudiantes con `tardanza` y a 1 con `falta`, y guardo                     | el sistema guarda al resto como `presente` y muestra "Asistencia guardada: 30 presentes, 2 tardanzas, 1 falta."                                                    | Back + Front |
| CP-RF010-17 | HU3 | Estudiantes que no marcaron en la puerta                             | que 2 estudiantes de 5.° A no marcaron entrada hoy                                                                                                        | abro la lista de asistencia                                                                             | el sistema los señala con "No marcó ingreso", pero los deja en `presente` hasta que yo decida.                                                                     | Back + Front |
| CP-RF010-18 | HU3 | Corregir la asistencia el mismo día                                  | que guardé la asistencia de la sesión de hoy                                                                                                              | cambio una `falta` a `presente` y guardo                                                                | el sistema actualiza la asistencia y registra el cambio en la bitácora.                                                                                            | Back + Front |
| CP-RF010-19 | HU3 | Asistencia fuera de plazo                                            | que la sesión es de ayer o su bimestre está cerrado                                                                                                       | intento modificar su asistencia                                                                         | el sistema bloquea la acción y muestra "La asistencia de esta sesión ya no se puede modificar."                                                                    | Back + Front |
| CP-RF010-20 | HU3 | Asistencia de una sesión ajena                                       | que la sesión la dicta otro docente                                                                                                                       | intento tomar su asistencia                                                                             | el sistema bloquea la acción y muestra "Solo el docente que dicta la sesión puede tomar su asistencia."                                                            | Back + Front |
| CP-RF010-21 | HU3 | Estudiante retirado                                                  | que un estudiante de 5.° A se retiró ayer                                                                                                                 | abro la lista de asistencia de hoy                                                                      | el estudiante no aparece en la lista.                                                                                                                              | Back + Front |
| CP-RF010-22 | HU3 | Justificar una falta                                                 | que un estudiante tiene `falta` en Matemática                                                                                                             | la Secretaria la cambia a `falta_justificada` con el motivo "Certificado médico" y adjunta el documento | el sistema guarda la justificación con quién la registró.                                                                                                          | Back + Front |
| CP-RF010-23 | HU4 | Apoderado consulta la asistencia                                     | que soy apoderado de un estudiante de 5.° A                                                                                                               | abro "Asistencia" y elijo el bimestre                                                                   | el sistema muestra sus entradas al colegio (con tardanzas y faltas al colegio) y su asistencia por curso, con totales.                                             | Back + Front |
| CP-RF010-24 | HU4 | Falta al colegio                                                     | que el 12/05/2027 hubo clases y el estudiante no marcó entrada                                                                                            | consulto su asistencia                                                                                  | ese día aparece como "Falta al colegio".                                                                                                                           | Back + Front |
| CP-RF010-25 | HU4 | Tutor consulta su sección                                            | que soy tutor de 5.° A                                                                                                                                    | abro "Asistencia de mi sección"                                                                         | el sistema muestra, por estudiante, sus faltas y tardanzas al colegio y por curso en el rango elegido.                                                             | Back + Front |
| CP-RF010-26 | HU1 | Docente marca en el kiosko poco después de marcar en otra vía (v2.0) | que soy docente y ya marqué mi entrada hoy a las 07:30 en el reloj biométrico (o Secretaría la registró a mano) y la variable de minutos entre vías es 30 | marco a las 07:40 en el Kiosko Personal                                                                 | el sistema no registra una salida y muestra "Ya tiene una marcación registrada a las 07:30."                                                                       | Back + Front |

## Casos de la versión nueva (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| Vuelve a marcar después de su salida (v3.0) | `marcaciones.service.spec.ts` y mezcla M6 (base desechable) | Pasa |
| Marca intermedia (v3.0) | `registrar-desde-reloj.spec.ts` y mezcla M6 | Pasa |
| Una sola marca por la tarde (v3.0) | `decidir-marca.util.spec.ts` y mezcla M14 | Pasa |
| Manual: salida más tarde / hora que no mejora (v3.0) | Mezcla M15 (base desechable) | Pasa |
| El kiosko dice el nombre (v3.0) | Chrome con datos y voz simulados | Pasa; falta oírlo en el equipo del colegio |

## Casos de la versión 4.0 (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| Docente con clases / sin clases (v4.0) | `turno-horario.util.spec.ts` y e2e T1–T3 (base desechable) | Pasa |
| Control de un día anterior; todavía no es su hora (v4.0) | `control-diario.service.spec.ts`, e2e T4, lectura en Supabase de pruebas y Chrome con datos simulados | Pasa |
| Detalle y mes de una persona (v4.0) | e2e T4 y Chrome (escritorio y móvil, claro y oscuro) con datos simulados | Pasa; falta revisarlo con sesión real |

## Casos de la versión 5.0 (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| Por defecto vale el horario del Reglamento Interno (v5.0) | `control-diario.service.spec.ts` y e2e T0 | Pasa |
| Horario según clases activado (v4.0, condición nueva) | e2e T1–T4 | Pasa |

## Casos de la versión 6.0 (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| Marcación del personal en semana de gestión | `registrar-desde-reloj.spec.ts` (reloj) y `control-diario.service.spec.ts`; kiosko y manual usan la misma función, sin prueba propia | Pasa |

## Casos de la versión 7.0 (2026-11-26)

| Escenario | Verificado con | Resultado |
|---|---|---|
| El kiosko lee dos veces seguidas | `marcaciones.service.spec.ts` (fallaba antes de corregir), e2e en base desechable y `marcaciones-vias.e2e-spec.ts` | Pasa |
| Envíos simultáneos o casi simultáneos al kiosko | e2e en base desechable: 60 pares con 0 a 55 ms de diferencia | Pasa |
| Salida pasado el plazo de doble lectura | unitarias y e2e | Pasa |

## Docente con ficha de estudiante dada de baja (2026-11-26)

| Comprobación | Resultado |
|---|---|
| Antes de corregir (base desechable) | El kiosko respondía 403 y la persona no salía en el control diario ni en el reporte a la UGEL |
| Después: marca en el kiosko como docente y figura en control diario, reporte y panel como personal | Pasa (`marcaciones-vias.e2e-spec.ts`) |
| Estudiante activo o retirado sin trabajo en el colegio sigue contando como estudiante | Pasa (misma prueba) |

No se probó por separado a un exalumno con cargo administrativo.

## Semana de gestión y límite del kiosko (2026-11-26)

Base desechable, con la hora del servidor simulada en los casos de la semana de gestión.

| Comprobación | Resultado |
|---|---|
| Semana de gestión: kiosko evalúa puntualidad, tardanza y salida anticipada | Pasa |
| Semana de gestión: marcación manual y reloj se evalúan igual | Pasa |
| Feriado: las marcas quedan «fuera_de_turno», sin tardanza ni salida anticipada | Pasa |
| Límite del kiosko a 4 peticiones por segundo | 60 pasan; la 61 responde 429 |

Al kiosko también se le aplican los límites generales de 10 por segundo y 50 cada 10 segundos, todos por IP.
