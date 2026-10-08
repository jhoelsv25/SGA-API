import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { MENSAJES, ZONA_HORARIA_COLEGIO } from "../constants";

dayjs.extend(utc);
dayjs.extend(timezone);

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaIso(valor: string): boolean {
  if (!FECHA_ISO.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  );
}

export function hoyEnColegio(): string {
  return dayjs().tz(ZONA_HORARIA_COLEGIO).format("YYYY-MM-DD");
}

export function finDeMes(anio: number, mes: number): string {
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

export function inicioDeMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

function sumarDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const cursor = new Date(Date.UTC(anio, mes - 1, dia));
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): string[] {
  if (hasta < desde) return [];
  const dias: string[] = [];
  let cursor = desde;
  while (cursor <= hasta) {
    dias.push(cursor);
    cursor = sumarDia(cursor);
  }
  return dias;
}

/** El mismo día es válido. Solo falla cuando el fin es anterior al inicio. */
export function mensajeSiRangoInvalido(inicio: string, fin: string): string | null {
  return fin < inicio ? MENSAJES.fechasInvertidas : null;
}
