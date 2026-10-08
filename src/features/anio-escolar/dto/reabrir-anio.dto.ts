import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { MENSAJES } from "../constants";

export class ReabrirAnioDto {
  @ApiProperty({ example: "Corrección de libretas", maxLength: 500 })
  @IsString()
  @IsNotEmpty({ message: MENSAJES.reaperturaIncompleta })
  @MaxLength(500, { message: MENSAJES.reaperturaIncompleta })
  motivo!: string;

  @ApiProperty({
    example: "2027-01-15",
    description: "Último día en que el año permanece reabierto",
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: MENSAJES.reaperturaIncompleta })
  fechaLimite!: string;
}
