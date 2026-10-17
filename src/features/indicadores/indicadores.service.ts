import { Injectable } from "@nestjs/common";
import type { Indicador } from "./constants";
import type {
  CerrarMedicionDto,
  ComparacionBimestreResponseDto,
  ExportarIndicadoresQueryDto,
  FiltroIndicadoresQueryDto,
  HistorialMedicionResponseDto,
  MedicionBimestreResponseDto,
  MensajeIndicadoresResponseDto,
  MisIndicadoresDocenteResponseDto,
  NuevaVersionMedicionDto,
  PanelGeneralResponseDto,
  PretestResponseDto,
  RegistrarPretestDto,
  TableroIndicadoresResponseDto,
} from "./dto";
import { ComparacionService } from "./services/comparacion.service";
import { ExportacionService } from "./services/exportacion.service";
import { IndicadoresCalculoService } from "./services/indicadores-calculo.service";
import { MedicionService } from "./services/medicion.service";
import { PanelService } from "./services/panel.service";
import { PretestService } from "./services/pretest.service";

/**
 * Fachada principal cohesiva para el módulo de indicadores de la tesis y panel general (RF-020).
 * Delega de forma unificada hacia los subservicios especializados con inyección de dependencias estricta.
 */
@Injectable()
export class IndicadoresService {
  constructor(
    private readonly calculoService: IndicadoresCalculoService,
    private readonly pretestService: PretestService,
    private readonly comparacionService: ComparacionService,
    private readonly medicionService: MedicionService,
    private readonly panelService: PanelService,
    private readonly exportacionService: ExportacionService,
  ) {}

  /**
   * Consulta el tablero general con los indicadores CSP, ISA e IGM según filtros.
   */
  async obtenerTablero(query: FiltroIndicadoresQueryDto): Promise<TableroIndicadoresResponseDto> {
    return this.calculoService.obtenerTablero(query);
  }

  /**
   * Consulta los indicadores propios del docente autenticado desagregados por curso y sección.
   */
  async obtenerMisIndicadores(
    personaId: string,
    periodoId?: string,
  ): Promise<MisIndicadoresDocenteResponseDto> {
    return this.calculoService.obtenerMisIndicadores(personaId, periodoId);
  }

  /**
   * Registra el pretest manual de un indicador con fuente obligatoria y control de vigencia.
   */
  async registrarPretest(
    dto: RegistrarPretestDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { pretest: PretestResponseDto }> {
    return this.pretestService.registrar(dto, actorId, rol, ip);
  }

  /**
   * Obtiene el pretest vigente de un indicador.
   */
  async obtenerPretestVigente(indicador: Indicador): Promise<PretestResponseDto | null> {
    return this.pretestService.obtenerVigente(indicador);
  }

  /**
   * Lista el histórico completo de pretests registrados.
   */
  async listarPretests(): Promise<PretestResponseDto[]> {
    return this.pretestService.listarTodos();
  }

  /**
   * Cierra la medición de un bimestre cerrado y congela los valores de CSP, ISA e IGM.
   */
  async cerrarMedicion(
    dto: CerrarMedicionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    return this.medicionService.cerrar(dto, actorId, rol, ip);
  }

  /**
   * Crea una nueva versión de una medición cerrada con motivo de recalculo obligatorio.
   */
  async crearNuevaVersionMedicion(
    id: string,
    dto: NuevaVersionMedicionDto,
    actorId: string,
    rol: string,
    ip?: string,
  ): Promise<MensajeIndicadoresResponseDto & { medicion: MedicionBimestreResponseDto }> {
    return this.medicionService.crearNuevaVersion(id, dto, actorId, rol, ip);
  }

  /**
   * Consulta la medición congelada vigente de un período.
   */
  async obtenerMedicionPeriodo(periodoId: string): Promise<MedicionBimestreResponseDto | null> {
    return this.medicionService.obtenerPorPeriodo(periodoId);
  }

  /**
   * Consulta el historial completo de versiones de la medición de un período.
   */
  async obtenerHistorialMediciones(periodoId: string): Promise<HistorialMedicionResponseDto> {
    return this.medicionService.obtenerHistorial(periodoId);
  }

  /**
   * Obtiene la comparación pretest vs postest vigente y la evolución por bimestre.
   */
  async obtenerComparacion(periodoId: string): Promise<ComparacionBimestreResponseDto> {
    return this.comparacionService.obtenerComparacion(periodoId);
  }

  /**
   * Obtiene las métricas directivas del día para el panel general.
   */
  async obtenerPanel(): Promise<PanelGeneralResponseDto> {
    return this.panelService.obtenerPanel();
  }

  /**
   * Exporta la evidencia de indicadores en datos crudos a una hoja de cálculo Excel.
   */
  async exportarExcel(
    query: ExportarIndicadoresQueryDto,
    actorId: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.exportacionService.exportarExcel(query, actorId, ip);
  }

  /**
   * Exporta el informe oficial de indicadores en PDF con membrete y gráfico de barras.
   */
  async exportarPdf(
    query: ExportarIndicadoresQueryDto,
    actorId: string,
    actorNombre: string,
    ip?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.exportacionService.exportarPdf(query, actorId, actorNombre, ip);
  }
}
