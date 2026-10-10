import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { GRAVEDADES_FALTA, GravedadFalta } from "../constants";

export class ActualizarIncidenciaDto {
  @ApiPropertyOptional({
    description: "Categoría de la conducta",
    example: "Uniforme",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  @ApiPropertyOptional({
    description: "Gravedad de la falta",
    enum: GRAVEDADES_FALTA,
    example: "leve",
  })
  @IsOptional()
  @IsIn(GRAVEDADES_FALTA)
  gravedad?: GravedadFalta;

  @ApiPropertyOptional({
    description: "Descripción actualizada",
    example: "El estudiante asistió sin la casaca del uniforme institucional.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @ApiPropertyOptional({
    description: "Lugar de la incidencia",
    example: "Aula de 5.° A",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lugar?: string;

  @ApiPropertyOptional({
    description: "Medidas adoptadas",
    example: "Diálogo formativo con el estudiante.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medidasTomadas?: string;
}
