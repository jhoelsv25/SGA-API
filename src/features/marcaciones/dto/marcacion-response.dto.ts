import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  OrigenMarcacion,
  ResultadoMarcacion,
  TipoMarcacion,
  TipoPersonaMarcacion,
} from "../constants";

export class MarcacionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() personaId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiPropertyOptional({ nullable: true }) fotoUrl!: string | null;
  @ApiProperty() tipoPersona!: TipoPersonaMarcacion;
  @ApiProperty() tipo!: TipoMarcacion;
  @ApiProperty({ description: "Fecha y hora de Lima (YYYY-MM-DD HH:mm:ss)" }) fechaHora!: string;
  @ApiProperty() origen!: OrigenMarcacion;
  @ApiProperty() resultado!: ResultadoMarcacion;
  @ApiProperty() minutosTardanza!: number;
  @ApiProperty() justificada!: boolean;
  @ApiPropertyOptional({ nullable: true }) motivoJustificacion!: string | null;
  @ApiPropertyOptional({ nullable: true }) justificadaEn!: string | null;
  @ApiPropertyOptional({ nullable: true }) observacion!: string | null;
}

export class MarcacionKioskoResponseDto {
  @ApiProperty({ description: "false si no se registró nada (ya había marcado)" })
  registrada!: boolean;
  @ApiProperty() mensaje!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiPropertyOptional({ nullable: true }) fotoUrl!: string | null;
  @ApiPropertyOptional({ enum: ["entrada", "salida"] }) tipo?: TipoMarcacion;
  @ApiPropertyOptional() resultado?: ResultadoMarcacion;
  @ApiPropertyOptional() minutosTardanza?: number;
  @ApiPropertyOptional({ description: "Hora registrada (HH:mm)" }) hora?: string;
}

export class ReporteMarcacionesResponseDto {
  @ApiProperty({ type: [MarcacionResponseDto] }) data!: MarcacionResponseDto[];
  @ApiProperty({ nullable: true }) nextCursor!: string | null;
  @ApiProperty() hasMore!: boolean;
  @ApiProperty() limit!: number;
}

export class PersonaPendienteDto {
  @ApiProperty() personaId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiPropertyOptional({ nullable: true, description: "Sección o cargo" }) detalle!: string | null;
}

export class GrupoPanelDto {
  @ApiProperty({ type: [MarcacionResponseDto] }) marcaron!: MarcacionResponseDto[];
  @ApiProperty({ type: [PersonaPendienteDto] }) faltan!: PersonaPendienteDto[];
  @ApiProperty() totalTardanzas!: number;
}

export class PanelMarcacionesHoyResponseDto {
  @ApiProperty() fecha!: string;
  @ApiProperty() diaConClases!: boolean;
  @ApiProperty({ type: GrupoPanelDto }) estudiantes!: GrupoPanelDto;
  @ApiProperty({ type: GrupoPanelDto }) personal!: GrupoPanelDto;
}
