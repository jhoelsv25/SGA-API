import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MENSAJES_ASISTENCIA } from "../constants";

export class JustificarFaltaDto {
  @ApiProperty({ example: "Certificado médico" })
  @IsString({ message: MENSAJES_ASISTENCIA.MOTIVO_REQUERIDO })
  @IsNotEmpty({ message: MENSAJES_ASISTENCIA.MOTIVO_REQUERIDO })
  @MaxLength(500)
  motivo!: string;

  @ApiPropertyOptional({ description: "URL del documento adjunto (certificado médico, etc.)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  documentoUrl?: string;
}
