import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class UserQueryDto {
  @ApiPropertyOptional({
    description: "Página a consultar (1-indexed)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: "Elementos por página",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: "Filtrar por rol (UUID)",
  })
  @IsOptional()
  @IsUUID("4")
  rolId?: string;

  @ApiPropertyOptional({
    description: "Filtrar por estado de la cuenta",
    enum: ["activo", "bloqueado", "inactivo"],
  })
  @IsOptional()
  @IsIn(["activo", "bloqueado", "inactivo"], {
    message: "El estado debe ser activo, bloqueado o inactivo",
  })
  estado?: "activo" | "bloqueado" | "inactivo";

  @ApiPropertyOptional({
    description: "Buscar por nombre, apellidos o nombre de usuario",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
