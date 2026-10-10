import { MatriculaEstado, MatriculaTipo } from "../constants";

export interface MatriculaRecord {
  id: string;
  estudianteId: string;
  seccionId: string;
  anioAcademicoId: string;
  codigo: string;
  fechaMatricula: string;
  tipo: MatriculaTipo;
  estado: MatriculaEstado;
  esRepitente: boolean;
  colegioProcedencia?: string | null;
  fechaRetiro?: string | null;
  motivoRetiro?: string | null;
  observaciones?: string | null;
  registradoPorId?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface EstudianteParaMatricula {
  id: string;
  personaId: string;
  codigo: string;
  estado: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  numeroDocumento: string;
  tipoDocumento: string;
}

export interface SeccionConVacantes {
  id: string;
  anioAcademicoId: string;
  anioNumero: number;
  gradoId: string;
  gradoNumero: number;
  gradoNombre: string;
  nombre: string;
  vacantes: number;
  estado: string;
  matriculadosCount: number;
  vacantesDisponibles: number;
}

export interface DatosConstanciaMatricula {
  codigoMatricula: string;
  fechaMatricula: string;
  tipoMatricula: string;
  anioEscolar: number;
  gradoNumero: number;
  gradoNombre: string;
  seccionNombre: string;
  estudiante: {
    codigo: string;
    nombres: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento?: string | null;
  };
  institucion: {
    nombre: string;
    codigoModular?: string | null;
    direccion?: string | null;
    telefono?: string | null;
  };
}
