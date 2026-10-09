import { ApiProperty } from "@nestjs/swagger";
import { BloqueHorarioResponseDto } from "./bloque-horario-response.dto";

export class HorarioEstudianteResponseDto {
  @ApiProperty({
    description: "UUID de la sección escolar asignada al estudiante",
    example: "sec-5a",
  })
  seccionId!: string;

  @ApiProperty({
    description: "Lista de bloques del horario semanal de la sección escolar",
    type: [BloqueHorarioResponseDto],
  })
  bloques!: BloqueHorarioResponseDto[];
}
