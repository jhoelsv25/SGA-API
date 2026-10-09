# T06 — Horarios: grilla propuesta y copiar horario

Capa: backend. Depende de: T05 (commiteada, `caf09b8`).

## Objetivo
Agregar a `src/features/horarios` la grilla propuesta y el copiado de horario entre secciones del mismo grado (RF-008 HU3), y hacer pasar sus pruebas sin modificarlas. T07 (consultas) viene después: no la implementes.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- Contrato (manda), con sus dos enmiendas: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/CONTRATO_RF008.md (sección `horarios` y «Enmienda 2»)
- RF (HU3: grilla, copiar): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Pruebas (inmutables): `TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt` y `horarios-grilla-copia.controller.spec.ts.txt`.
- Código existente de T05 (aprobado): `src/features/horarios/**`. Extiéndelo de forma aditiva, con el mismo estilo.
- Lee `.agents/memory/errores_frecuentes.md`: un valor de negocio fijo (45, 7, 3, 15, nombres de curso) es el error que ya hizo rechazar T05.

## Primer paso obligatorio
`cp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt test/features/horarios/horarios-grilla-copia.service.spec.ts && cp TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.controller.spec.ts.txt test/features/horarios/horarios-grilla-copia.controller.spec.ts`. No edites esas copias. NO copies `horarios-consulta*` (es de T07).

## Archivos permitidos
- `src/features/horarios/**` (puedes AGREGAR métodos y archivos a `horarios.service.ts`, `horarios.controller.ts`, `repositories/horarios.repository.ts`, `interfaces`, `dto`, `utils`, `constants`; no cambies el comportamiento ya aprobado de T05)
- `test/features/horarios/horarios-grilla-copia.service.spec.ts`, `test/features/horarios/horarios-grilla-copia.controller.spec.ts` (copias, sin cambios)
Prohibido: `src/features/features.module.ts` (T08), `src/features/carga-academica/**`, `src/features/secciones/**`, esquema Drizzle, migraciones, `package.json`, las pruebas de T05 y T07.

## Qué hacer
1. Repositorio, tres métodos nuevos (firmas exactas en la Enmienda 2 del contrato): `obtenerParametrosJornada()` (lee las 4 variables `jornada.*` vigentes de `variables_sistema`; si falta alguna, `InternalServerErrorException` con mensaje claro), `horaEntradaEstudiantes()` (turno `aplica_a = 'estudiantes'`) y `cursosSeccionPorSeccion(seccionId)`.
2. `HorariosService.proponerGrilla(seccionId, horaEntrada?)`: genera lunes a viernes `horasPedagogicasDia` bloques de `minutosHoraPedagogica` minutos con un `receso` de `minutosRecreo` minutos tras la hora `recreoDespuesDeHora`, empezando a la hora indicada o a `horaEntradaEstudiantes()`. Todo sale de `obtenerParametrosJornada()`: **ningún 45, 7, 3, 15 ni 5 días escrito en el código de negocio** (los días lunes–viernes sí son una regla del RF y van como constante con nombre en `constants`). No guarda nada.
3. `HorariosService.copiar(origenId, destinoId, actorId, ip?)`: ambas secciones existen y son del mismo grado (400) y destino sin bloques (409); empareja por `cursoId` usando `cursosSeccionPorSeccion` de origen y destino; crea cada bloque en destino con el `cursoSeccionId` del mismo curso en destino; revisa el cruce del docente del destino con `findCruceDocente(...)` y, si hay cruce, igual crea el bloque y lo agrega a `conflictos` con el mensaje exacto del RF («El docente ya dicta en 4.° B el lunes de 08:30 a 09:15.»). Un bloque de origen cuyo curso no existe en destino no se copia (ver la prueba). Año cerrado: no se escribe. Auditoría (`tabla: "horarios"`, `accion: "crear"`).
4. Controlador: `GET horarios/seccion/:seccionId/grilla?horaEntrada=HH:mm` (sin restricción de menú; valida el formato) y `POST horarios/seccion/:destinoId/copiar-de/:origenId` con `@MenuAccess(MENU_HORARIOS)`. Los nombres de método los fijan las pruebas.
5. Corrección heredada de T05 (hallazgo de validación): en `repositories/horarios.repository.ts` y `utils/horarios.util.ts` reemplaza los `throw new Error(...)` por `InternalServerErrorException` (o validación previa), y haz que `horasPorCurso` reutilice `obtenerParametrosJornada()` en vez de repetir la lectura de la variable. Sin cambiar el comportamiento observable: las pruebas de T05 deben seguir pasando.

## Criterios de aceptación (medibles)
- `pnpm exec jest test/features/horarios` pasa completo (T05 + T06: CP-RF008-11, 17 y el control de acceso de copiar/grilla).
- `.agents/tools/verificar_tarea.sh T06 --suite-completa` → `OK`.
- `grep -rnE "\b(45|2700)\b|\"Matemática\"|matem" src/features/horarios` no devuelve literales de negocio (los ejemplos de Swagger no cuentan).
- `cmp` entre cada `.txt` y su copia en `test/` sin diferencias (salvo el formato que aplique prettier del hook).
- Sin `any`, `console.log`, `TODO`, `eslint-disable`.

## Skills obligatorias (leer COMPLETAS antes de escribir código)
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/clean-code-architecture.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/security-api-standards.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/anio-lectivo.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/testing-guidelines.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/nestjs-best-practices/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/nodejs-backend-patterns/SKILL.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/typescript-advanced-types/SKILL.md
Si una instrucción contradice una skill, manda la skill: detente y repórtalo.

## Informe
TAREAS/T06_informe.md según _comun_DEV.md (tabla de skills, verificación, `## Commit propuesto` `feat(rf-008): ...`). No commitees hasta recibir «CONFIRMADO».
