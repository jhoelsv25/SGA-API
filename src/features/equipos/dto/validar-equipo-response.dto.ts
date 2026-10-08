import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EquipoResponseDto } from "./equipo-response.dto";

export class ValidarEquipoResponseDto {
  @ApiProperty({ description: "Indica si el equipo es válido, está autorizado y activo" })
  valido!: boolean;

  @ApiPropertyOptional({ description: "Mensaje de estado" })
  message?: string;

  @ApiPropertyOptional({ description: "Datos públicos del equipo validado" })
  equipo?: EquipoResponseDto;
}
