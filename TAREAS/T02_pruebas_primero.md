Eres VAL-2. Pruebas primero (rojo) del RF-008. Lee antes /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md.

# T02 — Pruebas primero (TDD) desde los escenarios del RF-008
Capa: pruebas. Depende de: T01 (hecha).

## Objetivo
Escribir SOLO archivos de prueba que fallen (rojo) porque los módulos aún no existen, y que fijen el contrato del backend. Un DEV las hará pasar después y no podrá modificarlas.

## Contexto (leer completo)
- Contrato: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md (obligatorio; no lo cambies)
- RF (Gherkin): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Casos CP-RF008-01..20: /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/pruebas/casos/RF-008_Secciones_Carga_Academica_y_Horarios/casos-de-prueba.md
- Modelo de estilo: test/features/plan-estudios/plan-estudios.service.spec.ts (mocks con jest.Mocked, `@/` alias).

## Archivos permitidos (crear)
- `test/features/secciones/secciones.service.spec.ts`
- `test/features/carga-academica/carga-academica.service.spec.ts`
- `test/features/horarios/horarios.service.spec.ts`
- `test/features/horarios/horarios.controller.spec.ts` (metadata `@MenuAccess` de las escrituras de secciones y horarios: CP-RF008-20; si el controlador de secciones va en otro archivo, créalo como `test/features/secciones/secciones.controller.spec.ts`)
Prohibido tocar `src/` y cualquier otro archivo.

## Qué hacer
1. Un `describe`/`it` por escenario, con el ID en el nombre (`CP-RF008-05 …`). Pasos Dado/Cuando/Entonces = preparación/acción/aserción. Cubre los 20 escenarios, sin inventar comportamiento.
2. Importa servicios, repositorios y DTO desde `@/features/secciones`, `@/features/carga-academica`, `@/features/horarios`, tal como dice el contrato; mockea los repositorios con los nombres del contrato y mockea `AuditService`, `AnioLectivoCls`, `AniosAcademicosService`, `GradosService`, `DocentesRepository`.
3. Verifica también la auditoría (`auditService.log`) en cada mutación.
4. Al final, corre `pnpm exec jest test/features/secciones test/features/carga-academica test/features/horarios` y guarda la salida en `TAREAS/VALIDACION/FASE_01/T02_pruebas_rojo.txt`. Deben fallar solo por módulos inexistentes, no por errores de sintaxis de tus pruebas: revisa con `pnpm exec eslint test/features/secciones test/features/carga-academica test/features/horarios`.
5. Escribe `TAREAS/T02_informe.md` con la matriz `| Escenario | Prueba (archivo:línea) | Resultado |` y `## Commit propuesto` (`test(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».

## Criterios de aceptación
- Los 20 CP-RF008-xx tienen al menos una prueba; ninguna está comentada ni con `skip`.
- `pnpm exec eslint` de las rutas de prueba sin errores.
- `git status --porcelain` muestra solo archivos dentro de `test/features/{secciones,carga-academica,horarios}`.
