import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { INDICADORES, type Indicador } from "../constants";

export class ExportarIndicadoresQueryDto {
  @ApiPropertyOptional({ description: "UUID del período académico a exportar" })
  @IsOptional()
  @IsUUID("4")
  periodoId?: string;

  @ApiPropertyOptional({
    enum: INDICADORES,
    description: "Indicador a exportar en detalle (opcional)",
  })
  @IsOptional()
  @IsEnum(INDICADORES)
  indicador?: Indicador;

  @ApiPropertyOptional({ description: "Fecha de inicio del rango (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({ description: "Fecha de fin del rango (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ description: "Filtrar por docente (UUID)" })
  @IsOptional()
  @IsUUID("4")
  docenteId?: string;
}
