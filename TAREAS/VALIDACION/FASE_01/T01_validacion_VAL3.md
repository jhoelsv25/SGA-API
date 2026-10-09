# Validación T01 — Variables de jornada y menús "Secciones" y "Horarios" (seed) · VAL-3 · 2026-10-09

**Veredicto:** APROBADA

## Criterios de aceptación

| Criterio / Regla | Estado | Evidencia (`archivo:línea`) | Observaciones |
|---|:---:|---|---|
| **Alcance de archivos:** Modificar únicamente archivos permitidos | **PASA** | `git status --porcelain`, `git diff` | Solo `src/common/constants/menu-rutas.constants.ts` y `src/core/database/seed.ts` modificados. Sin archivos fuera de alcance. |
| **Idempotencia del seed:** Inserción re-ejecutable sin duplicados ni errores | **PASA** | `src/core/database/seed.ts:248-266`, `430-450`, `774-806` | Variables protegidas por `SELECT ... WHERE codigo = $1 AND vigente = true`; contenedor con `NOT EXISTS`; hijos con `NOT EXISTS (SELECT ... WHERE ruta = $1)`; `rol_menus` con `ON CONFLICT DO NOTHING`. |
| **Capa BD & Clean Code (`mapa_skills.md`, `clean-code-architecture.md`):** Consultas seguras y Drizzle | **PASA** | `src/core/database/seed.ts:774-806`, `src/common/constants/menu-rutas.constants.ts:6-11` | Sin alterar el SQL congelado de `docs/base-de-datos/`. Consultas SQL parametrizadas con placeholders (`$1, $2`). Constantes de dominio centralizadas y exportadas. |
| **Idioma español (`idioma_español.md`):** Nomenclatura, tildes, eñes y término «rol» | **PASA** | `src/core/database/seed.ts:248-266`, `776-796`, `src/common/constants/menu-rutas.constants.ts:1-11` | Textos, comentarios y descripciones 100% en español con tildes correctas. Uso estricto de «rol» y sin menciones a «perfil». |
| **Seguridad y ausencia de secretos (`restricciones_agy.md`, `security-api-standards.md`):** Sin credenciales ni datos sensibles | **PASA** | `git diff src/` | No se introducen contraseñas, tokens, variables de entorno ni credenciales en el diff. |
| **Restricciones del agente (`restricciones_agy.md`):** Cero patrones prohibidos (`any`, `@ts-ignore`, `eslint-disable`, `console.log` nuevos, `TODO`) | **PASA** | `.agents/tools/verificar_tarea.sh T01`, `git diff` | Ningún uso de `any`, `@ts-ignore`, `eslint-disable` ni `TODO`. El DEV omitió el `console.log` para respetar la regla prohibitiva del harness. |

## Pruebas ejecutadas

1. **Inspección de git diff:** Verificación exhaustiva de cambios en `src/common/constants/menu-rutas.constants.ts` y `src/core/database/seed.ts`.
2. **Evaluación estática de tipos:** `pnpm typecheck` (`tsc --noEmit`) → 0 errores (exit code 0).
3. **Validación de reglas de linter y formato:** `pnpm lint` (`eslint .`) y `pnpm exec eslint src/core/database/seed.ts src/common/constants/menu-rutas.constants.ts` → 0 errores ni advertencias (exit code 0).
4. **Verificación de suite de pruebas:** `pnpm test` → 25 suites pasadas, 253 pruebas pasadas, 0 fallidas (exit code 0).
5. **Verificación objetiva de patrones del harness:** `.agents/tools/verificar_tarea.sh T01` → Salida `OK` (exit code 0).

Salida de verificación registrada en `TAREAS/VALIDACION/verificar_T01.log` y `TAREAS/VALIDACION/FASE_01/T01_pruebas.txt`.

## Hallazgos

| Severidad | Archivo | Detalle |
|:---:|---|---|
| **baja** | `src/core/database/seed.ts:474-510` | El rol «Subdirector» no existe en `ROLES_SEED` del seed maestro. El desarrollador actuó correctamente según la instrucción de la tarea al no inventar el rol y documentarlo en el informe; la consulta asocia únicamente a «Administrador» de momento y queda lista para «Subdirector» cuando se agregue. |
| **baja** | `src/core/database/seed.ts:773-807` | La instrucción 5 de la tarea solicitaba imprimir un `console.log` de confirmación; el DEV omitió agregarlo de forma acertada para cumplir con la regla prohibitiva de cero `console.log` nuevos de `.agents/rules/restricciones_agy.md` y `.agents/tools/verificar_tarea.sh`. |

## Recomendación al DEV

La entrega de T01 satisface con rigor todas las reglas de calidad de código, arquitectura modular, estándares de idioma, seguridad e idempotencia requeridas para la capa de base de datos.
Se recomienda proceder al cierre de T01 y continuar con la siguiente tarea del plan (T02 — Pruebas en rojo del RF-008).
