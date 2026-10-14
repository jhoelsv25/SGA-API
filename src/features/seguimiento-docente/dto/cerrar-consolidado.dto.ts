import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { MENSAJES_CONSOLIDADO } from "../constants";

export class CerrarConsolidadoDto {
  /**
   * Motivo obligatorio del recálculo y cierre para versionado (CP-RF013-08, CP-RF013-09).
   * Obligatorio desde la versión 2.
   */
  @ApiProperty({
    description: "Motivo obligatorio del cambio para la nueva versión del consolidado",
    maxLength: 500,
    example: "Ausencia anulada tras revisión",
  })
  @IsNotEmpty({ message: MENSAJES_CONSOLIDADO.NUEVO_CIERRE_SIN_MOTIVO })
  @IsString()
  @MaxLength(500, { message: "El motivo del cambio no puede superar los 500 caracteres." })
  motivoCambio!: string;
}
