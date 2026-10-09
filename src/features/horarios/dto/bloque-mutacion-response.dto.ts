import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BloqueHorarioResponseDto } from "./bloque-horario-response.dto";

export class BloqueMutacionResponseDto {
  @ApiProperty({
    description: "Datos del bloque de horario creado o actualizado",
    type: BloqueHorarioResponseDto,
  })
  bloque!: BloqueHorarioResponseDto;

  @ApiProperty({
    description: "Lista de advertencias si las horas difieren del plan de estudios",
    type: [String],
    example: ["Matemática tiene 5 horas en el horario y 6 en el plan de estudios."],
  })
  advertencias!: string[];

  @ApiPropertyOptional({
    description: "Mensaje informativo sobre la vigencia del horario guardado",
    example: "El horario se guardó. Los cambios rigen desde mañana.",
  })
  mensaje?: string;
}
