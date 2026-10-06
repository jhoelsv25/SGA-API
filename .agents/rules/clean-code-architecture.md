---
title: Clean Code & NestJS Architecture Guidelines
trigger: always_on
---

# Clean Code y Arquitectura Modular en NestJS

## 1. Zero `any` & Tipado Estricto

- **Prohibido el uso de `any`**: Utiliza interfaces, types explícitos, genéricos o `unknown` con type guards (`is`).
- **DTOs Fuertemente Tipados**: Toda entrada externa (Body, Query, Param) debe validarse estrictamente con DTOs decorados con `class-validator` y `class-transformer`.
- **Inmutabilidad y Visibilidad**: Marca propiedades inyectadas en constructores como `private readonly`.

## 2. Estructura Modular por Dominio

Organiza el código dentro de `src/modules/<modulo>/` agrupando por feature o dominio de negocio:

```
src/
├── common/                     # Utilidades, decoradores, filtros, guards y pipes transversales
│   ├── decorators/             # @CurrentUser(), @Public(), etc.
│   ├── filters/                # GlobalHttpExceptionFilter, etc.
│   ├── guards/                 # JwtAuthGuard, RolesGuard, etc.
│   ├── interceptors/           # ResponseTransformInterceptor, LoggingInterceptor, etc.
│   └── pipes/                  # Custom validation pipes
├── config/                     # Configuraciones tipadas del ConfigModule
├── modules/
│   └── <nombre-modulo>/
│       ├── controllers/        # Controladores REST HTTP (@Controller)
│       ├── services/           # Lógica de negocio (@Injectable)
│       ├── dto/                # Data Transfer Objects (CreateDto, UpdateDto, QueryDto)
│       ├── entities/           # Entidades o modelos de base de datos
│       ├── interfaces/         # Contratos e interfaces del dominio
│       ├── gateways/           # (Opcional) WebSockets Gateway si tiene eventos realtime
│       ├── processors/         # (Opcional) Consumidores BullMQ si tiene tareas en segundo plano
│       └── <nombre-modulo>.module.ts
├── app.module.ts
└── main.ts
```

## 3. Principios de Inyección de Dependencias y Responsabilidad Única

- **Controladores Delgados (Thin Controllers)**: Solo reciben la petición, delegan al servicio y retornan la respuesta. Cero lógica de negocio o queries complejas en los controladores.
- **Servicios Cohesivos**: Cada servicio debe tener una única responsabilidad. Si un servicio supera ~200 líneas o realiza demasiadas tareas dispares, divídelo en servicios especializados o helpers de dominio.
- **Inyección por Constructor**: Utiliza inyección de dependencias exclusivamente por constructor. Prohibido el uso de service locators manuales.

## 4. Manejo de Errores y Excepciones

- Lanza siempre excepciones HTTP nativas de NestJS:
  - `NotFoundException` (404)
  - `BadRequestException` (400)
  - `UnauthorizedException` (401)
  - `ForbiddenException` (403)
  - `ConflictException` (409)
  - `InternalServerErrorException` (500)
- **Nunca tragues errores silenciosamente**: En bloques `try/catch`, registra el error o relánzalo como una excepción HTTP comprensible para el cliente.

## 5. Arquitectura y Ubicación de Tests (`test/`)

- Toda la suite de pruebas unitarias, de integración y end-to-end reside en la carpeta raíz `test/`.
- La estructura dentro de `test/` refleja como espejo la de `src/features/` y `src/common/`:
  - `test/features/<modulo>/<modulo>.service.spec.ts`
  - `test/features/<modulo>/<modulo>.controller.spec.ts`
  - `test/features/<modulo>/services/<sub-servicio>.spec.ts`
  - `test/features/<modulo>/utils/<util>.spec.ts`
- Husky pre-commit ejecuta `pnpm test` de forma obligatoria en cada commit para garantizar cero regresiones y pruebas 100% limpias.
