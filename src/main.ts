import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Seguridad HTTP Headers
  app.use(helmet());

  // Parser de cookies (para HttpOnly cookies de autenticación)
  app.use(cookieParser());

  // Prefijo global de API (/api)
  app.setGlobalPrefix("api");

  // Validación y transformación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de CORS
  const frontendUrl = configService.get<string>("FRONTEND_URL", "http://localhost:3001");
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Documentación OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("SGA API")
    .setDescription("Documentación interactiva de la API del Sistema SGA")
    .setVersion("1.0")
    .addBearerAuth()
    .addCookieAuth("access_token")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
}

void bootstrap();
