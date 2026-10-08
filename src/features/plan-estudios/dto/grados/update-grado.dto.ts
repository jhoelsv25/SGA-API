import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateGradoDto {
  @ApiProperty({
    description: "Nombre visible del grado de secundaria",
    example: "5.° de secundaria",
    maxLength: 50,
  })
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  @IsNotEmpty({ message: "El nombre del grado es obligatorio." })
  @MaxLength(50, { message: "El nombre del grado no puede exceder 50 caracteres." })
  nombre!: string;
}
