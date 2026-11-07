import { LISTAS_PLANTILLA } from "../constants";

function limpiar(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_");
}

const ALIAS_TIPO_DOCUMENTO: Record<string, string> = {
  dni: "dni",
  ce: "carne_extranjeria",
  carne_extranjeria: "carne_extranjeria",
  carnet_extranjeria: "carne_extranjeria",
  carne_de_extranjeria: "carne_extranjeria",
  pasaporte: "pasaporte",
  partida_nacimiento: "partida_nacimiento",
  partida_de_nacimiento: "partida_nacimiento",
};

/** Devuelve el tipo de documento del sistema, o `null` si el valor no es válido. Vacío = dni. */
export function normalizarTipoDocumento(raw: string): string | null {
  if (!raw.trim()) return "dni";
  return ALIAS_TIPO_DOCUMENTO[limpiar(raw)] ?? null;
}

/** Devuelve "M" o "F", o `null` si el valor no es válido (incluye vacío: el sexo es obligatorio). */
export function normalizarSexo(raw: string): "M" | "F" | null {
  const v = limpiar(raw);
  if (v === "m" || v === "masculino") return "M";
  if (v === "f" || v === "femenino") return "F";
  return null;
}

/** Valor de lista (contrato, parentesco…) en minúsculas sin tildes, o `null` si no está en la lista. */
export function normalizarOpcion(raw: string, lista: readonly string[]): string | null {
  const v = limpiar(raw);
  return lista.includes(v) ? v : null;
}

/** SI/NO tolerante. Vacío = `false`; un valor que no sea sí/no devuelve `null`. */
export function normalizarSiNo(raw: string): boolean | null {
  if (!raw.trim()) return false;
  const v = limpiar(raw);
  if (v === "si" || v === "true" || v === "1") return true;
  if (v === "no" || v === "false" || v === "0") return false;
  return null;
}

/** Fecha ISO (YYYY-MM-DD) real y válida, o `null`. */
export function normalizarFechaIso(raw: string): string | null {
  const v = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return v;
}

export const JORNADAS_VALIDAS: readonly string[] = LISTAS_PLANTILLA.jornada;
