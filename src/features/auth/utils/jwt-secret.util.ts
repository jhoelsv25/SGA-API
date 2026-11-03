import type { ConfigService } from "@nestjs/config";

/**
 * Obtiene el secreto JWT desde la configuración.
 * No existe valor por defecto: si falta, la aplicación debe fallar al iniciar
 * en lugar de firmar tokens con un secreto público.
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>("JWT_SECRET");
  if (!secret || secret.trim().length === 0) {
    throw new Error("La variable de entorno JWT_SECRET es obligatoria y no está definida.");
  }
  return secret;
}
