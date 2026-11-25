import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from "class-validator";
import { IMPORTACION_MAX_FILAS, TIPO_IMPORTACION, type TipoImportacion } from "../constants";

export class EjecutarImportacionDto {
  @ApiProperty({
    description: "Tipo de plantilla / entidad a importar",
    enum: Object.values(TIPO_IMPORTACION),
    example: "estudiantes",
  })
  @IsIn(Object.values(TIPO_IMPORTACION), {
    message:
      "Tipo de importación no válido. Debe ser personas, estudiantes, docentes, apoderados, matriculas, carga_academica o horarios.",
  })
  @IsNotEmpty({ message: "El tipo de importación es obligatorio" })
  tipo: TipoImportacion;

  @ApiPropertyOptional({
    description: "Identificador del lote previsualizado almacenado temporalmente en Redis",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID("4", { message: "El identificador del lote no es válido." })
  loteId?: string;

  @ApiPropertyOptional({
    description: "Filas validadas (opcional si se indica loteId)",
    type: [Object],
  })
  @IsOptional()
  @IsArray({ message: "Las filas deben ser un arreglo" })
  @ArrayMinSize(1, { message: "No hay filas válidas para importar." })
  @ArrayMaxSize(IMPORTACION_MAX_FILAS, {
    message: `El archivo supera las ${IMPORTACION_MAX_FILAS} filas. Divídalo en varios archivos.`,
  })
  @Type(() => Object)
  filas?: Record<string, unknown>[];
}
