import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "../constants";

export class CreatePersonaDto {
  @ApiProperty({
    enum: TIPOS_DOCUMENTO,
    example: "dni",
    description: "Tipo de documento de identidad",
  })
  @IsIn(TIPOS_DOCUMENTO, {
    message:
      "Tipo de documento no válido. Valores permitidos: dni, carne_extranjeria, pasaporte, partida_nacimiento",
  })
  tipoDocumento: TipoDocumento;

  @ApiProperty({ example: "71234567", description: "Número de documento de identidad" })
  @IsNotEmpty({ message: "El número de documento es obligatorio." })
  @IsString()
  @ValidateIf((o: CreatePersonaDto) => o.tipoDocumento === "dni")
  @Matches(/^\d{8}$/, { message: "El DNI debe tener 8 dígitos." })
  numeroDocumento: string;

  @ApiProperty({ example: "Luis", description: "Nombres de la persona" })
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @IsString()
  @MaxLength(100)
  nombres: string;

  @ApiProperty({ example: "Quispe", description: "Apellido paterno" })
  @IsNotEmpty({ message: "El apellido paterno es obligatorio." })
  @IsString()
  @MaxLength(60)
  apellidoPaterno: string;

  @ApiPropertyOptional({ example: "Mamani", description: "Apellido materno" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  apellidoMaterno?: string;

  @ApiProperty({ enum: ["M", "F"], example: "M", description: "Sexo biológico (M o F)" })
  @IsIn(["M", "F"], { message: "El sexo debe ser 'M' o 'F'." })
  sexo: "M" | "F";

  @ApiPropertyOptional({
    example: "2005-04-12",
    description: "Fecha de nacimiento (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de nacimiento debe tener formato YYYY-MM-DD.",
  })
  fechaNacimiento?: string;

  @ApiPropertyOptional({ example: "Av. Las Flores 123", description: "Dirección de residencia" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ example: "Los Olivos", description: "Distrito de residencia" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  distrito?: string;

  @ApiPropertyOptional({ example: "014567890", description: "Teléfono fijo" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: "987654321", description: "Número de celular" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;

  @ApiPropertyOptional({ example: "lquispe@gmail.com", description: "Correo electrónico único" })
  @IsOptional()
  @IsEmail({}, { message: "Ingrese un correo válido." })
  @MaxLength(100)
  correo?: string;

  @ApiPropertyOptional({
    example: "https://ejemplo.com/foto.jpg",
    description: "URL de la foto de perfil",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fotoUrl?: string;
}
