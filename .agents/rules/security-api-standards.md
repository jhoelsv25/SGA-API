---
title: Seguridad, Documentación OpenAPI y Estándares de API
trigger: always_on
---

# Seguridad, Documentación OpenAPI y Estándares de API

## 1. Estándares REST y Prefijo Global

- Todos los endpoints residen bajo el prefijo global `/api` configurado en `main.ts`.
- Usa verbos HTTP adecuados:
  - `GET`: Obtención de recursos (idempotente, sin mutación de estado).
  - `POST`: Creación de recursos o acciones que generen estado.
  - `PATCH`: Actualización parcial de un recurso.
  - `PUT`: Reemplazo completo de un recurso.
  - `DELETE`: Eliminación lógica o física de un recurso.
- Respuestas consistentes: Las colecciones deben retornar arrays o estructuras paginadas con metadata (`data`, `total`, `page`, `limit`).

## 2. Documentación Swagger / OpenAPI

- Todo controlador debe estar documentado con los decoradores de `@nestjs/swagger`:
  - `@ApiTags('<Nombre>')`: Para agrupar endpoints en la UI de Swagger.
  - `@ApiOperation({ summary: '...' })`: Descripción concisa del endpoint.
  - `@ApiResponse({ status: 200, description: '...', type: ResponseDto })`: Esquemas de respuesta esperados.
  - `@ApiBearerAuth()` o `@ApiCookieAuth()`: En rutas que requieran autenticación.
- Todos los campos de los DTOs deben incluir `@ApiProperty()` o `@ApiPropertyOptional()` con descripciones y ejemplos.

## 3. Seguridad y Protección de Endpoints

- **Helmet**: Mantén activo `helmet()` en `main.ts` para cabeceras HTTP seguras.
- **CORS & Cookies**: Asegura `credentials: true` para permitir cookies HttpOnly entre `sga-web` y `sga-api`.
- **CSRF**: Utiliza `csrf-csrf` para endpoints mutantes sensibles cuando se consumen cookies de sesión.
- **Rate Limiting**: Utiliza `@nestjs/throttler` para limitar peticiones excesivas o ataques de fuerza bruta en rutas críticas (ej. `/api/auth/login`).
- **Autenticación & Guards**:
  - Aplica `JwtAuthGuard` a nivel de módulo o controlador para proteger rutas privadas.
  - Usa decoradores personalizados como `@Public()` para exceptuar rutas abiertas explícitamente.
  - Utiliza `@CurrentUser()` para extraer de manera tipada la información del usuario autenticado desde `req.user`.
