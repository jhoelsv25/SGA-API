import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { InstitucionService } from "../institucion/institucion.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import {
  MENSAJES_CONSOLIDADO,
  mensajeConsolidadosGenerados,
  mensajeNuevaVersion,
} from "./constants";
import type {
  ActualizarDecisionDto,
  CerrarConsolidadoDto,
  ConsolidadoQueryDto,
  GenerarConsolidadoDto,
  ResolverSolicitudRevisionDto,
  SolicitarRevisionDto,
} from "./dto";
import type { ActorConsolidado, ConsolidadoResumenItem } from "./interfaces";
import { ConsolidadoDocenteRepository } from "./repositories";
import {
  formatearMinutosAHrsMin,
  generarExcelConsolidados,
  generarFichaDocentePdf,
  puedeGenerarConsolidadoPeriodo,
} from "./utils";

@Injectable()
export class ConsolidadoDocenteService {
  constructor(
    private readonly repository: ConsolidadoDocenteRepository,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
    private readonly institucionService: InstitucionService,
  ) {}

  private exigirDirectorOAdmin(actor: ActorConsolidado) {
    if (actor.role !== "Director" && actor.role !== "Administrador") {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  private exigirAccesoGeneral(actor: ActorConsolidado) {
    if (
      actor.role !== "Director" &&
      actor.role !== "Subdirector" &&
      actor.role !== "Administrador"
    ) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }
  }

  async generarConsolidados(dto: GenerarConsolidadoDto, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);

    const periodo = await this.repository.obtenerPeriodo(dto.periodoId);
    if (!periodo) {
      throw new NotFoundException("Bimestre no encontrado.");
    }

    // Validar ventana de generación (última semana o cerrado) - CP-RF013-03
    const hoyIso = new Date().toISOString().split("T")[0];
    const puedeGenerar = puedeGenerarConsolidadoPeriodo(periodo.fechaFin, periodo.estado, hoyIso);
    if (!puedeGenerar) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO);
    }

    // Generación individual
    if (dto.docenteId) {
      const existente = await this.repository.obtenerConsolidadoVigenteDocente(
        dto.docenteId,
        periodo.id,
      );
      if (existente) {
        throw new ConflictException(MENSAJES_CONSOLIDADO.YA_EXISTE_CONSOLIDADO);
      }

      const metricas = await this.repository.calcularMetricasDocente(
        dto.docenteId,
        periodo.fechaInicio,
        periodo.fechaFin,
      );

      const consolidado = await this.repository.crearConsolidado({
        docenteId: dto.docenteId,
        periodoId: periodo.id,
        ...metricas,
        generadoPorId: actor.id,
      });

      await this.auditService.log({
        usuarioId: actor.id,
        accion: "crear",
        tabla: "consolidados_docente",
        registroId: consolidado.id,
        valorNuevo: consolidado,
      });

      return {
        id: consolidado.id,
        mensaje: `Consolidado del ${periodo.nombre} generado exitosamente.`,
      };
    }

    // Generación masiva para todos los docentes con sesiones en el bimestre - CP-RF013-01
    const docentes = await this.repository.listarDocentesConSesionesEnPeriodo(
      periodo.fechaInicio,
      periodo.fechaFin,
    );

    let creados = 0;
    for (const docente of docentes) {
      const existente = await this.repository.obtenerConsolidadoVigenteDocente(
        docente.docenteId,
        periodo.id,
      );
      if (existente) continue;

      const metricas = await this.repository.calcularMetricasDocente(
        docente.docenteId,
        periodo.fechaInicio,
        periodo.fechaFin,
      );

      const consolidado = await this.repository.crearConsolidado({
        docenteId: docente.docenteId,
        periodoId: periodo.id,
        ...metricas,
        generadoPorId: actor.id,
      });

      creados++;

      await this.auditService.log({
        usuarioId: actor.id,
        accion: "crear",
        tabla: "consolidados_docente",
        registroId: consolidado.id,
        valorNuevo: consolidado,
      });

      if (docente.usuarioId) {
        await this.notificacionesService.enviar({
          usuarioId: docente.usuarioId,
          tipo: "informacion",
          titulo: "Consolidado de seguimiento disponible",
          mensaje: `Se ha generado tu consolidado de seguimiento del ${periodo.nombre}.`,
          enlaceUrl: `/admin/mi-seguimiento?periodoId=${periodo.id}`,
        });
      }
    }

    return {
      creados,
      mensaje: mensajeConsolidadosGenerados(creados, periodo.nombre),
    };
  }

  async listarConsolidadosPeriodo(
    dto: ConsolidadoQueryDto,
    actor: ActorConsolidado,
  ): Promise<ConsolidadoResumenItem[]> {
    this.exigirAccesoGeneral(actor);

    const consolidados = await this.repository.obtenerConsolidadosVigentesPeriodo(dto.periodoId);

    if (dto.ordenarPor) {
      const campo = dto.ordenarPor as keyof ConsolidadoResumenItem;
      const asc = dto.orden === "asc";
      consolidados.sort((a, b) => {
        const valA = a[campo];
        const valB = b[campo];
        if (typeof valA === "number" && typeof valB === "number") {
          return asc ? valA - valB : valB - valA;
        }
        return asc
          ? String(valA || "").localeCompare(String(valB || ""))
          : String(valB || "").localeCompare(String(valA || ""));
      });
    }

    return consolidados;
  }

  async obtenerDetalle(consolidadoId: string, actor: ActorConsolidado) {
    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    // Docente sin permiso sobre consolidado de otro - CP-RF013-20
    if (actor.role === "Docente") {
      const docenteActor = await this.repository.obtenerDocenteDePersona(actor.personaId);
      if (!docenteActor || docenteActor.id !== consolidado.docenteId) {
        throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
      }
    }

    const periodo = await this.repository.obtenerPeriodo(consolidado.periodoId);
    if (!periodo) {
      throw new NotFoundException("Bimestre no encontrado.");
    }

    const sesiones = await this.repository.obtenerDetalleSesiones(
      consolidado.docenteId,
      periodo.fechaInicio,
      periodo.fechaFin,
    );

    const solicitudPendiente = await this.repository.obtenerSolicitudPendiente(consolidado.id);

    return {
      consolidado: {
        ...consolidado,
        tiempoTotalFueraTexto: formatearMinutosAHrsMin(consolidado.minutosTotalFuera),
      },
      sesiones,
      solicitudPendiente,
      firmaDocenteUrl: consolidado.firmaDocenteUrl,
    };
  }

  async obtenerMiSeguimiento(periodoId: string, actor: ActorConsolidado) {
    const docente = await this.repository.obtenerDocenteDePersona(actor.personaId);
    if (!docente) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.DOCENTE_NO_ENCONTRADO);
    }

    const consolidado = await this.repository.obtenerConsolidadoVigenteDocente(
      docente.id,
      periodoId,
    );

    if (!consolidado) {
      throw new NotFoundException("Aún no se ha generado el consolidado de este bimestre.");
    }

    return await this.obtenerDetalle(consolidado.id, actor);
  }

  async registrarDecision(
    consolidadoId: string,
    dto: ActualizarDecisionDto,
    actor: ActorConsolidado,
  ) {
    this.exigirDirectorOAdmin(actor);

    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    const actualizado = await this.repository.actualizarDecision(
      consolidadoId,
      dto.decision,
      dto.observacion,
    );

    await this.auditService.log({
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

  async reabrirConsolidado(consolidadoId: string, actor: ActorConsolidado) {
    this.exigirDirectorOAdmin(actor);

    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    const actualizado = await this.repository.reabrirConsolidado(consolidadoId);

    await this.auditService.log({
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

  async cerrarConsolidado(
    consolidadoId: string,
    dto: CerrarConsolidadoDto,
    actor: ActorConsolidado,
  ) {
    this.exigirDirectorOAdmin(actor);

    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    // Si ya es versión 1 o superior, para versionar a 2+ es obligatorio el motivo - CP-RF013-09
    if (consolidado.version >= 1 && !dto.motivoCambio?.trim()) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO);
    }

    const periodo = await this.repository.obtenerPeriodo(consolidado.periodoId);
    if (!periodo) {
      throw new NotFoundException("Bimestre no encontrado.");
    }

    // Recalcular métricas actuales (incluyendo ausencias anuladas o corregidas)
    const metricas = await this.repository.calcularMetricasDocente(
      consolidado.docenteId,
      periodo.fechaInicio,
      periodo.fechaFin,
    );

    const nuevaVersion = await this.repository.cerrarConNuevaVersion(
      consolidadoId,
      dto.motivoCambio!.trim(),
      metricas,
      actor.id,
    );

    await this.auditService.log({
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

  async historialVersiones(consolidadoId: string, actor: ActorConsolidado) {
    this.exigirAccesoGeneral(actor);

    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    return await this.repository.listarHistorialVersiones(
      consolidado.docenteId,
      consolidado.periodoId,
    );
  }

  async solicitarRevision(
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

    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    const docenteActor = await this.repository.obtenerDocenteDePersona(actor.personaId);
    if (!docenteActor || docenteActor.id !== consolidado.docenteId) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
    }

    const pendiente = await this.repository.obtenerSolicitudPendiente(consolidadoId);
    if (pendiente) {
      throw new ConflictException(MENSAJES_CONSOLIDADO.SOLICITUD_REPETIDA);
    }

    const solicitud = await this.repository.crearSolicitudRevision({
      consolidadoId,
      docenteId: consolidado.docenteId,
      motivo: dto.motivo.trim(),
      adjuntoUrl: dto.adjuntoUrl,
    });

    await this.auditService.log({
      usuarioId: actor.id,
      accion: "crear",
      tabla: "solicitudes_revision_consolidado",
      registroId: solicitud.id,
      valorNuevo: solicitud as unknown as Record<string, unknown>,
    });

    // Notificar al director si corresponde
    if (consolidado.generadoPorId) {
      await this.notificacionesService.enviar({
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

  async resolverSolicitud(
    solicitudId: string,
    dto: ResolverSolicitudRevisionDto,
    actor: ActorConsolidado,
  ) {
    this.exigirDirectorOAdmin(actor);

    const solicitud = await this.repository.obtenerSolicitudPorId(solicitudId);
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

    const resuelta = await this.repository.resolverSolicitud(
      solicitudId,
      dto.accion,
      respuestaFinal,
      actor.id,
    );

    await this.auditService.log({
      usuarioId: actor.id,
      accion: "actualizar",
      tabla: "solicitudes_revision_consolidado",
      registroId: solicitudId,
      valorAnterior: { estado: solicitud.estado },
      valorNuevo: { estado: resuelta.estado, respuesta: respuestaFinal },
    });

    // Notificar al docente
    if (solicitud.docenteUsuarioId) {
      const consolidadoSolicitud = await this.repository.obtenerConsolidadoPorId(
        solicitud.consolidadoId,
      );
      const periodoDestino = consolidadoSolicitud?.periodoId ?? solicitud.consolidadoId;
      const textoMensaje =
        dto.accion === "aceptar"
          ? `Tu solicitud de revisión fue aceptada. El consolidado fue reabierto.${respuestaFinal ? " Respuesta: " + respuestaFinal : ""}`
          : `Tu solicitud de revisión fue rechazada. Respuesta: ${respuestaFinal}`;

      await this.notificacionesService.enviar({
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

  async exportarExcel(periodoId: string, actor: ActorConsolidado, generadoPor: string) {
    this.exigirAccesoGeneral(actor);

    const periodo = await this.repository.obtenerPeriodo(periodoId);
    if (!periodo) {
      throw new NotFoundException("Bimestre no encontrado.");
    }

    const consolidados = await this.repository.obtenerConsolidadosVigentesPeriodo(periodoId);

    const institucion = await this.institucionService.get().catch(() => null);
    return await generarExcelConsolidados(periodo.nombre, consolidados, {
      institucion: institucion?.nombre ?? "SGA Colegio",
      generadoPor,
    });
  }

  async descargarFichaPdf(consolidadoId: string, actor: ActorConsolidado) {
    const consolidado = await this.repository.obtenerConsolidadoPorId(consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.NO_ENCONTRADO);
    }

    if (actor.role === "Docente") {
      const docenteActor = await this.repository.obtenerDocenteDePersona(actor.personaId);
      if (!docenteActor || docenteActor.id !== consolidado.docenteId) {
        throw new ForbiddenException(MENSAJES_CONSOLIDADO.NO_TIENE_PERMISO);
      }
    }

    const periodo = await this.repository.obtenerPeriodo(consolidado.periodoId);
    if (!periodo) {
      throw new NotFoundException("Bimestre no encontrado.");
    }

    const sesiones = await this.repository.obtenerDetalleSesiones(
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

  /**
   * Validador público invocado por Sesiones (RF-011) y Ausencias (RF-012)
   * para bloquear modificaciones si el consolidado está cerrado (CP-RF013-06).
   */
  async validarModificacionPermitida(docenteId: string, fecha: string) {
    const bloqueado = await this.repository.consolidadoCerradoBloqueante(docenteId, fecha);
    if (bloqueado) {
      throw new ForbiddenException(MENSAJES_CONSOLIDADO.CONSOLIDADO_CERRADO);
    }
  }
}
