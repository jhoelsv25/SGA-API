import { MOMENTOS, MENSAJES_PLANIFICACION } from "../constants";
import type { CompetenciaPlanificada, MomentoPlanificado } from "../interfaces";

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

/** Duración del bloque en minutos (`HH:MM[:SS]`). */
export function duracionBloqueMin(horaInicio: string, horaFin: string): number {
  return aMinutos(horaFin) - aMinutos(horaInicio);
}

/** Día ISO (1 = lunes … 7 = domingo) de una fecha `AAAA-MM-DD`. */
export function diaSemanaIso(fecha: string): number {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export function sumarDiasFecha(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana que contiene la fecha. */
export function lunesDe(fecha: string): string {
  return sumarDiasFecha(fecha, 1 - diaSemanaIso(fecha));
}

/**
 * Lo que falta para marcar la planificación como `lista` (RF-024, HU2). Devuelve los mensajes
 * de error; vacío = completa.
 */
export function faltantesParaLista(
  datos: {
    proposito: string | null;
    evidencia: string | null;
    competencias: Pick<CompetenciaPlanificada, "desempenos">[];
    momentos: MomentoPlanificado[];
  },
  duracionMin: number,
): string[] {
  const faltas: string[] = [];
  const propositoOk = !!datos.proposito?.trim();
  const competenciaOk =
    datos.competencias.length > 0 && datos.competencias.every((c) => c.desempenos.length > 0);
  const momentosOk = MOMENTOS.every((m) =>
    datos.momentos.some((x) => x.momento === m && !!x.actividades?.trim() && (x.minutos ?? 0) > 0),
  );
  if (!propositoOk || !competenciaOk || !momentosOk || !datos.evidencia?.trim()) {
    faltas.push(MENSAJES_PLANIFICACION.FALTA_COMPETENCIA);
  }
  if (momentosOk) {
    const suma = datos.momentos.reduce((a, m) => a + (m.minutos ?? 0), 0);
    if (suma !== duracionMin)
      faltas.push(MENSAJES_PLANIFICACION.tiemposNoCuadran(suma, duracionMin));
  }
  return faltas;
}

export function hayMomentosRepetidos(momentos: { momento: string }[]): boolean {
  return new Set(momentos.map((m) => m.momento)).size !== momentos.length;
}
