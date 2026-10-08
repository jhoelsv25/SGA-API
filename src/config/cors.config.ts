import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { ConfigService } from "@nestjs/config";
import { HEADER_ANIO_ACADEMICO } from "../common/anio-lectivo";

/**
 * Obtiene la configuración de CORS para la aplicación.
 * Permite comunicación segura con el frontend garantizando el intercambio de cookies HttpOnly.
 */
export const getCorsConfig = (configService: ConfigService): CorsOptions => {
  const frontendUrl = configService.get<string>("FRONTEND_URL", "http://localhost:3001");

  const allowedOrigins: (string | RegExp)[] = [
    frontendUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "x-csrf-token",
      HEADER_ANIO_ACADEMICO,
    ],
    exposedHeaders: ["x-csrf-token"],
  };
};
