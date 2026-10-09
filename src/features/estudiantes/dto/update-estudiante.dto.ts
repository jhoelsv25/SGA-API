import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { ESTADOS_ESTUDIANTE, type EstadoEstudiante } from "../constants";

export class UpdateEstudianteDto {
  @ApiPropertyOptional({
    description: "Fecha de ingreso (YYYY-MM-DD)",
    example: "2026-03-01",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de ingreso debe tener formato YYYY-MM-DD.",
  })
  fechaIngreso?: string;

  @ApiPropertyOptional({ example: "Castellano" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lenguaMaterna?: string;

  @ApiPropertyOptional({ example: "Católica" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  tieneDiscapacidad?: boolean;

  @ApiPropertyOptional({ example: "Discapacidad auditiva moderada" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  detalleDiscapacidad?: string;

  @ApiPropertyOptional({ example: "O+" })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  grupoSanguineo?: string;

  @ApiPropertyOptional({ example: "Penicilina" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alergias?: string;

  @ApiPropertyOptional({ example: "Asma leve" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condicionesMedicas?: string;

  @ApiPropertyOptional({ example: "SIS" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  seguroSalud?: string;

  @ApiPropertyOptional({
    description: "Estado administrativo escolar del estudiante",
    enum: ESTADOS_ESTUDIANTE,
    example: "activo",
  })
  @IsOptional()
  @IsIn(ESTADOS_ESTUDIANTE, {
    message: "El estado debe ser activo, retirado, trasladado o egresado.",
  })
  estado?: EstadoEstudiante;

  @ApiPropertyOptional({
    description: "Motivo del cambio en la ficha (si aplica)",
    example: "Actualización de seguro médico",
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
