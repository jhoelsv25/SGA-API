import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class UpdateSeccionDto {
  @ApiPropertyOptional({
    example: "A",
    description: "Nombre o letra de la sección",
  })
  @IsOptional()
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  @MaxLength(10, { message: "El nombre no puede exceder 10 caracteres." })
  nombre?: string;

  @ApiPropertyOptional({
    example: "Pab. B – 202",
    description: "Aula o ambiente asignado a la sección",
  })
  @IsOptional()
  @IsString({ message: "El aula debe ser una cadena de texto." })
  @MaxLength(50, { message: "El aula no puede exceder 50 caracteres." })
  aula?: string;

  @ApiPropertyOptional({
    example: 38,
    description: "Capacidad de vacantes de la sección (debe ser mayor que 0)",
  })
  @IsOptional()
  @IsInt({ message: "Las vacantes deben ser un número entero." })
  @Min(1, { message: "Las vacantes deben ser mayores que 0." })
  vacantes?: number;

  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    description: "UUID del docente tutor (null para desasignar)",
  })
  @IsOptional()
  @IsUUID("4", { message: "El tutor debe ser un UUID válido." })
  tutorId?: string | null;
}
