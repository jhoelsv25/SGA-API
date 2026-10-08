import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { AreaCurricular, AREAS_CURRICULARES } from "../../constants";

export class FilterCursoDto {
  @ApiPropertyOptional({
    description: "Filtrar por estado del curso",
    enum: ["activo", "inactivo", "todos"],
    default: "todos",
  })
  @IsOptional()
  @IsIn(["activo", "inactivo", "todos"], {
    message: "El estado debe ser 'activo', 'inactivo' o 'todos'.",
  })
  estado?: "activo" | "inactivo" | "todos";

  @ApiPropertyOptional({
    description: "Filtrar por área curricular",
    enum: AREAS_CURRICULARES,
  })
  @IsOptional()
  @IsIn(AREAS_CURRICULARES, { message: "El área curricular seleccionada no es válida." })
  areaCurricular?: AreaCurricular;

  @ApiPropertyOptional({
    description: "Buscar por nombre o código",
    example: "MAT",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
