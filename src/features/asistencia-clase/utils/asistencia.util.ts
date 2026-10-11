import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { esDiaLaborable } from "../../marcaciones/utils";
import type { EstadoAsistencia } from "../constants";
import type { ResumenAsistenciaDto } from "../dto";

dayjs.extend(utc);

export interface RangoSuspension {
  fechaInicio: string;
  fechaFin: string;
}

export function resumirEstados(estados: readonly EstadoAsistencia[]): ResumenAsistenciaDto {
  const resumen: ResumenAsistenciaDto = {
    presentes: 0,
    tardanzas: 0,
    faltas: 0,
    faltasJustificadas: 0,
  };
  for (const estado of estados) {
    if (estado === "presente") resumen.presentes++;
    else if (estado === "tardanza") resumen.tardanzas++;
    else if (estado === "falta") resumen.faltas++;
    else resumen.faltasJustificadas++;
  }
  return resumen;
}

function diasEntreFechas(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  let cursor = dayjs.utc(desde);
  const fin = dayjs.utc(hasta);
  while (!cursor.isAfter(fin)) {
    dias.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return dias;
}

/**
 * Días con clases dentro del rango: laborables según el turno y sin suspensión del calendario.
 * El día de hoy no cuenta todavía (la falta se conoce cuando termina la jornada).
 */
export function diasConClases(
  desde: string,
  hasta: string,
  hoy: string,
  diasLaborables: string,
  suspensiones: readonly RangoSuspension[],
): string[] {
  const limite = hasta < hoy ? hasta : dayjs.utc(hoy).subtract(1, "day").format("YYYY-MM-DD");
  if (limite < desde) return [];
  return diasEntreFechas(desde, limite).filter(
    (dia) =>
      esDiaLaborable(dia, diasLaborables) &&
      !suspensiones.some((s) => s.fechaInicio <= dia && dia <= s.fechaFin),
  );
}

/** Falta al colegio: día con clases, con matrícula vigente ese día y sin marcación de entrada. */
export function faltasAlColegio(
  dias: readonly string[],
  fechasConEntrada: ReadonlySet<string>,
  matriculadoDesde: string,
  retiradoDesde: string | null,
): string[] {
  return dias.filter(
    (dia) =>
      dia >= matriculadoDesde &&
      (retiradoDesde === null || dia < retiradoDesde) &&
      !fechasConEntrada.has(dia),
  );
}
