import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { CREDENCIAL_MESSAGES } from "../constants";

export class CambiarPinDto {
  @ApiPropertyOptional({
    description: "PIN actual de 4 dígitos para verificación (opcional si es administrador)",
    example: "1234",
  })
  @IsOptional()
  @IsString({ message: "El PIN actual debe ser una cadena de texto" })
  @Matches(/^[0-9]{4}$/, { message: CREDENCIAL_MESSAGES.PIN_INVALIDO })
  pinActual?: string;

  @ApiProperty({
    description: "Nuevo PIN numérico de 4 dígitos",
    example: "5678",
  })
  @IsString({ message: "El nuevo PIN debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nuevo PIN es obligatorio" })
  @Matches(/^[0-9]{4}$/, { message: CREDENCIAL_MESSAGES.PIN_INVALIDO })
  nuevoPin: string;
}
