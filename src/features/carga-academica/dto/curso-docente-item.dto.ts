import { ApiProperty } from "@nestjs/swagger";

export class CursoDocenteItemDto {
  @ApiProperty({ description: "UUID del registro de curso_seccion", example: "cs-mat-5a" })
  cursoSeccionId!: string;

  @ApiProperty({ description: "Nombre del curso", example: "Matemática" })
  cursoNombre!: string;

  @ApiProperty({ description: "UUID de la sección", example: "sec-5a" })
  seccionId!: string;

  @ApiProperty({ description: "Número del grado escolar (1 a 5)", example: 5 })
  gradoNumero!: number;

  @ApiProperty({ description: "Nombre o letra de la sección", example: "A" })
  seccionNombre!: string;

  @ApiProperty({ description: "Horas pedagógicas semanales del plan de estudios", example: 6 })
  horas!: number;
}
