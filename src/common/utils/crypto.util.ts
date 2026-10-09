import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Genera el hash seguro de una contraseña usando bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra su hash bcryptjs.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Genera un hash SHA-256 en formato hexadecimal.
 * Útil para firmas de sesiones, verificación de integridad, tokens y PINs.
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
