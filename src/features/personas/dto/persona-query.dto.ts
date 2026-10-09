import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "../constants";

export class PersonaQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de personas",
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
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Buscar por DNI, número de documento, nombres o apellidos",
    example: "Quispe",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TIPOS_DOCUMENTO,
    description: "Filtrar por tipo de documento",
    example: "dni",
  })
  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO)
  tipoDocumento?: TipoDocumento;

  @ApiPropertyOptional({
    description: "Filtrar solo personas provisionales (sin fichas ni cuenta)",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  esProvisional?: boolean;

  @ApiPropertyOptional({
    enum: ["docente", "estudiante", "apoderado"],
    description:
      "Ficha de destino pretendida para búsqueda preventiva. Evalúa si la persona ya cuenta con esa ficha.",
    example: "docente",
  })
  @IsOptional()
  @IsIn(["docente", "estudiante", "apoderado"])
  destinoFicha?: "docente" | "estudiante" | "apoderado";
}
