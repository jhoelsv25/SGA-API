import { Database } from "../../../../core/database";
import { EstudianteParaMatricula } from "../../interfaces";
import { MatriculaResponseDto } from "../../dto";

export type MatriculasRepositoryDeps = {
  db: Database;
};

export type MatriculasRepositoryCalls = {
  findAnioById: (anioId: string) => Promise<{ id: string; anio: number; estado: string } | null>;
  findAnioParaMatricula: (
    anioId?: string,
  ) => Promise<{ id: string; anio: number; estado: string } | null>;
  findEstudiantesPorCodigosODocumentos: (
    identificadores: string[],
  ) => Promise<EstudianteParaMatricula[]>;
  mapToResponseDto: (r: {
    id: string;
    codigo: string;
    fechaMatricula: string;
    tipo: string;
    estado: string;
    esRepitente: boolean;
    colegioProcedencia?: string | null;
    fechaRetiro?: string | null;
    motivoRetiro?: string | null;
    observaciones?: string | null;
    creadoEn: string;
    anioAcademicoId: string;
    anioNumero: number;
    gradoId: string;
    gradoNumero: number;
    gradoNombre: string;
    seccionId: string;
    seccionNombre: string;
    estudianteId: string;
    codigoEstudiante: string;
    estudianteEstado: string;
    personaNombres: string;
    personaApellidoPaterno: string;
    personaApellidoMaterno?: string | null;
    personaTipoDocumento: string;
    personaNumeroDocumento: string;
  }) => MatriculaResponseDto;
};
