import { Injectable, Optional } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { CacheService } from "../../core/cache/cache.service";
import { IaService } from "../../core/ia/ia.service";
import { AniosAcademicosService } from "../anio-escolar/anios.service";
import { DocentesRepository } from "../docentes";
import { SeccionesRepository } from "../secciones";
import { VariablesSistemaRepository } from "../variables-sistema/repositories";
import type {
  BloqueMutacionResponseDto,
  BloquesLoteResponseDto,
  CopiarHorarioResponseDto,
  CreateBloqueHorarioDto,
  CrearBloquesLoteDto,
  GrillaPropuestaResponseDto,
  HorarioEstudianteResponseDto,
  ListarPorSeccionResponseDto,
  MiHorarioResponseDto,
  ProponerHorarioIaDto,
  PropuestaHorarioIaResponseDto,
  UpdateBloqueHorarioDto,
} from "./dto";
import { HorariosRepository } from "./repositories";
import {
  HorariosBloquesService,
  HorariosConsultaService,
  HorariosPdfService,
  HorariosPlanificacionService,
  type UsuarioConsultaEstudiante,
} from "./services";

export type { UsuarioConsultaEstudiante };

/**
 * Fachada cohesiva de horarios que delega en servicios especializados
 * (bloques, consultas, PDF y planificación/IA), manteniendo compatibilidad con Nest DI y tests.
 */
@Injectable()
export class HorariosService {
  private readonly consultaService: HorariosConsultaService;
  private readonly pdfService: HorariosPdfService;
  private readonly planificacionService: HorariosPlanificacionService;
  private readonly bloquesService: HorariosBloquesService;

  constructor(
    horariosRepo: HorariosRepository,
    seccionesRepo: SeccionesRepository,
    docentesRepo: DocentesRepository,
    aniosService: AniosAcademicosService,
    anioLectivoCls: AnioLectivoCls,
    auditService: AuditService,
    @Optional() _variablesSistemaRepo?: VariablesSistemaRepository,
    @Optional() iaService?: IaService,
    @Optional() cacheService?: CacheService,
    @Optional() consultaService?: HorariosConsultaService,
    @Optional() pdfService?: HorariosPdfService,
    @Optional() planificacionService?: HorariosPlanificacionService,
    @Optional() bloquesService?: HorariosBloquesService,
  ) {
    this.consultaService =
      consultaService ??
      new HorariosConsultaService(horariosRepo, aniosService, anioLectivoCls, cacheService);
    this.pdfService =
      pdfService ??
      new HorariosPdfService(
        horariosRepo,
        docentesRepo,
        aniosService,
        anioLectivoCls,
        this.consultaService,
      );
    this.planificacionService =
      planificacionService ??
      new HorariosPlanificacionService(
        horariosRepo,
        seccionesRepo,
        aniosService,
        anioLectivoCls,
        auditService,
        this.consultaService,
        iaService,
      );
    this.bloquesService =
      bloquesService ??
      new HorariosBloquesService(
        horariosRepo,
        seccionesRepo,
        aniosService,
        anioLectivoCls,
        auditService,
        this.consultaService,
      );
  }

  crearBloque(
    seccionId: string,
    dto: CreateBloqueHorarioDto,
    actorId: string,
    ip?: string,
  ): Promise<BloqueMutacionResponseDto> {
    return this.bloquesService.crearBloque(seccionId, dto, actorId, ip);
  }

  actualizarBloque(
    id: string,
    dto: UpdateBloqueHorarioDto,
    actorId: string,
    ip?: string,
  ): Promise<BloqueMutacionResponseDto> {
    return this.bloquesService.actualizarBloque(id, dto, actorId, ip);
  }

  crearBloquesLote(
    seccionId: string,
    dto: CrearBloquesLoteDto,
    actorId: string,
    ip?: string,
  ): Promise<BloquesLoteResponseDto> {
    return this.bloquesService.crearBloquesLote(seccionId, dto, actorId, ip);
  }

  eliminarBloque(id: string, actorId: string, ip?: string): Promise<void> {
    return this.bloquesService.eliminarBloque(id, actorId, ip);
  }

  listarPorSeccion(seccionId: string): Promise<ListarPorSeccionResponseDto> {
    return this.consultaService.listarPorSeccion(seccionId);
  }

  listarBloquesConsolidados(filtros?: { gradoId?: string; seccionId?: string }) {
    return this.consultaService.listarBloquesConsolidados(filtros);
  }

  generarHorarioSeccionPdf(
    seccionId: string,
    docenteId?: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.pdfService.generarHorarioSeccionPdf(seccionId, docenteId);
  }

  generarHorariosConsolidadoPdf(filtros?: {
    gradoId?: string;
    seccionId?: string;
    docenteId?: string;
  }): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.pdfService.generarHorariosConsolidadoPdf(filtros);
  }

  proponerGrilla(seccionId: string, horaEntrada?: string): Promise<GrillaPropuestaResponseDto> {
    return this.planificacionService.proponerGrilla(seccionId, horaEntrada);
  }

  proponerConIa(
    seccionId: string,
    dto: ProponerHorarioIaDto,
  ): Promise<PropuestaHorarioIaResponseDto> {
    return this.planificacionService.proponerConIa(seccionId, dto);
  }

  copiar(
    origenId: string,
    destinoId: string,
    actorId: string,
    ip?: string,
  ): Promise<CopiarHorarioResponseDto> {
    return this.planificacionService.copiar(origenId, destinoId, actorId, ip);
  }

  miHorario(personaId: string): Promise<MiHorarioResponseDto> {
    return this.consultaService.miHorario(personaId);
  }

  generarMiHorarioPdf(personaId: string): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.pdfService.generarMiHorarioPdf(personaId);
  }

  generarHorarioEstudiantePdf(
    estudianteId: string,
    usuario: UsuarioConsultaEstudiante,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    return this.pdfService.generarHorarioEstudiantePdf(estudianteId, usuario);
  }

  horarioDeEstudiante(
    estudianteId: string,
    usuario: UsuarioConsultaEstudiante,
  ): Promise<HorarioEstudianteResponseDto> {
    return this.consultaService.horarioDeEstudiante(estudianteId, usuario);
  }
}
