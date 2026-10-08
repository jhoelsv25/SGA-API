import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TipoEvento } from "../constants";

export class EventoCalendarioResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  anioAcademicoId!: string;

  @ApiProperty()
  titulo!: string;

  @ApiPropertyOptional({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  tipo!: TipoEvento;

  @ApiProperty({ example: "2027-07-28" })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-07-29" })
  fechaFin!: string;

  @ApiProperty()
  suspendeClases!: boolean;

  @ApiPropertyOptional({
    description: "Presente cuando una suspensión eliminó o conservó sesiones ya generadas.",
  })
  mensaje?: string;
}

export class CalendarioConsultaResponseDto {
  @ApiProperty()
  anioAcademicoId!: string;

  @ApiProperty({ example: 2027 })
  anio!: number;

  @ApiProperty({ example: "2027-07-01" })
  desde!: string;

  @ApiProperty({ example: "2027-07-31" })
  hasta!: string;

  @ApiProperty({ type: [EventoCalendarioResponseDto] })
  eventos!: EventoCalendarioResponseDto[];

  @ApiProperty({ type: [String], description: "Días del rango en los que no hay clases" })
  diasSinClases!: string[];
}
