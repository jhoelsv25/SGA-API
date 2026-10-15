import { DIAS_ULTIMA_SEMANA_BIMESTRE } from "../constants";

export function formatearMinutosAHrsMin(minutos: number): string {
  if (!minutos || minutos <= 0) {
    return "0 min";
  }
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  if (horas > 0) {
    return `${horas} h ${min} min`;
  }
  return `${min} min`;
}

export function puedeGenerarConsolidadoPeriodo(
  fechaFin: string,
  estadoPeriodo: string,
  fechaActual: string,
): boolean {
  if (estadoPeriodo === "cerrado") {
    return true;
  }
  const fin = new Date(fechaFin);
  const actual = new Date(fechaActual);
  if (actual >= fin) {
    return true;
  }
  const diffTiempo = fin.getTime() - actual.getTime();
  const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
  return diffDias <= DIAS_ULTIMA_SEMANA_BIMESTRE;
}
