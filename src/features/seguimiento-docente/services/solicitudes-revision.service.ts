import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { MENSAJES_CONSOLIDADO } from "../constants";
import type {
  ConsolidadoResumenDto,
  CrearSolicitudRevisionDto,
  FiltroSolicitudesQueryDto,
  MensajeConsolidadoResponseDto,
  MiConsolidadoResponseDto,
  RechazarSolicitudDto,
  ResolverSolicitudDto,
  SolicitudRevisionResponseDto,
} from "../dto";
import type {
  DocenteParaConsolidado,
  PeriodoParaConsolidado,
  SolicitudRevisionFila,
} from "../interfaces";
import { SeguimientoDocenteRepository } from "../repositories";
import { formatearTiempoMinutos } from "../utils";
import { procesarAdjuntoSolicitud } from "../utils/adjuntos-solicitud.util";

/**
 * Servicio de gestión de solicitudes de revisión de consolidado y mi seguimiento docente (HU3).
 * Cumple con los requisitos del RF-013 y las pruebas CP-RF013-11 a CP-RF013-17.
 */
@Injectable()
export class SolicitudesRevisionService {
  constructor(
    private readonly repository: SeguimientoDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * HU3: Consultar el consolidado vigente del docente autenticado en el bimestre sin historial de versiones.
   * Traza: CP-RF013-11, CP-RF013-20.
   */
  async miConsolidado(periodoId: string, personaId: string): Promise<MiConsolidadoResponseDto> {
    const docente = await this.repository.docentePorPersonaId(personaId);
    if (!docente) {
      throw new ForbiddenException("El usuario no tiene un registro de docente asociado.");
    }

    const consolidadoVigente = await this.repository.buscarConsolidadoVigente(
      docente.id,
      periodoId,
    );
    if (!consolidadoVigente) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    const detalle = await this.repository.buscarConsolidadoConDetalle(consolidadoVigente.id);
    if (!detalle) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    const solicitudAbierta = await this.repository.buscarSolicitudAbierta(consolidadoVigente.id);

    const totalMinutosFueraClase =
      detalle.consolidado.minutosPerdidosFirma + detalle.consolidado.minutosFueraAula;

    const consolidadoResumen: ConsolidadoResumenDto = {
      id: detalle.consolidado.id,
      docenteId: detalle.docente.id,
      docenteNombre: detalle.docente.nombreCompleto,
      docenteDocumento: detalle.docente.numeroDocumento,
      periodoId: detalle.periodo.id,
      periodoNombre: detalle.periodo.nombre,
      consolidadoRaizId: detalle.consolidado.consolidadoRaizId,
      version: detalle.consolidado.version,
      vigente: detalle.consolidado.vigente,
      estado: detalle.consolidado.estado,
      motivoCambio: detalle.consolidado.motivoCambio,
      sesionesProgramadas: detalle.consolidado.sesionesProgramadas,
      sesionesCumplidas: detalle.consolidado.sesionesCumplidas,
      sesionesParciales: detalle.consolidado.sesionesParciales,
      sesionesNoCumplidas: detalle.consolidado.sesionesNoCumplidas,
      sesionesJustificadas: detalle.consolidado.sesionesJustificadas,
      minutosPerdidosFirma: detalle.consolidado.minutosPerdidosFirma,
      totalAusencias: detalle.consolidado.totalAusencias,
      minutosFueraAula: detalle.consolidado.minutosFueraAula,
      totalMinutosFueraClase,
      tiempoFueraClaseTexto: formatearTiempoMinutos(totalMinutosFueraClase),
      decision: detalle.consolidado.decision,
      observacion: detalle.consolidado.observacion,
      generadoPorId: detalle.consolidado.generadoPorId,
      generadoPorNombre: detalle.generadoPorNombre,
      generadoEn: detalle.consolidado.generadoEn,
      reabiertoPorId: detalle.consolidado.reabiertoPorId,
      reabiertoPorNombre: detalle.reabiertoPorNombre,
      reabiertoEn: detalle.consolidado.reabiertoEn,
    };

    let solicitudPendienteDto: SolicitudRevisionResponseDto | null = null;
    if (solicitudAbierta) {
      solicitudPendienteDto = {
        id: solicitudAbierta.id,
        consolidadoId: solicitudAbierta.consolidadoId,
        docenteId: detalle.docente.id,
        docenteNombre: detalle.docente.nombreCompleto,
        docenteDocumento: detalle.docente.numeroDocumento,
        periodoId: detalle.periodo.id,
        periodoNombre: detalle.periodo.nombre,
        motivo: solicitudAbierta.motivo,
        adjuntoUrl: solicitudAbierta.adjuntoRuta,
        adjuntoNombre: solicitudAbierta.adjuntoNombre,
        estado: solicitudAbierta.estado,
        respuesta: solicitudAbierta.respuesta,
        resueltaPorId: solicitudAbierta.resueltaPorId,
        resueltaPorNombre: null,
        creadoEn: solicitudAbierta.creadoEn,
        resueltaEn: solicitudAbierta.resueltaEn,
      };
    }

    return {
      consolidado: consolidadoResumen,
      sesiones: detalle.sesiones,
      solicitudPendiente: solicitudPendienteDto,
    };
  }

  /**
   * HU3: El docente registra una solicitud de revisión sobre su consolidado (adjunto opcional).
   * Traza: CP-RF013-12, CP-RF013-13, CP-RF013-14.
   */
  async crear(
    dto: CrearSolicitudRevisionDto,
    adjunto: Express.Multer.File | undefined,
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { solicitud: SolicitudRevisionResponseDto }> {
    if (!dto.motivo || dto.motivo.trim().length === 0) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO);
    }

    const docente = await this.repository.docentePorPersonaId(personaId);
    if (!docente) {
      throw new ForbiddenException("El usuario no tiene un registro de docente asociado.");
    }

    const consolidado = await this.repository.buscarConsolidadoPorId(dto.consolidadoId);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    if (consolidado.docenteId !== docente.id) {
      throw new ForbiddenException("No tiene acceso al consolidado de otro docente.");
    }

    const solicitudExistente = await this.repository.buscarSolicitudAbierta(dto.consolidadoId);
    if (solicitudExistente) {
      throw new ConflictException(MENSAJES_CONSOLIDADO.SOLICITUD_REPETIDA);
    }

    const adjuntoProcesado = await procesarAdjuntoSolicitud(adjunto);

    const nuevaSolicitud = await this.repository.crearSolicitud({
      consolidadoId: dto.consolidadoId,
      docenteId: docente.id,
      motivo: dto.motivo.trim(),
      adjuntoRuta: adjuntoProcesado.adjuntoRuta,
      adjuntoNombre: adjuntoProcesado.adjuntoNombre,
    });

    const periodo = await this.repository.buscarPeriodoPorId(consolidado.periodoId);
    const periodoNombre = periodo?.nombre ?? "";

    // Notificar al Director
    await this.notificacionesService.enviar({
      usuarioId: consolidado.generadoPorId,
      titulo: "Nueva solicitud de revisión de consolidado",
      mensaje: `El docente ${docente.nombreCompleto} ha enviado una solicitud de revisión para el consolidado del ${periodoNombre}.`,
      tipo: "alerta",
      enlaceUrl: "/admin/solicitudes-revision",
    });

    // Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "solicitudes_revision_consolidado",
      registroId: nuevaSolicitud.id,
      direccionIp: ip,
      valorNuevo: {
        id: nuevaSolicitud.id,
        consolidadoId: nuevaSolicitud.consolidadoId,
        docenteId: nuevaSolicitud.docenteId,
        motivo: nuevaSolicitud.motivo,
        estado: nuevaSolicitud.estado,
      },
    });

    const solicitudDto: SolicitudRevisionResponseDto = {
      id: nuevaSolicitud.id,
      consolidadoId: nuevaSolicitud.consolidadoId,
      docenteId: docente.id,
      docenteNombre: docente.nombreCompleto,
      docenteDocumento: docente.numeroDocumento,
      periodoId: consolidado.periodoId,
      periodoNombre,
      motivo: nuevaSolicitud.motivo,
      adjuntoUrl: nuevaSolicitud.adjuntoRuta,
      adjuntoNombre: nuevaSolicitud.adjuntoNombre,
      estado: nuevaSolicitud.estado,
      respuesta: nuevaSolicitud.respuesta,
      resueltaPorId: nuevaSolicitud.resueltaPorId,
      resueltaPorNombre: null,
      creadoEn: nuevaSolicitud.creadoEn,
      resueltaEn: nuevaSolicitud.resueltaEn,
    };

    return {
      mensaje: MENSAJES_CONSOLIDADO.SOLICITUD_ENVIADA,
      solicitud: solicitudDto,
    };
  }

  /**
   * HU3: Listar solicitudes de revisión para el Director con filtros opcionales de período y estado.
   */
  async listar(query: FiltroSolicitudesQueryDto): Promise<SolicitudRevisionResponseDto[]> {
    const filas = await this.repository.listarSolicitudes({
      periodoId: query.periodoId,
      estado: query.estado,
    });

    return filas.map((f) => ({
      id: f.id,
      consolidadoId: f.consolidadoId,
      docenteId: f.docenteId,
      docenteNombre: f.docente.nombreCompleto,
      docenteDocumento: f.docente.numeroDocumento,
      periodoId: f.periodo.id,
      periodoNombre: f.periodo.nombre,
      motivo: f.motivo,
      adjuntoUrl: f.adjuntoRuta,
      adjuntoNombre: f.adjuntoNombre,
      estado: f.estado,
      respuesta: f.respuesta,
      resueltaPorId: f.resueltaPorId,
      resueltaPorNombre: f.resueltaPorNombre,
      creadoEn: f.creadoEn,
      resueltaEn: f.resueltaEn,
    }));
  }

  /**
   * HU3: El Director acepta la solicitud de revisión, reabriendo automáticamente el consolidado docente.
   * Traza: CP-RF013-15.
   */
  async aceptar(
    id: string,
    dto: ResolverSolicitudDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    this.validarRolModificacion(rol);

    const solicitud = await this.repository.buscarSolicitudPorId(id);
    if (!solicitud) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.SOLICITUD_NO_ENCONTRADA);
    }

    if (solicitud.estado !== "solicitada") {
      throw new BadRequestException("La solicitud ya fue resuelta.");
    }

    const respuestaLimpia = dto.respuesta?.trim() ? dto.respuesta.trim() : undefined;

    const solicitudActualizada = await this.repository.resolverSolicitud(
      id,
      "aceptada",
      actorId,
      respuestaLimpia,
    );

    // Reabrir consolidado automáticamente
    await this.repository.reabrirConsolidado(solicitud.consolidadoId, actorId);

    // Notificar al docente
    if (solicitud.docente.usuarioId) {
      await this.notificacionesService.enviar({
        usuarioId: solicitud.docente.usuarioId,
        titulo: "Solicitud de revisión aceptada",
        mensaje: respuestaLimpia
          ? `Su solicitud de revisión fue aceptada: ${respuestaLimpia}`
          : "Su solicitud de revisión fue aceptada por la Dirección. El consolidado fue reabierto.",
        tipo: "alerta",
        enlaceUrl: "/admin/mi-seguimiento",
      });
    }

    // Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "solicitudes_revision_consolidado",
      registroId: id,
      direccionIp: ip,
      valorAnterior: {
        estado: solicitud.estado,
        respuesta: solicitud.respuesta,
      },
      valorNuevo: {
        estado: solicitudActualizada.estado,
        respuesta: solicitudActualizada.respuesta,
        resueltaPorId: actorId,
      },
    });

    return this.mapearSolicitudResponse(
      solicitudActualizada,
      solicitud.docente,
      solicitud.periodo,
      solicitud.resueltaPorNombre,
    );
  }

  /**
   * HU3: El Director rechaza la solicitud de revisión con fundamentación obligatoria.
   * Traza: CP-RF013-16, CP-RF013-17.
   */
  async rechazar(
    id: string,
    dto: RechazarSolicitudDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    this.validarRolModificacion(rol);

    if (!dto.respuesta || dto.respuesta.trim().length === 0) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.SOLICITUD_RECHAZADA_SIN_RESPUESTA);
    }

    const solicitud = await this.repository.buscarSolicitudPorId(id);
    if (!solicitud) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.SOLICITUD_NO_ENCONTRADA);
    }

    if (solicitud.estado !== "solicitada") {
      throw new BadRequestException("La solicitud ya fue resuelta.");
    }

    const respuestaLimpia = dto.respuesta.trim();

    const solicitudActualizada = await this.repository.resolverSolicitud(
      id,
      "rechazada",
      actorId,
      respuestaLimpia,
    );

    // Notificar al docente con la respuesta del Director
    if (solicitud.docente.usuarioId) {
      await this.notificacionesService.enviar({
        usuarioId: solicitud.docente.usuarioId,
        titulo: "Solicitud de revisión rechazada",
        mensaje: `Su solicitud de revisión fue rechazada por la Dirección. Respuesta: ${respuestaLimpia}`,
        tipo: "alerta",
        enlaceUrl: "/admin/mi-seguimiento",
      });
    }

    // Registrar auditoría inmutable
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "solicitudes_revision_consolidado",
      registroId: id,
      direccionIp: ip,
      valorAnterior: {
        estado: solicitud.estado,
        respuesta: solicitud.respuesta,
      },
      valorNuevo: {
        estado: solicitudActualizada.estado,
        respuesta: solicitudActualizada.respuesta,
        resueltaPorId: actorId,
      },
    });

    return this.mapearSolicitudResponse(
      solicitudActualizada,
      solicitud.docente,
      solicitud.periodo,
      solicitud.resueltaPorNombre,
    );
  }

  /**
   * Valida si un rol directivo tiene autorización para resolver solicitudes y mutar el consolidado.
   * El rol Subdirector solo cuenta con autorización de consulta.
   */
  private validarRolModificacion(rol: string): void {
    if (rol.toLowerCase() === "subdirector") {
      throw new ForbiddenException("Su rol no tiene autorización para modificar el consolidado.");
    }
  }

  /**
   * Mapea una fila de base de datos de solicitud de revisión a su DTO oficial de respuesta.
   */
  private mapearSolicitudResponse(
    solicitud: SolicitudRevisionFila,
    docente: DocenteParaConsolidado,
    periodo: PeriodoParaConsolidado,
    resueltaPorNombre?: string | null,
  ): SolicitudRevisionResponseDto {
    return {
      id: solicitud.id,
      consolidadoId: solicitud.consolidadoId,
      docenteId: docente.id,
      docenteNombre: docente.nombreCompleto,
      docenteDocumento: docente.numeroDocumento,
      periodoId: periodo.id,
      periodoNombre: periodo.nombre,
      motivo: solicitud.motivo,
      adjuntoUrl: solicitud.adjuntoRuta,
      adjuntoNombre: solicitud.adjuntoNombre,
      estado: solicitud.estado,
      respuesta: solicitud.respuesta,
      resueltaPorId: solicitud.resueltaPorId,
      resueltaPorNombre: resueltaPorNombre ?? null,
      creadoEn: solicitud.creadoEn,
      resueltaEn: solicitud.resueltaEn,
    };
  }
}
