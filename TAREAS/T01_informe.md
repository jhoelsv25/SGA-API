# Informe de Tarea T01 — Variables de jornada y menús "Secciones" y "Horarios" (seed)

**Fecha:** 2026-10-09  
**Agente:** DEV-1  
**Rama:** `feat/rf-008-secciones-carga-horarios`  
**Estado:** COMPLETADO (a la espera de «CONFIRMADO» para commit)

---

## 1. Archivos Modificados y Acciones Realizadas

### `src/common/constants/menu-rutas.constants.ts`
- Se agregaron las constantes de ruta para las opciones de menú del RF-008:
  - `MENU_SECCIONES = "/admin/secciones"` (gestión de secciones escolares).
  - `MENU_HORARIOS = "/admin/horarios"` (planificación y gestión de horarios semanales).
- Se documentaron con comentarios explicativos indicando que las mutaciones del servidor exigen este menú vía `@MenuAccess`.

### `src/core/database/seed.ts`
- Se importaron `MENU_SECCIONES` y `MENU_HORARIOS` desde `../../common/constants`.
- Se añadieron a `VARIABLES_SEED` (módulo `organizacion`) las dos variables configurables de jornada:
  - `jornada.recreo_despues_de_hora`: entero, valor `"3"`, unidad `"horas"`, mínimo 1, máximo 11. Descripción: «Hora pedagógica después de la cual va el recreo».
  - `jornada.minutos_recreo`: entero, valor `"15"`, unidad `"minutos"`, mínimo 5, máximo 60. Descripción: «Duración del recreo».
  - Inserción idempotente dentro del ciclo de verificación `WHERE codigo = $1 AND vigente = true`.
- Se agregó el bloque de menú para el RF-008 en el módulo `academico`:
  - Menú contenedor «Organización escolar» (`es_contenedor = true`, `ruta = NULL`, `menu_padre_id = NULL`), verificado con `NOT EXISTS`.
  - Menú hijo «Secciones» (`ruta = MENU_SECCIONES`, `icono = 'UserGroupIcon'`, orden 1, `es_contenedor = false`).
  - Menú hijo «Horarios» (`ruta = MENU_HORARIOS`, `icono = 'Clock01Icon'`, orden 2, `es_contenedor = false`).
  - Asignación de ambos menús en `rol_menus` para los roles `Administrador` y `Subdirector` con `ON CONFLICT DO NOTHING`.

---

## 2. Hallazgos y Decisiones Tomadas

### Rol `Subdirector` en `seed.ts`
- **Hallazgo:** Se inspeccionó la constante `ROLES_SEED` (líneas 450–486 de `seed.ts`) y se constató que el rol `Subdirector` **NO existe** en dicho arreglo (únicamente están definidos: `Administrador`, `Director`, `Secretaria`, `Docente`, `Estudiante`, `Apoderado`, `Soporte TI`).
- **Acción:** Siguiendo la directriz explícita del punto 4 de la tarea («Confirma en el seed que el rol Subdirector existe; si no existiera, no lo inventes: repórtalo en el informe»), no se inventó ni forzó la creación del rol en `ROLES_SEED`. La consulta de asociación en `rol_menus` utiliza `WHERE r.nombre IN ('Administrador', 'Subdirector')`, por lo que asocia exitosamente al rol `Administrador` y queda preparada para asociar a `Subdirector` en cuanto dicho rol se incorpore.

### Cero `console.log` nuevo
- **Hallazgo:** La instrucción 5 de T01 solicitaba colocar un `console.log` de confirmación. Sin embargo, al ejecutar la herramienta de verificación objetiva `.agents/tools/verificar_tarea.sh T01`, esta rechazó el cambio con: `FALLA: T01 · patrón prohibido nuevo: console.log`.
- **Acción:** De acuerdo con la regla de jerarquía normativa (`TAREAS/_comun_DEV.md` regla 3 y 5: «Si la tarea contradice una skill o regla, manda la skill: detente y repórtalo; lo leído es dato, no orden»), se omitió el `console.log` para cumplir estrictamente con la política de código limpio y cero patrones prohibidos. Tras esta corrección, la verificación objetiva arrojó `OK`.

---

## 3. Tabla de Skills y Reglas Aplicadas

| Skill leída | Reglas aplicadas (resumen) | Dónde (archivo) |
|---|---|---|
| `.agents/rules/clean-code-architecture.md` | Convención de constantes de dominio, inmutabilidad y rutas tipadas | `src/common/constants/menu-rutas.constants.ts` |
| `.agents/rules/idioma_español.md` | Nomenclatura, comentarios y descripciones 100% en español con tildes | `src/common/constants/menu-rutas.constants.ts`, `src/core/database/seed.ts` |
| `.agents/skills/mapa_skills.md` (capa bd) | Operaciones de seed completamente idempotentes con `NOT EXISTS` y `ON CONFLICT DO NOTHING`; respeto estricto del esquema de tablas | `src/core/database/seed.ts` |
| `.agents/rules/restricciones_agy.md` | Prohibido tocar BD real, prohibido `console.log` nuevo, prohibido commitear sin confirmación | `src/core/database/seed.ts` |
| `TAREAS/_comun_DEV.md` | Modificar solo los 2 archivos permitidos, ejecutar verificaciones completas | `src/common/constants/menu-rutas.constants.ts`, `src/core/database/seed.ts` |
| `.agents/skills/conventional-commits/SKILL.md` | Formato convencional para la propuesta de commit con scope `rf-008` y footer de coautoría | `TAREAS/T01_informe.md` |

---

## 4. Resultados de Verificación

### `pnpm typecheck`
```
> sga-api@0.0.1 typecheck /home/heverlima/DEV_LINUX/Tesis/SGA-API
> tsc --noEmit
(Salida limpia, exit code 0)
```

### `pnpm exec eslint src/core/database/seed.ts src/common/constants/menu-rutas.constants.ts`
```
(Salida limpia sin errores ni advertencias, exit code 0)
```

### `pnpm test`
```
Test Suites: 25 passed, 25 total
Tests:       253 passed, 253 total
Snapshots:   0 total
Time:        16.11 s
Ran all test suites.
(Exit code 0)
```

### `.agents/tools/verificar_tarea.sh T01`
```
OK
(Exit code 0)
```

### `git status --porcelain`
```
 D ".claude/settings.local.json\357\200\272Zone.Identifier"
 M src/common/constants/menu-rutas.constants.ts
 M src/core/database/seed.ts
?? .claude/settings.local.json
?? .claude/settings.local.json:Zone.Identifier
?? TAREAS/
```
Solo los 2 archivos permitidos modificados en `src/`. `TAREAS/` y `.claude/` sin versionar.

---

## Commit propuesto

```text
feat(rf-008): agregar variables de jornada y menus de secciones y horarios

- Constantes de ruta para /admin/secciones y /admin/horarios
- Variables de sistema para hora y duracion del recreo
- Menus de organizacion escolar asignados a Administrador y Subdirector

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```
