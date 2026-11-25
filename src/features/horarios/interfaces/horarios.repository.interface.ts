import type {
  BloqueDocenteResponseDto,
  BloqueHorarioResponseDto,
  ResumenHorasCursoDto,
} from "../dto";

export interface HorarioSeccionSqlResult {
  bloques: BloqueHorarioResponseDto[];
  resumenHoras: ResumenHorasCursoDto[];
}

export interface SeccionHorariosConsolidado {
  seccionId: string;
  gradoId: string;
  gradoNumero: number;
  gradoNombre: string;
  seccionNombre: string;
  bloques: Array<BloqueHorarioResponseDto & { docenteId: string | null }>;
}

export interface CruceDocenteResultado {
  docenteNombre: string;
  gradoNumero: number;
  seccionNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface BloqueDocenteResultado {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cursoNombre: string | null;
  colorHex: string | null;
  seccionNombre: string;
  gradoNumero: number;
  aula: string | null;
}

export interface DocenteSimpleResultado {
  id: string;
}

export interface MatriculaEstudianteResultado {
  seccionId: string;
  estado: string;
}

export interface CursoPlanDetalle {
  cursoNombre: string;
  horasPlan: number;
}

export interface ParametrosJornadaResultado {
  minutosHoraPedagogica: number;
  horasPedagogicasDia: number;
  recreoDespuesDeHora: number;
  minutosRecreo: number;
}

export interface CursoSeccionDetalle {
  cursoSeccionId: string;
  cursoId: string;
  cursoNombre: string;
  docenteId: string | null;
}

export interface CreateBloqueData {
  seccionId: string;
  cursoSeccionId?: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: "clase" | "receso";
  aula?: string | null;
}

export interface UpdateBloqueData {
  cursoSeccionId?: string | null;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  tipoBloque?: "clase" | "receso";
  aula?: string | null;
}

export interface IHorariosRepository {
  findBySeccion(seccionId: string): Promise<BloqueHorarioResponseDto[]>;
  findById(id: string): Promise<BloqueHorarioResponseDto | null>;
  findSolapados(
    seccionId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoId?: string,
  ): Promise<BloqueHorarioResponseDto[]>;
  findCruceDocente(
    anioId: string,
    docenteId: string,
    dia: number,
    inicio: string,
    fin: string,
    exceptoSeccionId?: string,
  ): Promise<CruceDocenteResultado | null>;
  horasPorCurso(seccionId: string): Promise<Record<string, number>>;
  horasPlanPorCurso(seccionId: string): Promise<Record<string, CursoPlanDetalle>>;
  obtenerParametrosJornada(): Promise<ParametrosJornadaResultado>;
  horaEntradaEstudiantes(): Promise<string>;
  cursosSeccionPorSeccion(seccionId: string): Promise<CursoSeccionDetalle[]>;
  create(data: CreateBloqueData): Promise<BloqueHorarioResponseDto>;
  crearLote(
    seccionId: string,
    bloques: CreateBloqueData[],
    reemplazarExistentes: boolean,
  ): Promise<BloqueHorarioResponseDto[]>;
  update(id: string, data: UpdateBloqueData): Promise<BloqueHorarioResponseDto>;
  delete(id: string): Promise<boolean>;
  tieneSesiones(id: string): Promise<boolean>;
  findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResponseDto[]>;
  docentePorPersonaId(personaId: string): Promise<DocenteSimpleResultado | null>;
  infoSeccion(
    seccionId: string,
  ): Promise<{ gradoNombre: string; seccionNombre: string; anio: number } | null>;
  matriculaEstudiante(
    anioId: string,
    estudianteId: string,
  ): Promise<MatriculaEstudianteResultado | null>;
  esApoderadoDeEstudiante(apoderadoPersonaId: string, estudianteId: string): Promise<boolean>;
  consultarHorarioSeccionSql?(seccionId: string): Promise<HorarioSeccionSqlResult>;
  listarSeccionesYBloquesDeAnio?(
    anioId: string,
    filtros?: { gradoId?: string; seccionId?: string },
  ): Promise<SeccionHorariosConsolidado[]>;
}
