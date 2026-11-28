import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { ConfigService } from "@nestjs/config";
import { HEADER_ANIO_ACADEMICO } from "../common/anio-lectivo";

/**
 * Obtiene la configuración de CORS para la aplicación.
 * Permite comunicación segura con el frontend garantizando el intercambio de cookies HttpOnly.
 */
export const getCorsConfig = (configService: ConfigService): CorsOptions => {
  const frontendUrl = configService.get<string>("FRONTEND_URL", "http://localhost:3001");

  const isProduction = configService.get<string>("NODE_ENV") === "production";

  // Los orígenes locales solo se permiten fuera de producción
  const allowedOrigins: (string | RegExp)[] = isProduction
    ? [frontendUrl]
    : [frontendUrl, "http://localhost:3000", "http://localhost:3001"];

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
      // RF-004/RF-010: el kiosko firma sus pedidos con la llave de su navegador
      "x-kiosk-key",
      "x-kiosk-timestamp",
      "x-kiosk-nonce",
      "x-kiosk-signature",
    ],
    exposedHeaders: ["x-csrf-token"],
  };
};
