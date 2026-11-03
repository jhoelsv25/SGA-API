import { randomInt } from "node:crypto";
import { hashSha256 } from "../../../common/utils";

/**
 * Genera un PIN numérico de 4 dígitos para marcación en kiosko.
 */
export function generarPinCredencial(): string {
  return randomInt(1000, 10000).toString();
}

/**
 * Genera el código único para una credencial.
 * @param numeroDocumento Número de documento de la persona
 * @param conSufijoAleatorio Si true, agrega un sufijo aleatorio de 3 dígitos (usado en reemisiones)
 */
export function generarCodigoCredencial(
  numeroDocumento: string,
  conSufijoAleatorio = false,
): string {
  const doc = numeroDocumento.trim();
  if (!conSufijoAleatorio) {
    return `CR-${doc}`;
  }
  const sufijoAleatorio = randomInt(100, 1000).toString();
  return `CR-${doc}-${sufijoAleatorio}`;
}

/**
 * Genera un par de credenciales: PIN en texto plano y su correspondiente hash SHA-256.
 */
export function generarPinConHash(): { pinPlano: string; pinHash: string } {
  const pinPlano = generarPinCredencial();
  const pinHash = hashSha256(pinPlano);
  return { pinPlano, pinHash };
}
