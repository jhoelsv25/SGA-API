import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ComunicadoQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de resultados",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Filtrar únicamente los comunicados redactados por el usuario autenticado",
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  soloMios?: boolean = false;

  @ApiPropertyOptional({
    description: "Estado del comunicado: borrador | publicado | archivado | all",
    example: "publicado",
  })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({
    description: "Público objetivo: todos | docentes | estudiantes | apoderados | all",
  })
  @IsOptional()
  @IsString()
  dirigidoA?: string;

  @ApiPropertyOptional({
    description: "Prioridad: normal | importante | urgente | all",
  })
  @IsOptional()
  @IsString()
  prioridad?: string;

  @ApiPropertyOptional({ description: "Filtrar por grado escolar" })
  @IsOptional()
  @IsString()
  gradoId?: string;

  @ApiPropertyOptional({ description: "Filtrar por sección escolar" })
  @IsOptional()
  @IsString()
  seccionId?: string;

  @ApiPropertyOptional({ description: "Búsqueda por texto en título o contenido" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Cantidad de elementos por página (máx. 50)",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
