import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GRAVEDADES_FALTA, GravedadFalta, TIPOS_INCIDENCIA, TipoIncidencia } from "../constants";

export class CrearIncidenciaDto {
  @ApiProperty({
    description: "ID de la matrícula vigente del estudiante",
    example: "a0000000-0000-0000-0000-000000000001",
  })
  @IsUUID("4")
  @IsNotEmpty()
  matriculaId!: string;

  @ApiProperty({
    description: "Fecha en que ocurrió la incidencia (formato YYYY-MM-DD)",
    example: "2026-05-15",
  })
  @IsDateString()
  @IsNotEmpty()
  fecha!: string;

  @ApiProperty({
    description: "Tipo de incidencia: 'merito' o 'falta'",
    enum: TIPOS_INCIDENCIA,
    example: "falta",
  })
  @IsIn(TIPOS_INCIDENCIA)
  @IsNotEmpty()
  tipo!: TipoIncidencia;

  @ApiProperty({
    description: "Categoría de la conducta (ej. Uniforme, Puntualidad, Respeto)",
    example: "Uniforme",
  })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  categoria!: string;

  @ApiPropertyOptional({
    description: "Gravedad (obligatoria si tipo='falta', prohibida si tipo='merito')",
    enum: GRAVEDADES_FALTA,
    example: "leve",
  })
  @IsOptional()
  @IsIn(GRAVEDADES_FALTA)
  gravedad?: GravedadFalta;

  @ApiProperty({
    description: "Descripción detallada de la incidencia",
    example: "El estudiante asistió sin la casaca del uniforme institucional.",
  })
  @IsString()
  @MaxLength(1000)
  @IsNotEmpty()
  descripcion!: string;

  @ApiPropertyOptional({
    description: "Lugar donde ocurrió la incidencia",
    example: "Patio principal",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lugar?: string;

  @ApiPropertyOptional({
    description: "Medidas pedagógicas o formativas adoptadas",
    example: "Conversación reflexiva y registro en cuaderno de control.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medidasTomadas?: string;
}
