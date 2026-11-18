export const INSTRUCCION_SISTEMA_PROPONER_HORARIO =
  "Eres planificador de horarios escolares. Distribuye los cursos en los slots disponibles respetando la cantidad exacta de bloques por curso, evitando cruces con los horarios ocupados de cada docente y repartiendo cada curso en distintos días de la semana. Devuelve JSON con { asignaciones: [{ diaSemana, horaInicio, cursoSeccionId }] }.";

export function construirPromptProponerHorario(params: {
  slotsDisponibles: Array<{
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  }>;
  cursos: Array<{
    cursoSeccionId: string;
    cursoNombre: string;
    docenteId: string | null;
    bloquesRequeridos: number;
  }>;
  docentesOcupados: Array<{
    docenteId: string;
    ocupado: string[];
  }>;
  preferencias?: string;
}): string {
  return JSON.stringify({
    slotsDisponibles: params.slotsDisponibles,
    cursos: params.cursos,
    docentesOcupados: params.docentesOcupados,
    preferencias: params.preferencias?.trim() || "Distribución pedagógica equilibrada.",
  });
}
