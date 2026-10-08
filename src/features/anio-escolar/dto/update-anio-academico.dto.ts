import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_INVALIDA = "Indique una fecha válida (AAAA-MM-DD).";

export class UpdateAnioAcademicoDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({ example: "2027-03-01" })
  @IsOptional()
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaInicio?: string;

  @ApiPropertyOptional({ example: "2027-12-19" })
  @IsOptional()
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaFin?: string;
}
