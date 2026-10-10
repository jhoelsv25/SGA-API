import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { GRAVEDADES_FALTA, GravedadFalta, TIPOS_INCIDENCIA, TipoIncidencia } from "../constants";

export class QueryIncidenciasDto {
  @ApiPropertyOptional({
    description: "ID de matrícula para filtrar incidencias de un estudiante específico",
  })
  @IsOptional()
  @IsUUID("4")
  matriculaId?: string;

  @ApiPropertyOptional({
    description: "ID de sección para consultar incidencias del salón",
  })
  @IsOptional()
  @IsUUID("4")
  seccionId?: string;

  @ApiPropertyOptional({
    description: "ID del periodo / bimestre académico",
  })
  @IsOptional()
  @IsUUID("4")
  periodoId?: string;

  @ApiPropertyOptional({
    description: "Filtrar por tipo de incidencia: 'merito' o 'falta'",
    enum: TIPOS_INCIDENCIA,
  })
  @IsOptional()
  @IsIn(TIPOS_INCIDENCIA)
  tipo?: TipoIncidencia;

  @ApiPropertyOptional({
    description: "Filtrar por gravedad de la falta",
    enum: GRAVEDADES_FALTA,
  })
  @IsOptional()
  @IsIn(GRAVEDADES_FALTA)
  gravedad?: GravedadFalta;

  @ApiPropertyOptional({
    description: "Fecha de inicio para rango (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({
    description: "Fecha de fin para rango (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    description: "Cursor opaco en Base64 para paginación por cursores",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Cantidad máxima de registros a retornar",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryObservacionesDto {
  @ApiPropertyOptional({
    description: "ID de matrícula del estudiante",
  })
  @IsOptional()
  @IsUUID("4")
  matriculaId?: string;

  @ApiPropertyOptional({
    description: "ID de sección",
  })
  @IsOptional()
  @IsUUID("4")
  seccionId?: string;

  @ApiPropertyOptional({
    description: "Cursor opaco en Base64 para paginación por cursores",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Límite de registros por página",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
