import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

import { USER_STATUSES, UserStatus } from "../constants";

export class UserQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de usuarios",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

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
    enum: USER_STATUSES,
  })
  @IsOptional()
  @IsIn(USER_STATUSES, {
    message: "El estado debe ser activo, bloqueado o inactivo",
  })
  estado?: UserStatus;

  @ApiPropertyOptional({
    description: "Buscar por nombre, apellidos o nombre de usuario",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
