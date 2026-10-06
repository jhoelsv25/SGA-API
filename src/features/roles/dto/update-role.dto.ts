import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: "Nombre del rol (no modificable si es rol del sistema)",
    example: "Coordinador General",
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: "El nombre del rol debe ser texto" })
  @MaxLength(50, { message: "El nombre no puede exceder 50 caracteres" })
  nombre?: string;

  @ApiPropertyOptional({
    description: "Descripción de las responsabilidades del rol",
    example: "Supervisa todas las áreas académicas",
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: "La descripción debe ser texto" })
  @MaxLength(255, { message: "La descripción no puede exceder 255 caracteres" })
  descripcion?: string;

  @ApiPropertyOptional({
    description: "Estado de activación del rol",
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: "El estado activo debe ser un valor booleano" })
  activo?: boolean;
}
