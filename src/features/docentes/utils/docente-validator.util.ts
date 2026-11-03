import { randomInt } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { DOCENTE_MESSAGES } from "../constants";

export function validarFechasDocente(fechaIngreso: string, fechaCese?: string | null): void {
  if (!fechaCese) return;

  const fIngreso = new Date(fechaIngreso);
  const fCese = new Date(fechaCese);

  if (fCese <= fIngreso) {
    throw new BadRequestException(DOCENTE_MESSAGES.FECHA_CESE_INVALIDA);
  }
}

export function generateCredencialPin(): string {
  // PIN numérico de 4 dígitos para marcación en kiosko
  return randomInt(1000, 10000).toString();
}

export function generateCodigoCredencial(numeroDocumento: string): string {
  return `CR-${numeroDocumento.trim()}`;
}
