# T01 — Variables de jornada y menús "Secciones" y "Horarios" (seed)

Capa: bd. Depende de: T00 (hecha).

## Objetivo
Preparar los datos base del RF-008: variables configurables del recreo y las dos opciones de menú para gestionar secciones y horarios.

## Contexto (leer completo)
- Reglas comunes: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/_comun_DEV.md
- RF (fuente de verdad, solo lectura): /home/heverlima/DEV_LINUX/Tesis/SGA-API/docs/requerimientos/RF-008_Secciones_Carga_Academica_y_Horarios/V1/RF-008_Secciones_Carga_Academica_y_Horarios.md
- Plan: /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/00_plan_orden_desarrollo.md
- Modelo a imitar: en `src/core/database/seed.ts`, la variable `jornada.minutos_hora_pedagogica` (lista de variables) y el bloque «RF-002 V3 … Corregir datos críticos» (menú contenedor + hijo + `rol_menus`). `src/common/constants/menu-rutas.constants.ts`.

## Archivos permitidos
- `src/core/database/seed.ts`
- `src/common/constants/menu-rutas.constants.ts`
Prohibido tocar cualquier otro archivo. No ejecutes el seed ni toques ninguna base de datos (solo editas código).

## Qué hacer
1. En `menu-rutas.constants.ts` agrega `MENU_SECCIONES = "/admin/secciones"` y `MENU_HORARIOS = "/admin/horarios"` con un comentario breve (RF-008: las escrituras exigen este menú).
2. En el seed agrega, junto a las variables `jornada.*`, dos variables del módulo `organizacion`:
   - `jornada.recreo_despues_de_hora`: entero, valor `3`, unidad `horas`, mínimo 1, máximo 11. Descripción: «Hora pedagógica después de la cual va el recreo».
   - `jornada.minutos_recreo`: entero, valor `15`, unidad `minutos`, mínimo 5, máximo 60. Descripción: «Duración del recreo».
   Deben ser idempotentes igual que las variables existentes (que el seed pueda correr dos veces).
3. En el seed crea, en el módulo `academico`, un menú contenedor «Organización escolar» (si no existe) con dos hijos: «Secciones» (ruta `MENU_SECCIONES`) y «Horarios» (ruta `MENU_HORARIOS`), con íconos que ya usa el proyecto en otros menús. Idempotente (`NOT EXISTS`) como el bloque de «Corregir datos críticos».
4. Asigna ambos menús en `rol_menus` a los roles `Administrador` y `Subdirector` con `ON CONFLICT DO NOTHING`. Confirma en el seed que el rol `Subdirector` existe; si no existiera, no lo inventes: repórtalo en el informe.
5. Imprime un `console.log` de confirmación como hacen los demás bloques del seed (el seed ya los usa; es la convención de ese archivo).

## Criterios de aceptación (medibles)
- `pnpm typecheck` sin errores. `pnpm exec eslint src/core/database/seed.ts src/common/constants/menu-rutas.constants.ts` sin errores.
- `pnpm test` pasa completo (253 pruebas como mínimo).
- `git status --porcelain` muestra solo los 2 archivos permitidos (más `TAREAS/` y `.claude/` sin versionar).

## Skills obligatorias (leer COMPLETAS antes de escribir código)
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/clean-code-architecture.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/rules/idioma_español.md
- /home/heverlima/DEV_LINUX/Tesis/SGA-API/.agents/skills/mapa_skills.md (capa bd)
Si una instrucción contradice una skill, manda la skill: detente y repórtalo.

## Informe
Escribe /home/heverlima/DEV_LINUX/Tesis/SGA-API/TAREAS/T01_informe.md según _comun_DEV.md (con tabla de skills y `## Commit propuesto`, scope `rf-008`). No commitees hasta recibir «CONFIRMADO» de Claude.
