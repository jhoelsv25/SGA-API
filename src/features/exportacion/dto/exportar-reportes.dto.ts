import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsUUID, Matches } from "class-validator";
import { TIPOS_PERSONA_MARCACION } from "../../marcaciones/constants";
import type { TipoPersonaMarcacion } from "../../marcaciones/constants";

export class ExportarMarcacionesQueryDto {
  @ApiPropertyOptional({
    description:
      "ID del período académico (bimestre). Si se indica, usa automáticamente sus fechas de inicio y fin.",
  })
  @IsOptional()
  @IsUUID("all", { message: "ID de período inválido." })
  periodoId?: string;

  @ApiPropertyOptional({
    description: "Fecha de inicio (AAAA-MM-DD). Opcional si se indica periodoId.",
    example: "2026-03-01",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de inicio debe tener formato AAAA-MM-DD." })
  desde?: string;

  @ApiPropertyOptional({
    description: "Fecha de fin (AAAA-MM-DD). Opcional si se indica periodoId.",
    example: "2026-05-15",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de fin debe tener formato AAAA-MM-DD." })
  hasta?: string;

  @ApiPropertyOptional({ description: "Sección (solo estudiantes matriculados en ella)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de sección inválido." })
  seccionId?: string;

  @ApiPropertyOptional({ description: "Filtrar por persona específica" })
  @IsOptional()
  @IsUUID("all", { message: "ID de persona inválido." })
  personaId?: string;

  @ApiPropertyOptional({ enum: TIPOS_PERSONA_MARCACION })
  @IsOptional()
  @IsIn(TIPOS_PERSONA_MARCACION)
  tipoPersona?: TipoPersonaMarcacion;
}

export class ExportarLibretasQueryDto {
  @ApiProperty({ description: "ID del período académico (bimestre)" })
  @IsUUID("all", { message: "ID de período inválido." })
  @IsNotEmpty({ message: "El período (bimestre) es obligatorio." })
  periodoId!: string;

  @ApiPropertyOptional({ description: "Filtrar por grado (todas sus secciones)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de grado inválido." })
  gradoId?: string;

  @ApiPropertyOptional({ description: "Filtrar a una sección específica" })
  @IsOptional()
  @IsUUID("all", { message: "ID de sección inválido." })
  seccionId?: string;
}

export class ExportarAsistenciaSeccionQueryDto {
  @ApiPropertyOptional({ description: "Filtrar a una sección específica" })
  @IsOptional()
  @IsUUID("all", { message: "ID de sección inválido." })
  seccionId?: string;

  @ApiPropertyOptional({ description: "Filtrar por grado (todas las secciones del grado)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de grado inválido." })
  gradoId?: string;

  @ApiPropertyOptional({
    description: "ID del período (bimestre). Si se envía, resuelve desde y hasta automáticamente.",
  })
  @IsOptional()
  @IsUUID("all", { message: "ID de período inválido." })
  periodoId?: string;

  @ApiPropertyOptional({ example: "2026-03-01" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de inicio debe tener formato AAAA-MM-DD." })
  desde?: string;

  @ApiPropertyOptional({ example: "2026-05-15" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de fin debe tener formato AAAA-MM-DD." })
  hasta?: string;
}

export const TIPOS_PERSONAL_ASISTENCIA = ["docentes", "administrativos"] as const;
export type TipoPersonalAsistencia = (typeof TIPOS_PERSONAL_ASISTENCIA)[number];

export class ExportarAsistenciaPersonalQueryDto {
  @ApiPropertyOptional({
    description:
      "ID del período (bimestre). Si se envía, resuelve las fechas desde/hasta automáticamente.",
  })
  @IsOptional()
  @IsUUID("all", { message: "ID de período inválido." })
  periodoId?: string;

  @ApiPropertyOptional({ example: "2026-03-01" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de inicio debe tener formato AAAA-MM-DD." })
  desde?: string;

  @ApiPropertyOptional({ example: "2026-05-15" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de fin debe tener formato AAAA-MM-DD." })
  hasta?: string;

  @ApiPropertyOptional({
    enum: TIPOS_PERSONAL_ASISTENCIA,
    description: "Filtrar a solo docentes o solo administrativos. Si se omite incluye ambos.",
  })
  @IsOptional()
  @IsIn(TIPOS_PERSONAL_ASISTENCIA, {
    message: "Tipo de personal inválido (use docentes o administrativos).",
  })
  tipoPersona?: TipoPersonalAsistencia;
}

export class ExportarHorariosQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por grado (todas sus secciones)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de grado inválido." })
  gradoId?: string;

  @ApiPropertyOptional({ description: "Filtrar a una sección específica" })
  @IsOptional()
  @IsUUID("all", { message: "ID de sección inválido." })
  seccionId?: string;
}
