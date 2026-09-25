import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Configura la documentación OpenAPI / Swagger en la aplicación.
 * Disponible en /api/docs con soporte para tokens Bearer y cookies HttpOnly.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("SGA API")
    .setDescription("Documentación interactiva de la API del Sistema SGA")
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Ingresa el token JWT para autenticarte",
        in: "header",
      },
      "bearer-token",
    )
    .addCookieAuth("access_token", {
      type: "apiKey",
      in: "cookie",
      name: "access_token",
      description: "Cookie HttpOnly de sesión",
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
    customSiteTitle: "SGA API - Swagger Docs",
  });
}
