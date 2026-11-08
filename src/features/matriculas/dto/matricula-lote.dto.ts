import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from "class-validator";
import { MATRICULA_TIPOS, type MatriculaTipo } from "../constants";

export class MatricularLoteDto {
  @ApiProperty({
    description: "ID de la sección destino en el año lectivo activo",
    example: "619c4246-b27b-4325-a2f2-c77399817d3e",
  })
  @IsUUID("all", { message: "ID de sección destino inválido" })
  @IsNotEmpty({ message: "La sección destino es obligatoria" })
  seccionId!: string;

  @ApiProperty({
    description: "Lista de IDs de estudiantes del padrón a matricular",
    type: [String],
    example: ["d30d640d-7b0a-43d0-a116-c9280ee36ac1"],
  })
  @IsArray({ message: "estudianteIds debe ser un arreglo de UUIDs" })
  @ArrayNotEmpty({ message: "Debe seleccionar al menos un estudiante" })
  @IsUUID("all", { each: true, message: "Cada elemento debe ser un UUID válido" })
  estudianteIds!: string[];

  @ApiProperty({
    description: "Tipo de matrícula institucional",
    enum: Object.values(MATRICULA_TIPOS),
    default: "nuevo",
  })
  @IsIn(Object.values(MATRICULA_TIPOS), {
    message: "El tipo debe ser 'nuevo', 'continuador' o 'traslado'",
  })
  tipo!: MatriculaTipo;

  @ApiPropertyOptional({
    description: "Fecha de matrícula (YYYY-MM-DD)",
    example: "2026-03-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "Formato de fecha inválido (YYYY-MM-DD)" })
  fechaMatricula?: string;
}
