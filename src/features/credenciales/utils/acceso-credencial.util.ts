import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { CREDENCIAL_MESSAGES, ROLES_EMISION_CARNES } from "../constants";

/** El carné lleva el código con el que se marca: lo ve su dueño o quien emite carnés. */
export function exigirAccesoACredencial(
  usuario: Pick<AuthenticatedUser, "personaId" | "role">,
  personaId: string,
): void {
  const esPropia = usuario.personaId === personaId;
  if (!esPropia && !(ROLES_EMISION_CARNES as readonly string[]).includes(usuario.role)) {
    throw new ForbiddenException(CREDENCIAL_MESSAGES.SIN_ACCESO);
  }
}
