import { IsDateString, IsOptional, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FiltroIndicadoresQueryDto {
  @ApiPropertyOptional({ description: "Identificador UUID del período académico (bimestre)" })
  @IsOptional()
  @IsUUID("4", { message: "El ID del período debe ser un UUID válido." })
  periodoId?: string;

  @ApiPropertyOptional({ description: "Fecha de inicio para filtro por rango (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString({}, { message: "La fecha de inicio debe tener formato YYYY-MM-DD." })
  fechaInicio?: string;

  @ApiPropertyOptional({ description: "Fecha de fin para filtro por rango (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString({}, { message: "La fecha de fin debe tener formato YYYY-MM-DD." })
  fechaFin?: string;

  @ApiPropertyOptional({ description: "Filtrar CSP e IGM por docente específico (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El ID del docente debe ser un UUID válido." })
  docenteId?: string;

  @ApiPropertyOptional({ description: "Filtrar CSP e IGM por curso específico (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El ID del curso debe ser un UUID válido." })
  cursoId?: string;

  @ApiPropertyOptional({ description: "Filtrar ISA por sección específica (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El ID de la sección debe ser un UUID válido." })
  seccionId?: string;
}
