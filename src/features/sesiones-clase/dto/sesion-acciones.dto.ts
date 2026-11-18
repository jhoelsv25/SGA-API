import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import {
  CODIGOS_MOTIVO_JUSTIFICACION,
  MENSAJES_SESION,
  type MotivoJustificacion,
} from "../constants";

export class ReemplazoSesionDto {
  @ApiProperty({ description: "Docente que dictará la sesión" })
  @IsUUID()
  docenteId!: string;
}

export class TemaSesionDto {
  @ApiProperty({ example: "Ecuaciones cuadráticas" })
  @IsString({ message: MENSAJES_SESION.FALTA_TEMA })
  @IsNotEmpty({ message: MENSAJES_SESION.FALTA_TEMA })
  @MaxLength(500)
  tema!: string;

  @ApiPropertyOptional({
    description: "Si es true, crea una unidad en borrador en Aula Virtual con el tema",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  crearEnAulaVirtual?: boolean;
}

export class SugerirTemaDto {
  @ApiPropertyOptional({
    example: "ec cuadraticas",
    description: "Borrador corto o palabras clave del docente para pulir con IA",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  borrador?: string;
}

export class SolicitarJustificacionDto {
  @ApiProperty({ enum: CODIGOS_MOTIVO_JUSTIFICACION, example: "descanso_medico" })
  @IsString({ message: MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO })
  @IsIn(CODIGOS_MOTIVO_JUSTIFICACION, { message: MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO })
  motivo!: MotivoJustificacion;

  @ApiPropertyOptional({ description: "Obligatoria solo con el motivo «Otro»" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @ApiPropertyOptional({ description: "Enlace del documento (certificado, constancia)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  documentoUrl?: string;
}

export class AprobarJustificacionDto {
  @ApiPropertyOptional({
    description: "Confirma la aprobación aunque supere el tope de permisos personales del año",
  })
  @IsOptional()
  @IsBoolean()
  confirmarTope?: boolean;
}

export class FiltrosBandejaJustificacionesDto {
  @ApiPropertyOptional({ enum: CODIGOS_MOTIVO_JUSTIFICACION })
  @IsOptional()
  @IsIn(CODIGOS_MOTIVO_JUSTIFICACION)
  motivo?: MotivoJustificacion;

  @ApiPropertyOptional({ description: "true para ver solo las solicitudes vencidas" })
  @IsOptional()
  @Matches(/^(true|false)$/, { message: "Use true o false." })
  vencidas?: string;
}

export class RechazarJustificacionDto {
  @ApiProperty({ example: "No presentó documento" })
  @IsString({ message: MENSAJES_SESION.RECHAZO_SIN_COMENTARIO })
  @IsNotEmpty({ message: MENSAJES_SESION.RECHAZO_SIN_COMENTARIO })
  @MaxLength(500)
  comentario!: string;
}

export class RangoSesionesQueryDto {
  @ApiProperty({ example: "2028-05-10" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  desde!: string;

  @ApiProperty({ example: "2028-07-16" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  hasta!: string;
}
