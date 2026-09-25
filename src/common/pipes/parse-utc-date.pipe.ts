import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { normalizeToUtc } from "../utils/date.util";

/**
 * Pipe de transformación para parámetros de ruta o query que convierte la fecha de entrada a UTC.
 *
 * @example
 * ```typescript
 * @Get('events')
 * findByDate(@Query('date', ParseUtcDatePipe) date: Date) { ... }
 * ```
 */
@Injectable()
export class ParseUtcDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    if (!value) {
      throw new BadRequestException("La fecha es obligatoria");
    }

    const normalized = normalizeToUtc(value);
    if (!normalized) {
      throw new BadRequestException(
        `Formato de fecha inválido: "${value}". Use YYYY-MM-DD o ISO UTC.`,
      );
    }

    return normalized;
  }
}
