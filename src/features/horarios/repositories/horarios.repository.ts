import { Inject, Injectable, Optional } from "@nestjs/common";
import { Database, DRIZZLE } from "../../../core/database";
import type { BloqueDocenteResponseDto, BloqueHorarioResponseDto } from "../dto";
import type {
  CreateBloqueData,
  CruceDocenteResultado,
  CursoPlanDetalle,
  CursoSeccionDetalle,
  DocenteSimpleResultado,
  HorarioSeccionSqlResult,
  IHorariosRepository,
  MatriculaEstudianteResultado,
  ParametrosJornadaResultado,
  SeccionHorariosConsolidado,
  UpdateBloqueData,
} from "../interfaces";
import { HorariosBloquesRepository } from "./horarios-bloques.repository";
import { HorariosConsultaRepository } from "./horarios-consulta.repository";
import { HorariosJornadaRepository } from "./horarios-jornada.repository";

/**
 * Fachada de repositorio de horarios que delega cada grupo de acceso a datos
 * en repositorios cohesivos (bloques, consultas y jornada).
 */
@Injectable()
export class HorariosRepository implements IHorariosRepository {
  private readonly bloquesRepo: HorariosBloquesRepository;
  private readonly consultaRepo: HorariosConsultaRepository;
  private readonly jornadaRepo: HorariosJornadaRepository;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Optional() bloquesRepo?: HorariosBloquesRepository,
    @Optional() consultaRepo?: HorariosConsultaRepository,
    @Optional() jornadaRepo?: HorariosJornadaRepository,
  ) {
    this.bloquesRepo = bloquesRepo ?? new HorariosBloquesRepository(db);
    this.consultaRepo = consultaRepo ?? new HorariosConsultaRepository(db);
    this.jornadaRepo = jornadaRepo ?? new HorariosJornadaRepository(db);
  }

  findBySeccion(seccionId: string): Promise<BloqueHorarioResponseDto[]> {
    return this.bloquesRepo.findBySeccion(seccionId);
  }

  consultarHorarioSeccionSql(seccionId: string): Promise<HorarioSeccionSqlResult> {
    return this.consultaRepo.consultarHorarioSeccionSql(seccionId);
  }

  findById(id: string): Promise<BloqueHorarioResponseDto | null> {
    return this.bloquesRepo.findById(id);
  }

  findSolapados(
    seccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoId?: string,
  ): Promise<BloqueHorarioResponseDto[]> {
    return this.bloquesRepo.findSolapados(seccionId, dia, inicio, fin, exceptoId);
  }

  findCruceDocente(
    anioId: string,
    docenteIdOCursoSeccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoSeccionId?: string,
  ): Promise<CruceDocenteResultado | null> {
    return this.bloquesRepo.findCruceDocente(
      anioId,
      docenteIdOCursoSeccionId,
      dia,
      inicio,
      fin,
      exceptoSeccionId,
    );
  }

  horasPorCurso(seccionId: string): Promise<Record<string, number>> {
    return this.jornadaRepo.horasPorCurso(seccionId);
  }

  obtenerParametrosJornada(): Promise<ParametrosJornadaResultado> {
    return this.jornadaRepo.obtenerParametrosJornada();
  }

  horaEntradaEstudiantes(): Promise<string> {
    return this.jornadaRepo.horaEntradaEstudiantes();
  }

  cursosSeccionPorSeccion(seccionId: string): Promise<CursoSeccionDetalle[]> {
    return this.jornadaRepo.cursosSeccionPorSeccion(seccionId);
  }

  horasPlanPorCurso(seccionId: string): Promise<Record<string, CursoPlanDetalle>> {
    return this.jornadaRepo.horasPlanPorCurso(seccionId);
  }

  create(data: CreateBloqueData): Promise<BloqueHorarioResponseDto> {
    return this.bloquesRepo.create(data);
  }

  crearLote(
    seccionId: string,
    bloques: CreateBloqueData[],
    reemplazarExistentes: boolean,
  ): Promise<BloqueHorarioResponseDto[]> {
    return this.bloquesRepo.crearLote(seccionId, bloques, reemplazarExistentes);
  }

  update(id: string, data: UpdateBloqueData): Promise<BloqueHorarioResponseDto> {
    return this.bloquesRepo.update(id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.bloquesRepo.delete(id);
  }

  tieneSesiones(id: string): Promise<boolean> {
    return this.bloquesRepo.tieneSesiones(id);
  }

  findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResponseDto[]> {
    return this.consultaRepo.findByDocente(anioId, docenteId);
  }

  docentePorPersonaId(personaId: string): Promise<DocenteSimpleResultado | null> {
    return this.consultaRepo.docentePorPersonaId(personaId);
  }

  matriculaEstudiante(
    anioId: string,
    estudianteId: string,
  ): Promise<MatriculaEstudianteResultado | null> {
    return this.consultaRepo.matriculaEstudiante(anioId, estudianteId);
  }

  esApoderadoDeEstudiante(apoderadoPersonaId: string, estudianteId: string): Promise<boolean> {
    return this.consultaRepo.esApoderadoDeEstudiante(apoderadoPersonaId, estudianteId);
  }

  infoSeccion(
    seccionId: string,
  ): Promise<{ gradoNombre: string; seccionNombre: string; anio: number } | null> {
    return this.consultaRepo.infoSeccion(seccionId);
  }

  listarSeccionesYBloquesDeAnio(
    anioId: string,
    filtros?: { gradoId?: string; seccionId?: string },
  ): Promise<SeccionHorariosConsolidado[]> {
    return this.consultaRepo.listarSeccionesYBloquesDeAnio(anioId, filtros);
  }
}
