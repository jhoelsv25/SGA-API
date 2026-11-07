import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import {
  APLICACIONES_MENU,
  type AplicacionMenu,
} from "../../../common/constants/aplicaciones-menu.constants";

export class UpdateMenuDto {
  @ApiPropertyOptional({
    description: "Nombre del contenedor u opción",
    example: "Operaciones Académicas",
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: "El nombre debe ser texto" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  nombre?: string;

  @ApiPropertyOptional({
    description: "Ruta de navegación URL (solo para opciones, no contenedores)",
    example: "/docente/sesiones/registrar",
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: "La ruta debe ser texto" })
  @MaxLength(255, { message: "La ruta no puede superar 255 caracteres" })
  ruta?: string;

  @ApiPropertyOptional({
    description: "Ícono visual",
    example: "calendar",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El ícono debe ser texto" })
  @MaxLength(50, { message: "El ícono no puede superar 50 caracteres" })
  icono?: string;

  @ApiPropertyOptional({
    description: "Orden relativo",
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: "El orden debe ser un número entero" })
  @Min(1, { message: "El orden debe ser mayor o igual a 1" })
  orden?: number;

  @ApiPropertyOptional({
    description: "ID del contenedor padre",
  })
  @IsOptional()
  @IsUUID("4")
  menuPadreId?: string;

  @ApiPropertyOptional({
    description: "Vigencia del menú",
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: "La vigencia debe ser un valor booleano" })
  vigente?: boolean;

  @ApiPropertyOptional({
    description: "Aplicaciones donde se muestra la opción (por defecto solo web)",
    enum: APLICACIONES_MENU,
    isArray: true,
    example: ["web", "escritorio"],
  })
  @IsOptional()
  @IsArray({ message: "Las aplicaciones deben ser una lista" })
  @ArrayMinSize(1, { message: "Indica al menos una aplicación" })
  @ArrayUnique({ message: "Las aplicaciones no pueden repetirse" })
  @IsIn(APLICACIONES_MENU, { each: true, message: "Aplicación no válida (web, escritorio o app)" })
  aplicaciones?: AplicacionMenu[];
}
