import { ApiProperty } from "@nestjs/swagger";
import { EquipoResponseDto } from "./equipo-response.dto";

export class AutorizarEquipoResponseDto {
  @ApiProperty({ description: "Mensaje de confirmación" })
  message!: string;

  @ApiProperty({
    description: "Clave criptográfica secreta de autorización generada para esta terminal",
  })
  tokenAutorizacion!: string;

  @ApiProperty({ description: "Datos del equipo autorizado" })
  equipo!: EquipoResponseDto;
}
