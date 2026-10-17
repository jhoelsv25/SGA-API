export interface FiltrosConsultaCalculo {
  anioAcademicoId: string;
  periodoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  docenteId?: string;
  cursoId?: string;
  seccionId?: string;
}

export interface ConteoSesionesFila {
  planificadas: number;
  cumplidas: number;
  parciales: number;
  noCumplidas: number;
  justificadas: number;
}

export interface ConteoLibretasFila {
  programadas: number;
  publicadasATiempo: number;
  publicadasFueraDePlazo: number;
  pendientes: number;
  vistasPorFamilia: number;
}

export interface ConteoMaterialesFila {
  planificados: number;
  publicadosATiempo: number;
  publicadosFueraDePlazo: number;
  pendientes: number;
  extras: number;
}

export interface CursoDocenteFila {
  cursoId: string;
  cursoNombre: string;
  seccionId: string;
  seccionNombre: string;
  gradoNombre: string;
}

export interface PeriodoResumen {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface DocenteResumen {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export interface IIndicadoresCalculoRepository {
  obtenerPeriodoPorId(periodoId: string): Promise<PeriodoResumen | null>;
  obtenerPeriodoEnCurso(anioAcademicoId: string): Promise<PeriodoResumen | null>;
  contarSesiones(filtros: FiltrosConsultaCalculo): Promise<ConteoSesionesFila>;
  contarLibretas(filtros: FiltrosConsultaCalculo): Promise<ConteoLibretasFila>;
  contarMateriales(filtros: FiltrosConsultaCalculo): Promise<ConteoMaterialesFila>;
  listarCursosDeDocente(
    docenteId: string,
    anioAcademicoId: string,
    periodoId?: string,
  ): Promise<CursoDocenteFila[]>;
  obtenerDocentePorPersonaId(personaId: string): Promise<DocenteResumen | null>;
}
