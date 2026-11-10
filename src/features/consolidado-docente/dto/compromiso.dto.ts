import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import {
  MENSAJES_CONSOLIDADO,
  RESULTADOS_COMPROMISO,
  type ResultadoCompromiso,
} from "../constants";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MENSAJE_FECHA = "La fecha de revisión debe tener el formato AAAA-MM-DD.";

export class RegistrarCompromisoDto {
  @ApiProperty({ description: "Consolidado sobre el que se registra el compromiso" })
  @IsUUID()
  consolidadoId!: string;

  @ApiProperty({ example: "Firmar el ingreso dentro de la tolerancia" })
  @IsString({ message: MENSAJES_CONSOLIDADO.COMPROMISO_SIN_DESCRIPCION })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.COMPROMISO_SIN_DESCRIPCION })
  @MaxLength(500)
  descripcion!: string;

  @ApiProperty({ example: "2026-12-15", description: "Hoy o posterior" })
  @Matches(FECHA_ISO, { message: MENSAJE_FECHA })
  fechaRevision!: string;
}

export class CerrarCompromisoDto {
  @ApiProperty({ enum: RESULTADOS_COMPROMISO })
  @IsIn(RESULTADOS_COMPROMISO)
  resultado!: ResultadoCompromiso;

  @ApiProperty({ example: "Cumplió las 3 semanas siguientes" })
  @IsString({ message: MENSAJES_CONSOLIDADO.COMPROMISO_CIERRE_SIN_OBSERVACION })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.COMPROMISO_CIERRE_SIN_OBSERVACION })
  @MaxLength(500)
  observacion!: string;
}

export class ReprogramarCompromisoDto {
  @ApiPropertyOptional({ example: "2026-12-20" })
  @IsOptional()
  @Matches(FECHA_ISO, { message: MENSAJE_FECHA })
  fechaRevision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class AnularCompromisoDto {
  @ApiProperty({ example: "Registrado en el docente equivocado" })
  @IsString({ message: MENSAJES_CONSOLIDADO.COMPROMISO_ANULACION_SIN_MOTIVO })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.COMPROMISO_ANULACION_SIN_MOTIVO })
  @MaxLength(500)
  motivo!: string;
}

export class ListarCompromisosQueryDto {
  @ApiProperty()
  @IsUUID()
  consolidadoId!: string;
}
