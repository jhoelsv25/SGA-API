import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AreaCurricular } from "../constants/areas-curriculares.constant";

export class CursoResponseDto {
  @ApiProperty({
    description: "ID único del curso",
    example: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  })
  id: string;

  @ApiProperty({ description: "Código único de la asignatura", example: "MAT" })
  codigo: string;

  @ApiProperty({ description: "Nombre de la asignatura", example: "Matemática" })
  nombre: string;

  @ApiProperty({ description: "Área curricular", example: "matematica" })
  areaCurricular: AreaCurricular;

  @ApiProperty({ description: "Nombre legible del área curricular", example: "Matemática" })
  areaCurricularNombre: string;

  @ApiPropertyOptional({ description: "Descripción o sumilla del curso" })
  descripcion: string | null;

  @ApiPropertyOptional({ description: "Color hexadecimal identificador", example: "#2563EB" })
  colorHex: string | null;

  @ApiProperty({
    description: "Indica si el curso se encuentra activo en el catálogo",
    example: true,
  })
  activo: boolean;

  @ApiPropertyOptional({ description: "Fecha de baja o eliminación lógica" })
  eliminadoEn: string | null;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn: string;

  @ApiProperty({ description: "Fecha de última actualización" })
  actualizadoEn: string;
}
