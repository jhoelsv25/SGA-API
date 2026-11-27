import { sinFichaDocente } from "../../../../common/utils/ficha-docente.util";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  DECISIONES_CON_COMPROMISO,
  MENSAJES_CONSOLIDADO,
  mensajeNuevaVersion,
} from "../../constants";
import type { ActualizarDecisionDto, CerrarConsolidadoDto, SolicitarRevisionDto } from "../../dto";
import type { ActorConsolidado } from "../../interfaces";
import { calcularHorasPedagogicas, formatearMinutosAHrsMin } from "../../utils";
import type { ConsolidadoDocenteServiceDeps, ConsolidadoDocenteServiceCalls } from "./deps";

export async function obtenerDetalle(
  deps: ConsolidadoDocenteServiceDeps,
  consolidadoId: string,
  actor: ActorConsolidado,
) {
  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  // Docente sin permiso sobre consolidado de otro - CP-RF013-20
  if (actor.role === "Docente") {
    const docenteActor = await deps.repository.obtenerDocenteDePersona(actor.personaId);
    if (!docenteActor || docenteActor.id !== consolidado.docenteId) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  const periodo = await deps.repository.obtenerPeriodo(consolidado.periodoId);
  if (!periodo) {
    throw new NotFoundException("Bimestre no encontrado.");
  }

  const sesiones = await deps.repository.obtenerDetalleSesiones(
    consolidado.docenteId,
    periodo.fechaInicio,
    periodo.fechaFin,
  );

  const solicitudPendiente = await deps.repository.obtenerSolicitudPendiente(consolidado.id);

  return {
    consolidado: {
      ...consolidado,
      ...calcularHorasPedagogicas(
        consolidado.minutosProgramados,
        consolidado.minutosDictados,
        consolidado.minutosHoraPedagogica,
      ),
      tiempoTotalFueraTexto: formatearMinutosAHrsMin(consolidado.minutosTotalFuera),
    },
    sesiones,
    solicitudPendiente,
    firmaDocenteUrl: consolidado.firmaDocenteUrl,
  };
}

export async function obtenerMiSeguimiento(
  deps: ConsolidadoDocenteServiceDeps,
  periodoId: string,
  actor: ActorConsolidado,
) {
  const docente = await deps.repository.obtenerDocenteDePersona(actor.personaId);
  if (!docente) {
    throw sinFichaDocente();
  }

  const consolidado = await deps.repository.obtenerConsolidadoVigenteDocente(docente.id, periodoId);

  if (!consolidado) {
    throw new NotFoundException("Aún no se ha generado el consolidado de este bimestre.");
  }

  return await obtenerDetalle(deps, consolidado.id, actor);
}

export async function registrarDecision(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  consolidadoId: string,
  dto: ActualizarDecisionDto,
  actor: ActorConsolidado,
) {
  calls.exigirDirectorOAdmin(actor);

  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  // No se cambia a una decisión sin compromisos mientras queden compromisos pendientes (RF-013 V2).
  if (!DECISIONES_CON_COMPROMISO.includes(dto.decision)) {
    const pendientes = await deps.repository.contarCompromisosPendientes(
      consolidado.docenteId,
      consolidado.periodoId,
    );
    if (pendientes > 0) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.COMPROMISOS_PENDIENTES_CAMBIO_DECISION);
    }
  }

  const actualizado = await deps.repository.actualizarDecision(
    consolidadoId,
    dto.decision,
    dto.observacion,
  );

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "consolidados_docente",
    registroId: consolidadoId,
    valorAnterior: {
      decision: consolidado.decision,
      observacion: consolidado.observacion,
    },
    valorNuevo: {
      decision: dto.decision,
      observacion: dto.observacion,
    },
  });

  return actualizado;
}

export async function reabrirConsolidado(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  consolidadoId: string,
  actor: ActorConsolidado,
) {
  calls.exigirDirectorOAdmin(actor);

  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  const actualizado = await deps.repository.reabrirConsolidado(consolidadoId);

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "consolidados_docente",
    registroId: consolidadoId,
    valorAnterior: { estado: consolidado.estado },
    valorNuevo: { estado: "reabierto" },
  });

  return {
    consolidado: actualizado,
    mensaje: MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO,
  };
}

export async function cerrarConsolidado(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  consolidadoId: string,
  dto: CerrarConsolidadoDto,
  actor: ActorConsolidado,
) {
  calls.exigirDirectorOAdmin(actor);

  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  if (consolidado.estado !== "reabierto" || !consolidado.vigente) {
    throw new ConflictException(MENSAJES_CONSOLIDADO.CIERRE_SIN_REAPERTURA);
  }

  // Si ya es versión 1 o superior, para versionar a 2+ es obligatorio el motivo - CP-RF013-09
  if (consolidado.version >= 1 && !dto.motivoCambio?.trim()) {
    throw new BadRequestException(MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO);
  }

  const periodo = await deps.repository.obtenerPeriodo(consolidado.periodoId);
  if (!periodo) {
    throw new NotFoundException("Bimestre no encontrado.");
  }

  // Recalcular métricas actuales (incluyendo ausencias anuladas o corregidas)
  const metricas = await deps.repository.calcularMetricasDocente(
    consolidado.docenteId,
    periodo.fechaInicio,
    periodo.fechaFin,
  );

  const nuevaVersion = await deps.repository.cerrarConNuevaVersion(
    consolidadoId,
    dto.motivoCambio!.trim(),
    { ...metricas, minutosHoraPedagogica: await calls.minutosHoraPedagogica() },
    actor.id,
  );

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "consolidados_docente",
    registroId: nuevaVersion.id,
    valorAnterior: { id: consolidado.id, version: consolidado.version },
    valorNuevo: {
      id: nuevaVersion.id,
      version: nuevaVersion.version,
      motivoCambio: dto.motivoCambio,
    },
  });

  return {
    version: nuevaVersion.version,
    mensaje: mensajeNuevaVersion(nuevaVersion.version),
  };
}

export async function historialVersiones(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  consolidadoId: string,
  actor: ActorConsolidado,
) {
  calls.exigirAccesoGeneral(actor);

  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  return await deps.repository.listarHistorialVersiones(
    consolidado.docenteId,
    consolidado.periodoId,
  );
}

export async function solicitarRevision(
  deps: ConsolidadoDocenteServiceDeps,
  consolidadoId: string,
  dto: SolicitarRevisionDto,
  actor: ActorConsolidado,
) {
  if (actor.role !== "Docente") {
    throw new ForbiddenException("Solo los docentes pueden enviar solicitudes de revisión.");
  }

  if (!dto.motivo?.trim()) {
    throw new BadRequestException(MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO);
  }

  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

  const docenteActor = await deps.repository.obtenerDocenteDePersona(actor.personaId);
  if (!docenteActor || docenteActor.id !== consolidado.docenteId) {
    throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
  }

  const pendiente = await deps.repository.obtenerSolicitudPendiente(consolidadoId);
  if (pendiente) {
    throw new ConflictException(MENSAJES_CONSOLIDADO.SOLICITUD_REPETIDA);
  }

  const solicitud = await deps.repository.crearSolicitudRevision({
    consolidadoId,
    docenteId: consolidado.docenteId,
    motivo: dto.motivo.trim(),
    adjuntoUrl: dto.adjuntoUrl,
  });

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "crear",
    tabla: "solicitudes_revision_consolidado",
    registroId: solicitud.id,
    valorNuevo: solicitud as unknown as Record<string, unknown>,
  });

  // Notificar al director si corresponde
  if (consolidado.generadoPorId) {
    await deps.notificacionesService.enviar({
      usuarioId: consolidado.generadoPorId,
      tipo: "informacion",
      titulo: "Nueva solicitud de revisión de consolidado",
      mensaje: `El docente ${consolidado.docenteNombre} ha enviado una solicitud de revisión para el consolidado del ${consolidado.periodoNombre}.`,
      enlaceUrl: `/admin/consolidados-docentes?periodoId=${consolidado.periodoId}`,
    });
  }

  return {
    solicitud,
    mensaje: MENSAJES_CONSOLIDADO.SOLICITUD_ENVIADA,
  };
}
