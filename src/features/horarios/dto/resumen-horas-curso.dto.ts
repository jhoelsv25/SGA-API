import { ApiProperty } from "@nestjs/swagger";

export class ResumenHorasCursoDto {
  @ApiProperty({
    description: "UUID del curso",
    example: "curso-mat",
  })
  cursoId!: string;

  @ApiProperty({
    description: "Nombre del curso",
    example: "Matemática",
  })
  cursoNombre!: string;

  @ApiProperty({
    description: "Total de horas pedagógicas asignadas en el horario semanal",
    example: 6,
  })
  horasHorario!: number;

  @ApiProperty({
    description: "Total de horas pedagógicas requeridas según el plan de estudios",
    example: 6,
  })
  horasPlan!: number;
}
