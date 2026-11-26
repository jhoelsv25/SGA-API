import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ZONA_HORARIA_COLEGIO } from "../../calendario/constants";
import type { OrigenMarcacion, ResultadoMarcacion, TipoMarcacion } from "../constants";
import type { MarcacionDelDia } from "../interfaces";

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

export type DecisionMarca =
  | {
      accion: "registrar";
      tipo: TipoMarcacion;
      /** La entrada ya guardada pasa a ser la salida porque la nueva marca es anterior a ella. */
      reetiquetar?: MarcacionDelDia & { tipo: "entrada" };
    }
  | { accion: "ignorar"; razon: "duplicada_entre_vias"; con: MarcacionDelDia }
  | { accion: "ignorar"; razon: "jornada_completa" };

/**
 * Decide qué hacer con una marcación nueva según las que ya hay ese día, sin importar la vía por la que llegó:
 *  1. Si hay una marca de OTRA vía a menos de `minutosEntreVias`, es la misma asistencia: se ignora (el llamador
 *     deja el rastro). Una segunda marca de la misma vía no entra aquí: sigue su propia regla (antirrebote).
 *  2. Entrada y salida se asignan por la hora de la marca, no por el orden de llegada: si llega una marca
 *     anterior a la entrada ya guardada (lote atrasado del reloj), esa pasa a ser la entrada y la guardada, la salida.
 * El personal admite entrada y salida; los estudiantes solo entrada.
 */
export function decidirMarca(params: {
  esEstudiante: boolean;
  previas: readonly MarcacionDelDia[];
  fechaHora: string;
  origen: OrigenMarcacion;
  minutosEntreVias: number;
}): DecisionMarca {
  const { esEstudiante, previas, fechaHora, origen, minutosEntreVias } = params;

  if (minutosEntreVias > 0) {
    const cercana = previas.find(
      (m) =>
        m.origen !== origen && Math.abs(minutosEntre(m.fechaHora, fechaHora)) < minutosEntreVias,
    );
    if (cercana) return { accion: "ignorar", razon: "duplicada_entre_vias", con: cercana };
  }

  const entrada = previas.find((m) => m.tipo === "entrada");
  if (!entrada) return { accion: "registrar", tipo: "entrada" };
  if (esEstudiante || previas.some((m) => m.tipo === "salida")) {
    return { accion: "ignorar", razon: "jornada_completa" };
  }
  if (minutosEntre(entrada.fechaHora, fechaHora) >= 0) {
    return { accion: "registrar", tipo: "salida" };
  }
  return { accion: "registrar", tipo: "entrada", reetiquetar: { ...entrada, tipo: "entrada" } };
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

/** Fecha YYYY-MM-DD en Lima de un instante en milisegundos (por defecto, ahora). */
export function fechaEnColegio(instante: number = Date.now()): string {
  return dayjs(instante).tz(ZONA_HORARIA_COLEGIO).format("YYYY-MM-DD");
}

/** "07:52:10" → "07:52" */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

/** Hora (HH:mm) de un timestamp "YYYY-MM-DD HH:mm:ss". */
export function horaDeFechaHora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

/** Diferencia en minutos (b − a) entre dos "YYYY-MM-DD HH:mm:ss" de la misma zona horaria. */
export function minutosEntre(a: string, b: string): number {
  return Math.round(
    (dayjs.utc(b.replace(" ", "T")).valueOf() - dayjs.utc(a.replace(" ", "T")).valueOf()) / 60000,
  );
}

/** Violación de clave única de Postgres (la envuelve Drizzle, por eso se mira también `cause`). */
export function esViolacionUnica(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
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
