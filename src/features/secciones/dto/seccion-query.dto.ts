import { ApiPropertyOptional } from "@nestjs/swagger";
<<<<<<< HEAD
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { ESTADOS_SECCION, type EstadoSeccion } from "../constants";

export class SeccionQueryDto {
  @ApiPropertyOptional({
    description: "UUID del grado para filtrar secciones",
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  })
  @IsOptional()
  @IsUUID("4", { message: "El id del grado debe ser un UUID válido." })
  gradoId?: string;

  @ApiPropertyOptional({
    enum: ESTADOS_SECCION,
    description: "Estado de la sección (activa o cerrada)",
    example: "activa",
  })
  @IsOptional()
  @IsIn(ESTADOS_SECCION, { message: "El estado debe ser 'activa' o 'cerrada'." })
  estado?: EstadoSeccion;
=======
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class SeccionQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por año académico" })
  @IsOptional()
  @IsUUID("all", { message: "ID de año académico inválido" })
  anioAcademicoId?: string;

  @ApiPropertyOptional({ description: "Filtrar por grado" })
  @IsOptional()
  @IsUUID("all", { message: "ID de grado inválido" })
  gradoId?: string;

  @ApiPropertyOptional({ description: "Solo secciones en estado activa" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  soloActivas?: boolean;
>>>>>>> ab15606 (feat(api): implementar RF-009 matriculas, retiro, traslado y base de secciones)
}
