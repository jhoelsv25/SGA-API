# Estado de la orquestación — 2026-10-14 00:35 (RF-012 COMPLETADO, pendiente de revisión y push del usuario)
**Plan:** TAREAS/_archivo_RF012/00_plan_RF012.md (VALIDADO 2026-10-13; orden «inicia el desarrollo» recibida 2026-10-13).
**Rama (SGA-API y SGA-WEB):** feat/rf-012-supervision-ausencias-docente — solo commits locales, sin push, sin merge.
**Cambio de método acordado con el usuario (2026-10-14):** la prueba en navegador (T10) y el cierre de documentación (T11) los hizo Claude directamente, sin agy; los `agy` de T10/T10b/T11a se detuvieron por PID.

## Commits locales
SGA-API: d7b3d6c T01 · 23896f0 T02 · f88db6a T03 · ff3003c T04 · 23748e7 T05 · d70f966 fix DI · e5ae050 T06 · 4ca1619 prueba en navegador y evidencias · 7d5650d backlog y P-32.
SGA-WEB: 8190dac W01 · 01c79d2 W02 · 0aac455 W03 · d3ce5c4 W04 · 05f7705 W05.
**Verificación final:** API `verificar_tarea.sh --suite-completa` OK (69/69 suites, 660/660 pruebas); WEB `typecheck`, `lint` y `build` OK. Prueba en navegador real: 25/25 escenarios.
**BD de desarrollo:** migración 0011 y menús de RF-012 aplicados; todos los datos de prueba RF012 y sus fotos borrados.

## Propuestas (R3) para el usuario
1. `getMenuRoutes` entrega todos los menús a los roles `es_sistema`, pero el servidor autoriza por `rol_menus` (el Docente ve «Ausencias docentes» y recibe 403).
2. La API corre en UTC: desde las 19:00 de Lima «hoy» ya es el día siguiente.
3. Las pruebas unitarias del registro de ausencias escriben fotos reales en `uploads/ausencias/` (simular `fs`).
4. Controles de 32 px en las miniaturas de fotos y `text-white` fijo sobre el velo; las páginas de RF-012 importan por subcarpeta y no por el barril raíz.
5. Duda de política P-32 (quién anula una ausencia docente).
6. Para el próximo RF: lanzar los `agy` de a 2-3 (la cuota y la memoria se agotaron antes) y recordar que `.agents/memory/*` y `.agents/skills/orquestar-con-agy-p/` están sin versionar.

## Ajenos al plan (R12)
`.agents/skills/orquestar-con-agy-p/` y `.agents/memory/*` sin versionar en SGA-API; `TAREAS/` archivada por RF (git muestra como borrados los archivos de TAREAS/ que el usuario había versionado antes). Los `agy` interactivos del usuario no son míos y no se tocaron.
**Próxima acción:** el usuario revisa, hace el push de las dos ramas e integra (merge/PR) cuando quiera.
