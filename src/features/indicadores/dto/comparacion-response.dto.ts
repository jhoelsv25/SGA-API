import { ApiProperty } from "@nestjs/swagger";
import type { Indicador } from "../constants";

export class ComparacionItemPretestDto {
  @ApiProperty({ example: true }) registrado!: boolean;
  @ApiProperty({ example: 78.5, nullable: true }) porcentaje!: number | null;
  @ApiProperty({ example: "78.50 %" }) porcentajeTexto!: string;
  @ApiProperty({ required: false }) fuente?: string;
  @ApiProperty({ required: false }) periodoDescrito?: string;
  @ApiProperty({ required: false, example: "Registre el pretest para ver la comparación." })
  mensaje?: string;
}

export class ComparacionItemPostestDto {
  @ApiProperty({ example: true }) medido!: boolean;
  @ApiProperty({ example: 94.2, nullable: true }) porcentaje!: number | null;
  @ApiProperty({ example: "94.20 %" }) porcentajeTexto!: string;
  @ApiProperty({ example: 1, required: false }) version?: number;
  @ApiProperty({ required: false }) cerradaEn?: string;
}

export class ComparacionIndicadorItemDto {
  @ApiProperty({ example: "CSP" }) indicador!: Indicador;
  @ApiProperty({ example: "Cumplimiento de sesiones planificadas" }) nombre!: string;
  @ApiProperty({ example: "Prácticas pedagógicas" }) dimension!: string;
  @ApiProperty({ type: ComparacionItemPretestDto }) pretest!: ComparacionItemPretestDto;
  @ApiProperty({ type: ComparacionItemPostestDto }) postest!: ComparacionItemPostestDto;
  @ApiProperty({ example: 15.7, nullable: true }) variacionPuntos!: number | null;
  @ApiProperty({ example: "+15.70 pp" }) variacionPuntosTexto!: string;
}

export class EvolucionBimestreItemDto {
  @ApiProperty() periodoId!: string;
  @ApiProperty({ example: "I Bimestre" }) periodoNombre!: string;
  @ApiProperty({ example: 1 }) numero!: number;
  @ApiProperty({ example: 94.2, nullable: true }) csp!: number | null;
  @ApiProperty({ example: 97.1, nullable: true }) isa!: number | null;
  @ApiProperty({ example: 88.0, nullable: true }) igm!: number | null;
}

export class ComparacionBimestreResponseDto {
  @ApiProperty() periodoId!: string;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty({ type: [ComparacionIndicadorItemDto] })
  comparaciones!: ComparacionIndicadorItemDto[];
  @ApiProperty({ type: [EvolucionBimestreItemDto] })
  evolucionBimestres!: EvolucionBimestreItemDto[];
}
