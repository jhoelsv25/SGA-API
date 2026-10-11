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
import { MENSAJES_MARCACION, TIPOS_MARCACION, type TipoMarcacion } from "../constants";

export class RegistrarMarcacionManualDto {
  @ApiProperty({ description: "ID de la persona (estudiante, docente o administrativo)" })
  @IsUUID()
  personaId!: string;

  @ApiProperty({ enum: TIPOS_MARCACION, example: "entrada" })
  @IsIn(TIPOS_MARCACION)
  tipo!: TipoMarcacion;

  @ApiPropertyOptional({
    description: "Fecha (YYYY-MM-DD). Por defecto, hoy.",
    example: "2027-05-12",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  fecha?: string;

  @ApiProperty({ description: "Hora real de la marcación (HH:mm)", example: "07:50" })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: MENSAJES_MARCACION.HORA_INVALIDA })
  hora!: string;

  @ApiProperty({ description: "Motivo de la marcación manual", example: "Kiosko sin conexión" })
  @IsString({ message: MENSAJES_MARCACION.OBSERVACION_REQUERIDA })
  @IsNotEmpty({ message: MENSAJES_MARCACION.OBSERVACION_REQUERIDA })
  @MaxLength(500)
  observacion!: string;
}
