import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { AREAS_CURRICULARES, type AreaCurricular } from "../constants/areas-curriculares.constant";

export class UpdateCursoDto {
  @ApiPropertyOptional({
    description: "Código único de la asignatura",
    example: "MAT",
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: "El código debe ser un texto." })
  @MaxLength(20, { message: "El código no puede exceder 20 caracteres." })
  codigo?: string;

  @ApiPropertyOptional({
    description: "Nombre oficial de la asignatura",
    example: "Matemática",
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: "El nombre debe ser un texto." })
  @MaxLength(100, { message: "El nombre no puede exceder 100 caracteres." })
  nombre?: string;

  @ApiPropertyOptional({
    description: "Área curricular según MINEDU o Taller",
    enum: AREAS_CURRICULARES,
    example: "matematica",
  })
  @IsOptional()
  @IsIn(AREAS_CURRICULARES, { message: "El área curricular elegida no es válida." })
  areaCurricular?: AreaCurricular;

  @ApiPropertyOptional({
    description: "Descripción o sumilla del curso",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "La descripción debe ser un texto." })
  @MaxLength(500, { message: "La descripción no puede exceder 500 caracteres." })
  descripcion?: string;

  @ApiPropertyOptional({
    description: "Color hexadecimal identificador",
    example: "#2563EB",
  })
  @IsOptional()
  @IsString({ message: "El color debe ser un texto." })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Elija un color válido.",
  })
  colorHex?: string;
}
