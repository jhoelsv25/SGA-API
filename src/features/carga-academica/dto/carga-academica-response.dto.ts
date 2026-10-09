import { ApiProperty } from "@nestjs/swagger";
import { CargaAcademicaItemDto } from "./carga-academica-item.dto";
import { CursoDocenteItemDto } from "./curso-docente-item.dto";

export class CargaDocenteResumenDto {
  @ApiProperty({
    description: "Horas pedagógicas asignadas al docente en el año escolar",
    example: 24,
  })
  horasAsignadas!: number;

  @ApiProperty({
    description: "Jornada laboral del docente en horas pedagógicas semanales",
    example: 30,
  })
  jornadaHoras!: number;

  @ApiProperty({
    description: "Indica si las horas asignadas superan la jornada laboral del docente",
    example: false,
  })
  excede!: boolean;
}

export class AsignarDocenteResultadoDto {
  @ApiProperty({
    description: "Item de carga académica del curso_seccion actualizado",
    type: CargaAcademicaItemDto,
  })
  item!: CargaAcademicaItemDto;

  @ApiProperty({
    description: "Resumen de la carga horaria del docente",
    type: CargaDocenteResumenDto,
  })
  cargaDocente!: CargaDocenteResumenDto;
}

export class CargaSeccionResponseDto {
  @ApiProperty({
    description: "UUID de la sección consultada",
    example: "sec-5a",
  })
  seccionId!: string;

  @ApiProperty({
    description: "Lista de cursos de la sección con sus docentes y horas",
    type: [CargaAcademicaItemDto],
  })
  items!: CargaAcademicaItemDto[];
}

export class CargaDocenteDetalleDto {
  @ApiProperty({
    description: "UUID del docente consultado",
    example: "doc-quispe",
  })
  docenteId!: string;

  @ApiProperty({
    description: "Jornada laboral del docente en horas pedagógicas semanales",
    example: 30,
  })
  jornadaHoras!: number;

  @ApiProperty({
    description: "Total de horas pedagógicas asignadas en el año lectivo",
    example: 6,
  })
  horasAsignadas!: number;

  @ApiProperty({
    description: "Indica si las horas asignadas superan la jornada laboral",
    example: false,
  })
  excede!: boolean;

  @ApiProperty({
    description: "Lista de cursos y secciones asignados al docente en el año",
    type: [CursoDocenteItemDto],
  })
  cursos!: CursoDocenteItemDto[];
}
