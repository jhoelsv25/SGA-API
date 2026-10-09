import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonaResponseDto } from "../../personas/dto/persona-response.dto";
import type { EstadoEstudiante } from "../constants";

export class EstudianteUsuarioSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  id: string;

  @ApiProperty({ example: "20261234567890" })
  nombreUsuario: string;

  @ApiProperty({ example: "activo" })
  estado: string;
}

export class EstudianteCredencialSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440002" })
  id: string;

  @ApiProperty({ example: "CR-2026123456" })
  codigo: string;

  @ApiProperty({ example: true })
  activa: boolean;
}

export class EstudianteResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "20261234567890", description: "Código SIAGIE único del estudiante" })
  codigo: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440003" })
  personaId: string;

  @ApiProperty({ type: PersonaResponseDto })
  persona: PersonaResponseDto;

  @ApiProperty({ example: "2026-03-01" })
  fechaIngreso: string;

  @ApiPropertyOptional({ example: "Castellano" })
  lenguaMaterna?: string | null;

  @ApiPropertyOptional({ example: "Católica" })
  religion?: string | null;

  @ApiProperty({ example: false })
  tieneDiscapacidad: boolean;

  @ApiPropertyOptional({ example: null })
  detalleDiscapacidad?: string | null;

  @ApiPropertyOptional({ example: "O+" })
  grupoSanguineo?: string | null;

  @ApiPropertyOptional({ example: "Penicilina" })
  alergias?: string | null;

  @ApiPropertyOptional({ example: "Asma leve controlada" })
  condicionesMedicas?: string | null;

  @ApiPropertyOptional({ example: "SIS" })
  seguroSalud?: string | null;

  @ApiProperty({ example: "activo" })
  estado: EstadoEstudiante;

  @ApiPropertyOptional({ example: "Estudiante" })
  cargoVigente?: string | null;

  @ApiPropertyOptional({ type: EstudianteUsuarioSummaryDto })
  usuario?: EstudianteUsuarioSummaryDto | null;

  @ApiPropertyOptional({ type: EstudianteCredencialSummaryDto })
  credencial?: EstudianteCredencialSummaryDto | null;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  creadoEn: string;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  actualizadoEn: string;
}

export class CreatedEstudianteCredencialDto {
  @ApiProperty({ example: "CR-2026123456" })
  codigo: string;

  @ApiProperty({
    example: "1234",
    description: "PIN de marcación emitido para mostrar una sola vez",
  })
  pin: string;
}

export class CreateEstudianteResponseDto {
  @ApiProperty({ type: EstudianteResponseDto })
  estudiante: EstudianteResponseDto;

  @ApiPropertyOptional({
    example: "Abcd-1234",
    description: "Contraseña temporal para la cuenta de usuario (se muestra una sola vez)",
  })
  tempPassword?: string | null;

  @ApiProperty({
    type: CreatedEstudianteCredencialDto,
    description: "Credencial de marcación y PIN emitido (se muestra una sola vez)",
  })
  credencial: CreatedEstudianteCredencialDto;
}

export class PaginatedEstudiantesResponseDto {
  @ApiProperty({ type: [EstudianteResponseDto] })
  data: EstudianteResponseDto[];

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
