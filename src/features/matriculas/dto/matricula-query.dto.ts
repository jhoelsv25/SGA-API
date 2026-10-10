import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class MatriculaQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por año académico" })
  @IsOptional()
  @IsUUID("all")
  anioAcademicoId?: string;

  @ApiPropertyOptional({ description: "Filtrar por grado" })
  @IsOptional()
  @IsUUID("all")
  gradoId?: string;

  @ApiPropertyOptional({ description: "Filtrar por sección" })
  @IsOptional()
  @IsUUID("all")
  seccionId?: string;

  @ApiPropertyOptional({ description: "Filtrar por tipo (nuevo, continuador, traslado)" })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({
    description: "Filtrar por estado (matriculado, retirado, trasladado, culminado)",
  })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({
    description: "Búsqueda por nombres, apellidos, documento o código de matrícula",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Límite de registros por página", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: "Desplazamiento para paginación", default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
