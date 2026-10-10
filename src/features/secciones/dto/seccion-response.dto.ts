import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SeccionTutorDto {
  @ApiProperty({
    example: "doc-perez",
    description: "UUID del docente tutor",
  })
  id!: string;

  @ApiProperty({
    example: "DOC001",
    description: "Código del docente",
  })
  codigo!: string;

  @ApiProperty({
    example: "Juan Pérez Gómez",
    description: "Nombres y apellidos completos del docente",
  })
  nombreCompleto!: string;
}

export class SeccionResponseDto {
  @ApiProperty({
    example: "sec-5a",
    description: "UUID de la sección",
  })
  id!: string;

  @ApiProperty({
    example: "anio-2027",
    description: "UUID del año académico",
  })
  anioAcademicoId!: string;

  @ApiProperty({
    example: "grado-5",
    description: "UUID del grado",
  })
  gradoId!: string;

  @ApiProperty({
    example: 5,
    description: "Número del grado escolar",
  })
  gradoNumero!: number;

  @ApiProperty({
    example: "5.° de secundaria",
    description: "Nombre del grado escolar",
  })
  gradoNombre!: string;

  @ApiProperty({
    example: "A",
    description: "Nombre o letra de la sección",
  })
  nombre!: string;

  @ApiPropertyOptional({
    example: "Pab. B – 201",
    description: "Aula asignada a la sección",
    nullable: true,
  })
  aula!: string | null;

  @ApiProperty({
    example: 35,
    description: "Capacidad de vacantes",
  })
  vacantes!: number;

  @ApiProperty({
    example: "activa",
    description: "Estado de la sección (activa o cerrada)",
  })
  estado!: string;

  @ApiPropertyOptional({
    type: () => SeccionTutorDto,
    description: "Docente tutor asignado",
    nullable: true,
  })
  tutor!: SeccionTutorDto | null;

  @ApiProperty({
    example: 0,
    description: "Cantidad de estudiantes matriculados vigentes",
  })
  matriculados!: number;

  @ApiProperty({
    example: 12,
    description: "Total de cursos en la carga académica de la sección",
  })
  totalCursos!: number;

  @ApiProperty({
    example: 12,
    description: "Cantidad de cursos de la sección sin docente asignado",
  })
  cursosSinDocente!: number;
}
