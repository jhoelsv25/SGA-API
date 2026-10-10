import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TIPOS_OBSERVACION, TipoObservacion } from "../constants";

export class CrearObservacionDto {
  @ApiProperty({
    description: "ID de la matrícula vigente del estudiante",
    example: "a0000000-0000-0000-0000-000000000001",
  })
  @IsUUID("4")
  @IsNotEmpty()
  matriculaId!: string;

  @ApiProperty({
    description: "Fecha de la observación (formato YYYY-MM-DD)",
    example: "2026-05-15",
  })
  @IsDateString()
  @IsNotEmpty()
  fecha!: string;

  @ApiProperty({
    description:
      "Tipo de observación: 'academica' | 'conductual' | 'socioemocional' | 'salud' | 'familiar'",
    enum: TIPOS_OBSERVACION,
    example: "familiar",
  })
  @IsIn(TIPOS_OBSERVACION)
  @IsNotEmpty()
  tipo!: TipoObservacion;

  @ApiProperty({
    description: "Descripción de la observación tutorial o psicopedagógica",
    example: "El estudiante manifiesta preocupación por situación económica familiar.",
  })
  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  observacion!: string;

  @ApiPropertyOptional({
    description: "Acciones o seguimiento acordado",
    example: "Entrevista programada con el apoderado.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  seguimiento?: string;

  @ApiPropertyOptional({
    description: "Entidad o área a la que se deriva (ej. psicología, DEMUNA, centro de salud)",
    example: "psicología",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  derivadoA?: string;

  @ApiPropertyOptional({
    description:
      "Indica si la observación es confidencial (restringida a autor, tutor, apoderados, director y estudiante)",
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  esConfidencial?: boolean;
}
