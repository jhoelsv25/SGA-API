import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  ESTADOS_ORDEN,
  MENSAJES_BIOMETRICO,
  TIPOS_ORDEN,
  type EstadoOrden,
  type TipoOrden,
} from "../constants";

export class ConfigRelojDto {
  @ApiProperty({ nullable: true, type: String, example: "192.168.1.201" }) relojIp!: string | null;
  @ApiProperty({ example: 4370 }) relojPuerto!: number;
  @ApiProperty({ example: 0 }) relojClaveComunicacion!: number;
  @ApiProperty({ example: 60 }) intervaloSegundos!: number;
}

export class GuardarConfigRelojDto {
  @ApiProperty({ example: "192.168.1.201" })
  @IsString()
  @Matches(/^[A-Za-z0-9]([A-Za-z0-9.-]{0,253}[A-Za-z0-9])?$/, {
    message: MENSAJES_BIOMETRICO.RELOJ_IP_INVALIDA,
  })
  relojIp!: string;

  @ApiProperty({ example: 4370 })
  @IsInt()
  @Min(1)
  @Max(65535)
  relojPuerto!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @Max(999999)
  relojClaveComunicacion!: number;

  @ApiProperty({ example: 60, description: "Cada cuántos segundos la app lee el reloj" })
  @IsInt()
  @Min(10)
  @Max(3600)
  intervaloSegundos!: number;
}

export class GuardarConfigRelojResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ type: ConfigRelojDto }) config!: ConfigRelojDto;
}

export class CrearOrdenDto {
  @ApiProperty({ enum: TIPOS_ORDEN })
  @IsString()
  @Matches(/^(probar_reloj|leer_reloj|sincronizar)$/)
  tipo!: TipoOrden;
}

export class OrdenDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TIPOS_ORDEN }) tipo!: TipoOrden;
  @ApiProperty({ enum: ESTADOS_ORDEN }) estado!: EstadoOrden;
  @ApiProperty({ nullable: true, type: String }) mensaje!: string | null;
  @ApiProperty({ nullable: true, description: "Detalle devuelto por la app puente" })
  datos!: unknown;
  @ApiProperty() creadoEn!: string;
  @ApiProperty({ nullable: true, type: String }) resueltaEn!: string | null;
}

export class OrdenPendienteDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TIPOS_ORDEN }) tipo!: TipoOrden;
}

export class ResultadoOrdenDto {
  @ApiProperty() @IsBoolean() ok!: boolean;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  mensaje!: string;

  @ApiPropertyOptional({ description: "Detalle opcional (por ejemplo, las marcaciones leídas)" })
  @IsOptional()
  @IsObject()
  datos?: Record<string, unknown>;
}
