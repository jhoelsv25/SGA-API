import { ApiProperty } from "@nestjs/swagger";

export class ConflictoHorarioCopiaDto {
  @ApiProperty({ description: "Día escolar del conflicto detectado (1 a 5)", example: 1 })
  diaSemana!: number;

  @ApiProperty({ description: "Hora de inicio del bloque en formato HH:mm", example: "08:00" })
  horaInicio!: string;

  @ApiProperty({ description: "Hora de fin del bloque en formato HH:mm", example: "08:40" })
  horaFin!: string;

  @ApiProperty({ description: "Nombre del curso asignado al bloque", example: "Comunicación" })
  cursoNombre!: string;

  @ApiProperty({
    description: "Detalle descriptivo del cruce del docente",
    example: "El docente Docente B ya dicta en 5.° C el lunes de 08:00 a 08:40.",
  })
  mensaje!: string;
}

export class CopiarHorarioResponseDto {
  @ApiProperty({
    description: "Cantidad total de bloques creados en la sección de destino",
    example: 35,
  })
  bloquesCreados!: number;

  @ApiProperty({
    description: "Listado de conflictos por cruce detectados al replicar el horario",
    type: [ConflictoHorarioCopiaDto],
  })
  conflictos!: ConflictoHorarioCopiaDto[];
}
