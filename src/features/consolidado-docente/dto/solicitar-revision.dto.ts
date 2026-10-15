import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MENSAJES_CONSOLIDADO } from "../constants";

export class SolicitarRevisionDto {
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO })
  @IsString()
  @MaxLength(1000)
  motivo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adjuntoUrl?: string;
}
