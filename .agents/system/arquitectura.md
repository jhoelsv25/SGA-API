# Arquitectura y comandos — SGA-API

- NestJS (TypeScript estricto), PostgreSQL con Drizzle ORM, Redis + BullMQ (auditoría), Jest para pruebas.
- Estructura por feature en `src/features/<modulo>/` (ver `.agents/rules/clean-code-architecture.md`): `constants/`, `dto/`, `interfaces/`, `repositories/`, `utils/`, controlador, servicio, módulo e `index.ts`.
- Esquema solo en `src/core/database/schema/` y migraciones en `drizzle/`. El `.sql` de `docs/base-de-datos/` está congelado.
- Año lectivo de trabajo: header `x-anio-academico-id`, se lee con `AnioLectivoCls` (`.agents/rules/anio-lectivo.md`).
- Acceso por menú: lecturas abiertas, escrituras con `@MenuAccess(<ruta>)` (`src/common/decorators/menu-access.decorator.ts`).
- Auditoría: toda mutación llama `auditService.log(...)` (RF-003).
- Pruebas en `test/` como espejo de `src/` (alias `@/` = `src/`). Cada prueba lleva el ID de su escenario (`CP-RF008-xx`).
- Gestor: pnpm (prohibido npm/yarn/bun).

## Comandos de verificación

- Tipos: `pnpm typecheck`
- Lint: `pnpm lint` (o `pnpm exec eslint <rutas>`)
- Pruebas: `pnpm test` (o `pnpm exec jest <ruta>`)
- Build: `pnpm build`
