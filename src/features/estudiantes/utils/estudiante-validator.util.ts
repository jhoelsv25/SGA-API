import { randomInt } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { ESTUDIANTE_MESSAGES } from "../constants";

export function validarDiscapacidadEstudiante(
  tieneDiscapacidad?: boolean,
  detalleDiscapacidad?: string | null,
): void {
  if (!tieneDiscapacidad && detalleDiscapacidad && detalleDiscapacidad.trim().length > 0) {
    throw new BadRequestException(ESTUDIANTE_MESSAGES.DISCAPACIDAD_DETALLE_INVALIDO);
  }
}

export function validarFechaNacimiento(fechaNacimiento?: string | null): void {
  if (!fechaNacimiento) return;

  const fecha = new Date(fechaNacimiento);
  const hoy = new Date();

  if (fecha > hoy) {
    throw new BadRequestException(ESTUDIANTE_MESSAGES.FECHA_NACIMIENTO_FUTURA);
  }
}

export function generateCredencialPin(): string {
  // PIN numérico de 4 dígitos para marcación en kiosko escolar
  return randomInt(1000, 10000).toString();
}

export function generateCodigoCredencial(codigoSiagie: string): string {
  return `CR-${codigoSiagie.trim()}`;
}
