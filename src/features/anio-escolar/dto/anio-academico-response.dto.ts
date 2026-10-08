import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EstadoAnio, EstadoBimestre } from "../constants";

export class BimestreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 1 })
  numero!: number;

  @ApiProperty({ example: "I" })
  nombre!: string;

  @ApiProperty({ example: "2027-03-01" })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-05-09" })
  fechaFin!: string;

  @ApiProperty({ enum: ["planificado", "en_curso", "cerrado"] })
  estado!: EstadoBimestre;
}

export class AnioAcademicoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 2027 })
  anio!: number;

  @ApiPropertyOptional({ nullable: true })
  nombre!: string | null;

  @ApiProperty({ example: "2027-03-01" })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-12-19" })
  fechaFin!: string;

  @ApiProperty({ enum: ["planificado", "en_curso", "cerrado", "reabierto"] })
  estado!: EstadoAnio;

  @ApiPropertyOptional({ nullable: true })
  reabiertoHasta!: string | null;

  @ApiPropertyOptional({ nullable: true })
  motivoReapertura!: string | null;

  @ApiProperty({ type: [BimestreResponseDto] })
  bimestres!: BimestreResponseDto[];
}
