import { ApiProperty } from "@nestjs/swagger";
import { BloqueHorarioResponseDto } from "./bloque-horario-response.dto";
import { ResumenHorasCursoDto } from "./resumen-horas-curso.dto";

export class ListarPorSeccionResponseDto {
  @ApiProperty({
    description: "Lista de todos los bloques que componen el horario semanal de la sección",
    type: [BloqueHorarioResponseDto],
  })
  bloques!: BloqueHorarioResponseDto[];

  @ApiProperty({
    description: "Comparativa de horas asignadas vs plan de estudios para cada curso",
    type: [ResumenHorasCursoDto],
  })
  resumenHoras!: ResumenHorasCursoDto[];

  @ApiProperty({
    description: "Advertencias de inconsistencia horaria frente al plan de estudios",
    type: [String],
    example: ["Matemática tiene 5 horas en el horario y 6 en el plan de estudios."],
  })
  advertencias!: string[];
}
