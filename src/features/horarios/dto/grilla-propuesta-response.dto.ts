import { ApiProperty } from "@nestjs/swagger";

export class BloquePropuestaDto {
  @ApiProperty({ description: "Día escolar de la semana (1 = lunes a 5 = viernes)", example: 1 })
  diaSemana!: number;

  @ApiProperty({ description: "Hora de inicio en formato HH:mm", example: "08:00" })
  horaInicio!: string;

  @ApiProperty({ description: "Hora de fin en formato HH:mm", example: "08:40" })
  horaFin!: string;

  @ApiProperty({
    description: "Tipo de bloque propuesto",
    enum: ["clase", "receso"],
    example: "clase",
  })
  tipoBloque!: "clase" | "receso";
}

export class GrillaPropuestaResponseDto {
  @ApiProperty({ description: "Hora de entrada aplicada para la grilla", example: "08:00" })
  horaEntrada!: string;

  @ApiProperty({
    description: "Colección de bloques propuestos de lunes a viernes",
    type: [BloquePropuestaDto],
  })
  bloques!: BloquePropuestaDto[];
}
