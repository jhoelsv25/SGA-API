import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import {
  MENSAJES_AUSENCIA,
  VALORES_DEFECTO_AUSENCIA,
  VARIABLES_AUSENCIA,
  type MotivoAusencia,
} from "./constants";
import type {
  AnularAusenciaDto,
  AusenciaResponseDto,
  CorregirAusenciaDto,
  HistorialAusenciaResponseDto,
} from "./dto";
import type { AusenciaConDetalle, DatosCrearVersion } from "./interfaces";
import { AusenciasDocenteRepository } from "./repositories";
import { mapearAAusenciaResponseDto } from "./utils";
import {
  guardarFotosEnDisco,
  prepararEvidenciasParaGuardar,
} from "./utils/evidencias-ausencia.util";

@Injectable()
export class AusenciasCorreccionService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * HU2: Corregir una ausencia dentro de las 24 horas y antes del descargo.
   * Traza: CP-RF012-10, 11, 14, 15, 18.
   */
  async corregir(
    id: string,
    dto: CorregirAusenciaDto,
    fotos: Express.Multer.File[] | undefined,
    actorId: string,
    ip?: string,
  ): Promise<AusenciaResponseDto> {
    const ausencia = await this.buscarAusenciaExistente(id);
    const plazoHoras = await this.validarModificabilidad(ausencia, actorId, dto.motivoCambio);
    const datosHorario = await this.validarHorariosYSuperposicion(ausencia, dto);

    const {
      evidencias: fotosNuevas,
      nombresArchivos,
      listaFotos,
    } = prepararEvidenciasParaGuardar(fotos, dto.metadatosFotos);

    const datosVersion: DatosCrearVersion = {
      ausenciaRaizId: ausencia.ausenciaRaizId ?? ausencia.id,
      sesionClaseId: ausencia.sesionClaseId,
      registradoPorId: actorId,
      horaDesde: datosHorario.horaDesde,
      horaHasta: datosHorario.horaHasta,
      motivo: datosHorario.motivo,
      observacion: datosHorario.observacion,
      version: ausencia.version + 1,
      motivoCambio: dto.motivoCambio.trim(),
    };

    const versionCorregida = await this.repository.crearNuevaVersion(
      ausencia.id,
      datosVersion,
      fotosNuevas,
      dto.fotosRetiradasIds ?? [],
    );

    await guardarFotosEnDisco(listaFotos, nombresArchivos);
    await this.auditarMutacion(actorId, versionCorregida.id, ausencia, versionCorregida, ip);

    const plazoDescargoDias = await this.obtenerPlazoDescargoDias();
    return mapearAAusenciaResponseDto(versionCorregida, plazoDescargoDias, plazoHoras);
  }

  /**
   * HU2: Anular una ausencia con motivo obligatorio.
   * Traza: CP-RF012-16, 17, 18.
   */
  async anular(
    id: string,
    dto: AnularAusenciaDto,
    actorId: string,
    ip?: string,
  ): Promise<AusenciaResponseDto> {
    if (!dto.motivoAnulacion || !dto.motivoAnulacion.trim()) {
      throw new BadRequestException(MENSAJES_AUSENCIA.ANULACION_SIN_MOTIVO);
    }

    const ausencia = await this.buscarAusenciaExistente(id);
    this.validarEstadoActivoParaAnulacion(ausencia);

    const estaBloqueado = await this.repository.bimestreEstaBloqueado(
      ausencia.sesion.fecha,
      ausencia.sesion.docenteId,
    );
    if (estaBloqueado) {
      throw new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO);
    }

    const ausenciaAnulada = await this.repository.anularAusencia(
      id,
      actorId,
      dto.motivoAnulacion.trim(),
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "ausencias_sesion",
      registroId: id,
      valorAnterior: {
        anulada: ausencia.anulada,
        motivoAnulacion: ausencia.motivoAnulacion,
      },
      valorNuevo: {
        anulada: true,
        motivoAnulacion: dto.motivoAnulacion.trim(),
        anuladaPorId: actorId,
      },
      direccionIp: ip,
    });

    const plazoDescargoDias = await this.obtenerPlazoDescargoDias();
    const plazoCorreccionHoras = await this.obtenerPlazoCorreccionHoras();

    return mapearAAusenciaResponseDto(ausenciaAnulada, plazoDescargoDias, plazoCorreccionHoras);
  }

  /**
   * HU2: Consultar el historial completo de versiones de una ausencia.
   * Traza: CP-RF012-12.
   */
  async obtenerHistorial(id: string): Promise<HistorialAusenciaResponseDto> {
    const ausencia = await this.buscarAusenciaExistente(id);
    const raizId = ausencia.ausenciaRaizId ?? ausencia.id;
    const versiones = await this.repository.buscarVersionesDeRaiz(raizId);
    const versionesOrdenadas = [...versiones].sort((a, b) => b.version - a.version);

    return {
      ausenciaRaizId: raizId,
      versiones: versionesOrdenadas.map((v) => ({
        version: v.version,
        vigente: v.vigente,
        horaDesde: v.horaDesde,
        horaHasta: v.horaHasta,
        minutos: v.minutos,
        motivo: v.motivo,
        observacion: v.observacion,
        motivoCambio: v.motivoCambio,
        registradoPor: {
          id: v.registradoPorId,
          nombreCompleto: v.registradoPorNombre,
        },
        registradoEn: v.registradoEn,
        fotos: (v.fotos ?? []).map((f) => ({
          id: f.id,
          archivoUrl: f.archivoUrl,
          tomadaEn: f.tomadaEn,
          orden: f.orden,
        })),
      })),
    };
  }

  // ==========================================
  // PASOS PRIVADOS Y VALIDACIONES
  // ==========================================

  private async buscarAusenciaExistente(id: string): Promise<AusenciaConDetalle> {
    const ausencia = await this.repository.buscarPorId(id);
    if (!ausencia) {
      throw new NotFoundException("Ausencia no encontrada.");
    }
    return ausencia;
  }

  private validarEstadoActivoParaAnulacion(ausencia: AusenciaConDetalle): void {
    if (!ausencia.vigente) {
      throw new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_NO_VIGENTE);
    }
    if (ausencia.anulada) {
      throw new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_YA_ANULADA);
    }
  }

  private async validarModificabilidad(
    ausencia: AusenciaConDetalle,
    actorId: string,
    motivoCambio?: string,
  ): Promise<number> {
    if (!motivoCambio || !motivoCambio.trim()) {
      throw new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_SIN_MOTIVO);
    }

    if (!ausencia.vigente) {
      throw new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_NO_VIGENTE);
    }

    if (ausencia.anulada) {
      throw new ConflictException(MENSAJES_AUSENCIA.AUSENCIA_YA_ANULADA);
    }

    const estaBloqueado = await this.repository.bimestreEstaBloqueado(
      ausencia.sesion.fecha,
      ausencia.sesion.docenteId,
    );
    if (estaBloqueado) {
      throw new ForbiddenException(MENSAJES_AUSENCIA.BIMESTRE_CERRADO);
    }

    if (ausencia.registradoPorId !== actorId) {
      throw new ForbiddenException("Solo quien registró la ausencia puede corregirla.");
    }

    if (ausencia.descargo !== null) {
      throw new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_FUERA_DE_PLAZO);
    }

    const plazoHoras = await this.obtenerPlazoCorreccionHoras();
    const horasTranscurridas =
      (Date.now() - new Date(ausencia.registradoEn).getTime()) / (1000 * 60 * 60);

    if (horasTranscurridas > plazoHoras) {
      throw new BadRequestException(MENSAJES_AUSENCIA.CORRECCION_FUERA_DE_PLAZO);
    }

    return plazoHoras;
  }

  private async validarHorariosYSuperposicion(
    ausencia: AusenciaConDetalle,
    dto: CorregirAusenciaDto,
  ): Promise<{
    horaDesde: string;
    horaHasta: string;
    motivo: MotivoAusencia;
    observacion: string | null;
  }> {
    const horaDesde = dto.horaDesde ?? ausencia.horaDesde;
    const horaHasta = dto.horaHasta ?? ausencia.horaHasta;
    const motivo = (dto.motivo ?? ausencia.motivo) as MotivoAusencia;
    const observacion =
      dto.observacion !== undefined ? (dto.observacion?.trim() ?? null) : ausencia.observacion;

    if (horaHasta <= horaDesde) {
      throw new BadRequestException(MENSAJES_AUSENCIA.HORAS_INVERTIDAS);
    }

    if (horaDesde < ausencia.sesion.horaInicio || horaHasta > ausencia.sesion.horaFin) {
      throw new BadRequestException(
        MENSAJES_AUSENCIA.FUERA_HORARIO_SESION(
          `${ausencia.sesion.horaInicio} a ${ausencia.sesion.horaFin}`,
        ),
      );
    }

    const ausenciasVigentes = await this.repository.buscarAusenciasVigentesDeSesion(
      ausencia.sesionClaseId,
      ausencia.id,
    );
    const raizIdActual = ausencia.ausenciaRaizId ?? ausencia.id;
    const hayCruce = ausenciasVigentes.some((otra) => {
      const otraRaizId = otra.ausenciaRaizId ?? otra.id;
      if (otra.id === ausencia.id || otraRaizId === raizIdActual || otra.anulada) {
        return false;
      }
      return horaDesde < otra.horaHasta && horaHasta > otra.horaDesde;
    });

    if (hayCruce) {
      throw new ConflictException(MENSAJES_AUSENCIA.TRAMOS_SUPERPUESTOS);
    }

    if (motivo === "otro" && (!observacion || !observacion.trim())) {
      throw new BadRequestException(MENSAJES_AUSENCIA.FALTA_OBSERVACION);
    }

    return { horaDesde, horaHasta, motivo, observacion };
  }

  private async auditarMutacion(
    actorId: string,
    registroId: string,
    anterior: AusenciaConDetalle,
    nuevo: AusenciaConDetalle,
    ip?: string,
  ): Promise<void> {
    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "ausencias_sesion",
      registroId,
      valorAnterior: {
        id: anterior.id,
        horaDesde: anterior.horaDesde,
        horaHasta: anterior.horaHasta,
        minutos: anterior.minutos,
        version: anterior.version,
      },
      valorNuevo: {
        id: nuevo.id,
        horaDesde: nuevo.horaDesde,
        horaHasta: nuevo.horaHasta,
        minutos: nuevo.minutos,
        version: nuevo.version,
        motivoCambio: nuevo.motivoCambio,
      },
      direccionIp: ip,
    });
  }

  private async obtenerPlazoDescargoDias(): Promise<number> {
    const plazoStr = await this.repository.obtenerVariableSistema(
      VARIABLES_AUSENCIA.PLAZO_DESCARGO_DIAS,
    );
    return plazoStr ? parseInt(plazoStr, 10) : VALORES_DEFECTO_AUSENCIA.PLAZO_DESCARGO_DIAS;
  }

  private async obtenerPlazoCorreccionHoras(): Promise<number> {
    const plazoStr = await this.repository.obtenerVariableSistema(
      VARIABLES_AUSENCIA.PLAZO_CORRECCION_HORAS,
    );
    return plazoStr ? parseInt(plazoStr, 10) : VALORES_DEFECTO_AUSENCIA.PLAZO_CORRECCION_HORAS;
  }
}
