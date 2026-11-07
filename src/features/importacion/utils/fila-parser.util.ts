import type { JornadaHoras, TipoContrato } from "../../docentes/constants";
import { PARENTESCOS, type Parentesco } from "../../apoderados/constants";
import { normalizarOpcion } from "./fila-normalizador.util";
import type { CredencialEmitidaDto } from "../dto";

/**
 * Extrae una cadena de texto no vacía de un objeto buscando por múltiples nombres de clave posibles.
 */
export function getStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof val === "number" || typeof val === "boolean") {
      return String(val).trim();
    }
  }
  return "";
}

/**
 * Extrae una cadena opcional de un objeto. Retorna `undefined` si está vacía.
 */
export function getOptStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  const val = getStr(obj, ...keys);
  return val.length > 0 ? val : undefined;
}

/**
 * Extrae un número válido de un objeto. Si no existe o no es numérico, retorna `defaultVal`.
 */
export function getNum(
  obj: Record<string, unknown>,
  defaultVal: number,
  ...keys: string[]
): number {
  for (const k of keys) {
    const val = obj[k];
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (!Number.isNaN(num)) return num;
    }
  }
  return defaultVal;
}

/**
 * Extrae un valor booleano tolerante a "si", "sí", "true", "1" o boolean primitivo.
 */
export function getBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const val = obj[k];
    if (val === true) return true;
    if (typeof val === "string") {
      const lower = val.trim().toLowerCase();
      if (lower === "si" || lower === "sí" || lower === "true" || lower === "1") return true;
    }
  }
  return false;
}

/**
 * Parsea el tipo de contrato del docente con fallback a "nombrado".
 */
export function parsearTipoContratoDocente(datos: Record<string, unknown>): TipoContrato {
  const raw = getStr(datos, "tipoContrato", "tipo_contrato").toLowerCase();
  return raw === "contratado" || raw === "practicante" ? raw : "nombrado";
}

/**
 * Parsea la jornada laboral en horas del docente con fallback a 30.
 */
export function parsearJornadaHorasDocente(datos: Record<string, unknown>): JornadaHoras {
  const raw = getNum(datos, 30, "jornada", "jornadaHoras");
  return raw === 20 || raw === 24 || raw === 40 ? raw : 30;
}

/**
 * Parsea el parentesco del apoderado con fallback a "madre".
 */
export function parsearParentescoApoderado(datos: Record<string, unknown>): Parentesco {
  // El valor ya se validó contra la lista en el análisis de la fila
  return (normalizarOpcion(getStr(datos, "parentesco"), PARENTESCOS) ?? "madre") as Parentesco;
}

/**
 * Parsea la fecha de ingreso o usa la fecha actual en formato ISO (YYYY-MM-DD).
 */
export function parsearFechaIngreso(datos: Record<string, unknown>): string {
  return (
    getOptStr(datos, "fechaIngreso", "fecha_ingreso") || new Date().toISOString().split("T")[0]
  );
}

/**
 * Construye el DTO estandarizado de una credencial emitida durante la importación.
 */
export function construirCredencialEmitida(params: {
  nombreCompleto: string;
  numeroDocumento: string;
  tipoRol: "Estudiante" | "Docente" | "Apoderado";
  nombreUsuario: string;
  tempPassword?: string;
  codigoCredencial?: string;
  pin?: string;
}): CredencialEmitidaDto {
  return {
    nombreCompleto: params.nombreCompleto,
    numeroDocumento: params.numeroDocumento,
    tipoRol: params.tipoRol,
    nombreUsuario: params.nombreUsuario,
    tempPassword: params.tempPassword || undefined,
    codigoCredencial: params.codigoCredencial,
    pin: params.pin,
  };
}
