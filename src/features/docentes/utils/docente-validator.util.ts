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
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateCodigoCredencial(numeroDocumento: string): string {
  return `CR-${numeroDocumento.trim()}`;
}
