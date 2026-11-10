export interface HorasPedagogicas {
  horasProgramadas: number | null;
  horasDictadas: number | null;
  horasPerdidas: number | null;
  /** Programados menos dictados, en minutos. */
  minutosNoDictados: number | null;
}

const redondear = (n: number): number => Math.round(n * 10) / 10;

/**
 * Horas pedagógicas con un decimal (RF-013 V2). Las dictadas salen solo de las firmas; las perdidas
 * son programadas menos dictadas. Sin datos (consolidados anteriores a la V2) devuelve nulos.
 */
export function calcularHorasPedagogicas(
  minutosProgramados: number | null,
  minutosDictados: number | null,
  minutosHoraPedagogica: number | null,
): HorasPedagogicas {
  if (minutosProgramados === null || minutosDictados === null || !minutosHoraPedagogica) {
    return {
      horasProgramadas: null,
      horasDictadas: null,
      horasPerdidas: null,
      minutosNoDictados: null,
    };
  }
  const noDictados = Math.max(0, minutosProgramados - minutosDictados);
  return {
    horasProgramadas: redondear(minutosProgramados / minutosHoraPedagogica),
    horasDictadas: redondear(minutosDictados / minutosHoraPedagogica),
    horasPerdidas: redondear(noDictados / minutosHoraPedagogica),
    minutosNoDictados: noDictados,
  };
}

/** AAAA-MM-DD → DD/MM/AAAA para los mensajes. */
export function fechaDdMmYyyy(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Días calendario entre dos fechas AAAA-MM-DD (hasta − desde), nunca negativo. */
export function diasEntre(desde: string, hasta: string): number {
  const ms =
    Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}
