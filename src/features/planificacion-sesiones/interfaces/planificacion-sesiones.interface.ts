import type { EstadoPlanificacion, Momento } from "../constants";

export interface ActorPlanificacion {
  id: string;
  roleId: string;
  role: string;
  personaId: string;
}

export interface BloqueDocente {
  horarioId: string;
  cursoSeccionId: string;
  docenteId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cursoNombre: string;
  areaCurricular: string;
  seccionNombre: string;
  gradoNumero: number;
  gradoNombre: string;
}

export interface DesempenoPlanificado {
  desempenoId: string | null;
  base: string | null;
  texto: string;
}

export interface CompetenciaPlanificada {
  orden: number;
  competenciaId: string;
  competenciaTexto: string;
  capacidades: string[];
  desempenos: DesempenoPlanificado[];
  campoTematico: string | null;
}

export interface MomentoPlanificado {
  momento: Momento;
  actividades: string | null;
  minutos: number | null;
}

export interface ComentarioPlanificacion {
  id: string;
  usuarioId: string;
  autor: string;
  texto: string;
  creadoEn: string;
}

export interface PlanificacionFila {
  id: string;
  docenteId: string;
  docentePersonaId: string;
  docenteNombre: string;
  cursoSeccionId: string;
  horarioId: string;
  sesionClaseId: string | null;
  fecha: string;
  numero: number | null;
  unidad: string | null;
  titulo: string;
  proposito: string | null;
  evidencia: string | null;
  criterios: string[];
  instrumentoCodigo: string | null;
  competenciasTransversales: unknown[];
  enfoques: unknown[];
  materiales: Record<string, string[]>;
  referencias: string[];
  estado: EstadoPlanificacion;
  copiadaDeId: string | null;
  actualizadoEn: string;
}

export interface PlanificacionCompleta extends PlanificacionFila {
  bloque: BloqueDocente;
  competencias: CompetenciaPlanificada[];
  momentos: MomentoPlanificado[];
  comentarios: ComentarioPlanificacion[];
}

export interface DatosGuardarPlanificacion {
  docenteId: string;
  cursoSeccionId: string;
  horarioId: string;
  fecha: string;
  numero: number | null;
  unidad: string | null;
  titulo: string;
  proposito: string | null;
  evidencia: string | null;
  criterios: string[];
  instrumentoCodigo: string | null;
  competenciasTransversales: unknown[];
  enfoques: unknown[];
  materiales: Record<string, string[]>;
  referencias: string[];
  estado: EstadoPlanificacion;
  copiadaDeId: string | null;
  competencias: Omit<CompetenciaPlanificada, "orden">[];
  momentos: MomentoPlanificado[];
}
