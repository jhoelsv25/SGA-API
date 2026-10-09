import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonaResponseDto } from "../../personas/dto/persona-response.dto";
import type { EstadoDocente, TipoContrato } from "../constants";

export class DocenteUsuarioSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  id: string;

  @ApiProperty({ example: "45678912" })
  nombreUsuario: string;

  @ApiProperty({ example: "activo" })
  estado: string;
}

export class DocenteCredencialSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440002" })
  id: string;

  @ApiProperty({ example: "CR-45678912" })
  codigo: string;

  @ApiProperty({ example: true })
  activa: boolean;
}

export class DocenteResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "DOC015" })
  codigo: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440003" })
  personaId: string;

  @ApiProperty({ type: PersonaResponseDto })
  persona: PersonaResponseDto;

  @ApiPropertyOptional({ example: "Matemáticas y Física" })
  especialidad?: string | null;

  @ApiPropertyOptional({ example: "Licenciado en Educación Secundaria" })
  tituloProfesional?: string | null;

  @ApiProperty({ example: "nombrado" })
  tipoContrato: TipoContrato;

  @ApiProperty({ example: 30 })
  jornadaHoras: number;

  @ApiProperty({ example: "2026-03-01" })
  fechaIngreso: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  fechaCese?: string | null;

  @ApiProperty({ example: "activo" })
  estado: EstadoDocente;

  @ApiPropertyOptional({ example: "https://ejemplo.com/firmas/doc015.png" })
  firmaUrl?: string | null;

  @ApiPropertyOptional({ example: "Docente de aula" })
  cargoVigente?: string | null;

  @ApiPropertyOptional({ type: DocenteUsuarioSummaryDto })
  usuario?: DocenteUsuarioSummaryDto | null;

  @ApiPropertyOptional({ type: DocenteCredencialSummaryDto })
  credencial?: DocenteCredencialSummaryDto | null;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  creadoEn: string;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  actualizadoEn: string;
}

export class CreatedCredencialDataDto {
  @ApiProperty({ example: "CR-45678912" })
  codigo: string;

  @ApiProperty({
    example: "1234",
    description: "PIN de marcación emitido para mostrar una sola vez",
  })
  pin: string;
}

export class CreateDocenteResponseDto {
  @ApiProperty({ type: DocenteResponseDto })
  docente: DocenteResponseDto;

  @ApiPropertyOptional({
    example: "Abcd-1234",
    description: "Contraseña temporal para la cuenta de usuario (se muestra una sola vez)",
  })
  tempPassword?: string | null;

  @ApiProperty({
    type: CreatedCredencialDataDto,
    description: "Credencial de marcación y PIN emitido (se muestra una sola vez)",
  })
  credencial: CreatedCredencialDataDto;
}

export class PaginatedDocentesResponseDto {
  @ApiProperty({ type: [DocenteResponseDto] })
  data: DocenteResponseDto[];

  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para solicitar la siguiente página",
    example: "eyJhcGVsbGlkb1BhdGVybm8iOiJRdWlzcGUiLCJpZCI6IjEyMyJ9",
  })
  nextCursor: string | null;

  @ApiProperty({ example: false, description: "Indica si existen más registros tras este cursor" })
  hasMore: boolean;

  @ApiProperty({ example: 10, description: "Cantidad de elementos solicitados por página" })
  limit: number;
}
