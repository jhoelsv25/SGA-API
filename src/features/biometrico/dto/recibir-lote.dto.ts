import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { LIMITE_LOTE_BIOMETRICO, MENSAJES_BIOMETRICO } from "../constants";

export class MarcacionRelojDto {
  @ApiProperty({ description: "ID del usuario en el reloj (código biométrico)", example: "152" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo!: string;

  @ApiProperty({
    description: "Fecha y hora de la marcación según el reloj (hora de Lima, sin zona)",
    example: "2026-11-03 07:35:12",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/, {
    message: MENSAJES_BIOMETRICO.FECHA_HORA_INVALIDA,
  })
  fechaHora!: string;
}

export class RecibirLoteDto {
  @ApiProperty({ type: [MarcacionRelojDto], description: "Marcaciones leídas del reloj" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LIMITE_LOTE_BIOMETRICO)
  @ValidateNested({ each: true })
  @Type(() => MarcacionRelojDto)
  marcaciones!: MarcacionRelojDto[];
}

export class LoteResponseDto {
  @ApiProperty() recibidas!: number;
  @ApiProperty({ description: "Marcaciones guardadas como asistencia" }) registradas!: number;
  @ApiProperty({ description: "Marcaciones que ya existían (reenvíos)" }) duplicadas!: number;
  @ApiProperty({ description: "Rebotes o jornada ya completa: no se guardan" }) ignoradas!: number;
  @ApiProperty({ description: "Enviadas a la bandeja de pendientes" }) pendientes!: number;
  @ApiProperty({ description: "Con fecha y hora inválida" }) rechazadas!: number;
  @ApiProperty({ description: "Hora actual del servidor (Lima)" }) horaServidor!: string;
}
