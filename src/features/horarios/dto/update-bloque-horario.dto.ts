import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateBloqueHorarioDto } from "./create-bloque-horario.dto";

export class UpdateBloqueHorarioDto extends PartialType(CreateBloqueHorarioDto) {
  @ApiPropertyOptional({
    description: "UUID del curso asignado a la sección",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  override cursoSeccionId?: string | null;

  @ApiPropertyOptional({
    description: "Día de la semana (1 a 5)",
    example: 1,
  })
  override diaSemana?: number;

  @ApiPropertyOptional({
    description: "Hora de inicio en formato HH:mm",
    example: "08:30",
  })
  override horaInicio?: string;

  @ApiPropertyOptional({
    description: "Hora de fin en formato HH:mm",
    example: "09:15",
  })
  override horaFin?: string;

  @ApiPropertyOptional({
    description: "Tipo de bloque",
    enum: ["clase", "receso"],
    example: "clase",
  })
  override tipoBloque?: "clase" | "receso";

  @ApiPropertyOptional({
    description: "Aula o ambiente físico asignado al bloque",
    example: "Pab. B – 201",
    nullable: true,
  })
  override aula?: string | null;
}
