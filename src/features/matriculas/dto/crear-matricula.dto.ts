import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { MATRICULA_TIPOS, MatriculaTipo } from "../constants";

export class CrearMatriculaDto {
  @ApiProperty({
    description: "ID del estudiante a matricular",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("all", { message: "ID de estudiante inválido" })
  @IsNotEmpty({ message: "El estudiante es obligatorio" })
  estudianteId!: string;

  @ApiProperty({
    description: "ID del año académico",
    example: "b3f07a41-3829-4505-89f5-7e23114d5e90",
  })
  @IsUUID("all", { message: "ID de año académico inválido" })
  @IsNotEmpty({ message: "El año académico es obligatorio" })
  anioAcademicoId!: string;

  @ApiProperty({
    description: "ID de la sección destino",
    example: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
  })
  @IsUUID("all", { message: "ID de sección inválido" })
  @IsNotEmpty({ message: "La sección es obligatoria" })
  seccionId!: string;

  @ApiProperty({
    description: "Tipo de matrícula",
    enum: Object.values(MATRICULA_TIPOS),
    example: "nuevo",
  })
  @IsIn(Object.values(MATRICULA_TIPOS), {
    message: "El tipo debe ser 'nuevo', 'continuador' o 'traslado'",
  })
  tipo!: MatriculaTipo;

  @ApiPropertyOptional({ description: "Indica si repite el grado", default: false })
  @IsOptional()
  @IsBoolean()
  esRepitente?: boolean;

  @ApiPropertyOptional({
    description: "Colegio de procedencia (obligatorio si el tipo es traslado)",
    example: "I.E. Los Próceres",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: "El colegio de procedencia no puede exceder 150 caracteres" })
  colegioProcedencia?: string;

  @ApiPropertyOptional({ description: "Fecha de matrícula (YYYY-MM-DD)", example: "2027-03-01" })
  @IsOptional()
  @IsDateString({}, { message: "Formato de fecha inválido (debe ser YYYY-MM-DD)" })
  fechaMatricula?: string;

  @ApiPropertyOptional({
    description: "Observaciones de la matrícula",
    example: "Documentación completa",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Las observaciones no pueden exceder 500 caracteres" })
  observaciones?: string;
}
