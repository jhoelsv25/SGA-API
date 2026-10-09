import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TipoDocumento } from "../constants";

export class FichasPersonaDto {
  @ApiProperty({ example: false, description: "Tiene ficha de docente activa" })
  esDocente: boolean;

  @ApiProperty({ example: false, description: "Tiene ficha de estudiante activa" })
  esEstudiante: boolean;

  @ApiProperty({ example: false, description: "Tiene ficha de apoderado activa" })
  esApoderado: boolean;

  @ApiProperty({ example: false, description: "Tiene cuenta de usuario en el sistema" })
  tieneUsuario: boolean;
}

export class PersonaResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "dni" })
  tipoDocumento: TipoDocumento;

  @ApiProperty({ example: "71234567" })
  numeroDocumento: string;

  @ApiProperty({ example: "Luis" })
  nombres: string;

  @ApiProperty({ example: "Quispe" })
  apellidoPaterno: string;

  @ApiPropertyOptional({ example: "Mamani" })
  apellidoMaterno?: string | null;

  @ApiProperty({ example: "Quispe Mamani, Luis" })
  nombreCompleto: string;

  @ApiProperty({ example: "M" })
  sexo: string;

  @ApiPropertyOptional({ example: "2005-04-12" })
  fechaNacimiento?: string | null;

  @ApiPropertyOptional({ example: "Av. Las Flores 123" })
  direccion?: string | null;

  @ApiPropertyOptional({ example: "Los Olivos" })
  distrito?: string | null;

  @ApiPropertyOptional({ example: "014567890" })
  telefono?: string | null;

  @ApiPropertyOptional({ example: "987654321" })
  celular?: string | null;

  @ApiPropertyOptional({ example: "lquispe@gmail.com" })
  correo?: string | null;

  @ApiPropertyOptional({ example: "https://ejemplo.com/foto.jpg" })
  fotoUrl?: string | null;

  @ApiProperty({
    example: true,
    description:
      "True si la persona no tiene fichas (docente, estudiante, apoderado) ni cuenta de usuario asociada",
  })
  esProvisional: boolean;

  @ApiProperty({ type: FichasPersonaDto })
  fichas: FichasPersonaDto;

  @ApiPropertyOptional({
    example: "Docente de aula",
    description: "Nombre del cargo vigente asignado a la persona, si tiene",
  })
  cargoVigente?: string | null;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  creadoEn: string;

  @ApiProperty({ example: "2026-10-09T10:00:00Z" })
  actualizadoEn: string;
}

export class PaginatedPersonasResponseDto {
  @ApiProperty({ type: [PersonaResponseDto] })
  data: PersonaResponseDto[];

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
