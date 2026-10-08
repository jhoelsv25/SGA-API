import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import {
  MAX_TOLERANCIA_MIN,
  MIN_TOLERANCIA_MIN,
  PERSONA_TYPES_TURNO,
  PersonaTypeTurno,
} from "../constants";

export class CreateTurnoDto {
  @ApiProperty({ description: "Tipo de persona a la que aplica", enum: PERSONA_TYPES_TURNO })
  @Transform(({ value, obj }: { value: unknown; obj?: Record<string, unknown> }) => {
    if (typeof value === "string") return value as PersonaTypeTurno;
    if (typeof obj?.tipoPersona === "string") return obj.tipoPersona as PersonaTypeTurno;
    return "" as PersonaTypeTurno;
  })
  @IsIn(PERSONA_TYPES_TURNO, {
    message: "El turno debe aplicar a estudiantes, docentes o administrativos.",
  })
  aplicaA!: PersonaTypeTurno;

  @ApiPropertyOptional({ description: "Alias de aplicaA", enum: PERSONA_TYPES_TURNO })
  @IsOptional()
  tipoPersona?: PersonaTypeTurno;

  @ApiProperty({ description: "Hora oficial de entrada (HH:mm o HH:mm:ss)", example: "07:45" })
  @IsString()
  @IsNotEmpty({ message: "La hora de entrada es obligatoria." })
  horaEntrada!: string;

  @ApiProperty({ description: "Hora oficial de salida (HH:mm o HH:mm:ss)", example: "13:15" })
  @IsString()
  @IsNotEmpty({ message: "La hora de salida es obligatoria." })
  horaSalida!: string;

  @ApiProperty({ description: "Inicio de ventana de entrada", example: "06:30" })
  @IsString()
  @IsNotEmpty({ message: "El inicio de la ventana de entrada es obligatorio." })
  ventanaEntradaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de entrada", example: "09:30" })
  @IsString()
  @IsNotEmpty({ message: "El fin de la ventana de entrada es obligatorio." })
  ventanaEntradaFin!: string;

  @ApiProperty({ description: "Inicio de ventana de salida", example: "12:30" })
  @IsString()
  @IsNotEmpty({ message: "El inicio de la ventana de salida es obligatorio." })
  ventanaSalidaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de salida", example: "15:00" })
  @IsString()
  @IsNotEmpty({ message: "El fin de la ventana de salida es obligatorio." })
  ventanaSalidaFin!: string;

  @ApiProperty({ description: "Tolerancia en minutos (0 a 60)", example: 10 })
  @Transform(({ value, obj }: { value: unknown; obj?: Record<string, unknown> }) => {
    if (value !== undefined && value !== null && value !== "") return Number(value);
    if (
      obj?.toleranciaMinutos !== undefined &&
      obj.toleranciaMinutos !== null &&
      obj.toleranciaMinutos !== ""
    ) {
      return Number(obj.toleranciaMinutos);
    }
    return 0;
  })
  @IsInt({ message: "La tolerancia debe ser un número entero." })
  @Min(MIN_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  @Max(MAX_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  toleranciaMin!: number;

  @ApiPropertyOptional({ description: "Alias de toleranciaMin" })
  @IsOptional()
  toleranciaMinutos?: number;

  @ApiProperty({
    description: "Días laborables separados por coma (1=Lunes a 7=Domingo)",
    example: "1,2,3,4,5",
  })
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return (value as unknown[]).join(",");
    return typeof value === "string" ? value : "";
  })
  @IsString()
  @IsNotEmpty({ message: "Seleccione al menos un día laborable." })
  diasLaborables!: string;
}
