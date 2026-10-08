import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { MENSAJES, NOMBRES_BIMESTRE, ZONA_HORARIA_COLEGIO } from "../constants";

dayjs.extend(utc);
dayjs.extend(timezone);

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface RangoFecha {
  fechaInicio: string;
  fechaFin: string;
}

export interface BimestreFecha extends RangoFecha {
  numero: number;
}

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

export function sumarDia(fecha: string): string {
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

/** Año y bimestre: el fin debe ser estrictamente posterior. Evento: el mismo día es válido. */
export function mensajeSiRangoInvalido(
  inicio: string,
  fin: string,
  permitirMismoDia: boolean,
): string | null {
  const invalido = permitirMismoDia ? fin < inicio : fin <= inicio;
  return invalido ? MENSAJES.fechasInvertidas : null;
}

export function validarBimestres(anio: RangoFecha, bimestres: BimestreFecha[]): string | null {
  if (bimestres.length !== 4) {
    return MENSAJES.bimestresIncompletos;
  }

  const ordenados = [...bimestres].sort((a, b) => a.numero - b.numero);
  const numeros = new Set(ordenados.map((b) => b.numero));
  if (numeros.size !== 4 || ordenados.some((b, indice) => b.numero !== indice + 1)) {
    return MENSAJES.bimestresIncompletos;
  }

  for (const bimestre of ordenados) {
    const invertidas = mensajeSiRangoInvalido(bimestre.fechaInicio, bimestre.fechaFin, false);
    if (invertidas) return invertidas;
    if (bimestre.fechaInicio < anio.fechaInicio || bimestre.fechaFin > anio.fechaFin) {
      return MENSAJES.bimestreFuera;
    }
  }

  for (let indice = 1; indice < ordenados.length; indice++) {
    if (ordenados[indice].fechaInicio <= ordenados[indice - 1].fechaFin) {
      return MENSAJES.bimestresSuperpuestos;
    }
  }

  return null;
}

export function nombreBimestre(numero: number): string {
  return NOMBRES_BIMESTRE[numero - 1] ?? String(numero);
}
