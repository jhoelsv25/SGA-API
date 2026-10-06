import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateModuleDto {
  @ApiProperty({
    description: "Código único identificador del módulo",
    example: "seguridad",
    maxLength: 30,
  })
  @IsString({ message: "El código debe ser texto" })
  @IsNotEmpty({ message: "El código del módulo es obligatorio" })
  @MaxLength(30, { message: "El código no puede superar 30 caracteres" })
  codigo!: string;

  @ApiProperty({
    description: "Nombre legible del módulo",
    example: "Seguridad y Accesos",
    maxLength: 50,
  })
  @IsString({ message: "El nombre debe ser texto" })
  @IsNotEmpty({ message: "El nombre del módulo es obligatorio" })
  @MaxLength(50, { message: "El nombre no puede superar 50 caracteres" })
  nombre!: string;

  @ApiPropertyOptional({
    description: "Ícono visual del módulo (ej. Lucide icon name)",
    example: "shield-check",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El ícono debe ser texto" })
  @MaxLength(50, { message: "El ícono no puede superar 50 caracteres" })
  icono?: string;

  @ApiProperty({
    description: "Orden relativo de visualización en el menú",
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: "El orden debe ser un número entero" })
  @Min(1, { message: "El orden debe ser mayor o igual a 1" })
  orden!: number;

  @ApiPropertyOptional({
    description: "Indica si el módulo está vigente en el sistema",
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: "La vigencia debe ser un valor booleano" })
  vigente?: boolean;
}
