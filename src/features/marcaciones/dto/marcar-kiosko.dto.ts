import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { MENSAJES_MARCACION } from "../constants";

export class MarcarKioskoDto {
  @ApiProperty({ description: "Código de la credencial (QR o escrito)", example: "CR-70123456" })
  @IsString({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @IsNotEmpty({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @MaxLength(50, { message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  codigo!: string;

  @ApiProperty({ description: "PIN de 4 dígitos", example: "1234" })
  @IsString({ message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  @Matches(/^\d{4}$/, { message: MENSAJES_MARCACION.CODIGO_O_PIN_INCORRECTO })
  pin!: string;
}
