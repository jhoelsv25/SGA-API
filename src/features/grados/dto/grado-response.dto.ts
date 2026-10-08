import { ApiProperty } from "@nestjs/swagger";

export class GradoResponseDto {
  @ApiProperty({
    description: "ID único del grado",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  id: string;

  @ApiProperty({ description: "Número de grado (1 a 5)", example: 1 })
  numero: number;

  @ApiProperty({ description: "Nombre visible del grado", example: "1.° de secundaria" })
  nombre: string;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn: string;

  @ApiProperty({ description: "Fecha de última actualización" })
  actualizadoEn: string;
}
