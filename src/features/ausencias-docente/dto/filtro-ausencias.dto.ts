import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsUUID } from "class-validator";

export class FiltroAusenciasQueryDto {
  @ApiPropertyOptional({
    description: "UUID del periodo académico / bimestre para filtrar",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsOptional()
  @IsUUID()
  periodoId?: string;

  @ApiPropertyOptional({
    description: "UUID del docente para filtrar",
    example: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  })
  @IsOptional()
  @IsUUID()
  docenteId?: string;

  @ApiPropertyOptional({
    description: "Fecha inicial de filtro en formato ISO 8601 (YYYY-MM-DD)",
    example: "2027-05-01",
  })
  @IsOptional()
  @IsISO8601()
  fechaDesde?: string;

  @ApiPropertyOptional({
    description: "Fecha final de filtro en formato ISO 8601 (YYYY-MM-DD)",
    example: "2027-05-31",
  })
  @IsOptional()
  @IsISO8601()
  fechaHasta?: string;
}
