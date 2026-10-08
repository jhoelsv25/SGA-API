import { ApiProperty } from "@nestjs/swagger";
import { CursoResponseDto } from "../cursos/curso-response.dto";
import { GradoResponseDto } from "../grados/grado-response.dto";

export class PlanEstudioItemDto {
  @ApiProperty({ description: "ID de la asignación en el plan de estudios" })
  id!: string;

  @ApiProperty({ description: "ID del grado asociado" })
  gradoId!: string;

  @ApiProperty({ description: "ID del curso asignado" })
  cursoId!: string;

  @ApiProperty({ description: "Horas pedagógicas semanales", example: 6 })
  horasSemanales!: number;

  @ApiProperty({ description: "Estado activo de la asignación", example: true })
  activo!: boolean;

  @ApiProperty({ description: "Detalle completo del curso", type: CursoResponseDto })
  curso!: CursoResponseDto;
}

export class PlanEstudioResponseDto {
  @ApiProperty({ description: "ID del grado", example: "84541be5-b6b4-42ca-8480-080c08fb40c9" })
  gradoId!: string;

  @ApiProperty({ description: "Información del grado", type: GradoResponseDto })
  grado!: GradoResponseDto;

  @ApiProperty({ description: "Total acumulado de horas semanales del grado", example: 35 })
  totalHoras!: number;

  @ApiProperty({
    description: "Listado de cursos asignados al plan de estudios",
    type: [PlanEstudioItemDto],
  })
  cursos!: PlanEstudioItemDto[];
}
