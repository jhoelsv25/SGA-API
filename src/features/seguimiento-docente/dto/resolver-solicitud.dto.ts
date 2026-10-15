import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ResolverSolicitudDto {
  /**
   * Respuesta o fundamentación del Director al aceptar la solicitud (opcional en aceptación).
   */
  @ApiPropertyOptional({
    description: "Respuesta o fundamentación del Director al aceptar la solicitud",
    maxLength: 1000,
    example: "Se revisará la sesión del 12/06",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: "La respuesta no puede superar los 1000 caracteres." })
  respuesta?: string;
}
