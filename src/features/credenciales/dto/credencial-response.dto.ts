import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CredencialResponseDto {
  @ApiProperty({
    description: "ID de la credencial",
    example: "b1febc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  })
  id: string;

  @ApiProperty({ description: "ID de la persona", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })
  personaId: string;

  @ApiProperty({ description: "Código de marcación", example: "CR-45678912" })
  codigo: string;

  @ApiProperty({ description: "Indica si la credencial está activa", example: true })
  activa: boolean;

  @ApiProperty({ description: "Fecha de emisión", example: "2026-10-09T16:00:00Z" })
  emitidaEn: string;

  @ApiPropertyOptional({ description: "Fecha de vencimiento", example: null })
  venceEn?: string | null;

  @ApiPropertyOptional({
    description: "Nuevo PIN en texto plano (mostrado una sola vez al reemitir)",
    example: "4589",
  })
  pin?: string;

  @ApiPropertyOptional({
    description: "Mensaje explicativo de la operación",
    example: "La credencial anterior quedó anulada y se emitió una nueva.",
  })
  mensaje?: string;
}

export class CarneDatosDto {
  @ApiProperty({ description: "ID de la persona" })
  personaId: string;

  @ApiProperty({ description: "Nombres y apellidos completos" })
  nombreCompleto: string;

  @ApiProperty({ description: "Tipo de documento" })
  tipoDocumento: string;

  @ApiProperty({ description: "Número de documento" })
  numeroDocumento: string;

  @ApiPropertyOptional({ description: "URL de la fotografía" })
  fotoUrl?: string | null;

  @ApiProperty({ description: "Tipo de rol / carné", example: "Estudiante" })
  tipoRol: string;

  @ApiProperty({ description: "Código de credencial para QR", example: "CR-45678912" })
  codigoCredencial: string;

  @ApiPropertyOptional({
    description: "Código institucional (SIAGIE o Docente)",
    example: "12345678901234",
  })
  codigoInstitucional?: string | null;

  @ApiProperty({ description: "Fecha de emisión", example: "2026-10-09" })
  emitidaEn: string;
}
