# Informe de Tarea T02 — Pruebas primero (TDD) desde los escenarios del RF-008

**Fecha:** 2026-10-09  
**Agente:** VAL-2  
**Rama:** `feat/rf-008-secciones-carga-horarios`  
**Estado:** COMPLETADO — Pruebas preparadas en `TAREAS/pruebas_rojo/` (no se commitea; listas para incorporar en T03–T07)

---

## 1. Archivos Creados y Organización por Tarea

Siguiendo la directriz de mantener el árbol `test/` 100% verde para la ejecución obligatoria del hook pre-commit y desacoplar las pruebas rojas hasta que cada tarea backend implemente su módulo respectivo, todas las pruebas se han organizado dentro de `TAREAS/pruebas_rojo/`:

### Módulo `secciones` (para T03)
- `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts`
  - Pruebas unitarias de `SeccionesService` cubriendo los escenarios Gherkin `CP-RF008-01` a `CP-RF008-05`.
- `TAREAS/pruebas_rojo/secciones/secciones.controller.spec.ts`
  - Pruebas de metadata `@MenuAccess(MENU_SECCIONES)` y delegación de `SeccionesController` cubriendo `CP-RF008-20`.

### Módulo `carga-academica` (para T04)
- `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts`
  - Pruebas unitarias de `CargaAcademicaService` cubriendo `CP-RF008-06` a `CP-RF008-10`.

### Módulo `horarios` — Núcleo de bloques (para T05)
- `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts`
  - Pruebas de núcleo de bloques (`crearBloque`, `actualizarBloque`, `eliminarBloque`, `listarPorSeccion`) cubriendo `CP-RF008-12`, `CP-RF008-13`, `CP-RF008-14`, `CP-RF008-15`, `CP-RF008-16` y `CP-RF008-18`.
  - **Enmienda 2026-10-09:** Las horas y nombres del plan de estudios se obtienen estrictamente del repositorio vía `horasPlanPorCurso(seccionId): Promise<Record<cursoSeccionId, { cursoNombre, horasPlan }>>` (verificado con `expect(mockHorariosRepo.horasPlanPorCurso).toHaveBeenCalledWith("sec-5a")`), con pruebas adicionales para cursos con horas coincidentes (sin advertencia) y cursos no convencionales (ej. "Taller de Robótica", plan 2).
- `TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts`
  - Pruebas de metadata `@MenuAccess(MENU_HORARIOS)` para creación, actualización y eliminación de bloques cubriendo `CP-RF008-20`.

### Módulo `horarios` — Grilla y Copia (para T06)
- `TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt`
  - Pruebas de propuesta de grilla semanal (`proponerGrilla`) y copia entre secciones (`copiar`) cubriendo `CP-RF008-11` y `CP-RF008-17`.
  - **Enmienda 2 (2026-10-09):** `obtenerParametrosJornada()`, `horaEntradaEstudiantes()` y `cursosSeccionPorSeccion(seccionId)` provienen del repositorio; pruebas adicionales para verificar que la grilla no usa literales fijos y que la copia empareja por `cursoId` llamando a `create` con el `cursoSeccionId` de destino y `findCruceDocente` con el docente de destino.
- `TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.controller.spec.ts.txt`
  - Pruebas de metadata `@MenuAccess(MENU_HORARIOS)` para el endpoint `copiar` y acceso abierto a `proponerGrilla` cubriendo `CP-RF008-20`.

### Módulo `horarios` — Consultas (para T07)
- `TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt`
  - Pruebas de consulta de horario de docente (`miHorario`) y horario de estudiante/apoderado (`horarioDeEstudiante`) cubriendo `CP-RF008-19`.
  - **Enmienda 2 (2026-10-09):** `docentePorPersonaId(personaId)`, `matriculaEstudiante(anioId, estudianteId)`, `esApoderadoDeEstudiante(apoderadoPersonaId, estudianteId)` y `colorHex` desde `cursos.color_hex` con fuentes de repositorio; pruebas adicionales de verificación de matrícula, control de acceso a apoderados y colores dinámicos.

---

## 2. Matriz de Cobertura de Casos de Prueba (CP-RF008-01..20)

| Escenario | Caso de Prueba | Archivo de Prueba : Línea | Tarea Destino |
|---|---|---|---|
| HU1: Crear una sección | **CP-RF008-01** | `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts.txt:193` | T03 (`secciones`) |
| HU1: Sección repetida | **CP-RF008-02** | `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts.txt:238` | T03 (`secciones`) |
| HU1: Vacantes inválidas | **CP-RF008-03** | `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts.txt:256` | T03 (`secciones`) |
| HU1: Tutor de dos secciones | **CP-RF008-04** | `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts.txt:283` | T03 (`secciones`) |
| HU1: Cerrar sección con matriculados | **CP-RF008-05** | `TAREAS/pruebas_rojo/secciones/secciones.service.spec.ts.txt:321` | T03 (`secciones`) |
| HU2: Asignar un docente | **CP-RF008-06** | `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt:195` | T04 (`carga-academica`) |
| HU2: Docente inactivo | **CP-RF008-07** | `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt:226` | T04 (`carga-academica`) |
| HU2: Exceso de carga horaria | **CP-RF008-08** | `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt:240` | T04 (`carga-academica`) |
| HU2: Cambiar docente a mitad de año | **CP-RF008-09** | `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt:272` | T04 (`carga-academica`) |
| HU2: Ver la carga de un docente | **CP-RF008-10** | `TAREAS/pruebas_rojo/carga-academica/carga-academica.service.spec.ts.txt:312` | T04 (`carga-academica`) |
| HU3: Proponer grilla del día | **CP-RF008-11** | `TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt:183` | T06 (`horarios/grilla-copia`) |
| HU3: Asignar curso a un bloque | **CP-RF008-12** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:119` | T05 (`horarios/bloques`) |
| HU3: Bloque doble | **CP-RF008-13** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:161` | T05 (`horarios/bloques`) |
| HU3: Bloques superpuestos | **CP-RF008-14** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:193` | T05 (`horarios/bloques`) |
| HU3: Cruce de docente | **CP-RF008-15** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:213` | T05 (`horarios/bloques`) |
| HU3: Horas distintas al plan | **CP-RF008-16** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:243` | T05 (`horarios/bloques`) |
| HU3: Copiar horario a otra sección | **CP-RF008-17** | `TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.service.spec.ts.txt:318` | T06 (`horarios/grilla-copia`) |
| HU3: Cambiar horario a mitad de año | **CP-RF008-18** | `TAREAS/pruebas_rojo/horarios/horarios.service.spec.ts.txt:340` | T05 (`horarios/bloques`) |
| HU3: Consultar mi horario | **CP-RF008-19** | `TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt:171` | T07 (`horarios/consulta`) |
| HU3: Usuario sin permiso (@MenuAccess) | **CP-RF008-20** | `TAREAS/pruebas_rojo/secciones/secciones.controller.spec.ts.txt:67`<br>`TAREAS/pruebas_rojo/horarios/horarios.controller.spec.ts.txt:52`<br>`TAREAS/pruebas_rojo/horarios/horarios-grilla-copia.controller.spec.ts.txt:40` | T03 / T05 / T06 |

---

## 3. Estado de la Suite Principal de Tests

- `test/features/secciones`, `test/features/carga-academica` y `test/features/horarios` fueron eliminadas de `test/`.
- La suite de pruebas de producción existente en `test/` ejecuta limpiamente:
  - 25 test suites pasadas.
  - 253 tests pasados (100%).
- `src/` no ha sido modificado.
- Sin archivos `.d.ts` sintéticos en `test/`.
- No se realiza ningún commit: la tarea T02 queda lista y las pruebas se transferirán a `test/` por cada desarrollador conforme se implementen los módulos correspondientes en T03 a T07.
