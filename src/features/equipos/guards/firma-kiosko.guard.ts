import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { firmaValida, TOLERANCIA_FIRMA_KIOSKO_MS } from "../utils/firma-kiosko.util";

export type PeticionKiosko = Request & { llaveKiosko?: string };

const NO_AUTORIZADO = "Este equipo no está autorizado. Comuníquese con el área de TI.";
const HORA_DESFASADA =
  "La fecha u hora de este equipo no es correcta. Corríjala y vuelva a intentar.";

// Nonces ya usados y hasta cuándo recordarlos. Vive en memoria: sirve con una sola instancia de la API.
const noncesUsados = new Map<string, number>();
let proximaLimpieza = 0;

function usarNonce(clave: string, ahora: number): boolean {
  if (ahora >= proximaLimpieza) {
    for (const [nonce, vence] of noncesUsados) {
      if (vence <= ahora) noncesUsados.delete(nonce);
    }
    proximaLimpieza = ahora + 60_000;
  }
  if ((noncesUsados.get(clave) ?? 0) > ahora) return false;
  // Una fecha puede ir adelantada hasta la tolerancia, así que sigue vigente el doble
  noncesUsados.set(clave, ahora + 2 * TOLERANCIA_FIRMA_KIOSKO_MS);
  return true;
}

/**
 * Comprueba que el pedido esté firmado con la llave privada del navegador y deja en
 * `llaveKiosko` su llave pública. Saber si esa llave está autorizada lo decide el servicio.
 * Sin firma no deja llave: el servicio responde que el equipo no está autorizado.
 */
@Injectable()
export class FirmaKioskoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<PeticionKiosko>();
    const cabecera = (nombre: string) => {
      const valor = req.headers[nombre];
      return typeof valor === "string" ? valor : "";
    };
    const llave = cabecera("x-kiosk-key");
    const firma = cabecera("x-kiosk-signature");
    const fecha = cabecera("x-kiosk-timestamp");
    const nonce = cabecera("x-kiosk-nonce");
    if (!llave && !firma) return true;

    const cuerpo = req.body as Record<string, unknown> | undefined;
    const valida =
      /^[0-9a-f]{32}$/.test(nonce) &&
      /^\d{13}$/.test(fecha) &&
      firmaValida(llave, firma, {
        metodo: req.method,
        ruta: req.originalUrl.split("?")[0].replace(/^\/api(?=\/)/, ""),
        fecha,
        nonce,
        cuerpo: cuerpo && Object.keys(cuerpo).length > 0 ? JSON.stringify(cuerpo) : "",
      });
    if (!valida) throw new UnauthorizedException(NO_AUTORIZADO);

    const ahora = Date.now();
    if (Math.abs(ahora - Number(fecha)) > TOLERANCIA_FIRMA_KIOSKO_MS) {
      throw new UnauthorizedException(HORA_DESFASADA);
    }
    if (!usarNonce(`${llave}:${nonce}`, ahora)) {
      throw new UnauthorizedException(NO_AUTORIZADO);
    }
    req.llaveKiosko = llave;
    return true;
  }
}
