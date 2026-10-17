import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnioLectivoCls } from "@/common/anio-lectivo";
import { AuditService } from "@/common/services/audit.service";
import { MENSAJES_INDICADORES, type Indicador } from "../constants";
import type {
  CerrarMedicionDto,
  DesgloseCspDto,
  DesgloseIgmDto,
  DesgloseIsaDto,
  HistorialMedicionResponseDto,
  MedicionBimestreResponseDto,
  MedicionIndicadorItemDto,
  MensajeIndicadoresResponseDto,
  NuevaVersionMedicionDto,
} from "../dto";
import type { MedicionFila } from "../interfaces";
import { MedicionRepository } from "../repositories/medicion.repository";
import { IndicadoresCalculoService } from "./indicadores-calculo.service";

function mapearAMedicionDto(fila: MedicionFila): MedicionBimestreResponseDto {
  return {
    id: fila.id,
    periodoId: fila.periodoId,
    periodoNombre: fila.periodoNombre,
    version: fila.version,
    vigente: fila.vigente,
    motivoCambio: fila.motivoCambio,
    cerradaPorId: fila.cerradaPorId,
    cerradaPorNombre: fila.cerradaPorNombre,
    cerradaEn: fila.cerradaEn,
    indicadores: fila.indicadores.map((ind): MedicionIndicadorItemDto => ({
      indicador: ind.indicador,
      numerador: ind.numerador,
      denominador: ind.denominador,
      porcentaje: ind.porcentaje,
      porcentajeTexto: `${Number(ind.porcentaje).toFixed(2)} %`,
      desglose: ind.desglose as unknown as DesgloseCspDto | DesgloseIsaDto | DesgloseIgmDto,
    })),
  };
}

@Injectable()
export class MedicionService {
  constructor(
    private readonly repository: MedicionRepository,
    private readonly calculoService: IndicadoresCalculoService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU2: Cerrar la medición de un bimestre cerrado y congelar CSP, ISA e IGM.
   * Traza: CP-RF020-11, CP-RF020-12.
   */
  async cerrar(
    dto: CerrarMedicionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    const rolNormalizado = rol?.toLowerCase();
    if (rolNormalizado !== "director" && rolNormalizado !== "admin") {
      throw new ForbiddenException(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
    }

    const periodo = await this.repository.obtenerPeriodoPorId(dto.periodoId);
    if (!periodo) {
      throw new NotFoundException(MENSAJES_INDICADORES.PERIODO_NO_ENCONTRADO);
    }

    if (periodo.estado !== "cerrado") {
      throw new BadRequestException(MENSAJES_INDICADORES.BIMESTRE_ABIERTO);
    }

    const medicionExistente = await this.repository.obtenerMedicionVigentePorPeriodo(dto.periodoId);
    if (medicionExistente) {
      throw new ConflictException(MENSAJES_INDICADORES.MEDICION_YA_CERRADA);
    }

    const tablero = await this.calculoService.obtenerTablero({ periodoId: dto.periodoId });

    const sinDatosCsp =
      tablero.csp.sinDatos || (tablero.csp.denominador <= 0 && tablero.csp.porcentaje === null);
    const sinDatosIsa =
      tablero.isa.sinDatos || (tablero.isa.denominador <= 0 && tablero.isa.porcentaje === null);
    const sinDatosIgm =
      tablero.igm.sinDatos || (tablero.igm.denominador <= 0 && tablero.igm.porcentaje === null);

    const cspInd = {
      indicador: "CSP" as Indicador,
      numerador: sinDatosCsp ? 0 : tablero.csp.numerador,
      denominador: sinDatosCsp ? 0 : tablero.csp.denominador,
      porcentaje: sinDatosCsp ? 0.0 : (tablero.csp.porcentaje ?? 0.0),
      desglose: sinDatosCsp
        ? ({ ...tablero.csp.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.csp.desglose as unknown as Record<string, unknown>),
    };

    const isaInd = {
      indicador: "ISA" as Indicador,
      numerador: sinDatosIsa ? 0 : tablero.isa.numerador,
      denominador: sinDatosIsa ? 0 : tablero.isa.denominador,
      porcentaje: sinDatosIsa ? 0.0 : (tablero.isa.porcentaje ?? 0.0),
      desglose: sinDatosIsa
        ? ({ ...tablero.isa.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.isa.desglose as unknown as Record<string, unknown>),
    };

    const igmInd = {
      indicador: "IGM" as Indicador,
      numerador: sinDatosIgm ? 0 : tablero.igm.numerador,
      denominador: sinDatosIgm ? 0 : tablero.igm.denominador,
      porcentaje: sinDatosIgm ? 0.0 : (tablero.igm.porcentaje ?? 0.0),
      desglose: sinDatosIgm
        ? ({ ...tablero.igm.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.igm.desglose as unknown as Record<string, unknown>),
    };

    const medicionGuardada = await this.repository.guardarMedicionCongelada({
      periodoId: dto.periodoId,
      version: 1,
      motivoCambio: null,
      cerradaPorId: actorId,
      indicadores: [cspInd, isaInd, igmInd],
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "mediciones_bimestre",
      registroId: medicionGuardada.id,
      direccionIp: ip,
    });

    const medicionDto = mapearAMedicionDto(medicionGuardada);

    return {
      mensaje: MENSAJES_INDICADORES.MEDICION_CERRADA(
        periodo.nombre,
        cspInd.porcentaje,
        isaInd.porcentaje,
        igmInd.porcentaje,
      ),
      id: medicionGuardada.id,
      version: medicionGuardada.version,
      medicion: medicionDto,
    };
  }

  /**
   * HU2: Generar una nueva versión congelada con motivo obligatorio.
   * Traza: CP-RF020-14, CP-RF020-15.
   */
  async crearNuevaVersion(
    medicionId: string,
    dto: NuevaVersionMedicionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    const rolNormalizado = rol?.toLowerCase();
    if (rolNormalizado !== "director" && rolNormalizado !== "admin") {
      throw new ForbiddenException(MENSAJES_INDICADORES.ROL_NO_AUTORIZADO);
    }

    if (!dto.motivoCambio || !dto.motivoCambio.trim()) {
      throw new BadRequestException(MENSAJES_INDICADORES.NUEVA_VERSION_SIN_MOTIVO);
    }

    const medicionVigente = await this.repository.obtenerMedicionVigentePorPeriodo(medicionId);
    if (!medicionVigente) {
      throw new NotFoundException(MENSAJES_INDICADORES.MEDICION_NO_ENCONTRADA);
    }

    const tablero = await this.calculoService.obtenerTablero({
      periodoId: medicionVigente.periodoId,
    });

    const sinDatosCsp =
      tablero.csp.sinDatos || (tablero.csp.denominador <= 0 && tablero.csp.porcentaje === null);
    const sinDatosIsa =
      tablero.isa.sinDatos || (tablero.isa.denominador <= 0 && tablero.isa.porcentaje === null);
    const sinDatosIgm =
      tablero.igm.sinDatos || (tablero.igm.denominador <= 0 && tablero.igm.porcentaje === null);

    const cspInd = {
      indicador: "CSP" as Indicador,
      numerador: sinDatosCsp ? 0 : tablero.csp.numerador,
      denominador: sinDatosCsp ? 0 : tablero.csp.denominador,
      porcentaje: sinDatosCsp ? 0.0 : (tablero.csp.porcentaje ?? 0.0),
      desglose: sinDatosCsp
        ? ({ ...tablero.csp.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.csp.desglose as unknown as Record<string, unknown>),
    };

    const isaInd = {
      indicador: "ISA" as Indicador,
      numerador: sinDatosIsa ? 0 : tablero.isa.numerador,
      denominador: sinDatosIsa ? 0 : tablero.isa.denominador,
      porcentaje: sinDatosIsa ? 0.0 : (tablero.isa.porcentaje ?? 0.0),
      desglose: sinDatosIsa
        ? ({ ...tablero.isa.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.isa.desglose as unknown as Record<string, unknown>),
    };

    const igmInd = {
      indicador: "IGM" as Indicador,
      numerador: sinDatosIgm ? 0 : tablero.igm.numerador,
      denominador: sinDatosIgm ? 0 : tablero.igm.denominador,
      porcentaje: sinDatosIgm ? 0.0 : (tablero.igm.porcentaje ?? 0.0),
      desglose: sinDatosIgm
        ? ({ ...tablero.igm.desglose, sinDatos: true } as unknown as Record<string, unknown>)
        : (tablero.igm.desglose as unknown as Record<string, unknown>),
    };

    await this.repository.invalidarVersionVigente(medicionVigente.periodoId);

    const nuevaVersion = medicionVigente.version + 1;
    const motivoLimpio = dto.motivoCambio.trim();

    const nuevaMedicionGuardada = await this.repository.guardarMedicionCongelada({
      periodoId: medicionVigente.periodoId,
      version: nuevaVersion,
      motivoCambio: motivoLimpio,
      cerradaPorId: actorId,
      indicadores: [cspInd, isaInd, igmInd],
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "mediciones_bimestre",
      registroId: nuevaMedicionGuardada.id,
      direccionIp: ip,
    });

    const medicionDto = mapearAMedicionDto(nuevaMedicionGuardada);

    return {
      mensaje: MENSAJES_INDICADORES.MEDICION_CERRADA(
        nuevaMedicionGuardada.periodoNombre,
        cspInd.porcentaje,
        isaInd.porcentaje,
        igmInd.porcentaje,
      ),
      id: nuevaMedicionGuardada.id,
      version: nuevaMedicionGuardada.version,
      medicion: medicionDto,
    };
  }

  /**
   * HU2: Consultar la medición vigente de un período (valores congelados inmutables).
   * Traza: CP-RF020-13.
   */
  async obtenerPorPeriodo(periodoId: string): Promise<MedicionBimestreResponseDto | null> {
    const medicion = await this.repository.obtenerMedicionVigentePorPeriodo(periodoId);
    if (!medicion) {
      return null;
    }
    return mapearAMedicionDto(medicion);
  }

  /**
   * HU2: Consultar el historial completo de versiones de la medición de un bimestre.
   */
  async obtenerHistorial(periodoId: string): Promise<HistorialMedicionResponseDto> {
    const historial = await this.repository.obtenerHistorialPorPeriodo(periodoId);
    if (!historial || historial.length === 0) {
      throw new NotFoundException(MENSAJES_INDICADORES.MEDICION_NO_ENCONTRADA);
    }

    return {
      periodoId,
      periodoNombre: historial[0].periodoNombre,
      versiones: historial.map((item) => mapearAMedicionDto(item)),
    };
  }
}
