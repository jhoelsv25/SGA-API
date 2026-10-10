# Validación T07 — Horarios: «Mi horario» (docente) y horario de la sección del estudiante/apoderado · VAL-1 · 2026-10-09

**Veredicto:** APROBADA

---

## Criterios de Aceptación de la Tarea

| # | Criterio de Aceptación | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|---|:---:|---|---|
| 1 | Ejecución de pruebas unitarias (`pnpm exec jest test/features/horarios`): Pasa suite completa cubriendo T05 + T06 + T07 (CP-RF008-19 y pruebas de estudiante/apoderado). | **PASA** | `test/features/horarios/horarios-consulta.service.spec.ts:1-276`<br>`test/features/horarios/horarios.service.spec.ts:1-426`<br>`test/features/horarios/horarios.controller.spec.ts:1-142`<br>`test/features/horarios/horarios-grilla-copia.service.spec.ts:1-420`<br>`test/features/horarios/horarios-grilla-copia.controller.spec.ts:1-80` | 5 suites pasadas de 5, 36 pruebas pasadas de 36 (6 nuevas de T07 en `horarios-consulta.service.spec.ts`). Cero fallos. |
| 2 | Verificación técnica objetiva del proyecto (`.agents/tools/verificar_tarea.sh T07 --suite-completa`): Typecheck, ESLint y pruebas sin regresiones. | **PASA** | Salida del script `.agents/tools/verificar_tarea.sh T07 --suite-completa` | Salida objetiva `OK`. Typecheck global limpio, ESLint limpio y 33 suites pasadas con 316 pruebas en toda la aplicación. |
| 3 | Ausencia de literales de negocio fijos: `grep -rnE "\b(45\|2700)\b\|matem\|throw new Error\|#[0-9A-Fa-f]{6}" src/features/horarios` no devuelve literales en lógica. | **PASA** | `src/features/horarios/repositories/horarios.repository.ts:433-464`<br>`src/features/horarios/dto/bloque-docente-response.dto.ts:37` | Solo aparecen ejemplos Swagger en DTOs. `colorHex` proviene directamente de la columna de BD `cursos.color_hex` (`null` para recesos). |
| 4 | Inmutabilidad de pruebas (`cmp`): Comparación byte a byte contra la suite roja inmutable base. | **PASA** | `cmp TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt test/features/horarios/horarios-consulta.service.spec.ts` | Salida limpia, exit code 0 — 0 diferencias entre la copia y la plantilla oficial. |
| 5 | Patrones prohibidos y limpieza de código: Cero `any`, `console.log`, `TODO`, `debugger`, `@ts-ignore` y `eslint-disable`. | **PASA** | `src/features/horarios/**` | `grep` exhaustivo sobre el directorio del feature no arroja ninguna coincidencia prohibida. |
| 6 | Alcance delimitado de archivos y contratos REST: Endpoints de consulta abiertos sin `@MenuAccess`, decorados con OpenAPI y con `ParseUUIDPipe`. | **PASA** | `src/features/horarios/horarios.controller.ts:164-192`<br>`src/features/horarios/dto/bloque-docente-response.dto.ts:1-61`<br>`src/features/horarios/dto/mi-horario-response.dto.ts:1-17`<br>`src/features/horarios/dto/horario-estudiante-response.dto.ts:1-17` | No se modificaron esquemas Drizzle, migraciones, ni `features.module.ts`. Solo archivos autorizados de `src/features/horarios` y el archivo de pruebas en `test/features/horarios`. |

---

## Matriz de Trazabilidad de Escenarios RF-008 HU3

| Escenario | Prueba (archivo:línea) | Resultado |
|---|---|:---:|
| **CP-RF008-19:** Consultar horario del docente con cada bloque, curso, sección, aula y color | `test/features/horarios/horarios-consulta.service.spec.ts:171-187` | **PASA** |
| **CP-RF008-19:** Reflejar el color del curso devuelto por repositorio (`cursos.color_hex`) sin inventar literales | `test/features/horarios/horarios-consulta.service.spec.ts:189-203` | **PASA** |
| **HU3 Estudiante:** Estudiante consulta únicamente el horario de su sección según su matrícula vigente | `test/features/horarios/horarios-consulta.service.spec.ts:205-219` | **PASA** |
| **HU3 Estudiante:** Bloquear con 403 (`ForbiddenException`) si estudiante intenta consultar horario ajeno | `test/features/horarios/horarios-consulta.service.spec.ts:220-224` | **PASA** |
| **HU3 Apoderado:** Apoderado consulta horario de estudiante vinculado mediante `esApoderadoDeEstudiante` | `test/features/horarios/horarios-consulta.service.spec.ts:226-240` | **PASA** |
| **HU3 Apoderado:** Bloquear con 403 (`ForbiddenException`) a apoderado si intenta consultar estudiante no vinculado | `test/features/horarios/horarios-consulta.service.spec.ts:241-245` | **PASA** |
| **HU3 Gestión/Admin:** Rol administrativo puede consultar el horario de cualquier estudiante | `test/features/horarios/horarios-consulta.service.spec.ts:247-259` | **PASA** |
| **HU3 Matrícula:** Retornar 404 (`NotFoundException`) si estudiante no cuenta con matrícula activa en el año lectivo | `test/features/horarios/horarios-consulta.service.spec.ts:261-273` | **PASA** |

---

## Verificación de Datos de Consulta contra el RF-008 HU3

El requerimiento funcional RF-008 HU3 establece:
> *"Cada docente ve su horario semanal (todas sus secciones); cada estudiante y apoderado ve el horario de su sección."*  
> *"Escenario Consultar mi horario: Entonces el sistema muestra mi semana con cada bloque, curso, sección y aula, con el color de cada curso."*

Se verificó la estructura de los datos retornados contra estas especificaciones:

1. **Consulta del Docente (`GET /api/horarios/mi-horario`):**
   - **Endpoint:** `src/features/horarios/horarios.controller.ts:164-175`.
   - **Servicio:** `src/features/horarios/horarios.service.ts:468-482` (`miHorario`).
   - **Repositorio:** `src/features/horarios/repositories/horarios.repository.ts:433-464` (`findByDocente`).
   - **Estructura del bloque (`BloqueDocenteResponseDto`):**
     - **Bloque:** `id`, `diaSemana`, `horaInicio`, `horaFin` normalizados con formato `"HH:mm"`.
     - **Curso:** `cursoNombre` obtenido de `cursos.nombre`.
     - **Sección y Grado:** `seccionNombre` de `secciones.nombre` y `gradoNumero` de `grados.numero`.
     - **Aula:** `aula` de `horarios.aula`.
     - **Color:** `colorHex` obtenido directamente de la base de datos `cursos.color_hex` (`null` para recesos).

2. **Consulta de Estudiante / Apoderado (`GET /api/horarios/estudiante/:estudianteId`):**
   - **Endpoint:** `src/features/horarios/horarios.controller.ts:177-192`.
   - **Servicio:** `src/features/horarios/horarios.service.ts:484-525` (`horarioDeEstudiante`).
   - **Repositorio:** `src/features/horarios/repositories/horarios.repository.ts:39-66, 480-532` (`matriculaEstudiante`, `esApoderadoDeEstudiante`, `findBySeccion`).
   - **Estructura del bloque (`BloqueHorarioResponseDto`):**
     - **Bloque:** `id`, `diaSemana`, `horaInicio`, `horaFin`, `tipoBloque` (`"clase"` o `"receso"`).
     - **Curso:** `cursoNombre` y `cursoSeccionId`.
     - **Sección:** `seccionId` de la matrícula vigente.
     - **Docente:** `docenteNombre` (concatenación limpia de nombres y apellidos).
     - **Aula:** `aula` de `horarios.aula`.
     - **Color:** `colorHex` proveniente de `cursos.color_hex`.

Ambas consultas proveen la totalidad de atributos exigidos por el RF y el contrato técnico.

---

## Evaluación Rigurosa de Riesgos de Negocio y Seguridad

### (a) Comparación de `estudianteId` con `usuario.personaId` y soporte de `estudiantes.id` vs `personas.id` en repositorio
- **Análisis del código:**
  - En `src/features/horarios/horarios.service.ts:491-496`:
    ```typescript
    if (rol === "estudiante") {
      const estudiantePersonaId = usuario.personaId ?? usuario.id;
      if (estudiantePersonaId !== estudianteId) {
        throw new ForbiddenException(
          "No tiene permiso para consultar el horario de otro estudiante.",
        );
      }
    }
    ```
  - En `src/features/horarios/repositories/horarios.repository.ts:490-496`:
    ```typescript
    or(eq(matriculas.estudianteId, estudianteId), eq(estudiantes.personaId, estudianteId))
    ```
- **¿Hay un camino real donde un estudiante vea el horario de otro?**
  **NO.** La variable `estudiantePersonaId` proviene de la sesión JWT del usuario autenticado (`usuario.personaId`). Si un estudiante intenta enviar en la URL el identificador de otro estudiante (sea su `personaId` o su `estudianteId`), la igualdad estricta `estudiantePersonaId !== estudianteId` detecta la discrepancia y lanza inmediatamente `ForbiddenException` (HTTP 403). No existe camino de fuga de información entre estudiantes.
- **¿Hay un camino real donde un estudiante NO pueda ver el suyo?**
  **SÍ.** En la base de datos, cada estudiante tiene dos UUIDs distintos: `personas.id` (su identificador como persona física) y `estudiantes.id` (su registro de estudiante). Si el cliente frontend o móvil invoca el endpoint canónico REST `GET /api/horarios/estudiante/:estudianteId` enviando el `estudiantes.id` (el identificador natural de la entidad estudiante expuesto en matrículas o perfiles), la condición `estudiantePersonaId !== estudianteId` fallará porque `usuario.personaId` es el ID de persona, no de estudiante. El estudiante legítimo recibirá un HTTP 403 `ForbiddenException` impidiéndole ver su propio horario.  
  El repositorio fue diseñado previsoramente con `or(...)` para aceptar indistintamente cualquiera de los dos UUIDs, pero la guardia de autorización del servicio asume que el parámetro recibido siempre es `personaId`.
- **Clasificación de Severidad:** **media**. (No rompe los criterios de T07 porque la prueba unitaria inmutable pasa `"per-est"`, pero representa un riesgo operacional de integración entre SGA-WEB y SGA-API).

### (b) Consulta de estudiantes por roles distintos de estudiante y apoderado
- **Análisis del código:**
  - En `src/features/horarios/horarios.service.ts:488-508`:
    La autorización en el servicio verifica exclusivamente `if (rol === "estudiante")` y `else if (rol === "apoderado")`. Si el usuario autenticado tiene cualquier otro rol (ej. `docente`, `secretaria`, `auxiliar`, `administrador`), no se aplica ninguna restricción y el flujo procede directamente a resolver la matrícula y devolver el horario.
  - En `src/features/horarios/horarios.controller.ts:177`:
    El endpoint no cuenta con decorador `@MenuAccess` porque fue diseñado para ser accesible por perfiles finales (estudiante/apoderado).
- **Análisis contra contrato y especificación:**
  El contrato `TAREAS/CONTRATO_RF008.md:28` establece: *"otro rol con acceso: cualquiera"*, y la prueba unitaria `horarios-consulta.service.spec.ts:247-259` comprueba que un usuario con rol `"Administrador"` puede consultar cualquier estudiante. En consecuencia, la implementación cumple formalmente con el contrato establecido.  
  Sin embargo, desde el punto de vista de control de acceso basado en roles (RBAC) y principio de mínimo privilegio, cualquier usuario autenticado con un rol que no sea estudiante ni apoderado (por ejemplo, un rol docente o administrativo auxiliar) puede consultar el horario de cualquier estudiante del colegio sin pertenecer al cuerpo directivo.
- **Clasificación de Severidad:** **media**. (Cumple con el contrato acordado en T02/T07, pero evidencia una brecha en la granularidad de permisos que amerita ser refinada con una lista blanca de roles de gestión).

### (c) Manejo de docente inexistente en `miHorario`
- **Análisis del código:**
  - En `src/features/horarios/horarios.service.ts:471-474`:
    ```typescript
    const docente = await this.horariosRepo.docentePorPersonaId(personaId);
    if (!docente) {
      throw new NotFoundException("No se encontró el docente asociado al usuario.");
    }
    ```
  - Si el usuario que invoca `GET /api/horarios/mi-horario` no está registrado en la tabla `docentes`, el repositorio retorna `null` y el servicio lanza `NotFoundException` (HTTP 404), satisfaciendo el requerimiento estipulado en la tarea: *"404 si no hay matrícula activa en el año o el docente no existe"*.
- **Observaciones de rigor:**
  1. En `src/features/horarios/repositories/horarios.repository.ts:466-479`, `docentePorPersonaId` busca por `personaId` o `id`, pero no incluye la condición `where(sql`(eliminado_en IS NULL)`)`. Un docente que haya sido eliminado lógicamente (soft-delete) sería retornado por el repositorio.
  2. En la suite de pruebas unitarias inmutable provista (`test/features/horarios/horarios-consulta.service.spec.ts`), no se incluyó un escenario unitario que compruebe explícitamente el lanzamiento del HTTP 404 cuando `docentePorPersonaId` retorna `null`.
- **Clasificación de Severidad:** **baja**. (El servicio maneja y lanza la excepción 404 requerida; la falta del filtro soft-delete y de prueba unitaria explícita son oportunidades de mejora no bloqueantes).

---

## Pruebas Ejecutadas

1. **Suite de pruebas de Horarios (`pnpm exec jest test/features/horarios`):**
   ```text
   PASS test/features/horarios/horarios.controller.spec.ts
   PASS test/features/horarios/horarios-consulta.service.spec.ts
   PASS test/features/horarios/horarios.service.spec.ts
   PASS test/features/horarios/horarios-grilla-copia.service.spec.ts
   PASS test/features/horarios/horarios-grilla-copia.controller.spec.ts

   Test Suites: 5 passed, 5 total
   Tests:       36 passed, 36 total
   Snapshots:   0 total
   Time:        10.044 s
   ```
2. **Verificación integral del repositorio (`.agents/tools/verificar_tarea.sh T07 --suite-completa`):**
   - Typecheck estricto (`tsc --noEmit`): Exitoso, 0 errores.
   - ESLint: Exitoso, 0 errores y 0 advertencias.
   - Suite completa del proyecto: 33 suites pasadas, 316 pruebas pasadas.
   - Salida: `OK`.
3. **Verificación de inmutabilidad (`cmp`):**
   - Comparación byte a byte de `test/features/horarios/horarios-consulta.service.spec.ts` contra `TAREAS/pruebas_rojo/horarios/horarios-consulta.service.spec.ts.txt`: 0 diferencias.

---

## Hallazgos

| # | Severidad | Archivo | Detalle |
|---|:---:|---|---|
| 1 | **media** | `src/features/horarios/horarios.service.ts` | En `horarioDeEstudiante`, cuando el rol es `Estudiante`, se compara estrictamente `usuario.personaId ?? usuario.id !== estudianteId`. Si el cliente frontend envía `estudiantes.id` (UUID del registro de la tabla estudiantes) en lugar de `personaId`, la validación falla con 403 Forbidden impidiendo al propio estudiante ver su horario. El repositorio `matriculaEstudiante` sí contempla ambos con `or(...)`, evidenciando una asimetría entre la guardia del servicio y la consulta del repositorio. |
| 2 | **media** | `src/features/horarios/horarios.service.ts` | En `horarioDeEstudiante`, cualquier rol que no sea exactamente `estudiante` o `apoderado` pasa la validación sin restricción alguna. Aunque responde al texto del contrato (*"otro rol con acceso: cualquiera"*), la ausencia de una lista blanca de roles de gestión administrativa (ej. Administrador, Subdirector) permite que otros roles autenticados (como Docente) puedan consultar el horario de cualquier estudiante. |
| 3 | **baja** | `src/features/horarios/repositories/horarios.repository.ts` | En `docentePorPersonaId`, la consulta en la tabla `docentes` no filtra por registros eliminados lógicamente (`eliminado_en IS NULL`). Asimismo, la suite de pruebas unitarias inmutable de T02 omitió un test explícito para validar el HTTP 404 cuando el docente no existe. |

---

## Recomendación al DEV

1. **Resolver asimetría de identificadores en `horarioDeEstudiante`:**  
   Para evitar que un estudiante legítimo reciba HTTP 403 al enviar su `estudiantes.id`, el servicio podría resolver el `personaId` del estudiante desde el repositorio si no coincide en primera instancia, o bien documentar y coordinar con el equipo de frontend que el parámetro requerido es `personaId`.
2. **Definir lista blanca de roles administrativos en la consulta de estudiantes:**  
   Restringir la consulta de cualquier estudiante a roles expresamente administrativos (`['administrador', 'subdirector']`), lanzando 403 para otros roles que no tengan vinculación directa con el estudiante.
3. **Agregar filtro de soft-delete en `docentePorPersonaId`:**  
   Incorporar `and(or(...), sql\`eliminado_en IS NULL\`)` en la consulta a la tabla `docentes` para evitar vincular cuentas a docentes retirados.
