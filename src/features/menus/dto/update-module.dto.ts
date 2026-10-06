import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateModuleDto {
  @ApiPropertyOptional({
    description: "Código del módulo",
    example: "seguridad",
    maxLength: 30,
  })
  @IsOptional()
  @IsString({ message: "El código debe ser texto" })
  @MaxLength(30, { message: "El código no puede superar 30 caracteres" })
  codigo?: string;

  @ApiPropertyOptional({
    description: "Nombre legible del módulo",
    example: "Seguridad y Accesos",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El nombre debe ser texto" })
  @MaxLength(50, { message: "El nombre no puede superar 50 caracteres" })
  nombre?: string;

  @ApiPropertyOptional({
    description: "Ícono visual del módulo",
    example: "shield-check",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El ícono debe ser texto" })
  @MaxLength(50, { message: "El ícono no puede superar 50 caracteres" })
  icono?: string;

  @ApiPropertyOptional({
    description: "Orden relativo de visualización",
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: "El orden debe ser un número entero" })
  @Min(1, { message: "El orden debe ser mayor o igual a 1" })
  orden?: number;

  @ApiPropertyOptional({
    description: "Indica si el módulo está vigente",
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: "La vigencia debe ser un valor booleano" })
  vigente?: boolean;
}
