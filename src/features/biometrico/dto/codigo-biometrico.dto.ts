import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";
import { MENSAJES_BIOMETRICO } from "../constants";

export class AsignarCodigoBiometricoDto {
  @ApiProperty({ description: "ID de la persona en el reloj", example: "152" })
  @IsString({ message: MENSAJES_BIOMETRICO.CODIGO_INVALIDO })
  @Matches(/^[A-Za-z0-9]{1,20}$/, { message: MENSAJES_BIOMETRICO.CODIGO_INVALIDO })
  codigo!: string;
}

export class CodigoBiometricoResponseDto {
  @ApiProperty() personaId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiProperty({ nullable: true, type: String }) codigoBiometrico!: string | null;
  @ApiProperty() mensaje!: string;
}
