import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { MENSAJES_CONSOLIDADO } from "../constants";

export class RechazarSolicitudDto {
  /**
   * Respuesta obligatoria del Director al rechazar la solicitud (CP-RF013-16, CP-RF013-17).
   */
  @ApiProperty({
    description: "Respuesta obligatoria con la fundamentación del rechazo",
    maxLength: 1000,
    example: "La sesión no tiene firma de ingreso",
  })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.SOLICITUD_RECHAZADA_SIN_RESPUESTA })
  @IsString()
  @MaxLength(1000, { message: "La respuesta no puede superar los 1000 caracteres." })
  respuesta!: string;
}
