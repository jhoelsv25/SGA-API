import type { ResultadoMarcacion } from "../../marcaciones/constants";
import type { EstadoAsistencia } from "../constants";
import type { EstudianteListaAsistenciaDto, EstudianteVinculadoDto } from "../dto";

export interface SesionParaAsistencia {
  id: string;
  fecha: string;
  docenteId: string;
  firmadaInicioEn: string | null;
  seccionId: string;
  seccionNombre: string;
  tutorId: string | null;
  cursoSeccionId: string;
  cursoNombre: string;
}

export interface RegistroAsistencia {
  id: string;
  estado: EstadoAsistencia;
  matriculaId: string;
  cursoSeccionId: string;
  fecha: string;
  seccionId: string;
  tutorId: string | null;
}

export interface NuevoRegistroAsistencia {
  matriculaId: string;
  estado: EstadoAsistencia;
}

export interface EstudianteBasico {
  id: string;
  personaId: string;
  nombreCompleto: string;
}

export interface MatriculaParaConsulta {
  id: string;
  seccionId: string;
  seccionNombre: string;
  tutorId: string | null;
  anioAcademicoId: string;
  fechaMatricula: string;
  fechaRetiro: string | null;
  estado: string;
}

export interface EntradaDePersona {
  personaId: string;
  fecha: string;
  hora: string;
  resultado: ResultadoMarcacion;
  minutosTardanza: number;
  justificada: boolean;
}

export interface AsistenciaCursoFila {
  id: string;
  matriculaId: string;
  cursoSeccionId: string;
  cursoNombre: string;
  fecha: string;
  estado: EstadoAsistencia;
  justificacion: string | null;
}

export interface MatriculaDeSeccion {
  matriculaId: string;
  estudianteId: string;
  personaId: string;
  nombreCompleto: string;
  fechaMatricula: string;
  fechaRetiro: string | null;
}

export interface SeccionConTutor {
  id: string;
  nombre: string;
  tutorId: string | null;
  anioAcademicoId: string;
}

export interface IAsistenciaClaseRepository {
  findSesion(sesionId: string): Promise<SesionParaAsistencia | null>;
  findDocenteIdPorPersona(personaId: string): Promise<string | null>;
  listarEstudiantesDeSesion(sesion: SesionParaAsistencia): Promise<EstudianteListaAsistenciaDto[]>;
  guardarAsistencia(
    sesion: SesionParaAsistencia,
    registros: NuevoRegistroAsistencia[],
    actorId: string,
  ): Promise<void>;
  findRegistro(id: string): Promise<RegistroAsistencia | null>;
  justificarFalta(
    id: string,
    motivo: string,
    documentoUrl: string | null,
    actorId: string,
  ): Promise<void>;
  findEstudiante(estudianteId: string): Promise<EstudianteBasico | null>;
  esApoderadoDe(personaId: string, estudianteId: string): Promise<boolean>;
  estudiantesVinculados(personaId: string): Promise<EstudianteVinculadoDto[]>;
  matriculaParaConsulta(
    estudianteId: string,
    desde: string,
    hasta: string,
  ): Promise<MatriculaParaConsulta | null>;
  entradasDePersonas(
    personaIds: string[],
    desde: string,
    hasta: string,
  ): Promise<EntradaDePersona[]>;
  suspensiones(
    anioAcademicoId: string,
    desde: string,
    hasta: string,
  ): Promise<{ fechaInicio: string; fechaFin: string }[]>;
  asistenciaPorCurso(
    matriculaIds: string[],
    desde: string,
    hasta: string,
  ): Promise<AsistenciaCursoFila[]>;
  seccionesConsultables(
    anioAcademicoId: string,
    tutorId: string | null,
  ): Promise<{ id: string; nombre: string }[]>;
  findSeccion(seccionId: string): Promise<SeccionConTutor | null>;
  matriculasDeSeccion(seccionId: string): Promise<MatriculaDeSeccion[]>;
}
