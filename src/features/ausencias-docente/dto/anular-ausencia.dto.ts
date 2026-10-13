import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AnularAusenciaDto {
  @ApiProperty({
    description: "Motivo obligatorio de la anulación",
    example: "Se confirmó que estaba en reunión con un apoderado",
    maxLength: 500,
  })
  @IsNotEmpty({ message: "Indique el motivo de la anulación." })
  @IsString()
  @MaxLength(500)
  motivoAnulacion!: string;
}
