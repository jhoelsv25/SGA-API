import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BloqueHorarioResponseDto {
  @ApiProperty({
    description: "UUID único del bloque de horario",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id!: string;

  @ApiProperty({
    description: "UUID de la sección a la que pertenece el horario",
    example: "sec-5a",
  })
  seccionId!: string;

  @ApiPropertyOptional({
    description: "UUID del curso asignado en la sección (null para receso)",
    example: "cs-mat-5a",
    nullable: true,
  })
  cursoSeccionId?: string | null;

  @ApiPropertyOptional({
    description: "Nombre del curso dictado (null para receso)",
    example: "Matemática",
    nullable: true,
  })
  cursoNombre?: string | null;

  @ApiPropertyOptional({
    description: "Color hexadecimal asociado al curso",
    example: "#2563EB",
    nullable: true,
  })
  colorHex?: string | null;

  @ApiPropertyOptional({
    description: "Nombre completo del docente asignado al curso",
    example: "Luis Quispe Mamani",
    nullable: true,
  })
  docenteNombre?: string | null;

  @ApiProperty({
    description: "Día escolar de la semana (1 = Lunes, ..., 5 = Viernes)",
    example: 1,
  })
  diaSemana!: number;

  @ApiProperty({
    description: "Hora de inicio del bloque en formato HH:mm",
    example: "07:45",
  })
  horaInicio!: string;

  @ApiProperty({
    description: "Hora de fin del bloque en formato HH:mm",
    example: "08:30",
  })
  horaFin!: string;

  @ApiProperty({
    description: "Tipo de bloque ('clase' o 'receso')",
    enum: ["clase", "receso"],
    example: "clase",
  })
  tipoBloque!: "clase" | "receso";

  @ApiPropertyOptional({
    description: "Aula o ambiente donde se dicta la clase",
    example: "Pab. B – 201",
    nullable: true,
  })
  aula?: string | null;
}
