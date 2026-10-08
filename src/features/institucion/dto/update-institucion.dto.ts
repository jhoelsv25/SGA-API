import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { GESTION_TYPES, GestionType } from "../constants";

export class UpdateInstitucionDto {
  @ApiProperty({ description: "Nombre oficial de la institución educativa" })
  @IsString()
  @IsNotEmpty({ message: "El nombre de la institución es obligatorio." })
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ description: "Código modular asignado por el MINEDU" })
  @IsString()
  @IsNotEmpty({ message: "El código modular es obligatorio." })
  @MaxLength(20)
  codigoModular!: string;

  @ApiPropertyOptional({ description: "Código del local escolar" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoLocal?: string | null;

  @ApiProperty({ description: "Tipo de gestión", enum: GESTION_TYPES })
  @IsIn(GESTION_TYPES, { message: "El tipo de gestión debe ser publica, privada o convenio." })
  tipoGestion!: GestionType;

  @ApiPropertyOptional({ description: "Unidad de Gestión Educativa Local (UGEL)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ugel?: string | null;

  @ApiPropertyOptional({ description: "Dirección Regional de Educación (DRE)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dre?: string | null;

  @ApiPropertyOptional({ description: "Nombre del director general" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  director?: string | null;

  @ApiProperty({ description: "Dirección física del colegio" })
  @IsString()
  @IsNotEmpty({ message: "La dirección es obligatoria." })
  @MaxLength(255)
  direccion!: string;

  @ApiPropertyOptional({ description: "Distrito" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  distrito?: string | null;

  @ApiPropertyOptional({ description: "Provincia" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string | null;

  @ApiPropertyOptional({ description: "Departamento" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string | null;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @ApiPropertyOptional({ description: "Correo electrónico oficial" })
  @IsOptional()
  @IsEmail({}, { message: "Ingrese un correo válido." })
  @MaxLength(100)
  correo?: string | null;
}
