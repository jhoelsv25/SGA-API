import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateMenuContainerDto {
  @ApiProperty({
    description: "ID del módulo al que pertenece el contenedor",
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  })
  @IsUUID("4", { message: "El ID del módulo debe ser un UUID válido" })
  @IsNotEmpty({ message: "El módulo es obligatorio" })
  moduloId!: string;

  @ApiProperty({
    description: "Nombre del contenedor (ej. 'Operaciones', 'Reportes')",
    example: "Operaciones",
    maxLength: 100,
  })
  @IsString({ message: "El nombre debe ser texto" })
  @IsNotEmpty({ message: "El nombre del contenedor es obligatorio" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  nombre!: string;

  @ApiPropertyOptional({
    description: "Ícono visual del contenedor",
    example: "folder",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El ícono debe ser texto" })
  @MaxLength(50, { message: "El ícono no puede superar 50 caracteres" })
  icono?: string;

  @ApiProperty({
    description: "Orden relativo dentro del módulo",
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: "El orden debe ser un número entero" })
  @Min(1, { message: "El orden debe ser mayor o igual a 1" })
  orden!: number;
}
