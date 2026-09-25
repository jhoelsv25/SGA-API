---
title: Guía de Testing Automatizado
trigger: always_on
---

# Guía de Testing Automatizado

## 1. Tipos de Pruebas y Cobertura

- **Pruebas Unitarias (`*.spec.ts`)**:
  - Ubicación: Junto al archivo que prueban (ej. `auth.service.spec.ts` junto a `auth.service.ts`).
  - Responsabilidad: Aislar la unidad de código probada simulando todas sus dependencias con mocks de Jest (`jest.fn()`).
  - Se ejecutan con: `pnpm test` o `pnpm test:cov`.

- **Pruebas End-to-End (`test/**/*.e2e-spec.ts`)**:
  - Ubicación: En la carpeta `test/`.
  - Responsabilidad: Levantar la aplicación con `Test.createTestingModule` y probar el flujo HTTP completo con `supertest`.
  - Se ejecutan con: `pnpm test:e2e`.

## 2. Buenas Prácticas al Escribir Tests

- **Patrón AAA (Arrange - Act - Assert)**: Estructura cada test de forma limpia y legible.
- **Nombres Descriptivos**: Usa `describe()` para la clase/método y `it('should ...')` para definir el comportamiento esperado.
- **Mocks Limpios**: Restaura o limpia los mocks antes de cada prueba (`jest.clearAllMocks()` en `beforeEach`).
- **Zero Tests Rotos**: Nunca hagas commit de código con tests fallando. Si una refactorización cambia un contrato, actualiza los tests correspondientes.
