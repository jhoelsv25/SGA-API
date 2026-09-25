---
title: Flujo de Desarrollo, pnpm y Control de Calidad
trigger: always_on
---

# Flujo de Desarrollo, pnpm y Control de Calidad

## 1. Gestor de Paquetes: pnpm Obligatorio

- Este repositorio utiliza exclusivamente **`pnpm`** como gestor de paquetes (`pnpm-lock.yaml`).
- **Prohibido ejecutar o documentar comandos con `npm`, `yarn` o `bun`**.
- Comandos oficiales:
  - Instalación: `pnpm install`
  - Agregar dependencia: `pnpm add <paquete>` o `pnpm add -D <paquete>`
  - Servidor de desarrollo: `pnpm start:dev`
  - Build de producción: `pnpm build`
  - Typecheck: `pnpm typecheck` (`tsc --noEmit`)
  - Linter: `pnpm lint` o `pnpm lint:fix`
  - Formateo: `pnpm format` o `pnpm format:check`
  - Pruebas unitarias: `pnpm test` o `pnpm test:watch`
  - Pruebas End-to-End: `pnpm test:e2e`
  - Cobertura de pruebas: `pnpm test:cov`

## 2. Validación de Calidad y Cero Regresiones

- **Chequeo de Tipos Obligatorio**:
  - Todo cambio o nueva característica debe pasar exitosamente `pnpm typecheck` (`tsc --noEmit`) sin advertencias ni errores.
- **Formateo y Linter**:
  - Respeta las reglas de ESLint 9 (`eslint.config.mjs`) y Prettier (`.prettierrc`).
  - Ejecuta `pnpm lint:fix` y `pnpm format` antes de concluir cualquier tarea.
- **Pruebas Automatizadas**:
  - Verifica que `pnpm test` y `pnpm test:e2e` no presenten fallos antes de dar por finalizada una tarea.
- **Husky y Pre-commit**:
  - El pre-commit ejecuta `lint-staged` (`eslint --fix` y `prettier --write`).
  - No uses flags como `--no-verify` para forzar commits si fallan los hooks de Husky. Corrige los errores en el código fuente.
