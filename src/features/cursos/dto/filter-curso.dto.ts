import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { AREAS_CURRICULARES, type AreaCurricular } from "../constants/areas-curriculares.constant";

export class FilterCursoDto {
  @ApiPropertyOptional({
    description: "Filtrar por estado del curso",
    enum: ["activo", "inactivo", "todos"],
    default: "activo",
  })
  @IsOptional()
  @IsIn(["activo", "inactivo", "todos"], { message: "El estado del filtro no es válido." })
  estado?: "activo" | "inactivo" | "todos";

  @ApiPropertyOptional({
    description: "Filtrar por área curricular",
    enum: AREAS_CURRICULARES,
  })
  @IsOptional()
  @IsIn(AREAS_CURRICULARES, { message: "El área curricular elegida no es válida." })
  areaCurricular?: AreaCurricular;

  @ApiPropertyOptional({
    description: "Búsqueda textual por código o nombre del curso",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
