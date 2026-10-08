# Instrucciones para agentes — SGA-API

## Seguimiento de requerimientos (obligatorio)

- Las skills del proyecto están en `.agents/skills/` y las reglas en `.agents/rules/`. Léelas cuando la tarea lo requiera.
- Al terminar o avanzar cualquier tarea que implemente un Requerimiento Funcional (RF), sigue **`.agents/skills/actualizar-backlog-rf/SKILL.md`** y actualiza el avance en el backlog vivo: `docs/00-Plan-y-Backlog-RF.md`.
- Los RF (escenarios Gherkin) están en `docs/requerimientos/` y las dudas abiertas en `docs/requerimientos/PENDIENTES.md`. No inventes reglas de negocio: si falta una, agrégala como pendiente.
- **Fuente de verdad:** la documentación (requerimientos y pruebas) vive solo en `docs/`. No se mantienen copias fuera del proyecto.
- **Ramas:** una rama por RF con el estándar de `.agents/skills/nombre-rama-rf/SKILL.md` (`feat/rf-001-acceso-al-sistema`, `feat/rf-001-v2-varios-perfiles`, `fix/rf-004-...`), el mismo nombre en SGA-API y SGA-WEB.
- **Base de datos:** los cambios se hacen solo en el esquema Drizzle (`src/core/database/schema/`) y en migraciones (`drizzle/`). El `.sql` de `docs/base-de-datos/` está congelado: no se usa ni se actualiza.
