import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GESTION_TYPES, GestionType } from "../constants";

export class InstitucionResponseDto {
  @ApiProperty({ description: "ID de la institución" })
  id!: string;

  @ApiProperty({ description: "Nombre oficial de la institución" })
  nombre!: string;

  @ApiProperty({ description: "Código modular del MINEDU" })
  codigoModular!: string;

  @ApiPropertyOptional({ description: "Código del local escolar" })
  codigoLocal?: string | null;

  @ApiProperty({ description: "Tipo de gestión", enum: GESTION_TYPES })
  tipoGestion!: GestionType;

  @ApiPropertyOptional({ description: "UGEL" })
  ugel?: string | null;

  @ApiPropertyOptional({ description: "DRE" })
  dre?: string | null;

  @ApiPropertyOptional({ description: "Director general" })
  director?: string | null;

  @ApiProperty({ description: "Dirección oficial" })
  direccion!: string;

  @ApiPropertyOptional({ description: "Distrito" })
  distrito?: string | null;

  @ApiPropertyOptional({ description: "Provincia" })
  provincia?: string | null;

  @ApiPropertyOptional({ description: "Departamento" })
  departamento?: string | null;

  @ApiPropertyOptional({ description: "Teléfono" })
  telefono?: string | null;

  @ApiPropertyOptional({ description: "Correo electrónico" })
  correo?: string | null;

  @ApiPropertyOptional({ description: "URL del logo institucional" })
  logoUrl?: string | null;

  @ApiProperty({ description: "Radio de geocerca en metros" })
  radioGeocercaM!: number;

  @ApiProperty({ description: "Fecha de creación ISO-8601" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización ISO-8601" })
  actualizadoEn!: string;
}
