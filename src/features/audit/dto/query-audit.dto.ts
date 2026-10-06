import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const AUDIT_ACTIONS = [
  "crear",
  "actualizar",
  "eliminar",
  "iniciar_sesion",
  "cerrar_sesion",
] as const;

export type AuditActionType = (typeof AUDIT_ACTIONS)[number];

export class QueryAuditDto {
  @ApiPropertyOptional({
    description: "Fecha inicial de consulta (YYYY-MM-DD o ISO). Por defecto: 7 días atrás.",
    example: "2026-10-01",
  })
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @ApiPropertyOptional({
    description: "Fecha final de consulta (YYYY-MM-DD o ISO). Por defecto: hoy.",
    example: "2026-10-07",
  })
  @IsOptional()
  @IsString()
  fechaFin?: string;

  @ApiPropertyOptional({
    description: "Filtro por usuario (UUID, nombre de usuario o 'Sistema')",
    example: "admin",
  })
  @IsOptional()
  @IsString()
  usuario?: string;

  @ApiPropertyOptional({
    description: "Filtro por acción realizada",
    enum: AUDIT_ACTIONS,
    example: "actualizar",
  })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS, {
    message: "La acción debe ser: crear, actualizar, eliminar, iniciar_sesion o cerrar_sesion",
  })
  accion?: AuditActionType;

  @ApiPropertyOptional({
    description: "Filtro por entidad/tabla afectada (ej: usuarios, roles, menus)",
    example: "usuarios",
  })
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiPropertyOptional({
    description: "Página a consultar (1-indexed)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Elementos por página (por defecto 50)",
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
