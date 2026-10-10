import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateBloqueHorarioDto {
  @ApiPropertyOptional({
    description: "UUID del curso asignado a la sección (obligatorio para tipo 'clase')",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4", { message: "cursoSeccionId debe ser un UUID válido" })
  cursoSeccionId?: string | null;

  @ApiProperty({
    description: "Día de la semana (1 = Lunes, ..., 5 = Viernes)",
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  @IsInt({ message: "diaSemana debe ser un número entero" })
  @Min(1, { message: "diaSemana debe ser mínimo 1 (lunes)" })
  @Max(5, { message: "diaSemana debe ser máximo 5 (viernes)" })
  diaSemana!: number;

  @ApiProperty({
    description: "Hora de inicio en formato HH:mm (24 horas)",
    example: "07:45",
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "horaInicio debe tener formato HH:mm (24 horas)",
  })
  horaInicio!: string;

  @ApiProperty({
    description: "Hora de fin en formato HH:mm (24 horas)",
    example: "08:30",
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "horaFin debe tener formato HH:mm (24 horas)",
  })
  horaFin!: string;

  @ApiProperty({
    description: "Tipo de bloque",
    enum: ["clase", "receso"],
    example: "clase",
  })
  @IsIn(["clase", "receso"], {
    message: "tipoBloque debe ser 'clase' o 'receso'",
  })
  tipoBloque!: "clase" | "receso";

  @ApiPropertyOptional({
    description: "Aula o ambiente físico asignado al bloque",
    example: "Pab. B – 201",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "El aula no puede exceder los 50 caracteres" })
  aula?: string | null;
}
