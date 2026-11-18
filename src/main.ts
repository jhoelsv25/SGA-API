// Garantizar que todo el runtime de Node.js opere en UTC
process.env.TZ = "UTC";

import { join } from "path";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { WinstonModule } from "nest-winston";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter, LoggingInterceptor } from "./common";
import {
  crearCsrfUtils,
  crearMiddlewareUploads,
  getCorsConfig,
  getWinstonLoggerConfig,
  setupSwagger,
} from "./config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(getWinstonLoggerConfig()),
  });
  const configService = app.get(ConfigService);

  // Compresión de respuestas HTTP (gzip)
  app.use(compression());

  // Seguridad HTTP Headers
  app.use(helmet());

  // Parser de cookies (para HttpOnly cookies de autenticación)
  app.use(cookieParser());

  // Proteger archivos privados en /uploads/ (solo /uploads/logos/ es público)
  app.use(crearMiddlewareUploads(configService));

  // Servir archivos estáticos subidos (/uploads)
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });

  // Protección CSRF (Double Submit Cookie) para peticiones con cookie de sesión
  const { doubleCsrfProtection } = crearCsrfUtils(configService);
  app.use(doubleCsrfProtection);

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

  // Filtro global para captura y estandarización de errores
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Interceptor global para trazabilidad y auditoría de peticiones HTTP
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Configuración modular de CORS
  app.enableCors(getCorsConfig(configService));

  // Documentación OpenAPI / Swagger: solo fuera de producción, salvo SWAGGER_ENABLED=true
  const esProduccion = configService.get<string>("NODE_ENV") === "production";
  if (!esProduccion || configService.get<string>("SWAGGER_ENABLED") === "true") {
    setupSwagger(app);
  }

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);
}

void bootstrap();
