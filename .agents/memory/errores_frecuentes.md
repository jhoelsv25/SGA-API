# Errores frecuentes (hallazgos que provocaron un RECHAZO)

| Fecha | Tarea | Capa | Error | Regla/skill incumplida | Cómo evitarlo |
|---|---|---|---|---|---|
| 2026-10-09 | T05 | backend | `obtenerHorasPlanPorDefecto` deducía las horas del plan por el nombre del curso (`matem`→6, resto→6) y dividía por un 45 fijo, en vez de leer `plan_estudios` y la variable `jornada.minutos_hora_pedagogica`; los 3 VAL lo dejaron como «baja/media» | RF-008 (horas del plan), regla «no inventar reglas de negocio» | Todo valor de negocio sale de la BD o de una variable; nunca de literales ni de nombres. Los VAL lo marcan **alta**. Una prueba que no da fuente del dato se corrige antes, no se pasa con un truco |
| 2026-10-09 | T04 | backend | `2700` (45 min) fijo en la subconsulta de `horasHorario` | variable configurable `jornada.minutos_hora_pedagogica` | Leer la variable; pendiente de corregir en T04 (ver informe) |
