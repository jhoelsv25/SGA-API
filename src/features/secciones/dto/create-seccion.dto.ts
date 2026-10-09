import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateSeccionDto {
  @ApiProperty({
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    description: "UUID del grado al que pertenece la sección",
  })
  @IsNotEmpty({ message: "El grado es obligatorio." })
  @IsUUID("4", { message: "El id del grado debe ser un UUID válido." })
  gradoId!: string;

  @ApiProperty({
    example: "A",
    description: "Nombre o letra de la sección (por ejemplo, A, B, C, Única)",
  })
  @IsNotEmpty({ message: "El nombre es obligatorio." })
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  @MaxLength(10, { message: "El nombre no puede exceder 10 caracteres." })
  nombre!: string;

  @ApiPropertyOptional({
    example: "Pab. B – 201",
    description: "Aula o ambiente asignado a la sección",
  })
  @IsOptional()
  @IsString({ message: "El aula debe ser una cadena de texto." })
  @MaxLength(50, { message: "El aula no puede exceder 50 caracteres." })
  aula?: string;

  @ApiProperty({
    example: 35,
    description: "Capacidad de vacantes de la sección (debe ser mayor que 0)",
  })
  @IsNotEmpty({ message: "Las vacantes son obligatorias." })
  @IsInt({ message: "Las vacantes deben ser un número entero." })
  @Min(1, { message: "Las vacantes deben ser mayores que 0." })
  vacantes!: number;

  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    description: "UUID del docente asignado como tutor",
  })
  @IsOptional()
  @IsUUID("4", { message: "El tutor debe ser un UUID válido." })
  tutorId?: string;
}
