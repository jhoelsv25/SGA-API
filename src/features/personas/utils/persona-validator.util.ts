import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CAMPOS_CRITICOS, PERSONA_MESSAGES } from "../constants";
import type { PersonaResponseDto, UpdatePersonaDto } from "../dto";

export function validarFechaNacimiento(fechaStr?: string): void {
  if (!fechaStr) return;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  if (fecha > hoy) {
    throw new BadRequestException(PERSONA_MESSAGES.FECHA_NACIMIENTO_FUTURA);
  }
}

export interface ValidarDatosCriticosParams {
  dto: UpdatePersonaDto;
  existing: PersonaResponseDto;
  actorRole: string;
}

export function validarDatosCriticosModificados(params: {
  dto: UpdatePersonaDto;
  existing: PersonaResponseDto;
  actorRole: string;
}): void {
  const { dto, existing, actorRole } = params;

  if (existing.esProvisional) {
    return;
  }

  const intentoModificarCritico = CAMPOS_CRITICOS.some((campo) => {
    const valNuevo = dto[campo as keyof UpdatePersonaDto];
    if (valNuevo === undefined) return false;
    const valActual = existing[campo as keyof PersonaResponseDto];
    return valNuevo !== valActual;
  });

  if (intentoModificarCritico) {
    if (actorRole !== "Administrador") {
      throw new ForbiddenException(PERSONA_MESSAGES.CRITICAL_DATA_UNAUTHORIZED);
    }

    if (!dto.motivo || dto.motivo.trim().length < 5) {
      throw new BadRequestException(PERSONA_MESSAGES.CRITICAL_DATA_MOTIVO_REQUIRED);
    }
  }
}
