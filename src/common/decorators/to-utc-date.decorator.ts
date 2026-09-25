import { Transform } from "class-transformer";
import { normalizeToUtc } from "../utils/date.util";

/**
 * Decorador de transformación para DTOs que convierte fechas a UTC de forma automática.
 *
 * Casos de uso:
 * - Si el frontend envía solo la fecha ("2026-09-24"), se le agrega la hora actual del servidor en UTC.
 * - Si el frontend envía hora local ("2026-09-24T15:00:00-05:00"), se convierte a su hora equivalente en UTC.
 * - Si el frontend ya envía en formato UTC ("2026-09-24T20:00:00Z"), se procesa de forma directa.
 *
 * @example
 * ```typescript
 * export class CreateEventDto {
 *   @ToUtcDate()
 *   @IsDate()
 *   startDate: Date;
 * }
 * ```
 */
export function ToUtcDate(options?: {
  appendCurrentServerTimeForDateOnly?: boolean;
}): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => normalizeToUtc(value, options));
}
