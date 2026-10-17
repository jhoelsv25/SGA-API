import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MENSAJES_INDICADORES } from "../constants";

export class NuevaVersionMedicionDto {
  @ApiProperty({
    example: "Justificaciones aprobadas tarde",
    description: "Motivo obligatorio para recalcular y congelar una nueva versión",
  })
  @IsString({ message: "El motivo debe ser texto." })
  @IsNotEmpty({ message: MENSAJES_INDICADORES.NUEVA_VERSION_SIN_MOTIVO })
  @MaxLength(500, { message: "El motivo no puede superar los 500 caracteres." })
  motivoCambio!: string;
}
