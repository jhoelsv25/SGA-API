import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { EstadoJustificacion, EstadoSesion } from "../constants";

export class JustificacionSesionDto {
  @ApiProperty() estado!: EstadoJustificacion;
  @ApiProperty() motivo!: string;
  @ApiPropertyOptional({ nullable: true }) documentoUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) comentario!: string | null;
  @ApiPropertyOptional({ nullable: true }) solicitadaEn!: string | null;
  @ApiPropertyOptional({ nullable: true }) revisadaEn!: string | null;
}

export class SesionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fecha!: string;
  @ApiProperty({ example: "08:30" }) horaInicio!: string;
  @ApiProperty({ example: "10:00" }) horaFin!: string;
  @ApiProperty() cursoNombre!: string;
  @ApiProperty({ example: "5.° A" }) seccionNombre!: string;
  @ApiProperty() docenteId!: string;
  @ApiProperty() docenteNombre!: string;
  @ApiPropertyOptional({ nullable: true, description: "Titular si hubo reemplazo" })
  docenteTitularNombre!: string | null;
  @ApiProperty() estado!: EstadoSesion;
  @ApiPropertyOptional({ nullable: true }) tema!: string | null;
  @ApiPropertyOptional({ nullable: true }) horaIngreso!: string | null;
  @ApiPropertyOptional({ nullable: true }) horaSalida!: string | null;
  @ApiProperty() minutosRetraso!: number;
  @ApiProperty() minutosPerdidos!: number;
  @ApiProperty() salidaAutomatica!: boolean;
  @ApiPropertyOptional({ nullable: true }) observaciones!: string | null;
  @ApiPropertyOptional({ type: JustificacionSesionDto, nullable: true })
  justificacion!: JustificacionSesionDto | null;
}

export class SesionPanelDto extends SesionResponseDto {
  @ApiProperty({ description: "Pasó la tolerancia sin firma de ingreso" }) alerta!: boolean;
}

export class PanelSesionesResponseDto {
  @ApiProperty() fecha!: string;
  @ApiProperty({ type: [SesionPanelDto] }) sesiones!: SesionPanelDto[];
  @ApiProperty() totalAlertas!: number;
}

export class SesionesKioskoResponseDto {
  @ApiProperty() docenteNombre!: string;
  @ApiProperty({ type: [SesionResponseDto] }) sesiones!: SesionResponseDto[];
  @ApiPropertyOptional({ nullable: true }) destacadaId!: string | null;
  @ApiPropertyOptional() mensaje?: string;
}

export class FirmaSesionResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ type: SesionResponseDto }) sesion!: SesionResponseDto;
}

export class TotalesSesionesDto {
  @ApiProperty() cumplidas!: number;
  @ApiProperty() parciales!: number;
  @ApiProperty() noCumplidas!: number;
  @ApiProperty() justificadas!: number;
  @ApiProperty() pendientes!: number;
}

export class MisSesionesResponseDto {
  @ApiProperty({ type: [SesionResponseDto] }) sesiones!: SesionResponseDto[];
  @ApiProperty({ type: TotalesSesionesDto }) totales!: TotalesSesionesDto;
}

export class MensajeSesionResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ type: SesionResponseDto }) sesion!: SesionResponseDto;
}

export class MiJornadaHoyResponseDto {
  @ApiProperty({ example: "2026-11-12" }) fecha!: string;
  @ApiProperty() docenteNombre!: string;
  @ApiPropertyOptional({ nullable: true }) destacadaId!: string | null;
  @ApiProperty({ example: 10 }) minutosAntes!: number;
  @ApiProperty() firmaWebHabilitada!: boolean;
  @ApiProperty({ type: [SesionResponseDto] }) sesiones!: SesionResponseDto[];
}
