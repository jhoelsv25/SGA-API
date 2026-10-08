import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const TIPOS_DOCUMENTO = ["dni", "carne_extranjeria", "pasaporte", "partida_nacimiento"];

/** RF-002 V3: datos básicos de una persona nueva (registro único). */
export class NuevaPersonaDto {
  @ApiProperty({ enum: TIPOS_DOCUMENTO, example: "dni" })
  @IsIn(TIPOS_DOCUMENTO, { message: "El tipo de documento no es válido" })
  tipoDocumento!: string;

  @ApiProperty({ example: "48123456" })
  @IsString()
  @IsNotEmpty({ message: "El número de documento es obligatorio" })
  @MaxLength(20)
  numeroDocumento!: string;

  @ApiProperty({ example: "Juan" })
  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios" })
  @MaxLength(100)
  nombres!: string;

  @ApiProperty({ example: "Pérez" })
  @IsString()
  @IsNotEmpty({ message: "El apellido paterno es obligatorio" })
  @MaxLength(60)
  apellidoPaterno!: string;

  @ApiPropertyOptional({ example: "Gómez" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  apellidoMaterno?: string;

  @ApiProperty({ enum: ["M", "F"], example: "M" })
  @IsIn(["M", "F"], { message: "El sexo debe ser M o F" })
  sexo!: string;

  @ApiPropertyOptional({ example: "juan@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "El correo no es válido" })
  @MaxLength(100)
  correo?: string;

  @ApiPropertyOptional({ example: "987654321" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;
}

/**
 * RF-002 V3: registro único. En un solo paso se registra (o reutiliza) la persona,
 * su cargo, su cuenta y sus roles. Se indica `personaId` (persona del padrón) o
 * `persona` (persona nueva), no ambos.
 */
export class CreateUserDto {
  @ApiPropertyOptional({
    description: "ID de una persona ya registrada en el padrón",
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  })
  @IsOptional()
  @IsUUID("4", { message: "El ID de la persona debe ser un UUID válido" })
  personaId?: string;

  @ApiPropertyOptional({
    description: "Datos de una persona nueva (si el documento ya existe, se reutiliza)",
    type: NuevaPersonaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NuevaPersonaDto)
  persona?: NuevaPersonaDto;

  @ApiProperty({
    description: "Cargo de la persona (Docente de aula, Director(a), Estudiante…). No da accesos",
    example: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  })
  @IsUUID("4", { message: "Seleccione un cargo válido." })
  @IsNotEmpty({ message: "El cargo es obligatorio" })
  cargoId!: string;

  @ApiPropertyOptional({
    description:
      "Roles de la cuenta; el primero es el principal. Si no se indican, se asignan los roles sugeridos del cargo",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: "Indique al menos un rol." })
  @ArrayUnique({ message: "No repita roles." })
  @IsUUID("4", { each: true, message: "El ID del rol debe ser un UUID válido" })
  rolIds?: string[];

  @ApiPropertyOptional({
    description: "Nombre de usuario único (por defecto, el número de documento)",
    example: "48123456",
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El nombre de usuario debe ser texto" })
  @MinLength(3, { message: "El nombre de usuario debe tener al menos 3 caracteres" })
  @MaxLength(50, { message: "El nombre de usuario no puede exceder 50 caracteres" })
  nombreUsuario?: string;
}
