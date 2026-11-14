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

export class CarneInstitucionDto {
  @ApiProperty({ example: "I.E. De Mujeres Nuestra Señora del Carmen" })
  nombre: string;

  @ApiPropertyOptional({ example: "0543210" })
  codigoModular?: string | null;

  @ApiPropertyOptional({ example: "Lircay" })
  distrito?: string | null;

  @ApiPropertyOptional({ example: "Angaraes" })
  provincia?: string | null;

  @ApiPropertyOptional({ example: "Huancavelica" })
  departamento?: string | null;

  @ApiPropertyOptional({ example: "UGEL Angaraes" })
  ugel?: string | null;

  @ApiPropertyOptional({ example: "DRE Huancavelica" })
  dre?: string | null;

  @ApiPropertyOptional({ example: "/uploads/logos/logo.png" })
  logoUrl?: string | null;
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

  @ApiPropertyOptional({
    description: "Grado escolar actual del estudiante (si aplica)",
    example: "1.° de secundaria",
  })
  gradoNombre?: string | null;

  @ApiPropertyOptional({
    description: "Sección actual del estudiante (si aplica)",
    example: "A",
  })
  seccionNombre?: string | null;

  @ApiProperty({ description: "Fecha de emisión", example: "2026-10-09" })
  emitidaEn: string;

  @ApiPropertyOptional({
    description: "Datos institucionales de la institución emisora",
    type: CarneInstitucionDto,
  })
  institucion?: CarneInstitucionDto;
}
