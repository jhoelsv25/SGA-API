import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { WinstonModule } from "nest-winston";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common";
import { getCorsConfig, getWinstonLoggerConfig, setupSwagger } from "./config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(getWinstonLoggerConfig()),
  });
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

  // Interceptor global para trazabilidad y auditoría de peticiones HTTP
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Configuración modular de CORS
  app.enableCors(getCorsConfig(configService));

  // Documentación modular OpenAPI / Swagger
  setupSwagger(app);

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
}

void bootstrap();
