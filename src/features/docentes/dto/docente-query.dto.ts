import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import {
  ESTADOS_DOCENTE,
  type EstadoDocente,
  TIPOS_CONTRATO,
  type TipoContrato,
} from "../constants";

export class DocenteQueryDto {
  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página de docentes",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Cantidad de elementos por página (1-100)",
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Buscar por código de docente, DNI o nombres y apellidos",
    example: "Flores",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filtrar por régimen o tipo de contrato",
    enum: TIPOS_CONTRATO,
  })
  @IsOptional()
  @IsIn(TIPOS_CONTRATO)
  tipoContrato?: TipoContrato;

  @ApiPropertyOptional({
    description: "Filtrar por estado del docente",
    enum: ESTADOS_DOCENTE,
  })
  @IsOptional()
  @IsIn(ESTADOS_DOCENTE)
  estado?: EstadoDocente;
}
