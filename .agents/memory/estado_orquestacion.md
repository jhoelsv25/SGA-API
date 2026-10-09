# Estado de la orquestación — 2026-10-09 (RF-008 COMPLETADO, pendiente de revisión y push del usuario)
**Plan:** /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/00_plan_orden_desarrollo.md (VALIDADO 2026-10-09; orden «inicia el desarrollo» recibida 2026-10-09). Todas las tareas del plan terminadas.
**Rama (SGA-API y SGA-WEB):** feat/rf-008-secciones-carga-horarios — solo commits locales, sin push, sin merge.

**SGA-API (10 commits desde d988aec):** T00 77f9dfe · T01 826d142 · T03 96d3e3e · T04 1719ec7 · T05 caf09b8 · T06 10e78f5 · T07 b3fa121 · T08 18d1477 · harness 649c3ea · T09 3724416. T02 (pruebas primero) sin commit propio: entraron con cada módulo.
**SGA-WEB (5 commits desde 3a67b46):** W01 8324d15 · W04 e001c33 · W02 89ea26c · W03 a4d249a · W05 fa225b5.
**Verificación final:** API `verificar_tarea.sh --suite-completa` OK (319 pruebas); WEB `typecheck`, `lint` y `build` OK.

**Rechazos y reparaciones:** T05 (horas del plan deducidas del nombre del curso y 45 min fijos), W02 (claves de caché sin Año académico, «perfil», tabla monolítica, 40 px, hex) y W03 (horas fijas de jornada, colores de paleta, claves sin año, 28–32 px, archivos de 400 líneas). Detalle en `errores_frecuentes.md`.

**Propuestas (R3) para el informe final y el usuario:**
1. El rol `Subdirector` no existe en ROLES_SEED; los menús ya lo prevén (P-23).
2. No existe el menú «Mi horario» (`/admin/mi-horario`) sembrado en la API: el WEB tiene la ruta y la opción de menú, pero ningún rol salvo el Administrador la ve hasta que se cree ese menú y se asigne en Roles-Menú. Falta una tarea pequeña de seed (Docente, Estudiante, Apoderado).
3. El apoderado no puede elegir a sus estudiantes: falta una consulta en la API (P-24).
4. T04 usa 2700 s (45 min) fijos en `horasHorario`; debería leer `jornada.minutos_hora_pedagogica`.
5. `copiar` horario inserta bloque por bloque sin transacción (copia parcial posible).
6. `horarioDeEstudiante`: lista de exclusión por rol y parámetro que acepta id de estudiante o de persona (el estudiante llama con su personaId; el apoderado con el id del hijo).
7. Un 409 en la asignación de docente abre siempre el diálogo de exceso de jornada (hoy la API solo usa 409 para eso).
8. Las consultas Drizzle nunca se ejecutaron contra Postgres, ni las pantallas contra un navegador: solo mocks, prueba de cableado, typecheck, lint, build y revisión. SGA-WEB no tiene ejecutor de pruebas.
9. Tipos y llamadas mínimas duplicados entre `features/horarios`, `features/mi-horario` y `features/carga-academica` (se hicieron en paralelo).
10. T02 sin commit propio por el hook pre-commit (ver decisiones.md).

**Cambios sin commitear:** este archivo y `.agents/memory/*` si cambió algo; `.claude/` y `TAREAS/` fuera de git.
**Próxima acción:** el usuario revisa, valida en el sistema y hace el push de las dos ramas; integra (merge/PR) cuando quiera.
