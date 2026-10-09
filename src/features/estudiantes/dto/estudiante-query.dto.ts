import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ESTADOS_ESTUDIANTE, type EstadoEstudiante } from "../constants";

export class EstudianteQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de estudiantes",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Cantidad de elementos por página (1-100)",
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Buscar por código SIAGIE, documento de identidad o nombres y apellidos",
    example: "Ramos",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filtrar por estado del estudiante",
    enum: ESTADOS_ESTUDIANTE,
  })
  @IsOptional()
  @IsIn(ESTADOS_ESTUDIANTE)
  estado?: EstadoEstudiante;
}
