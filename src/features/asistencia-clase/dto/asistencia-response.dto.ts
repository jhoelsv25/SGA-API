import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ResultadoMarcacion } from "../../marcaciones/constants";
import type { EstadoAsistencia } from "../constants";

export class EstudianteListaAsistenciaDto {
  @ApiProperty() matriculaId!: string;
  @ApiProperty() estudianteId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiPropertyOptional({ nullable: true }) fotoUrl!: string | null;
  @ApiProperty({ enum: ["presente", "tardanza", "falta", "falta_justificada"] })
  estado!: EstadoAsistencia;
  @ApiPropertyOptional({ nullable: true }) asistenciaId!: string | null;
  @ApiProperty({ description: "true si no marcó entrada en la puerta ese día" })
  noMarcoIngreso!: boolean;
  @ApiPropertyOptional({ nullable: true }) justificacion!: string | null;
}

export class ListaAsistenciaSesionResponseDto {
  @ApiProperty() sesionId!: string;
  @ApiProperty() fecha!: string;
  @ApiProperty() cursoSeccionId!: string;
  @ApiProperty() cursoNombre!: string;
  @ApiProperty() seccionNombre!: string;
  @ApiProperty({ description: "true si la fecha y el bimestre aún permiten modificar" })
  editable!: boolean;
  @ApiProperty({ type: [EstudianteListaAsistenciaDto] })
  estudiantes!: EstudianteListaAsistenciaDto[];
}

export class ResumenAsistenciaDto {
  @ApiProperty() presentes!: number;
  @ApiProperty() tardanzas!: number;
  @ApiProperty() faltas!: number;
  @ApiProperty() faltasJustificadas!: number;
}

export class GuardarAsistenciaResponseDto {
  @ApiProperty() mensaje!: string;
  @ApiProperty({ type: ResumenAsistenciaDto }) resumen!: ResumenAsistenciaDto;
}

export class EntradaColegioDto {
  @ApiProperty() fecha!: string;
  @ApiProperty({ description: "HH:mm" }) hora!: string;
  @ApiProperty() resultado!: ResultadoMarcacion;
  @ApiProperty() minutosTardanza!: number;
  @ApiProperty() justificada!: boolean;
}

export class AsistenciaColegioDto {
  @ApiProperty({ type: [EntradaColegioDto] }) entradas!: EntradaColegioDto[];
  @ApiProperty({ type: [String], description: "Días con clases sin marcación de entrada" })
  faltasAlColegio!: string[];
  @ApiProperty() puntuales!: number;
  @ApiProperty() tardanzas!: number;
  @ApiProperty() fueraDeTurno!: number;
}

export class IncidenciaCursoDto {
  @ApiProperty({ description: "ID del registro (para justificar una falta)" }) id!: string;
  @ApiProperty() fecha!: string;
  @ApiProperty() estado!: EstadoAsistencia;
  @ApiPropertyOptional({ nullable: true }) justificacion!: string | null;
}

export class AsistenciaCursoDto {
  @ApiProperty() cursoSeccionId!: string;
  @ApiProperty() cursoNombre!: string;
  @ApiProperty({ type: ResumenAsistenciaDto }) totales!: ResumenAsistenciaDto;
  @ApiProperty({ type: [IncidenciaCursoDto] }) incidencias!: IncidenciaCursoDto[];
}

export class AsistenciaEstudianteResponseDto {
  @ApiProperty() estudianteId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiProperty() desde!: string;
  @ApiProperty() hasta!: string;
  @ApiProperty({ type: AsistenciaColegioDto }) colegio!: AsistenciaColegioDto;
  @ApiProperty({ type: [AsistenciaCursoDto] }) cursos!: AsistenciaCursoDto[];
}

export class ResumenEstudianteSeccionDto {
  @ApiProperty() estudianteId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiProperty() faltasColegio!: number;
  @ApiProperty() tardanzasColegio!: number;
  @ApiProperty({ type: ResumenAsistenciaDto }) clases!: ResumenAsistenciaDto;
}

export class AsistenciaSeccionResponseDto {
  @ApiProperty() seccionId!: string;
  @ApiProperty() seccionNombre!: string;
  @ApiProperty() desde!: string;
  @ApiProperty() hasta!: string;
  @ApiProperty() diasConClases!: number;
  @ApiProperty({ type: [ResumenEstudianteSeccionDto] }) estudiantes!: ResumenEstudianteSeccionDto[];
}

export class SeccionConsultableDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: "5.° A" }) nombre!: string;
}

export class EstudianteVinculadoAsistenciaDto {
  @ApiProperty() estudianteId!: string;
  @ApiProperty() nombreCompleto!: string;
  @ApiPropertyOptional({ nullable: true }) seccion!: string | null;
}
