import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { MENSAJES_MARCACION } from "../../marcaciones/constants";
import { MENSAJES_SESION } from "../constants";

export class CredencialesKioskoDto {
  @ApiProperty({ description: "Código del carné (QR) o DNI", example: "CR-70123456" })
  @IsString({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @IsNotEmpty({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @MaxLength(50, { message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  codigo!: string;

  @ApiProperty({ description: "PIN de 4 dígitos", example: "1234" })
  @IsString({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @Matches(/^\d{4}$/, { message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  pin!: string;
}

export class FirmarIngresoDto extends CredencialesKioskoDto {
  @ApiProperty({ description: "Tema de la sesión", example: "Ecuaciones cuadráticas" })
  @IsString({ message: MENSAJES_SESION.FALTA_TEMA })
  @MaxLength(500)
  tema!: string;
}
