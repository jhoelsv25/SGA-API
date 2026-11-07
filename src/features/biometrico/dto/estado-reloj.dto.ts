import { ApiProperty } from "@nestjs/swagger";
import { ConfigRelojDto } from "./config-reloj.dto";
import { ESTADOS_RELOJ, type EstadoReloj } from "../constants";

export class EstadoRelojDto {
  @ApiProperty() equipoId!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty() ubicacion!: string;
  @ApiProperty() activo!: boolean;
  @ApiProperty({ nullable: true, type: String }) ultimoLatidoEn!: string | null;
  @ApiProperty({ nullable: true, type: String }) relojRespondioEn!: string | null;
  @ApiProperty({ nullable: true, type: Number }) desfaseMinutos!: number | null;
  @ApiProperty({ enum: ESTADOS_RELOJ }) estado!: EstadoReloj;
  @ApiProperty({ type: ConfigRelojDto }) config!: ConfigRelojDto;
  @ApiProperty({ type: [String], description: "Alertas para Soporte TI" }) alertas!: string[];
}
