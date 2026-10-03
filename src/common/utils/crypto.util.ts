import * as crypto from "crypto";

/**
 * Genera un hash SHA-256 en formato hexadecimal.
 * Útil para firmas de sesiones, verificación de integridad y tokens hash.
 */
export function hashSha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Genera una cadena hexadecimal aleatoria criptográficamente segura.
 * Útil para tokens de restablecimiento de contraseña, claves de un solo uso o correlaciones.
 */
export function generateRandomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
