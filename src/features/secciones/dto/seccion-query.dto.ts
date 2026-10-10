import { ApiPropertyOptional } from "@nestjs/swagger";
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
}
