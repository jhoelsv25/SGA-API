import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class DashboardFiltrosDto {
  @ApiPropertyOptional({ description: "ID del año académico (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El anioAcademicoId debe ser un UUID válido" })
  anioAcademicoId?: string;

  @ApiPropertyOptional({ description: "ID del período o bimestre académico (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El periodoId debe ser un UUID válido" })
  periodoId?: string;

  @ApiPropertyOptional({ description: "Fecha inicial de filtro (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString({}, { message: "fechaDesde debe tener formato YYYY-MM-DD" })
  fechaDesde?: string;

  @ApiPropertyOptional({ description: "Fecha final de filtro (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString({}, { message: "fechaHasta debe tener formato YYYY-MM-DD" })
  fechaHasta?: string;

  @ApiPropertyOptional({ description: "ID del estudiante para apoderados o directivos (UUID)" })
  @IsOptional()
  @IsUUID("4", { message: "El estudianteId debe ser un UUID válido" })
  estudianteId?: string;
}
