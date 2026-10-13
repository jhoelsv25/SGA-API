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
import { MOTIVOS_AUSENCIA, type MotivoAusencia } from "../constants";

export class RegistrarAusenciaDto {
  @ApiProperty({
    description: "UUID de la sesión de clase en la que se registra la ausencia",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  sesionClaseId!: string;

  @ApiProperty({
    description: "Hora inicial de la ausencia en formato HH:mm",
    example: "08:50",
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Formato de hora inválido (HH:mm)." })
  @IsNotEmpty()
  horaDesde!: string;

  @ApiProperty({
    description: "Hora final de la ausencia en formato HH:mm",
    example: "09:10",
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Formato de hora inválido (HH:mm)." })
  @IsNotEmpty()
  horaHasta!: string;

  @ApiProperty({
    description: "Motivo de la ausencia",
    enum: MOTIVOS_AUSENCIA,
    example: "desayunando",
  })
  @IsIn(MOTIVOS_AUSENCIA)
  @IsNotEmpty()
  motivo!: MotivoAusencia;

  @ApiPropertyOptional({
    description: "Observación de la situación (obligatoria si el motivo es «otro»)",
    example: "En la cafetería",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;

  @ApiPropertyOptional({
    description:
      "Metadatos opcionales de captura de fotos (JSON con fecha/hora tomadaEn por cada foto enviada)",
    example: '[{"tomadaEn":"2027-05-13T08:55:00.000Z"}]',
  })
  @IsOptional()
  @IsString()
  metadatosFotos?: string;
}
