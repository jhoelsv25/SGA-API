import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AreaCurricular } from "../../constants";

export class CursoResponseDto {
  @ApiProperty({
    description: "Identificador único del curso",
    example: "b2d2f7a1-5c74-4b52-9b21-4f129a0c7e2b",
  })
  id!: string;

  @ApiProperty({ description: "Código único de la asignatura", example: "MAT" })
  codigo!: string;

  @ApiProperty({ description: "Nombre del curso", example: "Matemática" })
  nombre!: string;

  @ApiProperty({ description: "Código del área curricular", example: "matematica" })
  areaCurricular!: AreaCurricular;

  @ApiProperty({ description: "Nombre visible del área curricular", example: "Matemática" })
  areaCurricularNombre!: string;

  @ApiPropertyOptional({ description: "Descripción del curso", nullable: true })
  descripcion!: string | null;

  @ApiPropertyOptional({
    description: "Color hexadecimal identificador",
    example: "#2563EB",
    nullable: true,
  })
  colorHex!: string | null;

  @ApiProperty({ description: "Indica si el curso está activo (sin soft-delete)", example: true })
  activo!: boolean;

  @ApiPropertyOptional({ description: "Fecha de baja / desactivación", nullable: true })
  eliminadoEn!: string | null;

  @ApiProperty({ description: "Fecha de registro" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última modificación" })
  actualizadoEn!: string;
}
