import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditService } from "@/common/services/audit.service";
import { MENSAJES_INDICADORES, type Indicador } from "../constants";
import type {
  MensajeIndicadoresResponseDto,
  PretestResponseDto,
  RegistrarPretestDto,
} from "../dto";
import type { PretestFila } from "../interfaces";
import { PretestRepository } from "../repositories/pretest.repository";

@Injectable()
export class PretestService {
  constructor(
    private readonly repository: PretestRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * HU2: Registrar el pretest manual con validaciones y cambio de vigencia.
   * Traza: CP-RF020-08, CP-RF020-09, CP-RF020-10.
   */
  async registrar(
    dto: RegistrarPretestDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { pretest: PretestResponseDto }> {
    // 1. Control de acceso por rol: solo Director y Administrador pueden registrar pretest
    const rolNormalizado = rol?.toLowerCase();
    if (
      rolNormalizado !== "director" &&
      rolNormalizado !== "admin" &&
      rolNormalizado !== "administrador"
    ) {
      throw new ForbiddenException(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
    }

    // 2. Validaciones estrictas de datos del pretest
    if (!dto.fuente || !dto.fuente.trim()) {
      throw new BadRequestException(MENSAJES_INDICADORES.PRETEST_SIN_FUENTE);
    }

    if (dto.numerador < 0) {
      throw new BadRequestException(MENSAJES_INDICADORES.NUMERADOR_NEGATIVO);
    }

    if (dto.denominador <= 0) {
      throw new BadRequestException(MENSAJES_INDICADORES.DENOMINADOR_CERO);
    }

    if (dto.numerador > dto.denominador) {
      throw new BadRequestException(MENSAJES_INDICADORES.NUMERADOR_MAYOR);
    }

    if (dto.fechaFin < dto.fechaInicio) {
      throw new BadRequestException(MENSAJES_INDICADORES.FECHAS_INCOHERENTES);
    }

    // 3. Cálculo de porcentaje redondeado a 2 decimales estándar
    const porcentaje = Number(((dto.numerador / dto.denominador) * 100).toFixed(2));

    // 4. Invalidar cualquier pretest vigente previo del mismo indicador (vigencia unívoca)
    await this.repository.invalidarPretestVigenteAnterior(dto.indicador);

    // 5. Persistir el nuevo pretest vigente
    const pretestFila = await this.repository.crearPretest({
      indicador: dto.indicador,
      periodoDescrito: dto.periodoDescrito.trim(),
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      numerador: dto.numerador,
      denominador: dto.denominador,
      porcentaje,
      fuente: dto.fuente.trim(),
      registradoPorId: actorId,
    });

    // 6. Auditoría inmutable de la acción de mutación
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "indicadores_pretest",
      registroId: pretestFila.id,
      direccionIp: ip,
    });

    const pretestDto = this.mapearPretestFilaADto(pretestFila);

    return {
      mensaje: MENSAJES_INDICADORES.PRETEST_REGISTRADO(dto.indicador, porcentaje),
      pretest: pretestDto,
    };
  }

  /**
   * HU2: Obtener el pretest vigente de un indicador.
   * Traza: CP-RF020-16, CP-RF020-17.
   */
  async obtenerVigente(indicador: Indicador): Promise<PretestResponseDto | null> {
    const pretestFila = await this.repository.obtenerPretestVigente(indicador);
    if (!pretestFila) {
      return null;
    }
    return this.mapearPretestFilaADto(pretestFila);
  }

  /**
   * HU2: Listar todos los pretests registrados históricamente.
   */
  async listarTodos(): Promise<PretestResponseDto[]> {
    const filas = await this.repository.listarTodosPretests();
    return filas.map((fila) => this.mapearPretestFilaADto(fila));
  }

  private mapearPretestFilaADto(fila: PretestFila): PretestResponseDto {
    return {
      id: fila.id,
      indicador: fila.indicador,
      periodoDescrito: fila.periodoDescrito,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      numerador: fila.numerador,
      denominador: fila.denominador,
      porcentaje: fila.porcentaje,
      porcentajeTexto: `${fila.porcentaje.toFixed(2)} %`,
      fuente: fila.fuente,
      vigente: fila.vigente,
      registradoPorId: fila.registradoPorId,
      registradoPorNombre: fila.registradoPorNombre,
      creadoEn: fila.creadoEn,
    };
  }
}
