import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ZONA_HORARIA_COLEGIO } from "../../calendario/constants";
import type { ResultadoMarcacion, TipoMarcacion } from "../constants";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface TurnoParaEvaluar {
  horaEntrada: string;
  horaSalida: string;
  ventanaEntradaInicio: string;
  ventanaEntradaFin: string;
  ventanaSalidaInicio: string;
  ventanaSalidaFin: string;
  toleranciaMin: number;
  diasLaborables: string;
}

export interface EvaluacionMarcacion {
  resultado: ResultadoMarcacion;
  minutosTardanza: number;
}

/** "07:45" o "07:45:00" → minutos desde la medianoche. */
export function minutosDelDia(hora: string): number {
  const [h, m] = hora.trim().split(":").map(Number);
  return h * 60 + m;
}

export function esHoraValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora.trim());
}

/** Día ISO de una fecha YYYY-MM-DD: 1 = lunes … 7 = domingo. */
export function diaIsoDeFecha(fecha: string): number {
  const dia = dayjs.utc(fecha).day();
  return dia === 0 ? 7 : dia;
}

export function esDiaLaborable(fecha: string, diasLaborables: string): boolean {
  const dias = diasLaborables.split(",").map((d) => Number(d.trim()));
  return dias.includes(diaIsoDeFecha(fecha));
}

export function evaluarEntrada(
  turno: TurnoParaEvaluar,
  hora: string,
  diaConClases: boolean,
): EvaluacionMarcacion {
  const minutos = minutosDelDia(hora);
  const fueraDeVentana =
    minutos < minutosDelDia(turno.ventanaEntradaInicio) ||
    minutos > minutosDelDia(turno.ventanaEntradaFin);
  if (!diaConClases || fueraDeVentana) {
    return { resultado: "fuera_de_turno", minutosTardanza: 0 };
  }
  const limite = minutosDelDia(turno.horaEntrada) + turno.toleranciaMin;
  if (minutos <= limite) {
    return { resultado: "puntual", minutosTardanza: 0 };
  }
  return { resultado: "tardanza", minutosTardanza: minutos - limite };
}

export function evaluarSalida(
  turno: TurnoParaEvaluar,
  hora: string,
  diaConClases: boolean,
): EvaluacionMarcacion {
  const minutos = minutosDelDia(hora);
  const fueraDeVentana =
    minutos < minutosDelDia(turno.ventanaSalidaInicio) ||
    minutos > minutosDelDia(turno.ventanaSalidaFin);
  if (!diaConClases || fueraDeVentana) {
    return { resultado: "fuera_de_turno", minutosTardanza: 0 };
  }
  if (minutos >= minutosDelDia(turno.horaSalida)) {
    return { resultado: "puntual", minutosTardanza: 0 };
  }
  return { resultado: "salida_anticipada", minutosTardanza: 0 };
}

export function evaluarMarcacion(
  tipo: TipoMarcacion,
  turno: TurnoParaEvaluar,
  hora: string,
  diaConClases: boolean,
): EvaluacionMarcacion {
  return tipo === "entrada"
    ? evaluarEntrada(turno, hora, diaConClases)
    : evaluarSalida(turno, hora, diaConClases);
}

/**
 * El personal marca entrada primero y salida después; los estudiantes solo entrada.
 * Devuelve null si ya no admite más marcaciones ese día.
 */
export function siguienteTipo(
  esEstudiante: boolean,
  tiposYaMarcados: readonly TipoMarcacion[],
): TipoMarcacion | null {
  if (!tiposYaMarcados.includes("entrada")) return "entrada";
  if (esEstudiante) return null;
  return tiposYaMarcados.includes("salida") ? null : "salida";
}

/** Hora del servidor en la zona de Lima (nunca la del equipo). */
export function ahoraEnColegio(): { fecha: string; hora: string; fechaHora: string } {
  const ahora = dayjs().tz(ZONA_HORARIA_COLEGIO);
  return {
    fecha: ahora.format("YYYY-MM-DD"),
    hora: ahora.format("HH:mm:ss"),
    fechaHora: ahora.format("YYYY-MM-DD HH:mm:ss"),
  };
}

/** "07:52:10" → "07:52" */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

/** Hora (HH:mm) de un timestamp "YYYY-MM-DD HH:mm:ss". */
export function horaDeFechaHora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

export function personaDeTipo(tipoPersona: string): "estudiantes" | "docentes" | "administrativos" {
  if (tipoPersona === "estudiante") return "estudiantes";
  if (tipoPersona === "docente") return "docentes";
  return "administrativos";
}

export function equipoPermite(usuariosPermitidos: string, aplicaA: string): boolean {
  return usuariosPermitidos
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .includes(aplicaA);
}
