import { Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { AusenciasConsultaService } from "./ausencias-consulta.service";
import { AusenciasCorreccionService } from "./ausencias-correccion.service";
import { AusenciasRegistroService } from "./ausencias-registro.service";
import type {
  AnularAusenciaDto,
  AusenciaResponseDto,
  CorregirAusenciaDto,
  FiltroAusenciasQueryDto,
  HistorialAusenciaResponseDto,
  MensajeAusenciaResponseDto,
  RegistrarAusenciaDto,
  RegistrarDescargoDto,
  ResumenAusenciasSupervisorResponseDto,
} from "./dto";
import { AusenciasDocenteRepository } from "./repositories";

@Injectable()
export class AusenciasDocenteService {
  private readonly servicioRegistro: AusenciasRegistroService;
  private readonly servicioCorreccion: AusenciasCorreccionService;
  private readonly servicioConsulta: AusenciasConsultaService;

  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
    @Optional() registroService?: AusenciasRegistroService,
    @Optional() correccionService?: AusenciasCorreccionService,
    @Optional() consultaService?: AusenciasConsultaService,
  ) {
    this.servicioRegistro =
      registroService ??
      new AusenciasRegistroService(repository, notificacionesService, auditService, anioLectivoCls);
    this.servicioCorreccion =
      correccionService ??
      new AusenciasCorreccionService(
        repository,
        notificacionesService,
        auditService,
        anioLectivoCls,
      );
    this.servicioConsulta =
      consultaService ??
      new AusenciasConsultaService(repository, notificacionesService, auditService, anioLectivoCls);
  }

  /**
   * HU1: Registrar una ausencia en una sesión de clase con fotos opcionales.
   * Traza: CP-RF012-01, 02, 03, 04, 05, 06, 07, 08, 09, 18, 25.
   */
  async registrar(
    dto: RegistrarAusenciaDto,
    fotos: Express.Multer.File[] | undefined,
    actorId: string,
    ip?: string,
  ): Promise<MensajeAusenciaResponseDto & { ausencia: AusenciaResponseDto }> {
    return this.servicioRegistro.registrar(dto, fotos, actorId, ip);
  }

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
    return this.servicioCorreccion.corregir(id, dto, fotos, actorId, ip);
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
    return this.servicioCorreccion.anular(id, dto, actorId, ip);
  }

  /**
   * HU2: Consultar el historial completo de versiones de una ausencia (Director / Subdirector).
   * Traza: CP-RF012-12.
   */
  async obtenerHistorial(id: string): Promise<HistorialAusenciaResponseDto> {
    return this.servicioCorreccion.obtenerHistorial(id);
  }

  /**
   * HU4: Listar ausencias para supervisores con filtros y cálculo de total de minutos (excluyendo anuladas).
   * Traza: CP-RF012-24.
   */
  async listarSupervisor(
    query: FiltroAusenciasQueryDto,
  ): Promise<ResumenAusenciasSupervisorResponseDto> {
    return this.servicioConsulta.listarSupervisor(query);
  }

  /**
   * HU3: Listar ausencias del docente autenticado (solo vigentes y de sus sesiones).
   * Traza: CP-RF012-13, 19, 23.
   */
  async misAusencias(personaId: string): Promise<AusenciaResponseDto[]> {
    return this.servicioConsulta.misAusencias(personaId);
  }

  /**
   * HU3: Obtener el detalle de una ausencia para el docente autenticado.
   * Traza: CP-RF012-13, 19, 23.
   */
  async obtenerDetalleDocente(id: string, personaId: string): Promise<AusenciaResponseDto> {
    return this.servicioConsulta.obtenerDetalleDocente(id, personaId);
  }

  /**
   * HU3: Registrar el descargo único del docente dentro del plazo de 7 días.
   * Traza: CP-RF012-20, 21, 22, 23, 18.
   */
  async presentarDescargo(
    id: string,
    dto: RegistrarDescargoDto,
    personaId: string,
    actorId: string,
    ip?: string,
  ): Promise<MensajeAusenciaResponseDto> {
    return this.servicioConsulta.presentarDescargo(id, dto, personaId, actorId, ip);
  }
}
