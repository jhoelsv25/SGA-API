import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AnularIncidenciaDto {
  @ApiProperty({
    description: "Motivo obligatorio de la anulación de la incidencia o registro",
    example: "Registro duplicado por error de digitación.",
  })
  @IsString()
  @IsNotEmpty({ message: "Indique el motivo de la anulación." })
  @MaxLength(500)
  motivo!: string;
}
