import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { RedisService } from "@/core/redis/redis.service";
import { firmaValida, TOLERANCIA_FIRMA_KIOSKO_MS } from "../utils/firma-kiosko.util";

export type PeticionKiosko = Request & { llaveKiosko?: string };

const NO_AUTORIZADO = "Este equipo no está autorizado. Comuníquese con el área de TI.";
const HORA_DESFASADA =
  "La fecha u hora de este equipo no es correcta. Corríjala y vuelva a intentar.";
const PREFIJO_NONCE_REDIS = "kiosko:nonce:";
const TTL_NONCE_MS = 2 * TOLERANCIA_FIRMA_KIOSKO_MS;

// Respaldo en memoria para tests o si Redis no está disponible temporalmente.
const noncesUsados = new Map<string, number>();
let proximaLimpieza = 0;

function usarNonceEnMemoria(clave: string, ahora: number): boolean {
  if (ahora >= proximaLimpieza) {
    for (const [nonce, vence] of noncesUsados) {
      if (vence <= ahora) noncesUsados.delete(nonce);
    }
    proximaLimpieza = ahora + 60_000;
  }
  if ((noncesUsados.get(clave) ?? 0) > ahora) return false;
  // Una fecha puede ir adelantada hasta la tolerancia, así que sigue vigente el doble
  noncesUsados.set(clave, ahora + TTL_NONCE_MS);
  return true;
}

/**
 * Comprueba que el pedido esté firmado con la llave privada del navegador y deja en
 * `llaveKiosko` su llave pública. Saber si esa llave está autorizada lo decide el servicio.
 * Sin firma no deja llave: el servicio responde que el equipo no está autorizado.
 */
@Injectable()
export class FirmaKioskoGuard implements CanActivate {
  private readonly logger = new Logger(FirmaKioskoGuard.name);

  constructor(@Optional() private readonly redisService?: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    if (!(await this.reservarNonce(`${llave}:${nonce}`, ahora))) {
      throw new UnauthorizedException(NO_AUTORIZADO);
    }
    req.llaveKiosko = llave;
    return true;
  }

  private async reservarNonce(clave: string, ahora: number): Promise<boolean> {
    if (!this.redisService) {
      return usarNonceEnMemoria(clave, ahora);
    }
    try {
      return await this.redisService.setIfNotExistsPx(
        `${PREFIJO_NONCE_REDIS}${clave}`,
        "1",
        TTL_NONCE_MS,
      );
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo verificar el nonce del kiosko en Redis (${detalle}); usando respaldo en memoria.`,
      );
      return usarNonceEnMemoria(clave, ahora);
    }
  }
}
