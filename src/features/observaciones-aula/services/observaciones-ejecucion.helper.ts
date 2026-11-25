import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  CANTIDAD_DESEMPENOS,
  MENSAJES_OBSERVACION,
  ROLES_CORRIGEN,
  type EstadoObservacion,
} from "../constants";
import type { ActorObservacion, CompromisoObsFila, ObservacionFila } from "../interfaces";

export function exigirDesempeno(desempeno: number): void {
  if (!Number.isInteger(desempeno) || desempeno < 1 || desempeno > CANTIDAD_DESEMPENOS) {
    throw new BadRequestException(MENSAJES_OBSERVACION.DESEMPENO_INVALIDO);
  }
}

/** Quien consulta o da seguimiento sin ser el observador asignado, pero nunca el evaluado. */
export function exigirNoEvaluado(actor: ActorObservacion, obs: ObservacionFila): void {
  if (actor.personaId === obs.docentePersonaId) {
    throw new ForbiddenException(MENSAJES_OBSERVACION.NO_TIENE_PERMISO);
  }
}

export function exigirCorrector(actor: ActorObservacion, obs: ObservacionFila): void {
  exigirNoEvaluado(actor, obs);
  if (!(ROLES_CORRIGEN as readonly string[]).includes(actor.role)) {
    throw new ForbiddenException(MENSAJES_OBSERVACION.SOLO_DIRECTOR);
  }
}

export function exigirEstado(
  obs: ObservacionFila,
  estado: EstadoObservacion,
  mensaje: string,
): void {
  if (obs.estado !== estado) throw new BadRequestException(mensaje);
}

export function conVencimiento(c: CompromisoObsFila, hoy: string) {
  return { ...c, vencido: c.estado === "pendiente" && c.fechaRevision < hoy };
}
