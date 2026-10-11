import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { MENSAJES_SESION } from "../constants";

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
}

export class SolicitarJustificacionDto {
  @ApiProperty({ example: "Descanso médico" })
  @IsString({ message: MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO })
  @IsNotEmpty({ message: MENSAJES_SESION.JUSTIFICACION_SIN_MOTIVO })
  @MaxLength(500)
  motivo!: string;

  @ApiPropertyOptional({ description: "Enlace del documento (certificado, constancia)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  documentoUrl?: string;
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
