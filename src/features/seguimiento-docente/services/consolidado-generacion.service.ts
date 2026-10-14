import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { fechaHoyLima } from "../../../common/utils/fecha-lima.util";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import type { TipoNotificacion } from "../../notificaciones/interfaces";
import { MENSAJES_CONSOLIDADO } from "../constants";
import {
  ConsolidadoDetalleResponseDto,
  ConsolidadoResumenDto,
  FiltroReporteBimestreQueryDto,
  MensajeConsolidadoResponseDto,
  ReporteBimestreResponseDto,
  RegistrarDecisionDto,
} from "../dto";
import type { PeriodoParaConsolidado } from "../interfaces";
import { SeguimientoDocenteRepository } from "../repositories";
import { diasEntreFechas, formatearTiempoMinutos } from "../utils";

@Injectable()
export class ConsolidadoGeneracionService {
  constructor(
    private readonly repository: SeguimientoDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU1: Generar consolidado masivo para todos los docentes con sesiones en el bimestre.
   * Traza: CP-RF013-01, CP-RF013-03, CP-RF013-04.
   */
  async generarTodos(
    periodoId: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto> {
    this.validarRolModificacion(rol);

    const periodo = await this.repository.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      throw new NotFoundException("Período académico no encontrado.");
    }

    this.validarPeriodoParaGeneracion(periodo);

    const docentes = await this.repository.buscarDocentesConSesionesEnPeriodo(periodoId);
    const docentesACrear: typeof docentes = [];

    for (const docente of docentes) {
      const consolidadoExistente = await this.repository.buscarConsolidadoVigente(
        docente.id,
        periodoId,
      );
      if (!consolidadoExistente) {
        docentesACrear.push(docente);
      }
    }

    if (docentes.length > 0 && docentesACrear.length === 0) {
      throw new ConflictException(MENSAJES_CONSOLIDADO.CONSOLIDADO_YA_EXISTE);
    }

    for (const docente of docentesACrear) {
      const metricas = await this.repository.calcularMetricasDocente(docente.id, periodoId);
      const nuevoConsolidado = await this.repository.crearConsolidado({
        docenteId: docente.id,
        periodoId,
        generadoPorId: actorId,
        metricas,
      });

      if (docente.usuarioId) {
        await this.notificacionesService.enviar({
          usuarioId: docente.usuarioId,
          titulo: "Consolidado de seguimiento disponible",
          mensaje: `Se generó el consolidado del ${periodo.nombre}. Puede revisarlo en Mi seguimiento.`,
          tipo: "informativa" as TipoNotificacion,
          enlaceUrl: "/admin/mi-seguimiento",
        });
      }

      await this.auditService.log({
        usuarioId: actorId,
        accion: "crear",
        tabla: "consolidados_docente",
        registroId: nuevoConsolidado.id,
        direccionIp: ip,
        valorNuevo: {
          id: nuevoConsolidado.id,
          docenteId: docente.id,
          periodoId,
          version: 1,
          estado: "cerrado",
        },
      });
    }

    return {
      mensaje: MENSAJES_CONSOLIDADO.CONSOLIDADO_GENERADO(periodo.nombre, docentesACrear.length),
      cantidad: docentesACrear.length,
    };
  }

  /**
   * HU1: Generar consolidado individual para un docente específico.
   * Traza: CP-RF013-02, CP-RF013-03, CP-RF013-04, Escenario 21 / R3.
   */
  async generarUno(
    periodoId: string,
    docenteId: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<ConsolidadoDetalleResponseDto> {
    this.validarRolModificacion(rol);

    const periodo = await this.repository.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      throw new NotFoundException("Período académico no encontrado.");
    }

    this.validarPeriodoParaGeneracion(periodo);

    const consolidadoExistente = await this.repository.buscarConsolidadoVigente(
      docenteId,
      periodoId,
    );
    if (consolidadoExistente) {
      throw new ConflictException(MENSAJES_CONSOLIDADO.CONSOLIDADO_YA_EXISTE);
    }

    const docente = await this.repository.docentePorId(docenteId);
    if (!docente) {
      throw new NotFoundException("Docente no encontrado.");
    }

    const metricas = await this.repository.calcularMetricasDocente(docenteId, periodoId);
    const nuevoConsolidado = await this.repository.crearConsolidado({
      docenteId,
      periodoId,
      generadoPorId: actorId,
      metricas,
    });

    if (docente.usuarioId) {
      await this.notificacionesService.enviar({
        usuarioId: docente.usuarioId,
        titulo: "Consolidado de seguimiento disponible",
        mensaje: `Se generó el consolidado del ${periodo.nombre}. Puede revisarlo en Mi seguimiento.`,
        tipo: "informativa" as TipoNotificacion,
        enlaceUrl: "/admin/mi-seguimiento",
      });
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "consolidados_docente",
      registroId: nuevoConsolidado.id,
      direccionIp: ip,
      valorNuevo: {
        id: nuevoConsolidado.id,
        docenteId,
        periodoId,
        version: 1,
        estado: "cerrado",
      },
    });

    return this.obtenerDetalle(nuevoConsolidado.id, {
      id: actorId,
      role: rol,
      personaId: "",
    } as AuthenticatedUser);
  }

  /**
   * HU1: Registrar o actualizar la decisión y observación autónoma del Director.
   * Traza: CP-RF013-05.
   */
  async registrarDecision(
    id: string,
    dto: RegistrarDecisionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<ConsolidadoDetalleResponseDto> {
    this.validarRolModificacion(rol);

    const consolidado = await this.repository.buscarConsolidadoPorId(id);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    await this.repository.actualizarDecision(id, dto.decision, dto.observacion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "consolidados_docente",
      registroId: id,
      direccionIp: ip,
      valorAnterior: {
        decision: consolidado.decision,
        observacion: consolidado.observacion,
      },
      valorNuevo: {
        decision: dto.decision,
        observacion: dto.observacion ?? null,
      },
    });

    return this.obtenerDetalle(id, {
      id: actorId,
      role: rol,
      personaId: "",
    } as AuthenticatedUser);
  }

  /**
   * HU1, HU4: Obtener el detalle completo del consolidado con sus sesiones y ausencias.
   * Traza: CP-RF013-02, CP-RF013-05, CP-RF013-20.
   */
  async obtenerDetalle(
    id: string,
    usuario: AuthenticatedUser,
  ): Promise<ConsolidadoDetalleResponseDto> {
    const detalle = await this.repository.buscarConsolidadoConDetalle(id);
    if (!detalle) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    // Restricción para docentes: solo pueden consultar su propio consolidado (CP-RF013-20)
    if (usuario.role === "docente") {
      const docente = await this.repository.docentePorPersonaId(usuario.personaId);
      if (!docente || docente.id !== detalle.consolidado.docenteId) {
        throw new ForbiddenException("No tiene acceso al consolidado de otro docente.");
      }
    }

    const totalMinutosFueraClase =
      detalle.consolidado.minutosPerdidosFirma + detalle.consolidado.minutosFueraAula;

    return {
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
      firmaDocenteUrl: detalle.docente.firmaUrl,
      sesiones: detalle.sesiones,
    };
  }

  /**
   * HU4: Obtener el reporte consolidado de todos los docentes del bimestre (ordenable).
   * Traza: CP-RF013-19.
   */
  async obtenerReporteBimestre(
    periodoId: string,
    query?: FiltroReporteBimestreQueryDto,
  ): Promise<ReporteBimestreResponseDto> {
    const periodo = await this.repository.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      throw new NotFoundException("Período académico no encontrado.");
    }

    const filas = await this.repository.listarConsolidadosVigentesPorPeriodo(periodoId);

    const docentesResumen: ConsolidadoResumenDto[] = filas.map((f) => {
      const totalMinutosFueraClase = f.minutosPerdidosFirma + f.minutosFueraAula;
      return {
        id: f.id,
        docenteId: f.docente.id,
        docenteNombre: f.docente.nombreCompleto,
        docenteDocumento: f.docente.numeroDocumento,
        periodoId: f.periodoId,
        periodoNombre: periodo.nombre,
        consolidadoRaizId: f.consolidadoRaizId,
        version: f.version,
        vigente: f.vigente,
        estado: f.estado,
        motivoCambio: f.motivoCambio,
        sesionesProgramadas: f.sesionesProgramadas,
        sesionesCumplidas: f.sesionesCumplidas,
        sesionesParciales: f.sesionesParciales,
        sesionesNoCumplidas: f.sesionesNoCumplidas,
        sesionesJustificadas: f.sesionesJustificadas,
        minutosPerdidosFirma: f.minutosPerdidosFirma,
        totalAusencias: f.totalAusencias,
        minutosFueraAula: f.minutosFueraAula,
        totalMinutosFueraClase,
        tiempoFueraClaseTexto: formatearTiempoMinutos(totalMinutosFueraClase),
        decision: f.decision,
        observacion: f.observacion,
        generadoPorId: f.generadoPorId,
        generadoPorNombre: f.generadoPorNombre,
        generadoEn: f.generadoEn,
        reabiertoPorId: f.reabiertoPorId,
        reabiertoPorNombre: f.reabiertoPorNombre,
        reabiertoEn: f.reabiertoEn,
      };
    });

    if (query?.ordenarPor) {
      const direccion = query.direccion === "asc" ? 1 : -1;
      const campo = query.ordenarPor as keyof ConsolidadoResumenDto;
      docentesResumen.sort((a, b) => {
        const valA = a[campo] ?? 0;
        const valB = b[campo] ?? 0;
        if (typeof valA === "string" && typeof valB === "string") {
          return valA.localeCompare(valB) * direccion;
        }
        return ((valA as number) - (valB as number)) * direccion;
      });
    }

    const totalMinutosPerdidosFirma = docentesResumen.reduce(
      (acc, d) => acc + d.minutosPerdidosFirma,
      0,
    );
    const totalMinutosFueraAula = docentesResumen.reduce((acc, d) => acc + d.minutosFueraAula, 0);
    const totalMinutosFueraClase = totalMinutosPerdidosFirma + totalMinutosFueraAula;

    return {
      periodo: {
        id: periodo.id,
        nombre: periodo.nombre,
        numero: periodo.numero,
        estado: periodo.estado,
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin,
      },
      docentes: docentesResumen,
      totalDocentes: docentesResumen.length,
      totalMinutosPerdidosFirma,
      totalMinutosFueraAula,
      totalMinutosFueraClase,
      tiempoTotalFueraClaseTexto: formatearTiempoMinutos(totalMinutosFueraClase),
    };
  }

  /**
   * Valida si un rol tiene autorización para realizar operaciones mutacionales sobre el consolidado.
   * El Subdirector solo posee autorización de consulta.
   */
  private validarRolModificacion(rol: string): void {
    if (rol.toLowerCase() === "subdirector") {
      throw new ForbiddenException("Su rol no tiene autorización para modificar el consolidado.");
    }
  }

  /**
   * Evalúa la regla de «última semana del bimestre» (CP-RF013-03).
   * Solo se puede generar si el período está cerrado o si está en curso y faltan <= 7 días naturales para su fin.
   */
  private validarPeriodoParaGeneracion(periodo: PeriodoParaConsolidado): void {
    if (periodo.estado === "cerrado") {
      return;
    }

    if (periodo.estado === "en_curso") {
      const hoy = fechaHoyLima();
      const diasRestantes = diasEntreFechas(hoy, periodo.fechaFin);
      const yaInicio = diasEntreFechas(periodo.fechaInicio, hoy) >= 0;

      if (yaInicio && diasRestantes <= 7) {
        return;
      }
    }

    throw new BadRequestException(MENSAJES_CONSOLIDADO.BIMESTRE_AUN_ABIERTO);
  }
}
