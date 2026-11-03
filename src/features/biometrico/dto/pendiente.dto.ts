import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import {
  ESTADOS_PENDIENTE,
  MOTIVOS_PENDIENTE,
  type EstadoPendiente,
  type MotivoPendiente,
} from "../constants";

export class PendientesQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_PENDIENTE, default: "pendiente" })
  @IsOptional()
  @IsIn(ESTADOS_PENDIENTE)
  estado?: EstadoPendiente;
}

export class AsignarPendienteDto {
  @ApiProperty({ description: "Persona (docente) a la que se asigna la marcación" })
  @IsUUID()
  personaId!: string;

  @ApiPropertyOptional({ description: "Vincular también el código biométrico a esa persona" })
  @IsOptional()
  @IsBoolean()
  vincularCodigo?: boolean;
}

export class DescartarPendienteDto {
  @ApiProperty({ description: "Motivo obligatorio del descarte" })
  @IsString()
  @MaxLength(500)
  motivo!: string;
}

export class PendienteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() equipoId!: string;
  @ApiProperty({ nullable: true, type: String }) equipoNombre!: string | null;
  @ApiProperty() codigoBiometrico!: string;
  @ApiProperty() fechaHora!: string;
  @ApiProperty({ enum: MOTIVOS_PENDIENTE }) motivo!: MotivoPendiente;
  @ApiProperty({ enum: ESTADOS_PENDIENTE }) estado!: EstadoPendiente;
  @ApiProperty({ nullable: true, type: String }) personaId!: string | null;
  @ApiProperty({ nullable: true, type: String }) motivoDescarte!: string | null;
  @ApiProperty({ nullable: true, type: String }) resueltaEn!: string | null;
}

export class ResolverPendienteResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ type: PendienteResponseDto }) pendiente!: PendienteResponseDto;
}
