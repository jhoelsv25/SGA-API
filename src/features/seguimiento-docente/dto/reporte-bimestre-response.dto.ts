import { ApiProperty } from "@nestjs/swagger";
import { ConsolidadoResumenDto } from "./consolidado-resumen.dto";

export class PeriodoResumenDto {
  @ApiProperty({ example: "p1098c1a-f86e-11da-bd1a-00112444be5e" })
  id!: string;

  @ApiProperty({ example: "II Bimestre" })
  nombre!: string;

  @ApiProperty({ example: 2 })
  numero!: number;

  @ApiProperty({ example: "cerrado" })
  estado!: string;

  @ApiProperty({ example: "2027-05-01" })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-07-15" })
  fechaFin!: string;
}

export class ReporteBimestreResponseDto {
  @ApiProperty({ type: PeriodoResumenDto })
  periodo!: PeriodoResumenDto;

  @ApiProperty({ type: [ConsolidadoResumenDto] })
  docentes!: ConsolidadoResumenDto[];

  @ApiProperty({ example: 24 })
  totalDocentes!: number;

  @ApiProperty({ example: 450 })
  totalMinutosPerdidosFirma!: number;

  @ApiProperty({ example: 620 })
  totalMinutosFueraAula!: number;

  @ApiProperty({ example: 1070 })
  totalMinutosFueraClase!: number;

  @ApiProperty({ example: "17 h 50 min" })
  tiempoTotalFueraClaseTexto!: string;
}
