import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import type { TipoNotificacion } from "../../notificaciones/interfaces";
import { MENSAJES_CONSOLIDADO } from "../constants";
import {
  CerrarConsolidadoDto,
  ConsolidadoResumenDto,
  HistorialConsolidadoResponseDto,
  MensajeConsolidadoResponseDto,
  VersionHistorialConsolidadoDto,
} from "../dto";
import type { ConsolidadoFila, DocenteParaConsolidado } from "../interfaces";
import { SeguimientoDocenteRepository } from "../repositories";
import { formatearTiempoMinutos } from "../utils";

/**
 * Servicio encargado del flujo de versionado y reapertura de consolidados docentes (HU2).
 * Cubre:
 * - Reabrir consolidado cerrado para corrección de sesiones/ausencias (CP-RF013-07).
 * - Cierre de nueva versión con recálculo atómico e invalidación de vigencia previa (CP-RF013-08, CP-RF013-09).
 * - Consulta de historial ordenado de versiones para Director y Subdirector (CP-RF013-10).
 */
@Injectable()
export class ConsolidadoVersionadoService {
  constructor(
    private readonly repository: SeguimientoDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * HU2: Reabrir un consolidado cerrado para permitir correcciones de sesiones o ausencias.
   * Traza: CP-RF013-07.
   */
  async reabrir(
    id: string,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    this.validarRolModificacion(rol);

    const consolidado = await this.repository.buscarConsolidadoPorId(id);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    if (consolidado.vigente === false) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_VIGENTE);
    }

    if (consolidado.estado === "reabierto") {
      throw new BadRequestException("El consolidado ya se encuentra reabierto.");
    }

    const consolidadoReabierto = await this.repository.reabrirConsolidado(id, actorId);

    const docente = await this.repository.docentePorId(consolidado.docenteId);
    if (docente?.usuarioId) {
      await this.notificacionesService.enviar({
        usuarioId: docente.usuarioId,
        titulo: "Consolidado de seguimiento reabierto",
        mensaje: "Su consolidado ha sido reabierto para correcciones de sesiones y ausencias.",
        tipo: "informativa" as TipoNotificacion,
        enlaceUrl: "/admin/mi-seguimiento",
      });
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "consolidados_docente",
      registroId: id,
      direccionIp: ip,
      valorAnterior: {
        estado: consolidado.estado,
      },
      valorNuevo: {
        estado: "reabierto",
        reabiertoPorId: actorId,
      },
    });

    const resumen = await this.construirResumen(consolidadoReabierto, docente);

    return {
      mensaje: MENSAJES_CONSOLIDADO.CONSOLIDADO_REABIERTO,
      consolidado: resumen,
    };
  }

  /**
   * HU2: Volver a cerrar un consolidado reabierto creando una versión nueva e invalidando la anterior.
   * Traza: CP-RF013-08, CP-RF013-09.
   */
  async cerrar(
    id: string,
    dto: CerrarConsolidadoDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { consolidado: ConsolidadoResumenDto }> {
    this.validarRolModificacion(rol);

    const consolidado = await this.repository.buscarConsolidadoPorId(id);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    if (consolidado.vigente === false) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_VIGENTE);
    }

    if (consolidado.estado !== "reabierto") {
      throw new BadRequestException("Solo se puede cerrar un consolidado que esté reabierto.");
    }

    const motivoCambio = dto?.motivoCambio?.trim();
    if (!motivoCambio) {
      throw new BadRequestException(MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO);
    }

    const metricas = await this.repository.calcularMetricasDocente(
      consolidado.docenteId,
      consolidado.periodoId,
    );

    const consolidadoRaizId = consolidado.consolidadoRaizId || consolidado.id;
    const nuevaVersionNumero = consolidado.version + 1;

    const nuevaVersion = await this.repository.crearNuevaVersion({
      anteriorId: consolidado.id,
      consolidadoRaizId,
      version: nuevaVersionNumero,
      motivoCambio,
      generadoPorId: actorId,
      metricas,
      decision: consolidado.decision,
      observacion: consolidado.observacion,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "consolidados_docente",
      registroId: nuevaVersion.id,
      direccionIp: ip,
      valorNuevo: {
        id: nuevaVersion.id,
        anteriorId: consolidado.id,
        consolidadoRaizId,
        version: nuevaVersionNumero,
        motivoCambio,
      },
    });

    const resumen = await this.construirResumen(nuevaVersion);

    return {
      mensaje: MENSAJES_CONSOLIDADO.NUEVA_VERSION(nuevaVersionNumero),
      consolidado: resumen,
    };
  }

  /**
   * HU2: Consultar el historial completo de versiones de un consolidado (Director / Subdirector).
   * Traza: CP-RF013-10.
   */
  async obtenerHistorial(id: string): Promise<HistorialConsolidadoResponseDto> {
    const consolidado = await this.repository.buscarConsolidadoPorId(id);
    if (!consolidado) {
      throw new NotFoundException(MENSAJES_CONSOLIDADO.CONSOLIDADO_NO_ENCONTRADO);
    }

    const raizId = consolidado.consolidadoRaizId || consolidado.id;
    const [docente, periodo, filas] = await Promise.all([
      this.repository.docentePorId(consolidado.docenteId),
      this.repository.buscarPeriodoPorId(consolidado.periodoId),
      this.repository.buscarHistorialVersiones(raizId),
    ]);

    const versiones: VersionHistorialConsolidadoDto[] = filas.map((f) => {
      const totalMinutosFueraClase = f.minutosPerdidosFirma + f.minutosFueraAula;
      return {
        id: f.id,
        version: f.version,
        vigente: f.vigente,
        estado: f.estado,
        motivoCambio: f.motivoCambio ?? null,
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
        observacion: f.observacion ?? null,
        generadoPorId: f.generadoPorId,
        generadoPorNombre: f.generadoPorNombre,
        generadoEn:
          typeof f.generadoEn === "string" ? f.generadoEn : new Date(f.generadoEn).toISOString(),
        reabiertoPorId: f.reabiertoPorId ?? null,
        reabiertoPorNombre: f.reabiertoPorNombre ?? null,
        reabiertoEn: f.reabiertoEn
          ? typeof f.reabiertoEn === "string"
            ? f.reabiertoEn
            : new Date(f.reabiertoEn).toISOString()
          : null,
      };
    });

    return {
      consolidadoRaizId: raizId,
      docenteId: consolidado.docenteId,
      docenteNombre: docente?.nombreCompleto ?? "",
      periodoId: consolidado.periodoId,
      periodoNombre: periodo?.nombre ?? "",
      versiones,
    };
  }

  /**
   * Valida si un rol tiene autorización para realizar operaciones mutacionales sobre el consolidado.
   * El Subdirector solo posee autorización de consulta (CP-RF013-07, CP-RF013-08).
   */
  private validarRolModificacion(rol: string): void {
    if (rol?.toLowerCase() === "subdirector") {
      throw new ForbiddenException("Su rol no tiene autorización para modificar el consolidado.");
    }
  }

  /**
   * Construye el DTO resumido del consolidado para las respuestas de reapertura y versionado.
   */
  private async construirResumen(
    consolidado: ConsolidadoFila,
    docentePreCargado?: DocenteParaConsolidado | null,
  ): Promise<ConsolidadoResumenDto> {
    const docente =
      docentePreCargado ?? (await this.repository.docentePorId(consolidado.docenteId));
    const periodo = await this.repository.buscarPeriodoPorId(consolidado.periodoId);

    const totalMinutosFueraClase = consolidado.minutosPerdidosFirma + consolidado.minutosFueraAula;

    return {
      id: consolidado.id,
      docenteId: consolidado.docenteId,
      docenteNombre: docente?.nombreCompleto ?? "",
      docenteDocumento: docente?.numeroDocumento ?? "",
      periodoId: consolidado.periodoId,
      periodoNombre: periodo?.nombre ?? "",
      consolidadoRaizId: consolidado.consolidadoRaizId,
      version: consolidado.version,
      vigente: consolidado.vigente,
      estado: consolidado.estado,
      motivoCambio: consolidado.motivoCambio ?? null,
      sesionesProgramadas: consolidado.sesionesProgramadas,
      sesionesCumplidas: consolidado.sesionesCumplidas,
      sesionesParciales: consolidado.sesionesParciales,
      sesionesNoCumplidas: consolidado.sesionesNoCumplidas,
      sesionesJustificadas: consolidado.sesionesJustificadas,
      minutosPerdidosFirma: consolidado.minutosPerdidosFirma,
      totalAusencias: consolidado.totalAusencias,
      minutosFueraAula: consolidado.minutosFueraAula,
      totalMinutosFueraClase,
      tiempoFueraClaseTexto: formatearTiempoMinutos(totalMinutosFueraClase),
      decision: consolidado.decision,
      observacion: consolidado.observacion ?? null,
      generadoPorId: consolidado.generadoPorId,
      generadoPorNombre: "",
      generadoEn:
        typeof consolidado.generadoEn === "string"
          ? consolidado.generadoEn
          : new Date(consolidado.generadoEn).toISOString(),
      reabiertoPorId: consolidado.reabiertoPorId ?? null,
      reabiertoPorNombre: null,
      reabiertoEn: consolidado.reabiertoEn
        ? typeof consolidado.reabiertoEn === "string"
          ? consolidado.reabiertoEn
          : new Date(consolidado.reabiertoEn).toISOString()
        : null,
    };
  }
}
