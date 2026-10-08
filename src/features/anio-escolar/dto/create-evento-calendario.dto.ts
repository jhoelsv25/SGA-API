import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { TIPOS_EVENTO, TipoEvento } from "../constants";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_INVALIDA = "Indique una fecha válida (AAAA-MM-DD).";

export class CreateEventoCalendarioDto {
  @ApiProperty({ example: "Fiestas Patrias", maxLength: 150 })
  @IsString()
  @MaxLength(150)
  titulo!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ enum: TIPOS_EVENTO, example: "feriado" })
  @IsIn(TIPOS_EVENTO)
  tipo!: TipoEvento;

  @ApiProperty({ example: "2027-07-28" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-07-29" })
  @Matches(FECHA, { message: FECHA_INVALIDA })
  fechaFin!: string;

  @ApiPropertyOptional({
    description:
      "Si se omite, feriado, suspensión y jornada pedagógica suspenden clases; el resto no.",
  })
  @IsOptional()
  @IsBoolean()
  suspendeClases?: boolean;

  @ApiPropertyOptional({ description: "Año escolar. Si se omite, se usa el año vigente." })
  @IsOptional()
  @IsUUID()
  anioAcademicoId?: string;
}
