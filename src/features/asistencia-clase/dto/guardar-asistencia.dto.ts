import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsUUID, ValidateNested } from "class-validator";
import { ESTADOS_MARCABLES_DOCENTE, type EstadoMarcableDocente } from "../constants";

export class ExcepcionAsistenciaDto {
  @ApiProperty({ description: "ID de la matrícula del estudiante" })
  @IsUUID()
  matriculaId!: string;

  @ApiProperty({ enum: ESTADOS_MARCABLES_DOCENTE })
  @IsIn(ESTADOS_MARCABLES_DOCENTE)
  estado!: EstadoMarcableDocente;
}

export class GuardarAsistenciaDto {
  @ApiProperty({
    type: [ExcepcionAsistenciaDto],
    description: "Solo las excepciones (tardanza o falta); el resto queda en presente.",
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExcepcionAsistenciaDto)
  excepciones!: ExcepcionAsistenciaDto[];
}
