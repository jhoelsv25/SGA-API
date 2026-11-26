import { MatriculaResponseDto } from "../../dto";

export function mapToResponseDto(r: {
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
}): MatriculaResponseDto {
  return {
    id: r.id,
    codigo: r.codigo,
    fechaMatricula: r.fechaMatricula,
    tipo: r.tipo,
    estado: r.estado,
    esRepitente: r.esRepitente,
    colegioProcedencia: r.colegioProcedencia ?? null,
    fechaRetiro: r.fechaRetiro ?? null,
    motivoRetiro: r.motivoRetiro ?? null,
    observaciones: r.observaciones ?? null,
    anioAcademicoId: r.anioAcademicoId,
    anioNumero: r.anioNumero,
    gradoId: r.gradoId,
    gradoNumero: r.gradoNumero,
    gradoNombre: r.gradoNombre,
    seccionId: r.seccionId,
    seccionNombre: r.seccionNombre,
    estudiante: {
      id: r.estudianteId,
      codigo: r.codigoEstudiante,
      nombres: r.personaNombres,
      apellidos: `${r.personaApellidoPaterno} ${r.personaApellidoMaterno ?? ""}`.trim(),
      tipoDocumento: r.personaTipoDocumento,
      numeroDocumento: r.personaNumeroDocumento,
      estado: r.estudianteEstado,
    },
    creadoEn: r.creadoEn,
  };
}
