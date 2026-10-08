import { EstadoAnio, EstadoBimestre } from "../constants";
import { AnioAcademicoResponseDto, BimestreResponseDto } from "../dto";

export interface BimestrePersistido extends BimestreResponseDto {
  anioAcademicoId: string;
}

export interface AnioPersistido extends AnioAcademicoResponseDto {
  bimestres: BimestrePersistido[];
}

export interface CrearAnioData {
  anio: number;
  nombre: string | null;
  fechaInicio: string;
  fechaFin: string;
  bimestres: { numero: number; nombre: string; fechaInicio: string; fechaFin: string }[];
}

export interface ActualizarAnioData {
  nombre?: string | null;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface IAniosAcademicosRepository {
  findAll(): Promise<AnioPersistido[]>;
  findById(id: string): Promise<AnioPersistido | null>;
  findByAnio(anio: number): Promise<AnioPersistido | null>;
  findEnCurso(): Promise<AnioPersistido | null>;
  findReabierto(): Promise<AnioPersistido | null>;
  create(data: CrearAnioData): Promise<AnioPersistido>;
  update(id: string, data: ActualizarAnioData): Promise<AnioPersistido>;
  guardarBimestres(
    anioId: string,
    bimestres: { numero: number; nombre: string; fechaInicio: string; fechaFin: string }[],
  ): Promise<AnioPersistido>;
  cambiarEstadoAnio(
    id: string,
    estado: EstadoAnio,
    reapertura?: { motivo: string | null; hasta: string | null },
  ): Promise<AnioPersistido>;
  findBimestre(anioId: string, bimestreId: string): Promise<BimestrePersistido | null>;
  cambiarEstadoBimestre(id: string, estado: EstadoBimestre): Promise<BimestrePersistido>;
  hayOtroBimestreEnCurso(anioId: string, exceptoId?: string): Promise<boolean>;
  bimestreCerradoEn(fecha: string): Promise<boolean>;
  cerrarReaperturasVencidas(hoy: string): Promise<AnioPersistido[]>;
}
