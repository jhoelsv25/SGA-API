import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";
import { MENSAJES_BIOMETRICO } from "../constants";

export class LatidoDto {
  @ApiProperty({ description: "Indica si el reloj respondió a la app en la última lectura" })
  @IsBoolean()
  relojResponde!: boolean;

  @ApiPropertyOptional({
    description: "Hora actual del reloj (hora de Lima, sin zona), si respondió",
    example: "2026-11-03 07:35:12",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/, {
    message: MENSAJES_BIOMETRICO.FECHA_HORA_INVALIDA,
  })
  horaReloj?: string;
}

export class LatidoResponseDto {
  @ApiProperty({ description: "Hora actual del servidor (Lima)" }) horaServidor!: string;
  @ApiProperty({ description: "Diferencia en minutos con la hora del reloj" })
  desfaseMinutos!: number;
  @ApiProperty({ description: "La app debe poner el reloj en la hora del servidor" })
  ponerEnHora!: boolean;
}
