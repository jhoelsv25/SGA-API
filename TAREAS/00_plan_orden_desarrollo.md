# Plan de desarrollo — RF-008 Secciones, carga académica y horarios (SGA-API + SGA-WEB)

Estado: VALIDADO — 2026-10-09

- Proyectos: `/home/heverlima/DEV_LINUX/Tesis/SGA-API` (backend) y `/home/heverlima/DEV_LINUX/Tesis/SGA-WEB` (frontend), solo por lo que el RF-008 requiere. Nada más.
- Fuente de verdad (Gherkin): `/home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md`
- Casos de prueba: `/home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/pruebas/casos/RF-008_Secciones_Carga_Academica_y_Horarios/casos-de-prueba.md`
- Rama local (la crea agy, skill `nombre-rama-rf`): `feat/rf-008-secciones-carga-horarios`, con el mismo nombre en SGA-API y SGA-WEB.
- Esquema: las tablas `secciones`, `cursos_seccion` y `horarios` ya existen en Drizzle. No se prevé migración.
- Acceso: consultas abiertas; escrituras con `@MenuAccess` (rutas `/admin/secciones` y `/admin/horarios`).

## Tareas

| Tarea | Capa | Descripción | Archivos permitidos (resumen) | Depende de |
|---|---|---|---|---|
| T00 | harness | Completar `.agents/` (system, memory, tools `.sh`, `mapa_skills`, `validar_entrega`, `idioma_español`, `restricciones_agy`) y actualizar `AGENTS.md` | `.agents/**`, `AGENTS.md` | — |
| T01 | bd | Variables de sistema de jornada (hora de entrada, recreo), menús "Secciones" y "Horarios" asignados a Administrador y Subdirector en el seed, constantes de ruta | `src/core/database/seed.ts`, `src/common/constants/menu-rutas.constants.ts` | T00 |
| T02 | pruebas | Pruebas primero (rojo) desde los escenarios del RF-008 con IDs `CP-RF008-xx` | `test/features/secciones/**`, `test/features/carga-academica/**`, `test/features/horarios/**` | T01 |
| T03 | backend | Módulo `secciones`: crear/editar/listar/cerrar; carga académica automática al crear (transacción) | `src/features/secciones/**` | T02 |
| T04 | backend | Módulo `carga-academica`: asignar docente, solo activos, aviso de exceso con confirmación, carga por docente | `src/features/carga-academica/**` | T03 |
| T05 | backend | Módulo `horarios` (núcleo): bloques CRUD, sin superposición, sin cruce de docente, fin > inicio, avisos de horas vs plan, mensaje "rigen desde mañana" | `src/features/horarios/**` | T03 |
| T06 | backend | Grilla propuesta y copiar horario entre secciones del mismo grado (marca cruces) | `src/features/horarios/**` (solo archivos nuevos de grilla/copia) | T05 |
| T07 | backend | Consulta: mi horario (docente) y horario de la sección del estudiante/apoderado | `src/features/horarios/**` (archivos nuevos de consulta) | T05 |
| T08 | backend | Registrar módulos en `features.module.ts`, auditoría (RF-003) revisada, actualizar backlog `docs/00-Plan-y-Backlog-RF.md` y `PENDIENTES.md` (solo agregar pendientes) | `src/features/features.module.ts`, `docs/00-Plan-y-Backlog-RF.md`, `docs/requerimientos/PENDIENTES.md` | T04, T06, T07 |
| W01 | frontend | Módulo `secciones` en SGA-WEB: listado por grado y formulario (pantalla "Secciones") con tipos, API y hooks | `SGA-WEB/features/secciones/**`, `SGA-WEB/app/admin/secciones/**` | T08 |
| W02 | frontend | Pantalla "Carga académica": tabla curso–docente con carga horaria y confirmación de exceso | `SGA-WEB/features/carga-academica/**`, `SGA-WEB/app/admin/secciones/[id]/carga/**` | W01 |
| W03 | frontend | Pantalla "Horario": grilla semanal, bloque doble, avisos, copiar horario (arrastrar y soltar) | `SGA-WEB/features/horarios/**`, `SGA-WEB/app/admin/horarios/**` | W01 |
| W04 | frontend | Pantalla "Mi horario" (docente) y horario de la sección (estudiante/apoderado), con color por curso | `SGA-WEB/features/horarios/**` (archivos nuevos de consulta), `SGA-WEB/app/mi-horario/**` | W03 |
| W05 | frontend | Registrar menús/rutas, actualizar backlog del RF en `SGA-API/docs/00-Plan-y-Backlog-RF.md` y `SGA-WEB/AGENTS.md` si aplica | archivos de navegación del WEB | W02, W04 |

`features.module.ts` y los `index.ts` barril compartidos los toca solo T08. T06 y T07 comparten carpeta con T05 pero
usan archivos distintos, y van en serie después de T05 (máximo 1 DEV a la vez cuando comparten archivos).

## Decisiones del usuario (2026-10-09)

1. **Recreo:** aprobado, configurable. Variables `jornada.recreo_despues_de_hora` (3) y `jornada.minutos_recreo` (15); la duda queda en `PENDIENTES.md` (P-03).
2. **Borrar un bloque con sesiones:** aprobado, se bloquea con mensaje claro y se anota como pendiente.
3. **SGA-WEB:** incluido (W01–W05); rutas `/admin/secciones`, `/admin/horarios`, `/mi-horario` aceptadas por defecto.
4. **`PENDIENTES.md`:** ya commiteado por el usuario (`d988aec`).
5. **Rama:** `feat/rf-008-secciones-carga-horarios` creada en SGA-API y SGA-WEB desde el commit local actual.
6. **Fuera de los `git add`:** `.claude/` y `TAREAS/` (sin versionar).

## Registro
- Validado por el usuario: 2026-10-09
- Orden «inicia el desarrollo»: pendiente
