import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { AreaCurricular, AREAS_CURRICULARES } from "../../constants";

export class UpdateCursoDto {
  @ApiPropertyOptional({
    description: "Código único de la asignatura (ej. MAT, TCOMP)",
    example: "TCOMP",
    maxLength: 20,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: "El código debe ser una cadena de texto." })
  @IsNotEmpty({ message: "El código no puede estar vacío." })
  @MaxLength(20, { message: "El código no puede exceder 20 caracteres." })
  codigo?: string;

  @ApiPropertyOptional({
    description: "Nombre descriptivo de la asignatura",
    example: "Taller de Computación Avanzada",
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  @IsNotEmpty({ message: "El nombre no puede estar vacío." })
  @MaxLength(100, { message: "El nombre no puede exceder 100 caracteres." })
  nombre?: string;

  @ApiPropertyOptional({
    description: "Área curricular según el Currículo Nacional o Taller",
    enum: AREAS_CURRICULARES,
    example: "taller",
  })
  @IsOptional()
  @IsIn(AREAS_CURRICULARES, { message: "El área curricular seleccionada no es válida." })
  areaCurricular?: AreaCurricular;

  @ApiPropertyOptional({
    description: "Descripción o sumilla del curso",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "La descripción debe ser una cadena de texto." })
  @MaxLength(500, { message: "La descripción no puede exceder 500 caracteres." })
  descripcion?: string;

  @ApiPropertyOptional({
    description: "Color identificador en formato hexadecimal #RRGGBB",
    example: "#0284C7",
  })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "Elija un color válido." })
  colorHex?: string;
}
