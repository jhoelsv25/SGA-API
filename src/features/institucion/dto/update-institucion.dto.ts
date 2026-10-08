import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { GESTION_TYPES, GestionType } from "../constants";

export class UpdateInstitucionDto {
  @ApiPropertyOptional({ description: "Nombre oficial de la institución educativa" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({ description: "Código modular asignado por el MINEDU" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoModular?: string;

  @ApiPropertyOptional({ description: "Código del local escolar" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(20)
  codigoLocal?: string | null;

  @ApiPropertyOptional({ description: "Tipo de gestión", enum: GESTION_TYPES })
  @IsOptional()
  @IsIn(GESTION_TYPES, { message: "El tipo de gestión debe ser publica, privada o convenio." })
  tipoGestion?: GestionType;

  @ApiPropertyOptional({ description: "Unidad de Gestión Educativa Local (UGEL)" })
  @IsOptional()
  @Transform(({ value, obj }: { value: unknown; obj?: Record<string, unknown> }) => {
    if (typeof value === "string") return value === "" ? null : value;
    if (typeof obj?.ugelDre === "string") return obj.ugelDre === "" ? null : obj.ugelDre;
    return value;
  })
  @IsString()
  @MaxLength(100)
  ugel?: string | null;

  @ApiPropertyOptional({ description: "Dirección Regional de Educación (DRE)" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(100)
  dre?: string | null;

  @ApiPropertyOptional({ description: "UGEL o DRE consolidada" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(100)
  ugelDre?: string | null;

  @ApiPropertyOptional({ description: "Nombre del director general" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(150)
  director?: string | null;

  @ApiPropertyOptional({ description: "Dirección física del colegio" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ description: "Distrito" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(100)
  distrito?: string | null;

  @ApiPropertyOptional({ description: "Provincia" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(100)
  provincia?: string | null;

  @ApiPropertyOptional({ description: "Departamento" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(100)
  departamento?: string | null;

  @ApiPropertyOptional({ description: "Teléfono de contacto" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @ApiPropertyOptional({ description: "Correo electrónico oficial" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsEmail({}, { message: "Ingrese un correo válido." })
  @MaxLength(100)
  correo?: string | null;

  @ApiPropertyOptional({ description: "URL del logo institucional" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === "" ? null : value))
  @IsString()
  logoUrl?: string | null;
}
