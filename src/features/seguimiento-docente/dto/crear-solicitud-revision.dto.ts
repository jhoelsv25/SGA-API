import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { MENSAJES_CONSOLIDADO } from "../constants";

export class CrearSolicitudRevisionDto {
  /** Identificador único del consolidado sobre el que se solicita revisión */
  @ApiProperty({
    description: "Identificador UUID del consolidado sobre el cual se solicita revisión",
    example: "a8098c1a-f86e-11da-bd1a-00112444be1e",
  })
  @IsUUID("4", { message: "El identificador del consolidado debe ser un UUID válido." })
  @IsNotEmpty({ message: "El identificador del consolidado es obligatorio." })
  consolidadoId!: string;

  /**
   * Motivo de la solicitud expresado por el docente (CP-RF013-12, CP-RF013-13).
   */
  @ApiProperty({
    description: "Motivo detallado de la solicitud de revisión",
    maxLength: 1000,
    example: "El 12/06 firmé en el kiosko; adjunto foto de la pizarra",
  })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.SOLICITUD_SIN_MOTIVO })
  @IsString()
  @MaxLength(1000, { message: "El motivo de la solicitud no puede superar los 1000 caracteres." })
  motivo!: string;
}
