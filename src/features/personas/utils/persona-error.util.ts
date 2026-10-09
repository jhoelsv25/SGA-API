import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PERSONA_MESSAGES } from "../constants";

export function handlePersonaDatabaseError(error: unknown, logger?: Logger): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const err = error as { message?: string; code?: string; stack?: string };
  const msg = err?.message || "";
  const code = err?.code || "";

  if (
    code === "23505" ||
    msg.includes("ya está registrada") ||
    msg.includes("ux_personas_documento")
  ) {
    throw new ConflictException(PERSONA_MESSAGES.DOCUMENTO_DUPLICADO);
  }

  if (msg.includes("El correo ya está registrado") || msg.includes("ux_personas_correo")) {
    throw new ConflictException(PERSONA_MESSAGES.CORREO_DUPLICADO);
  }

  if (code === "P0002" || msg.includes("Persona no encontrada")) {
    throw new NotFoundException(PERSONA_MESSAGES.NOT_FOUND);
  }

  if (logger) {
    logger.error(`Error de base de datos en personas: ${msg}`, err?.stack);
  }

  throw new InternalServerErrorException("Ocurrió un error inesperado al procesar la persona.");
}
