import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MENSAJES_CONSOLIDADO } from "../../constants";
import type { ResolverSolicitudRevisionDto } from "../../dto";
import type { ActorConsolidado } from "../../interfaces";
import {
  formatearMinutosAHrsMin,
  generarExcelConsolidados,
  generarFichaDocentePdf,
} from "../../utils";
import type { ConsolidadoDocenteServiceDeps, ConsolidadoDocenteServiceCalls } from "./deps";

export async function resolverSolicitud(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  solicitudId: string,
  dto: ResolverSolicitudRevisionDto,
  actor: ActorConsolidado,
) {
  calls.exigirDirectorOAdmin(actor);

  const solicitud = await deps.repository.obtenerSolicitudPorId(solicitudId);
  if (!solicitud) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.SOLICITUD_NO_ENCONTRADA);
  }

  if (solicitud.estado !== "solicitada") {
    throw new ConflictException(MENSAJES_CONSOLIDADO.SOLICITUD_NO_PENDIENTE);
  }

  if (dto.accion === "rechazar" && !dto.respuesta?.trim()) {
    throw new BadRequestException(MENSAJES_CONSOLIDADO.SOLICITUD_RECHAZADA_SIN_RESPUESTA);
  }

  const respuestaFinal = dto.respuesta?.trim() || "";

  const resuelta = await deps.repository.resolverSolicitud(
    solicitudId,
    dto.accion,
    respuestaFinal,
    actor.id,
  );

  await deps.auditService.log({
    usuarioId: actor.id,
    accion: "actualizar",
    tabla: "solicitudes_revision_consolidado",
    registroId: solicitudId,
    valorAnterior: { estado: solicitud.estado },
    valorNuevo: { estado: resuelta.estado, respuesta: respuestaFinal },
  });

  // Notificar al docente
  if (solicitud.docenteUsuarioId) {
    const consolidadoSolicitud = await deps.repository.obtenerConsolidadoPorId(
      solicitud.consolidadoId,
    );
    const periodoDestino = consolidadoSolicitud?.periodoId ?? solicitud.consolidadoId;
    const textoMensaje =
      dto.accion === "aceptar"
        ? `Tu solicitud de revisión fue aceptada. El consolidado fue reabierto.${respuestaFinal ? " Respuesta: " + respuestaFinal : ""}`
        : `Tu solicitud de revisión fue rechazada. Respuesta: ${respuestaFinal}`;

    await deps.notificacionesService.enviar({
      usuarioId: solicitud.docenteUsuarioId,
      tipo: "informacion",
      titulo: `Solicitud de revisión ${dto.accion === "aceptar" ? "aceptada" : "rechazada"}`,
      mensaje: textoMensaje,
      enlaceUrl: `/admin/mi-seguimiento?periodoId=${periodoDestino}`,
    });
  }

  return {
    solicitud: resuelta,
    mensaje:
      dto.accion === "aceptar"
        ? "Solicitud aceptada y consolidado reabierto."
        : "Solicitud rechazada con respuesta.",
  };
}

export async function exportarExcel(
  deps: ConsolidadoDocenteServiceDeps,
  calls: ConsolidadoDocenteServiceCalls,
  periodoId: string,
  actor: ActorConsolidado,
  generadoPor: string,
) {
  calls.exigirAccesoGeneral(actor);

  const periodo = await deps.repository.obtenerPeriodo(periodoId);
  if (!periodo) {
    throw new NotFoundException("Bimestre no encontrado.");
  }

  const consolidados = await deps.repository.obtenerConsolidadosVigentesPeriodo(periodoId);

  const institucion = await deps.institucionService.get().catch(() => null);
  return await generarExcelConsolidados(periodo.nombre, consolidados, {
    institucion: institucion?.nombre ?? "SGA Colegio",
    generadoPor,
  });
}

export async function descargarFichaPdf(
  deps: ConsolidadoDocenteServiceDeps,
  consolidadoId: string,
  actor: ActorConsolidado,
) {
  const consolidado = await deps.repository.obtenerConsolidadoPorId(consolidadoId);
  if (!consolidado) {
    throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
  }

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

  return await generarFichaDocentePdf({
    colegio: {
      nombre: "I.E. NUESTRA SEÑORA DEL CARMEN — SECUNDARIA",
    },
    docente: {
      nombreCompleto: consolidado.docenteNombre,
      numeroDocumento: consolidado.docenteDni,
      firmaUrl: consolidado.firmaDocenteUrl,
    },
    consolidado: {
      bimestre: periodo.nombre,
      version: consolidado.version,
      estado: consolidado.estado,
      generadoEn: consolidado.generadoEn,
      sesionesProgramadas: consolidado.sesionesProgramadas,
      sesionesCumplidas: consolidado.sesionesCumplidas,
      sesionesParciales: consolidado.sesionesParciales,
      sesionesNoCumplidas: consolidado.sesionesNoCumplidas,
      sesionesJustificadas: consolidado.sesionesJustificadas,
      totalAusencias: consolidado.totalAusencias,
      minutosFueraAula: consolidado.minutosFueraAula,
      minutosPerdidosFirma: consolidado.minutosPerdidosFirma,
      minutosTotalFuera: consolidado.minutosTotalFuera,
      tiempoTotalFueraTexto: formatearMinutosAHrsMin(consolidado.minutosTotalFuera),
      decision: consolidado.decision,
      observacion: consolidado.observacion,
    },
    sesiones: sesiones.map((s) => ({
      fecha: s.fecha,
      curso: s.cursoNombre,
      seccion: s.seccionNombre,
      grado: s.gradoNombre,
      tema: s.tema,
      horaIngresoFirmada: s.horaIngresoFirmada,
      horaSalidaFirmada: s.horaSalidaFirmada,
      minutosPerdidos: s.minutosPerdidos,
      estado: s.estado,
      ausencias: s.ausencias.map((a) => ({
        tramoHorario: a.tramoHorario,
        minutos: a.minutos,
        motivo: a.motivo,
        observacion: a.observacion,
        descargo: a.descargo,
        anulada: a.anulada,
      })),
    })),
  });
}

export async function validarModificacionPermitida(
  deps: ConsolidadoDocenteServiceDeps,
  docenteId: string,
  fecha: string,
) {
  const bloqueado = await deps.repository.consolidadoCerradoBloqueante(docenteId, fecha);
  if (bloqueado) {
    throw new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO);
  }
}
