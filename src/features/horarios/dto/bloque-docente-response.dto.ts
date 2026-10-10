import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BloqueDocenteResponseDto {
  @ApiProperty({
    description: "UUID único del bloque de horario",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id!: string;

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

  @ApiPropertyOptional({
    description: "Nombre del curso dictado (null para receso)",
    example: "Matemática",
    nullable: true,
  })
  cursoNombre?: string | null;

  @ApiPropertyOptional({
    description: "Color hexadecimal asociado al curso (null para receso)",
    example: "#2563EB",
    nullable: true,
  })
  colorHex?: string | null;

  @ApiProperty({
    description: "Nombre de la sección escolar",
    example: "A",
  })
  seccionNombre!: string;

  @ApiProperty({
    description: "Número del grado escolar",
    example: 5,
  })
  gradoNumero!: number;

  @ApiPropertyOptional({
    description: "Aula o ambiente donde se dicta la clase",
    example: "Pab. B – 201",
    nullable: true,
  })
  aula?: string | null;
}
