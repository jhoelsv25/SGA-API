import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RegistrarDescargoDto {
  @ApiProperty({
    description: "Texto del descargo presentado por el docente",
    example: "Estaba en dirección recogiendo material didáctico",
    maxLength: 1000,
  })
  @IsNotEmpty({ message: "El texto del descargo es obligatorio." })
  @IsString()
  @MaxLength(1000)
  descargo!: string;
}
