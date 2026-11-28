import * as crypto from "crypto";

/** Diferencia máxima aceptada entre la hora del kiosko y la del servidor. */
export const TOLERANCIA_FIRMA_KIOSKO_MS = 5 * 60 * 1000;

/** Llave pública ECDSA P-256 sin comprimir (65 bytes) en base64url. */
export const FORMATO_LLAVE_PUBLICA_KIOSKO = /^B[A-Za-z0-9_-]{86}$/;

export interface PeticionFirmada {
  metodo: string;
  /** Ruta sin el prefijo /api ni parámetros. */
  ruta: string;
  fecha: string;
  nonce: string;
  /** JSON del cuerpo, o cadena vacía si no hay. */
  cuerpo: string;
}

/** Texto que firma el navegador. Debe coincidir con SGA-WEB/lib/llave-kiosko.ts. */
export function textoAFirmar({ metodo, ruta, fecha, nonce, cuerpo }: PeticionFirmada): string {
  const huellaCuerpo = crypto.createHash("sha256").update(cuerpo).digest("hex");
  return [metodo.toUpperCase(), ruta, fecha, nonce, huellaCuerpo].join("\n");
}

export function importarLlavePublica(llave: string): crypto.KeyObject | null {
  if (!FORMATO_LLAVE_PUBLICA_KIOSKO.test(llave)) return null;
  const bytes = Buffer.from(llave, "base64url");
  if (bytes.length !== 65 || bytes[0] !== 4) return null;
  try {
    return crypto.createPublicKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        x: bytes.subarray(1, 33).toString("base64url"),
        y: bytes.subarray(33).toString("base64url"),
      },
    });
  } catch {
    // El punto no pertenece a la curva
    return null;
  }
}

export function firmaValida(llave: string, firma: string, peticion: PeticionFirmada): boolean {
  const publica = importarLlavePublica(llave);
  if (!publica) return false;
  return crypto.verify(
    "sha256",
    Buffer.from(textoAFirmar(peticion)),
    { key: publica, dsaEncoding: "ieee-p1363" },
    Buffer.from(firma, "base64url"),
  );
}
