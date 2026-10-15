# Estado de la orquestación — 2026-10-14 (RF-013 INICIADO)
**Plan:** TAREAS/00_plan_RF013.md (VALIDADO 2026-10-14; orden «inicia el desarrollo» recibida 2026-10-14).
**Rama (SGA-API y SGA-WEB):** feat/rf-013-consolidado-ficha-seguimiento-docente — solo commits locales, sin push, sin merge.
**Árbol inicial:** limpio en ambos repos, en main (verificado 2026-10-14). RF-012 archivado en TAREAS/_archivo_RF012/.
**Autorizado por el usuario:** sin tope extra de agy en paralelo (cuando se agote la cuota avisa para cambiar de cuenta); propuestas 1 y 2 de RF-012 entran como T09; prueba en navegador (T10) solo como última opción y avisando antes.

## Tareas
Hechas: —
En curso: R9 (crear ramas)
Pendientes: T01 T02 T03 T04 T05 T06 T07 T08 T09 W01 W02 W03 W04 W05 T10 T11
**Próxima acción:** crear la rama local con un agy en ambos repos.

## Ejecución (2026-10-14)
R9 hecho (ramas creadas en API y WEB). Paralelismo pedido por el usuario: «lanza n agentes… que terminemos rápido».
- T01 DEV-1 (PID .agy_pid_T01_DEV): programando (diseño aprobado).
- T09 DEV-3 (PID .agy_pid_T09_DEV): programando en paralelo con T01 (no comparten archivos; su dependencia en el plan era solo de orden con T05, que aún no corre).
- T03 DEV-2 (PID .agy_pid_T03_DEV): solo diseño (--mode plan), en paralelo.
Nota: agy escribe artefactos propios en ~/.gemini/antigravity-cli (su memoria interna, fuera del proyecto; no afecta al repo).

## Avance (2026-10-14)
- T01 HECHA y commiteada: c9f37b6 (3 VAL APROBADA tras 1 reintento de validación por salida sin veredicto; Claude revisó la migración).
- T09 DEV-3 en desarrollo. T03 diseño aprobado (TAREAS/T03_diseño.md; falta verificar columnas reales en el contrato).
- T02a DEV-4 redactando TAREAS/CONTRATO_RF013.md (como en RF-012); luego T02 (VAL-2 escribe pruebas en rojo).
Nota técnica: agy -p con comandos en segundo plano termina sin veredicto; pedirle ejecutar en primer plano y retomar con --conversation.
- T09 HECHA y commiteada: 2db15f4 (3 VAL APROBADA). Desviación aceptada: la corrección de getMenuRoutes está en src/features/auth/repositories/auth.repository.ts (no en menus/). Propuesta: unificar ahoraEnColegio (marcaciones) con fecha-lima.util.ts en un mantenimiento futuro.
- CONTRATO_RF013.md aceptado (T02a). T02: pruebas en rojo escritas por VAL-2 y VAL-5; VAL-6 en curso. Pendiente: revisar y commitear (test(rf-013)).
- T02 HECHA (sin commit propio, como en RF-012, por el hook pre-commit): 6 specs en rojo, 20/20 CP cubiertos, guardadas en TAREAS/pruebas_rojo/seguimiento-docente/ (sin versionar); cada tarea de módulo copia sus specs sin modificarlas. Verificado por Claude (rojo por módulo inexistente, sin skip/any).
- T03 DEV-2 programando (base, repositorio completo, HU1). W01 DEV-7 (SGA-WEB) adelantado contra el contrato (Q.5), en paralelo con T03.
- W01 HECHA y commiteada en SGA-WEB: 74e2c8c (3 VAL APROBADA; Claude revisó api.ts).
- T03 DEV-2 terminó; verificar_tarea OK (tras corregir lint de la prueba por su autor VAL-2). Pruebas rojas ahora con extensión .rojo (Jest las recogía). VAL-1/2/3 de T03 en curso. Hallazgo propio de Claude (C.3): @Optional() en audit/notificaciones/anioLectivo de ConsolidadoGeneracionService y SeguimientoDocenteService permitiría omitir auditoría en silencio; quitar donde no sea necesario.
- T03 HECHA y commiteada: dd54616 (3 VAL APROBADA + corrección de Claude: sin @Optional en auditoría/notificación, sin N+1 de nombres). Pendiente anotado: listado de solicitudes del repositorio aún hace consultas por fila (propuesta R3).
- En paralelo (2026-10-14): T04 DEV-8, T05 DEV-9, T06 DEV-10, T07 DEV-11 (API) y W02 DEV-12, W03 DEV-13, W04 DEV-14 (WEB). Fachada, controlador, módulo y barril quedan para T08. Las specs rojas son *.spec.ts.rojo en TAREAS/pruebas_rojo/seguimiento-docente/.
- T04, T06, T07, W02, W03, W04 entregadas por sus DEV (2026-10-14). Specs rojas con lint corregido por sus autores VAL-5/VAL-6. T04: Claude exige comprobar versión vigente en reabrir/cerrar (DEV-8 corrigiendo). VAL de T06, T07, W02, W03, W04 en curso (guía en TAREAS/_val_comun.md). T05 (DEV-9) y lint de VAL-6 aún corriendo.
- Veredictos (2026-10-14): T06 APROBADA (propuesta R3: aceptar solicitud = resolver + reabrir en 2 llamadas no atómicas; listarSolicitudes del repositorio con N+1). W02 y W03 APROBADAS. W04 RECHAZADA (eslint-disable) → DEV-14 corrigiendo. T07 APROBADA con 3 hallazgos: acción de auditoría 'consultar' inexistente en AuditAction/ck_bitacora_accion → decisión de Claude: el RF no pide auditar descargas; VAL-6 corrige la spec (sin auditoría en descargas; Excel con una sola llamada listarConsolidadosVigentesPorPeriodo) y luego DEV-11 adapta el servicio (también membrete institucional hoy literal: propuesta R3). T04 con 3 VAL en curso. Commits: W02 y T06 autorizados (en curso).
- Commits hechos: T06 12a0bb8 (API); W02 ede8de3, W03 553e8b5 (WEB). T04 y W04: commits en curso. T05 entregada (11 puntos protegidos, 23 pruebas nuevas): 3 VAL en curso. T07: DEV-11 aplicando correcciones (sin auditoría en descargas, Excel con una consulta, membrete institucional). T08 y W05 con prompt listo, pendientes de dependencias.
- Nota: los agy con PID 7233 y 7298 (conversaciones interactivas del usuario) no son míos; no se tocan.
- REINICIO DE SESIÓN (2026-10-14): todos los agy lanzados por Claude se detuvieron. Relanzados: commit de T04 (DEV-8, ya staged), T05 VAL-1/2/3, W05 DEV-15, corrección T07 DEV-11. Commits previos intactos: API c9f37b6, 2db15f4, dd54616, 12a0bb8; WEB 74e2c8c, ede8de3, 553e8b5, f1e2d90 (W04). Los agy 6202/6271 son del usuario.
- T04 COMMITEADA 93ef517. T07 corregida y verificada por Claude (commit en curso). T05 APROBADA por 3 VAL. Propuesta R3 (T05): el RF dice que con consolidado cerrado no se modifican sesiones; si el Director genera el consolidado en la última semana del bimestre, las firmas de kiosco de los días restantes quedan bloqueadas — decidir con el usuario si esas firmas deben exceptuarse. Además cada firma de kiosco suma 2 consultas (buscarPeriodoIdPorFecha + buscarConsolidadoVigente).
- 3.er reinicio de sesión: commit de T05 (21 archivos staged) y W05 (a medias: navigation/admin.ts, menu-del-usuario.ts, index.ts) relanzados (DEV-9 y DEV-16). Commits API hasta ahora: c9f37b6 T01, 2db15f4 T09, dd54616 T03, 12a0bb8 T06, 93ef517 T04, 998aec3 T07. WEB: 74e2c8c W01, ede8de3 W02, 553e8b5 W03, f1e2d90 W04. Pendientes: T05 (commit), W05, T08, validación de fase, T10 (avisar antes), T11.
- T05 COMMITEADA 0b5937c. T08 lanzada (DEV-17). W05 en curso (DEV-16).
- W05 COMMITEADA en WEB (3 VAL APROBADA). Frontend completo W01–W05. Falta T08 (DEV-17 en curso), fase, T10 (avisar antes), T11.
- T08 entregada por DEV-17 (verificar --suite-completa OK); 3 VAL en curso.
- T08 RECHAZADA por VAL-2 (cobertura fachada 44,68 %). Claude añade: MenuAccess variádico para :id y :id/ficha (el docente recibiría 403 al bajar su ficha). DEV-17 en reparación 1/2.
- 2026-10-14: el usuario pidió CANCELAR la orquestación y que Claude haga directamente lo que falta (T08 reparación, fase, T10, T11). DEV-17 detenido por PID (muerto verificado, sin PID files). Cambios a medias de T08 dejados tal cual. Sin agy de Claude vivos (6476/6511 son del usuario).
- 2026-10-14: T08 commit f2f27f1 (hecho por Claude tras cancelar la orquestación); backlog Back 100 % commit docs. T10 BLOQUEADO: el clasificador denegó 'pnpm db:seed' (BD dev compartida); la BD ya tiene migración 0015 aplicada pero faltan menús consolidado-bimestre y solicitudes-revision. Esperando decisión del usuario.
