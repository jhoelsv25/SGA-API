import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { TIPOS_EVENTO, TipoEvento } from "../constants";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_INVALIDA = "Indique una fecha válida (AAAA-MM-DD).";

export class UpdateEventoCalendarioDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @ApiPropertyOptional({ enum: TIPOS_EVENTO })
  @IsOptional()
  @IsIn(TIPOS_EVENTO)
  tipo?: TipoEvento;

  @ApiPropertyOptional({ example: "2027-07-28" })
  @IsOptional()
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaInicio?: string;

  @ApiPropertyOptional({ example: "2027-07-29" })
  @IsOptional()
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  suspendeClases?: boolean;
}
