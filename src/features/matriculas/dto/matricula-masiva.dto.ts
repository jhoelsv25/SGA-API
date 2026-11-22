import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from "class-validator";

export class MatriculaMasivaDto {
  @ApiProperty({
    description: "ID de la sección del año anterior (origen)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("all", { message: "ID de sección origen inválido" })
  @IsNotEmpty({ message: "La sección de origen es obligatoria" })
  seccionOrigenId!: string;

  @ApiProperty({
    description: "ID de la sección del año nuevo (destino)",
    example: "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
  })
  @IsUUID("all", { message: "ID de sección destino inválido" })
  @IsNotEmpty({ message: "La sección destino es obligatoria" })
  seccionDestinoId!: string;

  @ApiPropertyOptional({
    description:
      "Lista opcional de IDs de estudiantes seleccionados a matricular. Si se omite, se toman todos los culminados.",
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: "estudianteIds debe ser un arreglo de UUIDs" })
  @ArrayNotEmpty({ message: "Si especifica estudianteIds, debe incluir al menos uno" })
  @IsUUID("all", { each: true, message: "Cada elemento debe ser un UUID válido" })
  estudianteIds?: string[];

  @ApiPropertyOptional({
    description: "Fecha de matrícula masiva (YYYY-MM-DD)",
    example: "2027-03-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "Formato de fecha inválido" })
  fechaMatricula?: string;

  @ApiPropertyOptional({
    description: "Indica si los estudiantes matriculados repiten el grado en el nuevo año",
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: "esRepitente debe ser booleano" })
  esRepitente?: boolean;
}
