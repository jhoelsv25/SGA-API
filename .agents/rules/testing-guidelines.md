---
title: Guía de Testing Automatizado
trigger: always_on
---

# Guía de Testing Automatizado

## 1. Tipos de Pruebas y Cobertura

- **Pruebas Unitarias y de Integración (`test/**/*.spec.ts`)**:
  - Ubicación: En la carpeta raíz `test/`, replicando exactamente la estructura de módulos y capas de `src/` (ej. `test/features/auth/auth.service.spec.ts`, `test/features/auth/services/session.service.spec.ts`, `test/features/auth/auth.controller.spec.ts`, etc.).
  - Responsabilidad: Aislar la unidad de código probada simulando todas sus dependencias con mocks limpios de Jest (`jest.fn()`).
  - Se ejecutan con: `pnpm test` o `pnpm test:cov`.

- **Pruebas End-to-End (`test/**/*.e2e-spec.ts`)**:
  - Ubicación: En la carpeta `test/` (ej. `test/app.e2e-spec.ts` o `test/features/**/*.e2e-spec.ts`).
  - Responsabilidad: Levantar la aplicación con `Test.createTestingModule` y probar el flujo HTTP completo con `supertest`.
  - Se ejecutan con: `pnpm test:e2e`.

## 2. Buenas Prácticas al Escribir Tests

- **Estructura Espejo en `test/`**: Todo nuevo test debe residir bajo `test/` siguiendo la jerarquía exacta de carpetas de `src/features/` o `src/common/`.
- **Patrón AAA (Arrange - Act - Assert)**: Estructura cada test de forma limpia, predecible y legible.
- **Nombres Descriptivos**: Usa `describe()` para la clase/método y `it('should ...')` para definir el comportamiento esperado y relacionarlo al RF correspondiente.
- **Mocks Limpios**: Restaura o limpia los mocks antes de cada prueba (`jest.clearAllMocks()` en `beforeEach`).
- **Zero Tests Rotos (Enforzado en Git Hook)**: Husky (`.husky/pre-commit`) ejecuta `pnpm test` antes de cada commit. Está estrictamente prohibido commitear tests en fallo o usar `--no-verify`. Si una refactorización cambia un contrato, actualiza los tests correspondientes de inmediato.
