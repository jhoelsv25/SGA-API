import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { AreaCurricular, AREAS_CURRICULARES } from "../../constants";

export class CreateCursoDto {
  @ApiProperty({
    description: "Código único de la asignatura (ej. MAT, TCOMP)",
    example: "TCOMP",
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: "El código debe ser una cadena de texto." })
  @IsNotEmpty({ message: "El código es obligatorio." })
  @MaxLength(20, { message: "El código no puede exceder 20 caracteres." })
  codigo!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la asignatura",
    example: "Taller de Computación",
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  @IsNotEmpty({ message: "El nombre es obligatorio." })
  @MaxLength(100, { message: "El nombre no puede exceder 100 caracteres." })
  nombre!: string;

  @ApiProperty({
    description: "Área curricular según el Currículo Nacional o Taller",
    enum: AREAS_CURRICULARES,
    example: "taller",
  })
  @IsNotEmpty({ message: "El área curricular es obligatoria." })
  @IsIn(AREAS_CURRICULARES, { message: "El área curricular seleccionada no es válida." })
  areaCurricular!: AreaCurricular;

  @ApiPropertyOptional({
    description: "Descripción o sumilla del curso",
    example: "Taller extracurricular enfocado en habilidades digitales",
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
