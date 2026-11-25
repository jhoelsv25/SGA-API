import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import type { ActorObservacion } from "../interfaces";

/** Extrae el actor de observación a partir del usuario autenticado. */
export function actorDe(usuario: AuthenticatedUser): ActorObservacion {
  return {
    id: usuario.id,
    roleId: usuario.roleId,
    role: usuario.role,
    personaId: usuario.personaId,
  };
}
