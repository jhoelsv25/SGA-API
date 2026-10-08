---
title: Clean Code & NestJS Architecture Guidelines
trigger: always_on
---

# Clean Code y Arquitectura Modular en NestJS

## 1. Zero `any` & Tipado Estricto

- **Prohibido el uso de `any`**: Utiliza interfaces, types explícitos, genéricos o `unknown` con type guards (`is`).
- **DTOs Fuertemente Tipados**: Toda entrada externa (Body, Query, Param) debe validarse estrictamente con DTOs decorados con `class-validator` y `class-transformer`.
- **Inmutabilidad y Visibilidad**: Marca propiedades inyectadas en constructores como `private readonly`.

## 2. Estructura Modular por Feature (`src/features/<modulo>/`)

Organiza el código dentro de `src/features/<modulo>/` siguiendo esta separación estricta de responsabilidades:

```
src/features/<nombre-modulo>/
├── constants/                      # Constantes de dominio, enums y valores por defecto
│   ├── <modulo>.constants.ts
│   └── index.ts
├── dto/                            # Data Transfer Objects (CreateDto, UpdateDto, QueryDto, ResponseDto)
│   ├── <accion>.dto.ts
│   └── index.ts
├── interfaces/                     # Contratos de repositorios y tipos internos del dominio
│   ├── <modulo>.repository.interface.ts
│   └── index.ts
├── repositories/                   # Acceso a base de datos (Drizzle ORM o ejecución de procedures)
│   ├── <modulo>.repository.ts
│   └── index.ts
├── utils/                          # Utilidades y funciones puras exclusivas del feature
│   ├── <util>.util.ts
│   └── index.ts
├── <modulo>.controller.ts          # Controlador REST HTTP (@Controller)
├── <modulo>.service.ts             # Reglas de negocio y auditoría (@Injectable)
├── <modulo>.module.ts              # Módulo NestJS (@Module)
└── index.ts                        # Barrel export del feature completo
```

## 3. Principios de Inyección de Dependencias y Responsabilidad Única

- **Controladores Delgados (Thin Controllers)**: Solo reciben la petición, delegan al servicio y retornan la respuesta. Cero lógica de negocio o queries en los controladores.
- **Servicios Cohesivos**: Cada servicio maneja la lógica y reglas de negocio del caso de uso.
- **Inyección por Constructor**: Utiliza inyección de dependencias exclusivamente por constructor.
- **Imports Relativos Limpios**: Dentro de cada feature, utiliza imports desde los índices de las subcarpetas (`../constants`, `../dto`, `../interfaces`, `../utils`, `../repositories`).

## 4. Procedimientos Almacenados y Funciones SQL (`src/core/database/procedures/`)

Para optimizar lecturas complejas, reportes o tablas con volumen considerable:
- **Ubicación**: Se ubican en `src/core/database/procedures/<dominio>/fn_<nombre>.sql`.
- **Firma estándar**: Entrada `p_params JSONB` y Retorno `JSONB`.
- **Aplicación automatizada**: Ejecutar siempre `pnpm db:procedures`, el cual corre `src/core/database/apply-procedures.ts` y aplica todos los `.sql` recursivamente a PostgreSQL.
- **Repositorio**: El repositorio invoca la función con `SELECT fn_consultar_*(...) AS resultado` y castea el resultado a interfaces tipadas en `interfaces/<modulo>.repository.interface.ts`.

## 5. Paginación por Cursor (Keyset Pagination) para Tablas de Alto Volumen

**Regla de Negocio y Rendimiento**:
- **Tablas de Alto Volumen** (usuarios, bitácora de auditoría, asistencias, matrículas, notas, pagos, etc.): **ES OBLIGATORIO usar paginación por cursor (Keyset Pagination)**.
  - Está **prohibido el uso de `OFFSET`** para tablas de alto volumen debido a la degradación $O(N)$ y saltos de páginas inconsistentes cuando hay inserciones concurrentes.
  - **Filtros en Query DTO**: `cursor?: string;` (Base64URL opaco) y `limit: number;`.
  - **Respuesta paginada**:
    ```typescript
    export class PaginatedResponseDto<T> {
      data!: T[];
      nextCursor!: string | null;
      hasMore!: boolean;
      limit!: number;
      mensaje?: string;
    }
    ```
  - **En PostgreSQL**: Se ordena por columnas indexadas deterministas y el `id`:
    ```sql
    WHERE (p.apellido_paterno, p.apellido_materno, p.nombres, u.id) > 
          (v_cursor_paterno, v_cursor_materno, v_cursor_nombres, v_cursor_id)
    ORDER BY p.apellido_paterno ASC, p.apellido_materno ASC, p.nombres ASC, u.id ASC
    LIMIT (v_limit + 1)
    ```
  - **En el Frontend (`sga-web`)**:
    - Se gestiona el historial con `cursorHistory` (stack de cursores) para navegar adelante/atrás.
    - Se conecta a la propiedad `cursorPagination` del componente `<DataTable />`.
- **Tablas de Catálogo Pequeño** (roles, módulos, opciones de menú, secciones, etc. con menos de 100 registros): Se permiten listados completos o paginación estándar sin necesidad de cursor complejo.

## 6. Auditoría Asíncrona con BullMQ

- Cualquier acción mutacional de negocio (`crear`, `actualizar`, `eliminar`, `iniciar_sesion`) debe registrarse en la bitácora mediante `await this.auditService.log(params)`.
- `AuditService` despacha el trabajo de auditoría a la cola `audit-queue` en Redis vía **BullMQ** en `< 1 ms`, evitando bloquear el hilo HTTP.
- `AuditProcessor` (`src/core/queues/processors/audit.processor.ts`) consume los jobs en segundo plano y persiste en `bitacora_auditoria`.
- Si Redis no está disponible o falla, `AuditService` cuenta con un fallback automático que inserta directamente en PostgreSQL para garantizar que ningún registro de auditoría se pierda.

## 7. Manejo de Errores y Excepciones

- Lanza siempre excepciones HTTP nativas de NestJS:
  - `NotFoundException` (404)
  - `BadRequestException` (400)
  - `UnauthorizedException` (401)
  - `ForbiddenException` (403)
  - `ConflictException` (409)
  - `InternalServerErrorException` (500)
- **Nunca tragues errores silenciosamente**: En bloques `try/catch`, registra el error o relánzalo como una excepción HTTP comprensible para el cliente.

## 8. Arquitectura y Ubicación de Tests (`test/`)

- Toda la suite de pruebas unitarias, de integración y end-to-end reside en la carpeta raíz `test/`.
- La estructura dentro de `test/` refleja como espejo la de `src/features/` y `src/common/`:
  - `test/features/<modulo>/<modulo>.service.spec.ts`
  - `test/features/<modulo>/<modulo>.controller.spec.ts`
  - `test/common/services/audit.service.spec.ts`
  - `test/common/utils/<util>.spec.ts`
- Husky pre-commit ejecuta `pnpm test` de forma obligatoria en cada commit para garantizar cero regresiones y pruebas 100% limpias.
