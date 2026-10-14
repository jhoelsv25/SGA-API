import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { MOTIVOS_AUSENCIA, type MotivoAusencia } from "../constants";

export class CorregirAusenciaDto {
  @ApiPropertyOptional({
    description: "Nueva hora inicial de la ausencia en formato HH:mm",
    example: "08:50",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Formato de hora inválido (HH:mm)." })
  horaDesde?: string;

  @ApiPropertyOptional({
    description: "Nueva hora final de la ausencia en formato HH:mm",
    example: "09:05",
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Formato de hora inválido (HH:mm)." })
  horaHasta?: string;

  @ApiPropertyOptional({
    description: "Nuevo motivo de la ausencia",
    enum: MOTIVOS_AUSENCIA,
    example: "fuera_del_aula",
  })
  @IsOptional()
  @IsIn(MOTIVOS_AUSENCIA)
  motivo?: MotivoAusencia;

  @ApiPropertyOptional({
    description: "Nueva observación de la ausencia",
    example: "Ajuste de detalle",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;

  @ApiProperty({
    description: "Motivo obligatorio del cambio para auditoría y versionado",
    example: "Error al anotar la hora",
    maxLength: 500,
  })
  @IsNotEmpty({ message: "Indique el motivo del cambio." })
  @IsString()
  @MaxLength(500)
  motivoCambio!: string;

  @ApiPropertyOptional({
    description: "IDs de fotos anteriores que el supervisor desea retirar (marcar vigente = false)",
    type: [String],
    example: ["b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"],
  })
  @IsOptional()
  fotosRetiradasIds?: string[];

  @ApiPropertyOptional({
    description: "Metadatos opcionales de fotos nuevas (JSON con tomadaEn)",
    example: '[{"tomadaEn":"2027-05-13T09:00:00.000Z"}]',
  })
  @IsOptional()
  @IsString()
  metadatosFotos?: string;
}
