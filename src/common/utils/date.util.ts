import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Regex para detectar formato de solo fecha YYYY-MM-DD
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normaliza cualquier entrada de fecha (string, number o Date) a un objeto Date en UTC.
 *
 * Reglas de negocio:
 * 1. Si viene solo fecha ("YYYY-MM-DD"), le añade la hora actual del servidor en UTC.
 * 2. Si viene fecha y hora local (sin 'Z' ni offset), la interpreta como local y la convierte a UTC.
 * 3. Si ya viene en formato UTC (termina en 'Z' o +00:00), la respeta y parsea directamente.
 */
export function normalizeToUtc(
  value: unknown,
  options?: { appendCurrentServerTimeForDateOnly?: boolean },
): Date | null {
  if (!value) {
    return null;
  }

  const appendTime = options?.appendCurrentServerTimeForDateOnly ?? true;

  // 1. Caso: Viene solo fecha "YYYY-MM-DD"
  if (typeof value === "string" && DATE_ONLY_REGEX.test(value.trim())) {
    if (appendTime) {
      const now = dayjs.utc();
      const [year, month, day] = value.trim().split("-").map(Number);
      const combined = now
        .year(year)
        .month(month - 1)
        .date(day);
      return combined.toDate();
    }
    // Sin hora actual, se fija al inicio del día UTC
    return dayjs.utc(value.trim()).startOf("day").toDate();
  }

  // 2. Caso: Viene string con fecha y hora
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Si ya tiene indicador UTC ('Z' o '+00:00' o '+0000')
    if (trimmed.endsWith("Z") || trimmed.includes("+00:00")) {
      const parsedUtc = dayjs.utc(trimmed);
      return parsedUtc.isValid() ? parsedUtc.toDate() : null;
    }

    // Si viene con otro offset o sin zona horaria, dayjs parsea y convierte a UTC
    const parsed = dayjs(trimmed).utc();
    return parsed.isValid() ? parsed.toDate() : null;
  }

  // 3. Caso: Viene instancia de Date o timestamp numérico
  if (value instanceof Date || typeof value === "number") {
    const parsed = dayjs(value).utc();
    return parsed.isValid() ? parsed.toDate() : null;
  }

  return null;
}

/**
 * Retorna la fecha y hora actual en UTC.
 */
export function getNowUtc(): Date {
  return dayjs.utc().toDate();
}
