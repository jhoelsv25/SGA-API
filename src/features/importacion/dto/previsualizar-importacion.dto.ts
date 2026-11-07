import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty } from "class-validator";
import { IMPORTACION_MAX_FILAS, TIPO_IMPORTACION, type TipoImportacion } from "../constants";

export class PrevisualizarImportacionDto {
  @ApiProperty({
    description: "Tipo de plantilla / entidad a importar",
    enum: Object.values(TIPO_IMPORTACION),
    example: "estudiantes",
  })
  @IsIn(Object.values(TIPO_IMPORTACION), {
    message:
      "Tipo de importación no válido. Debe ser personas, estudiantes, docentes o apoderados.",
  })
  @IsNotEmpty({ message: "El tipo de importación es obligatorio" })
  tipo: TipoImportacion;

  @ApiProperty({
    description: "Filas extraídas de la plantilla Excel",
    type: [Object],
  })
  @IsArray({ message: "Las filas deben ser un arreglo" })
  @ArrayMinSize(1, { message: "El archivo no contiene filas de datos para procesar." })
  @ArrayMaxSize(IMPORTACION_MAX_FILAS, {
    message: `El archivo supera las ${IMPORTACION_MAX_FILAS} filas. Divídalo en varios archivos.`,
  })
  @Type(() => Object)
  filas: Record<string, unknown>[];
}
