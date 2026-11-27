import { diaIsoDeFecha, minutosDelDia, type TurnoParaEvaluar } from "./marcacion-reglas.util";

export interface BloqueDeClase {
  horaInicio: string;
  horaFin: string;
}

const horaDe = (minutos: number): string => {
  const total = Math.min(Math.max(minutos, 0), 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
};

/**
 * Turno del docente en un día según sus clases: la entrada esperada es el inicio de la primera y la salida, el fin
 * de la última. La tolerancia y los márgenes de cada ventana son los del turno general (la misma distancia respecto
 * de su hora de entrada o de salida). Sin clases ese día vale el turno general.
 */
export function turnoSegunClases<T extends TurnoParaEvaluar>(
  general: T,
  clases: readonly BloqueDeClase[],
  fecha: string,
): T {
  if (clases.length === 0) return general;
  const entrada = Math.min(...clases.map((c) => minutosDelDia(c.horaInicio)));
  const salida = Math.max(...clases.map((c) => minutosDelDia(c.horaFin)));
  const mover = (hora: string, baseGeneral: string, base: number) =>
    horaDe(base + minutosDelDia(hora) - minutosDelDia(baseGeneral));
  const dia = String(diaIsoDeFecha(fecha));
  const dias = general.diasLaborables.split(",").map((d) => d.trim());
  return {
    ...general,
    horaEntrada: horaDe(entrada),
    horaSalida: horaDe(salida),
    ventanaEntradaInicio: mover(general.ventanaEntradaInicio, general.horaEntrada, entrada),
    ventanaEntradaFin: mover(general.ventanaEntradaFin, general.horaEntrada, entrada),
    ventanaSalidaInicio: mover(general.ventanaSalidaInicio, general.horaSalida, salida),
    ventanaSalidaFin: mover(general.ventanaSalidaFin, general.horaSalida, salida),
    // Un día con clases programadas es laborable para ese docente, aunque el turno general no lo incluya.
    diasLaborables: dias.includes(dia) ? general.diasLaborables : [...dias, dia].join(","),
  };
}
