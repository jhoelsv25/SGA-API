import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator";
import { TIPOS_PERSONA_MARCACION, type TipoPersonaMarcacion } from "../../marcaciones/constants";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "../../personas/constants";
import { TIPOS_REPORTE_COLA, type TipoReporteCola } from "../constants";

export class SolicitarReporteDto {
  @ApiProperty({ enum: TIPOS_REPORTE_COLA, example: "asistencia-seccion" })
  @IsIn(TIPOS_REPORTE_COLA, { message: "Tipo de reporte no soportado." })
  tipo!: TipoReporteCola;

  @ApiPropertyOptional({ description: "UUID del año académico (si se omite usa el del header)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de año académico inválido." })
  anioAcademicoId?: string;

  @ApiPropertyOptional({ description: "UUID del período académico (bimestre)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de período inválido." })
  periodoId?: string;

  @ApiPropertyOptional({ description: "UUID del grado" })
  @IsOptional()
  @IsUUID("all", { message: "ID de grado inválido." })
  gradoId?: string;

  @ApiPropertyOptional({ description: "UUID de la sección" })
  @IsOptional()
  @IsUUID("all", { message: "ID de sección inválido." })
  seccionId?: string;

  @ApiPropertyOptional({ description: "Estado de matrícula o entidad" })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: "Tipo de matrícula (nuevo, continuador, traslado)" })
  @IsOptional()
  @IsString()
  tipoMatricula?: string;

  @ApiPropertyOptional({ enum: TIPOS_PERSONA_MARCACION })
  @IsOptional()
  @IsIn(TIPOS_PERSONA_MARCACION)
  tipoPersona?: TipoPersonaMarcacion;

  @ApiPropertyOptional({ example: "2026-03-01" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha desde inválido (AAAA-MM-DD)." })
  desde?: string;

  @ApiPropertyOptional({ example: "2026-05-15" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha hasta inválido (AAAA-MM-DD)." })
  hasta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TIPOS_DOCUMENTO })
  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO)
  tipoDocumento?: TipoDocumento;
}

export type EstadoTrabajoReporte = "encolado" | "procesando" | "completado" | "fallido";

export class TrabajoReporteResponseDto {
  @ApiProperty({ example: "42" })
  jobId!: string;

  @ApiProperty({ enum: TIPOS_REPORTE_COLA })
  tipo!: TipoReporteCola;

  @ApiProperty({ example: "Asistencia Consolidada por Sección" })
  etiqueta!: string;

  @ApiProperty({ enum: ["encolado", "procesando", "completado", "fallido"] })
  estado!: EstadoTrabajoReporte;

  @ApiProperty({ example: 100 })
  progreso!: number;

  @ApiProperty({ example: "Reporte listo para descargar" })
  mensajeEstado!: string;

  @ApiPropertyOptional({ nullable: true })
  nombreArchivo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  tamanoBytes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  totalFilas?: number | null;

  @ApiProperty()
  disponibleDescarga!: boolean;

  @ApiProperty()
  creadoEn!: string;

  @ApiPropertyOptional({ nullable: true })
  finalizadoEn?: string | null;

  @ApiPropertyOptional({ nullable: true })
  error?: string | null;
}
