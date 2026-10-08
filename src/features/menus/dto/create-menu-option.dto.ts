import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateMenuOptionDto {
  @ApiProperty({
    description: "ID del módulo al que pertenece la opción",
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  })
  @IsUUID("4", { message: "El ID del módulo debe ser un UUID válido" })
  @IsNotEmpty({ message: "El módulo es obligatorio" })
  moduloId!: string;

  @ApiProperty({
    description: "ID del contenedor padre al que pertenece la opción",
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  })
  @IsUUID("4", { message: "El contenedor padre debe ser un UUID válido" })
  @IsNotEmpty({ message: "El contenedor es obligatorio" })
  menuPadreId!: string;

  @ApiProperty({
    description: "Nombre de la opción de pantalla",
    example: "Registrar sesión de clase",
    maxLength: 100,
  })
  @IsString({ message: "El nombre debe ser texto" })
  @IsNotEmpty({ message: "El nombre de la opción es obligatorio" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  nombre!: string;

  @ApiProperty({
    description: "Ruta de navegación URL en el frontend",
    example: "/docente/sesiones/registrar",
    maxLength: 255,
  })
  @IsString({ message: "La ruta debe ser texto" })
  @IsNotEmpty({ message: "La ruta es obligatoria" })
  @MaxLength(255, { message: "La ruta no puede superar 255 caracteres" })
  ruta!: string;

  @ApiPropertyOptional({
    description: "Ícono visual de la opción",
    example: "file-text",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El ícono debe ser texto" })
  @MaxLength(50, { message: "El ícono no puede superar 50 caracteres" })
  icono?: string;

  @ApiProperty({
    description: "Orden relativo dentro del contenedor",
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: "El orden debe ser un número entero" })
  @Min(1, { message: "El orden debe ser mayor o igual a 1" })
  orden!: number;
}
