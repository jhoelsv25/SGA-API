import { ApiProperty } from "@nestjs/swagger";

export class GradoResponseDto {
  @ApiProperty({
    description: "Identificador único del grado",
    example: "84541be5-b6b4-42ca-8480-080c08fb40c9",
  })
  id!: string;

  @ApiProperty({ description: "Número del grado en secundaria (1 al 5)", example: 1 })
  numero!: number;

  @ApiProperty({ description: "Nombre visible del grado", example: "1.° de secundaria" })
  nombre!: string;

  @ApiProperty({ description: "Fecha de creación del registro" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización" })
  actualizadoEn!: string;
}
