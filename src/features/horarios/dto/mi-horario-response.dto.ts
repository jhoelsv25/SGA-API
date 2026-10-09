import { ApiProperty } from "@nestjs/swagger";
import { BloqueDocenteResponseDto } from "./bloque-docente-response.dto";

export class MiHorarioResponseDto {
  @ApiProperty({
    description: "UUID del docente titular del horario",
    example: "doc-quispe",
  })
  docenteId!: string;

  @ApiProperty({
    description: "Lista de bloques de horario asignados al docente durante la semana",
    type: [BloqueDocenteResponseDto],
  })
  bloques!: BloqueDocenteResponseDto[];
}
