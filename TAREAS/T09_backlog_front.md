# T09 — Backlog: avance del Front % del RF-008 y pendiente de los apoderados

Capa: documentación. Se ejecuta en SGA-API (el backlog vive aquí). Depende de: W01–W05 commiteadas en SGA-WEB.

## Objetivo
Actualizar el avance de la capa Front del RF-008 en `docs/00-Plan-y-Backlog-RF.md` siguiendo la skill, y anotar en `docs/requerimientos/PENDIENTES.md` el pendiente que dejó el frontend.

## Contexto (leer completo)
- Skill del backlog (seguir los pasos 1 a 5, aplicados a la capa **Front**; la versión de SGA-WEB es la de referencia): /home/heverlima/DEV_LINUX/Tesis/SGA-WEB/.agents/skills/actualizar-backlog-rf/SKILL.md (SOLO LECTURA) y /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/actualizar-backlog-rf/SKILL.md
- RF: /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Código del frontend (SOLO LECTURA): /home/heverlima/DEV_LINUX/Tesis/SGA-WEB/features/{secciones,carga-academica,horarios,mi-horario}, /home/heverlima/DEV_LINUX/Tesis/SGA-WEB/app/admin/{secciones,horarios,mi-horario,docentes}, y los informes `/home/heverlima/DEV_LINUX/Tesis/SGA-WEB/TAREAS/W0{1,2,3,4,5}_informe.md` (matriz escenario → pantalla).

## Archivos permitidos
- `docs/00-Plan-y-Backlog-RF.md`
- `docs/requerimientos/PENDIENTES.md` (solo agregar filas; no cambiar las existentes)
Prohibido: cualquier otro archivo, y escribir en SGA-WEB.

## Qué hacer
1. Cuenta los escenarios del RF-008 que aplican a la capa **Front** (los de presentación e interacción) y cuáles están implementados y verificados en el frontend. «Verificado» en SGA-WEB significa: typecheck, lint y build limpios y comprobado en el código por los validadores (SGA-WEB no tiene ejecutor de pruebas automáticas: dilo así en la nota del registro). Un escenario sin cubrir (por ejemplo, el apoderado que no puede elegir a sus estudiantes) NO suma.
2. Actualiza SOLO la columna **Front %** y el **Estado** de la fila RF-008, el promedio Front del resumen (recalcúlalo con las 20 filas), agrega una fila ARRIBA del *Registro de avance* y la fecha de «Última actualización» (`2026-10-09`). No toques Back %.
3. En `PENDIENTES.md` agrega al final una fila nueva (siguiente P-XX libre), estado `Pendiente`, RF `RF-008`: «El apoderado debe ver el horario de la sección de sus estudiantes, pero hoy no existe una consulta para listar los estudiantes vinculados al apoderado que inició sesión; la pantalla "Mi horario" no puede mostrarle ninguno. ¿Se agrega esa consulta en la API?» (A quién: Dirección / equipo de desarrollo; Supuesto: la pantalla informa que aún no está disponible).
4. Muestra en tu informe la lista de escenarios contados.

## Criterios de aceptación (medibles)
- `git diff --stat` solo muestra los 2 archivos permitidos.
- El promedio Front del resumen coincide con el recálculo manual de las 20 filas.
- Sin cambios en filas existentes de PENDIENTES.md.

## Skills obligatorias
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/actualizar-backlog-rf/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/idioma_español.md
Si una instrucción contradice una skill, manda la skill: detente y repórtalo.

## Informe
TAREAS/T09_informe.md (lista de escenarios, recálculo, `## Commit propuesto` `docs(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
