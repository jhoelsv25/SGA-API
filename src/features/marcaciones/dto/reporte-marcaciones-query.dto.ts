import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from "class-validator";
import { LIMITE_REPORTE_MAXIMO, TIPOS_PERSONA_MARCACION } from "../constants";
import type { TipoPersonaMarcacion } from "../constants";

export class ReporteMarcacionesQueryDto {
  @ApiProperty({ example: "2027-05-01" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  desde!: string;

  @ApiProperty({ example: "2027-05-31" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  hasta!: string;

  @ApiPropertyOptional({ description: "Sección (solo estudiantes matriculados en ella)" })
  @IsOptional()
  @IsUUID()
  seccionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @ApiPropertyOptional({ enum: TIPOS_PERSONA_MARCACION })
  @IsOptional()
  @IsIn(TIPOS_PERSONA_MARCACION)
  tipoPersona?: TipoPersonaMarcacion;

  @ApiPropertyOptional({ description: "Cursor opaco de la página anterior" })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, maximum: LIMITE_REPORTE_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_REPORTE_MAXIMO)
  limit?: number;
}
