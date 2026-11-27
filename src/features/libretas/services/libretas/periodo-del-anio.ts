import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MENSAJES_LIBRETAS, ROLES_PROGRAMAN } from "../../constants";
import type { ActorLibreta, AlcanceLibreta } from "../../interfaces";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./deps";

export async function periodoDelAnio(deps: LibretasServiceDeps, periodoId: string) {
  const periodo = await deps.repository.obtenerPeriodo(periodoId);
  if (!periodo) throw new NotFoundException(MENSAJES_LIBRETAS.PERIODO_NO_ENCONTRADO);
  const anioId = await deps.repository.anioDeTrabajo(deps.anioLectivo.id());
  if (periodo.anioAcademicoId !== anioId) {
    throw new BadRequestException(MENSAJES_LIBRETAS.PERIODO_NO_ENCONTRADO);
  }
  return periodo;
}

export async function exigirProgramacion(
  deps: LibretasServiceDeps,
  periodoId: string,
): Promise<void> {
  if (!(await deps.repository.existeProgramacion(periodoId))) {
    throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PROGRAMAR);
  }
}

export async function exigirAlcance(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  actor: ActorLibreta,
  seccionId: string,
): Promise<void> {
  const alcance = await calls.alcanceEfectivo(actor);
  if (alcance === "colegio") return;
  if (alcance === "tutoria") {
    const esTutor = await deps.repository.esTutorDeSeccion(actor.personaId, seccionId);
    if (!esTutor) throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
    return;
  }
  if (alcance === "mis_secciones") {
    const esTutor = await deps.repository.esTutorDeSeccion(actor.personaId, seccionId);
    const dicta = await deps.repository.dictaEnSeccion(actor.personaId, seccionId);
    if (!esTutor && !dicta) throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
    return;
  }
  throw new ForbiddenException(MENSAJES_LIBRETAS.SIN_PERMISO_SECCION);
}

export async function alcanceEfectivo(
  deps: LibretasServiceDeps,
  actor: ActorLibreta,
): Promise<AlcanceLibreta | null> {
  const guardado = await deps.repository.obtenerAlcance(actor.roleId);
  if (guardado) return guardado;
  const rol = actor.role.toLowerCase();
  if (rol === "docente") return "mis_secciones";
  if (["director", "subdirector", "secretaria", "administrador"].includes(rol)) return "colegio";
  return null;
}

export function puedeProgramar(actor: ActorLibreta): boolean {
  return ROLES_PROGRAMAN.includes(actor.role.toLowerCase() as (typeof ROLES_PROGRAMAN)[number]);
}

export function exigirPrograma(calls: LibretasServiceCalls, actor: ActorLibreta): void {
  if (!calls.puedeProgramar(actor)) {
    throw new ForbiddenException(MENSAJES_LIBRETAS.PROGRAMAR_DENEGADO);
  }
}

export async function notificarPublicacion(
  deps: LibretasServiceDeps,
  items: Array<{ usuarioEstudianteId: string | null; usuarioApoderadoId: string | null }>,
  bimestre: string,
): Promise<void> {
  const destinatarios = new Set<string>();
  for (const item of items) {
    if (item.usuarioEstudianteId) destinatarios.add(item.usuarioEstudianteId);
    if (item.usuarioApoderadoId) destinatarios.add(item.usuarioApoderadoId);
  }
  await Promise.all(
    [...destinatarios].map((usuarioId) =>
      deps.notificacionesService
        .enviar({
          usuarioId,
          titulo: "Libreta disponible",
          mensaje: `Ya puedes ver la libreta del ${bimestre}.`,
          tipo: "informacion",
          enlaceUrl: "/admin/mis-libretas",
          canales: ["in_app"],
        })
        .catch(() => undefined),
    ),
  );
}
