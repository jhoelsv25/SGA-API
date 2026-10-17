import { ApiProperty } from "@nestjs/swagger";
import {
  DesgloseCspDto,
  DesgloseIgmDto,
  DesgloseIsaDto,
  IndicadorCalculadoDto,
} from "./indicador-calculado.dto";

export class DetalleCursoDocenteIndicadorDto {
  @ApiProperty()
  cursoId!: string;

  @ApiProperty()
  cursoNombre!: string;

  @ApiProperty()
  seccionId!: string;

  @ApiProperty()
  seccionNombre!: string;

  @ApiProperty()
  gradoNombre!: string;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  csp!: IndicadorCalculadoDto<DesgloseCspDto>;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  igm!: IndicadorCalculadoDto<DesgloseIgmDto>;
}

export class TableroIndicadoresResponseDto {
  @ApiProperty({ nullable: true })
  periodoId!: string | null;

  @ApiProperty({ nullable: true })
  periodoNombre!: string | null;

  @ApiProperty()
  enCurso!: boolean;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  csp!: IndicadorCalculadoDto<DesgloseCspDto>;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  isa!: IndicadorCalculadoDto<DesgloseIsaDto>;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  igm!: IndicadorCalculadoDto<DesgloseIgmDto>;

  @ApiProperty({ type: [DetalleCursoDocenteIndicadorDto], required: false })
  detallePorCursos?: DetalleCursoDocenteIndicadorDto[];
}
