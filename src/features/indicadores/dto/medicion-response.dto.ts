import { ApiProperty } from "@nestjs/swagger";
import type { Indicador } from "../constants";
import type { DesgloseCspDto, DesgloseIgmDto, DesgloseIsaDto } from "./indicador-calculado.dto";

export class MedicionIndicadorItemDto {
  @ApiProperty({ example: "CSP" }) indicador!: Indicador;
  @ApiProperty({ example: 1140 }) numerador!: number;
  @ApiProperty({ example: 1180 }) denominador!: number;
  @ApiProperty({ example: 96.61 }) porcentaje!: number;
  @ApiProperty({ example: "96.61 %" }) porcentajeTexto!: string;
  @ApiProperty() desglose!: DesgloseCspDto | DesgloseIsaDto | DesgloseIgmDto;
}

export class MedicionBimestreResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() periodoId!: string;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty({ example: 1 }) version!: number;
  @ApiProperty({ example: true }) vigente!: boolean;
  @ApiProperty({ nullable: true }) motivoCambio!: string | null;
  @ApiProperty() cerradaPorId!: string;
  @ApiProperty({ required: false }) cerradaPorNombre?: string;
  @ApiProperty() cerradaEn!: string;
  @ApiProperty({ type: [MedicionIndicadorItemDto] }) indicadores!: MedicionIndicadorItemDto[];
}

export class HistorialMedicionResponseDto {
  @ApiProperty() periodoId!: string;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty({ type: [MedicionBimestreResponseDto] }) versiones!: MedicionBimestreResponseDto[];
}
