import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { ERROR_MESSAGES } from "../constants";

export class UpdateVariableDto {
  @ApiProperty({ description: "Nuevo valor de la variable en formato texto", example: "10" })
  @IsNotEmpty({ message: "El valor es obligatorio." })
  @IsString({ message: "El valor debe ser una cadena de texto." })
  valor: string;

  @ApiProperty({ description: "Motivo justificativo del cambio", example: "Acuerdo de dirección" })
  @IsNotEmpty({ message: ERROR_MESSAGES.MOTIVO_REQUERIDO })
  @IsString({ message: ERROR_MESSAGES.MOTIVO_REQUERIDO })
  motivoCambio: string;
}
