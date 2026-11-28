import * as crypto from "crypto";
import { textoAFirmar } from "../../src/features/equipos/utils/firma-kiosko.util";

/** Imita al navegador de un kiosko: llave propia y pedidos firmados. */
export function crearKioskoDePrueba() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = publicKey.export({ format: "jwk" });
  const llavePublica = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x as string, "base64url"),
    Buffer.from(jwk.y as string, "base64url"),
  ]).toString("base64url");

  const cabeceras = (metodo: string, ruta: string, cuerpo?: object, ahora = Date.now()) => {
    const fecha = String(ahora);
    const nonce = crypto.randomBytes(16).toString("hex");
    const texto = textoAFirmar({
      metodo,
      ruta,
      fecha,
      nonce,
      cuerpo: cuerpo ? JSON.stringify(cuerpo) : "",
    });
    return {
      "x-kiosk-key": llavePublica,
      "x-kiosk-timestamp": fecha,
      "x-kiosk-nonce": nonce,
      "x-kiosk-signature": crypto
        .sign("sha256", Buffer.from(texto), { key: privateKey, dsaEncoding: "ieee-p1363" })
        .toString("base64url"),
    };
  };

  return { llavePublica, cabeceras };
}
