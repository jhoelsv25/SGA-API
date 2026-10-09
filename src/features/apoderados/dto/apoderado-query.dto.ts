import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { GRADOS_INSTRUCCION, type GradoInstruccion } from "../constants";

export class ApoderadoQueryDto {
  @ApiPropertyOptional({
    description: "Término de búsqueda (DNI, nombres, apellidos, teléfono u ocupación)",
    example: "Ramos",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filtrar apoderados de un estudiante específico (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID("4")
  estudianteId?: string;

  @ApiPropertyOptional({
    description: "Filtrar por grado de instrucción",
    enum: GRADOS_INSTRUCCION,
    example: "universitaria",
  })
  @IsOptional()
  @IsIn(GRADOS_INSTRUCCION)
  gradoInstruccion?: GradoInstruccion;

  @ApiPropertyOptional({
    description: "Cursor opaco codificado en Base64 para paginación",
    example: "ZXlKMWMyVnlZMnhoY3lJNklqRXlNelEx...",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Cantidad máxima de registros por página",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
