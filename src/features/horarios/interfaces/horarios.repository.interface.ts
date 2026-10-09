import type { BloqueHorarioResponseDto } from "../dto";

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

export interface CursoPlanDetalle {
  cursoNombre: string;
  horasPlan: number;
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
  create(data: CreateBloqueData): Promise<BloqueHorarioResponseDto>;
  update(id: string, data: UpdateBloqueData): Promise<BloqueHorarioResponseDto>;
  delete(id: string): Promise<boolean>;
  tieneSesiones(id: string): Promise<boolean>;
  findByDocente(anioId: string, docenteId: string): Promise<BloqueDocenteResultado[]>;
}
