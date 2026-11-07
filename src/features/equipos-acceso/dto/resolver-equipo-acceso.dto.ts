import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class AutorizarEquipoAccesoDto {
  @ApiPropertyOptional({
    description: "Fecha límite de la autorización (ISO-8601); vacío = sin límite",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha límite no es válida." })
  vigenteHasta?: string;
}

export class MotivoEquipoAccesoDto {
  @ApiPropertyOptional({ description: "Motivo del rechazo o la revocación" })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "El motivo no puede superar los 255 caracteres." })
  motivo?: string;
}
