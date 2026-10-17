import { ApiProperty } from "@nestjs/swagger";
import type { Indicador } from "../constants";

export class PretestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: "CSP" }) indicador!: Indicador;
  @ApiProperty({ example: "I Bimestre 2026" }) periodoDescrito!: string;
  @ApiProperty({ example: "2026-03-01" }) fechaInicio!: string;
  @ApiProperty({ example: "2026-05-08" }) fechaFin!: string;
  @ApiProperty({ example: 942 }) numerador!: number;
  @ApiProperty({ example: 1200 }) denominador!: number;
  @ApiProperty({ example: 78.5 }) porcentaje!: number;
  @ApiProperty({ example: "78.50 %" }) porcentajeTexto!: string;
  @ApiProperty({ example: "Hojas físicas de firma de la subdirección" }) fuente!: string;
  @ApiProperty({ example: true }) vigente!: boolean;
  @ApiProperty() registradoPorId!: string;
  @ApiProperty({ required: false }) registradoPorNombre?: string;
  @ApiProperty() creadoEn!: string;
}
