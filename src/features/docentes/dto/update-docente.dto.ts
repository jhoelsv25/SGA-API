import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import {
  ESTADOS_DOCENTE,
  type EstadoDocente,
  JORNADAS_HORAS,
  type JornadaHoras,
  TIPOS_CONTRATO,
  type TipoContrato,
} from "../constants";

export class UpdateDocenteDto {
  @ApiPropertyOptional({
    description: "Especialidad pedagógica o materia principal",
    example: "Matemáticas y Física",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidad?: string;

  @ApiPropertyOptional({
    description: "Título profesional",
    example: "Licenciado en Educación Secundaria",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tituloProfesional?: string;

  @ApiPropertyOptional({
    description: "Régimen laboral",
    enum: TIPOS_CONTRATO,
    example: "nombrado",
  })
  @IsOptional()
  @IsIn(TIPOS_CONTRATO)
  tipoContrato?: TipoContrato;

  @ApiPropertyOptional({
    description: "Jornada laboral en horas (20, 24, 30 o 40)",
    enum: JORNADAS_HORAS,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(JORNADAS_HORAS)
  jornadaHoras?: JornadaHoras;

  @ApiPropertyOptional({
    description: "Fecha de ingreso institucional (YYYY-MM-DD)",
    example: "2026-03-01",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de ingreso debe tener formato YYYY-MM-DD.",
  })
  fechaIngreso?: string;

  @ApiPropertyOptional({
    description: "Fecha de cese o desvinculación (YYYY-MM-DD)",
    example: "2026-12-31",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de cese debe tener formato YYYY-MM-DD.",
  })
  fechaCese?: string;

  @ApiPropertyOptional({
    description: "Estado administrativo del docente",
    enum: ESTADOS_DOCENTE,
    example: "activo",
  })
  @IsOptional()
  @IsIn(ESTADOS_DOCENTE)
  estado?: EstadoDocente;

  @ApiPropertyOptional({
    description: "URL o ruta de la firma digitalizada",
    example: "https://ejemplo.com/firmas/doc015.png",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firmaUrl?: string;

  @ApiPropertyOptional({
    description: "Motivo justificatorio para auditoría",
    example: "Actualización de especialidad y jornada por reasignación académica",
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
