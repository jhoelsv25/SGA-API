import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty } from "class-validator";
import { IMPORTACION_MAX_FILAS, TIPO_IMPORTACION, type TipoImportacion } from "../constants";

export class EjecutarImportacionDto {
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
    description: "Filas validadas que se confirmaron para importar",
    type: [Object],
  })
  @IsArray({ message: "Las filas deben ser un arreglo" })
  @ArrayMinSize(1, { message: "No hay filas válidas para importar." })
  @ArrayMaxSize(IMPORTACION_MAX_FILAS, {
    message: `El archivo supera las ${IMPORTACION_MAX_FILAS} filas. Divídalo en varios archivos.`,
  })
  filas: Record<string, unknown>[];
}
