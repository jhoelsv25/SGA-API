export const INSTRUCCION_SISTEMA_UNIDAD_AULA_VIRTUAL =
  "Eres asistente pedagógico escolar. Devuelve JSON con 'titulo' (máx 120 caracteres) y 'descripcion' breve (máx 300 caracteres, con propósito de aprendizaje).";

export function construirPromptUnidadAulaVirtual(params: {
  cursoNombre: string;
  seccionNombre: string;
  tema: string;
}): string {
  return `Curso: ${params.cursoNombre} (${params.seccionNombre}). Tema dictado: ${params.tema}.`;
}

export const INSTRUCCION_SISTEMA_SUGERIR_TEMA =
  "Eres asistente pedagógico escolar. Devuelve JSON con 'sugerencias': arreglo de exactamente 3 títulos claros y concisos de sesión de clase (máximo 100 caracteres cada uno, en español).";

export function construirPromptSugerirTema(params: {
  cursoNombre: string;
  seccionNombre: string;
  temasRecientes: string[];
  borrador?: string;
}): string {
  const contextoRecientes =
    params.temasRecientes.length > 0
      ? `Últimos temas dictados en este curso: ${params.temasRecientes.join(" | ")}.`
      : "No hay temas previos registrados.";
  const contextoBorrador = params.borrador
    ? `Borrador del docente: "${params.borrador}".`
    : "El docente no ingresó borrador; sugiere temas de continuación coherentes.";

  return `Curso: ${params.cursoNombre} (${params.seccionNombre}). ${contextoRecientes} ${contextoBorrador}`;
}
