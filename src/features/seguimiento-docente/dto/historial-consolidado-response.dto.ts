import { ApiProperty } from "@nestjs/swagger";
import {
  DECISIONES_CONSOLIDADO,
  ESTADOS_CONSOLIDADO,
  type DecisionConsolidado,
  type EstadoConsolidado,
} from "../constants";

export class VersionHistorialConsolidadoDto {
  @ApiProperty({ example: "c1098c1a-f86e-11da-bd1a-00112444be3e" })
  id!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: true })
  vigente!: boolean;

  @ApiProperty({ enum: ESTADOS_CONSOLIDADO, example: "cerrado" })
  estado!: EstadoConsolidado;

  @ApiProperty({ example: "Ausencia anulada tras revisión", nullable: true })
  motivoCambio!: string | null;

  @ApiProperty({ example: 24 })
  sesionesProgramadas!: number;

  @ApiProperty({ example: 20 })
  sesionesCumplidas!: number;

  @ApiProperty({ example: 2 })
  sesionesParciales!: number;

  @ApiProperty({ example: 2 })
  sesionesNoCumplidas!: number;

  @ApiProperty({ example: 0 })
  sesionesJustificadas!: number;

  @ApiProperty({ example: 40 })
  minutosPerdidosFirma!: number;

  @ApiProperty({ example: 3 })
  totalAusencias!: number;

  @ApiProperty({ example: 60 })
  minutosFueraAula!: number;

  @ApiProperty({ example: 100 })
  totalMinutosFueraClase!: number;

  @ApiProperty({ example: "1 h 40 min" })
  tiempoFueraClaseTexto!: string;

  @ApiProperty({ enum: DECISIONES_CONSOLIDADO, example: "ninguna" })
  decision!: DecisionConsolidado;

  @ApiProperty({ example: null, nullable: true })
  observacion!: string | null;

  @ApiProperty({ example: "u1098c1a-f86e-11da-bd1a-00112444be6e" })
  generadoPorId!: string;

  @ApiProperty({ example: "Director Escolar" })
  generadoPorNombre!: string;

  @ApiProperty({ example: "2027-07-16T10:00:00.000Z" })
  generadoEn!: string;

  @ApiProperty({ example: null, nullable: true })
  reabiertoPorId!: string | null;

  @ApiProperty({ example: null, nullable: true })
  reabiertoPorNombre!: string | null;

  @ApiProperty({ example: null, nullable: true })
  reabiertoEn!: string | null;
}

export class HistorialConsolidadoResponseDto {
  @ApiProperty({ example: "r1098c1a-f86e-11da-bd1a-00112444be9e" })
  consolidadoRaizId!: string;

  @ApiProperty({ example: "d1098c1a-f86e-11da-bd1a-00112444be4e" })
  docenteId!: string;

  @ApiProperty({ example: "Quispe Mamani, Juan" })
  docenteNombre!: string;

  @ApiProperty({ example: "p1098c1a-f86e-11da-bd1a-00112444be5e" })
  periodoId!: string;

  @ApiProperty({ example: "II Bimestre" })
  periodoNombre!: string;

  @ApiProperty({ type: [VersionHistorialConsolidadoDto] })
  versiones!: VersionHistorialConsolidadoDto[];
}
