import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { MAX_TOLERANCIA_MIN, MIN_TOLERANCIA_MIN } from "../constants";

export class UpdateTurnoDto {
  @ApiPropertyOptional({
    description: "Hora oficial de entrada (HH:mm o HH:mm:ss)",
    example: "07:45",
  })
  @IsOptional()
  @IsString()
  horaEntrada?: string;

  @ApiPropertyOptional({
    description: "Hora oficial de salida (HH:mm o HH:mm:ss)",
    example: "13:15",
  })
  @IsOptional()
  @IsString()
  horaSalida?: string;

  @ApiPropertyOptional({ description: "Inicio de ventana de entrada", example: "06:30" })
  @IsOptional()
  @IsString()
  ventanaEntradaInicio?: string;

  @ApiPropertyOptional({ description: "Fin de ventana de entrada", example: "09:30" })
  @IsOptional()
  @IsString()
  ventanaEntradaFin?: string;

  @ApiPropertyOptional({ description: "Inicio de ventana de salida", example: "12:30" })
  @IsOptional()
  @IsString()
  ventanaSalidaInicio?: string;

  @ApiPropertyOptional({ description: "Fin de ventana de salida", example: "15:00" })
  @IsOptional()
  @IsString()
  ventanaSalidaFin?: string;

  @ApiPropertyOptional({ description: "Tolerancia en minutos (0 a 60)", example: 10 })
  @IsOptional()
  @Transform(({ value, obj }: { value: unknown; obj?: Record<string, unknown> }) => {
    if (value !== undefined && value !== null && value !== "") return Number(value);
    if (
      obj?.toleranciaMinutos !== undefined &&
      obj.toleranciaMinutos !== null &&
      obj.toleranciaMinutos !== ""
    ) {
      return Number(obj.toleranciaMinutos);
    }
    return undefined;
  })
  @IsInt({ message: "La tolerancia debe ser un número entero." })
  @Min(MIN_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  @Max(MAX_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  toleranciaMin?: number;

  @ApiPropertyOptional({ description: "Alias de toleranciaMin" })
  @IsOptional()
  toleranciaMinutos?: number;

  @ApiPropertyOptional({
    description: "Días laborables separados por coma (1=Lunes a 7=Domingo)",
    example: "1,2,3,4,5",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return (value as unknown[]).join(",");
    return typeof value === "string" ? value : undefined;
  })
  @IsString()
  diasLaborables?: string;

  @ApiPropertyOptional({ description: "Indica si el turno está activo" })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
