import { ApiProperty } from "@nestjs/swagger";

export class DocenteCargaItemDto {
  @ApiProperty({ description: "UUID del docente", example: "doc-quispe" })
  id!: string;

  @ApiProperty({ description: "Código institucional del docente", example: "DOC010" })
  codigo!: string;

  @ApiProperty({ description: "Nombre completo del docente", example: "Luis Quispe Mamani" })
  nombreCompleto!: string;
}

export class CargaAcademicaItemDto {
  @ApiProperty({ description: "UUID del registro de curso_seccion", example: "cs-mat-5a" })
  id!: string;

  @ApiProperty({ description: "UUID del curso", example: "curso-mat" })
  cursoId!: string;

  @ApiProperty({ description: "Nombre del curso", example: "Matemática" })
  cursoNombre!: string;

  @ApiProperty({
    description: "Color hexadecimal asignado al curso para horarios",
    example: "#2563EB",
    nullable: true,
  })
  colorHex!: string | null;

  @ApiProperty({ description: "Horas pedagógicas semanales del plan de estudios", example: 6 })
  horasPlan!: number;

  @ApiProperty({ description: "Horas pedagógicas semanales programadas en el horario", example: 6 })
  horasHorario!: number;

  @ApiProperty({
    description: "Docente asignado al curso de la sección, o null si está pendiente",
    nullable: true,
    type: DocenteCargaItemDto,
  })
  docente!: DocenteCargaItemDto | null;
}
