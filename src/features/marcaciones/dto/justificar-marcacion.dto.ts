import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { MENSAJES_MARCACION } from "../constants";

export class JustificarMarcacionDto {
  @ApiProperty({ example: "Cita médica con constancia" })
  @IsString({ message: MENSAJES_MARCACION.MOTIVO_JUSTIFICACION_REQUERIDO })
  @IsNotEmpty({ message: MENSAJES_MARCACION.MOTIVO_JUSTIFICACION_REQUERIDO })
  @MaxLength(500)
  motivo!: string;
}
