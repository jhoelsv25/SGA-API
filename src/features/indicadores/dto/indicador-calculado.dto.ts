import { ApiProperty } from "@nestjs/swagger";
import type { Indicador } from "../constants";

export class DesgloseCspDto {
  @ApiProperty({ example: 1200 })
  planificadas!: number;

  @ApiProperty({ example: 1080 })
  cumplidas!: number;

  @ApiProperty({ example: 60 })
  parciales!: number;

  @ApiProperty({ example: 40 })
  noCumplidas!: number;

  @ApiProperty({ example: 20 })
  justificadas!: number;

  @ApiProperty({ example: 1180, description: "Denominador efectivo (planificadas - justificadas)" })
  denominadorEfectivo!: number;
}

export class DesgloseIsaDto {
  @ApiProperty({ example: 168 })
  programadas!: number;

  @ApiProperty({ example: 160 })
  publicadasATiempo!: number;

  @ApiProperty({ example: 5 })
  publicadasFueraDePlazo!: number;

  @ApiProperty({ example: 3 })
  pendientes!: number;

  @ApiProperty({ example: 142 })
  vistasPorFamilia!: number;

  @ApiProperty({ example: 84.52, description: "% de libretas vistas sobre las programadas" })
  porcentajeVistasFamilia!: number;
}

export class DesgloseIgmDto {
  @ApiProperty({ example: 250 })
  planificados!: number;

  @ApiProperty({ example: 220 })
  publicadosATiempo!: number;

  @ApiProperty({ example: 20 })
  publicadosFueraDePlazo!: number;

  @ApiProperty({ example: 10 })
  pendientes!: number;

  @ApiProperty({ example: 30, description: "Materiales extra que no entran al cálculo" })
  extras!: number;
}

export class IndicadorCalculadoDto<TDesglose> {
  @ApiProperty({ example: "CSP" })
  indicador!: Indicador;

  @ApiProperty({ example: "Cumplimiento de sesiones planificadas" })
  nombre!: string;

  @ApiProperty({ example: "Prácticas pedagógicas" })
  dimension!: string;

  @ApiProperty({ example: "(cumplidas + parciales) ÷ (planificadas − justificadas) × 100" })
  formula!: string;

  @ApiProperty({ example: 1140 })
  numerador!: number;

  @ApiProperty({ example: 1180 })
  denominador!: number;

  @ApiProperty({ example: 96.61, nullable: true })
  porcentaje!: number | null;

  @ApiProperty({ example: "96.61 %" })
  porcentajeTexto!: string;

  @ApiProperty({ example: false })
  enCurso!: boolean;

  @ApiProperty({ example: false })
  sinDatos!: boolean;

  @ApiProperty({ example: "No hay datos para el periodo y los filtros elegidos.", required: false })
  mensajeSinDatos?: string;

  @ApiProperty()
  desglose!: TDesglose;
}
