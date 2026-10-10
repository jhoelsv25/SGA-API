import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateSeccionDto {
  @ApiProperty({
<<<<<<< HEAD
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
=======
    description: "ID del año académico",
    example: "b3f07a41-3829-4505-89f5-7e23114d5e90",
  })
  @IsUUID("all", { message: "ID de año académico inválido" })
  @IsNotEmpty({ message: "El año académico es obligatorio" })
  anioAcademicoId!: string;

  @ApiProperty({ description: "ID del grado", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" })
  @IsUUID("all", { message: "ID de grado inválido" })
  @IsNotEmpty({ message: "El grado es obligatorio" })
  gradoId!: string;

  @ApiProperty({ description: "Nombre de la sección (ej. A, B, Única)", example: "A" })
  @IsString({ message: "El nombre debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de la sección es obligatorio" })
  @MaxLength(10, { message: "El nombre no puede exceder 10 caracteres" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Aula física o ubicación", example: "Pabellón B - Aula 201" })
  @IsOptional()
  @IsString({ message: "El aula debe ser una cadena de texto" })
  @MaxLength(50, { message: "El aula no puede exceder 50 caracteres" })
  aula?: string;

  @ApiProperty({ description: "Número de vacantes disponibles", example: 35 })
  @IsInt({ message: "Las vacantes deben ser un número entero" })
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
  @Min(1, { message: "Las vacantes deben ser mayores que 0." })
  vacantes!: number;

  @ApiPropertyOptional({
<<<<<<< HEAD
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    description: "UUID del docente asignado como tutor",
  })
  @IsOptional()
  @IsUUID("4", { message: "El tutor debe ser un UUID válido." })
=======
    description: "ID del docente tutor (opcional)",
    example: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
  })
  @IsOptional()
  @IsUUID("all", { message: "ID de tutor inválido" })
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
  tutorId?: string;
}
