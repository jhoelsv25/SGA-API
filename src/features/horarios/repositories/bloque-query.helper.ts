import { cursos, horarios, personas } from "../../../core/database/schema";
import type { BloqueHorarioResponseDto } from "../dto";
import { normalizarHora } from "../utils";

/** Proyección base reutilizada para consultar bloques con curso y docente. */
export const SELECT_BLOQUE_HORARIO = {
  id: horarios.id,
  seccionId: horarios.seccionId,
  cursoSeccionId: horarios.cursoSeccionId,
  cursoNombre: cursos.nombre,
  colorHex: cursos.colorHex,
  docenteNombres: personas.nombres,
  docenteApellidoPaterno: personas.apellidoPaterno,
  docenteApellidoMaterno: personas.apellidoMaterno,
  diaSemana: horarios.diaSemana,
  horaInicio: horarios.horaInicio,
  horaFin: horarios.horaFin,
  tipoBloque: horarios.tipoBloque,
  aula: horarios.aula,
};

export interface FilaBloqueBruta {
  id: string;
  seccionId: string;
  cursoSeccionId: string | null;
  cursoNombre: string | null;
  colorHex: string | null;
  docenteNombres: string | null;
  docenteApellidoPaterno: string | null;
  docenteApellidoMaterno: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoBloque: string;
  aula: string | null;
}

/** Convierte una fila SQL de horario al DTO normalizado de respuesta. */
export function mapearFilaABloqueResponse(fila: FilaBloqueBruta): BloqueHorarioResponseDto {
  const docenteNombre = [
    fila.docenteNombres,
    fila.docenteApellidoPaterno,
    fila.docenteApellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: fila.id,
    seccionId: fila.seccionId,
    cursoSeccionId: fila.cursoSeccionId,
    cursoNombre: fila.cursoNombre,
    colorHex: fila.colorHex,
    docenteNombre: docenteNombre || null,
    diaSemana: fila.diaSemana,
    horaInicio: normalizarHora(fila.horaInicio),
    horaFin: normalizarHora(fila.horaFin),
    tipoBloque: fila.tipoBloque as "clase" | "receso",
    aula: fila.aula,
  };
}
