/**
 * Utilitario único para manejo de fecha y hora local en la zona horaria oficial del colegio (America/Lima).
 * No añade dependencias externas; utiliza la API estándar Intl.
 */

export const ZONA_HORARIA_LIMA = "America/Lima";

const formateadorLima = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA_LIMA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  hourCycle: "h23",
});

export interface FechaHoraLima {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  fechaHora: string; // YYYY-MM-DD HH:mm:ss
}

/**
 * Obtiene la fecha y hora actual o de referencia descompuesta en la zona horaria de Lima.
 */
export function ahoraEnLima(referencia?: Date | string | number): FechaHoraLima {
  const fechaObj =
    referencia === undefined
      ? new Date()
      : typeof referencia === "object"
        ? referencia
        : new Date(referencia);

  const partes = formateadorLima.formatToParts(fechaObj);
  const mapa: Record<string, string> = {};
  for (const parte of partes) {
    mapa[parte.type] = parte.value;
  }

  const fecha = `${mapa.year}-${mapa.month}-${mapa.day}`;
  const hora = `${mapa.hour}:${mapa.minute}:${mapa.second}`;

  return {
    fecha,
    hora,
    fechaHora: `${fecha} ${hora}`,
  };
}

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD correspondiente a la zona horaria de Lima.
 */
export function fechaHoyLima(referencia?: Date | string | number): string {
  return ahoraEnLima(referencia).fecha;
}

/**
 * Devuelve la hora actual en formato HH:mm:ss correspondiente a la zona horaria de Lima.
 */
export function horaActualLima(referencia?: Date | string | number): string {
  return ahoraEnLima(referencia).hora;
}
