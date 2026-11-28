import { applyDecorators, createParamDecorator, ExecutionContext, UseGuards } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";
import { FirmaKioskoGuard, type PeticionKiosko } from "../guards/firma-kiosko.guard";

/** Ruta usada por un kiosko: exige la firma del navegador y documenta sus cabeceras. */
export function FirmadoPorKiosko() {
  return applyDecorators(
    UseGuards(FirmaKioskoGuard),
    ApiHeader({ name: "x-kiosk-key", description: "Llave pública del navegador (base64url)" }),
    ApiHeader({ name: "x-kiosk-timestamp", description: "Hora del pedido en milisegundos" }),
    ApiHeader({ name: "x-kiosk-nonce", description: "32 hexadecimales de un solo uso" }),
    ApiHeader({ name: "x-kiosk-signature", description: "Firma ECDSA P-256 del pedido" }),
  );
}

/** Llave pública ya verificada por FirmaKioskoGuard. */
export const LlaveKiosko = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<PeticionKiosko>().llaveKiosko,
);
