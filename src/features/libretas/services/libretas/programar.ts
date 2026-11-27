import { BadRequestException, ConflictException } from "@nestjs/common";
import { MENSAJES_LIBRETAS, mensajeProgramadas } from "../../constants";
import type { ActorLibreta } from "../../interfaces";
import { formatearFechaLimite } from "../../utils";
import type { LibretasServiceDeps, LibretasServiceCalls } from "./deps";
import { periodoDelAnio } from "./periodo-del-anio";

export async function programar(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  periodoId: string,
  fechaLimite: string,
  actor: ActorLibreta,
  ip?: string,
) {
  calls.exigirPrograma(actor);
  const periodo = await periodoDelAnio(deps, periodoId);
  if (await deps.repository.existeProgramacion(periodoId)) {
    throw new ConflictException(MENSAJES_LIBRETAS.YA_PROGRAMADO);
  }

  const cantidad = await deps.repository.programar(
    periodoId,
    periodo.anioAcademicoId,
    fechaLimite.slice(0, 10),
  );
  const mensaje = mensajeProgramadas(cantidad, periodo.nombre, formatearFechaLimite(fechaLimite));

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "crear",
    tabla: "libretas",
    registroId: periodoId,
    valorNuevo: { periodoId, fechaLimite, cantidad },
    direccionIp: ip,
  });

  return { mensaje, cantidad, periodoId, fechaLimite: fechaLimite.slice(0, 10) };
}

export async function cambiarFecha(
  deps: LibretasServiceDeps,
  calls: LibretasServiceCalls,
  periodoId: string,
  fechaLimite: string,
  actor: ActorLibreta,
  ip?: string,
) {
  calls.exigirPrograma(actor);
  await calls.periodoDelAnio(periodoId);
  if (!(await deps.repository.existeProgramacion(periodoId))) {
    throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PROGRAMAR);
  }

  const actualizadas = await deps.repository.cambiarFechaPendientes(
    periodoId,
    fechaLimite.slice(0, 10),
  );
  if (actualizadas === 0) {
    throw new BadRequestException(MENSAJES_LIBRETAS.SIN_PENDIENTES);
  }

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "libretas",
    registroId: periodoId,
    valorNuevo: { fechaLimite, actualizadas, soloPendientes: true },
    direccionIp: ip,
  });

  return { actualizadas, fechaLimite: fechaLimite.slice(0, 10) };
}

export async function crearPendientesDeMatricula(
  deps: LibretasServiceDeps,
  matriculaId: string,
): Promise<number> {
  return deps.repository.crearPendientesDeMatricula(matriculaId);
}

export async function eliminarPendientesPorRetiro(
  deps: LibretasServiceDeps,
  matriculaId: string,
  fechaRetiro: string,
): Promise<number> {
  return deps.repository.eliminarPendientesAntesDeLimite(matriculaId, fechaRetiro.slice(0, 10));
}
