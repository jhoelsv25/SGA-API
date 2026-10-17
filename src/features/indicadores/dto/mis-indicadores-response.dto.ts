import { ApiProperty } from "@nestjs/swagger";
import { DesgloseCspDto, DesgloseIgmDto, IndicadorCalculadoDto } from "./indicador-calculado.dto";
import { DetalleCursoDocenteIndicadorDto } from "./tablero-indicadores-response.dto";

export class MisIndicadoresDocenteResponseDto {
  [key: string]: unknown;

  @ApiProperty()
  docenteId!: string;

  @ApiProperty()
  docenteNombre!: string;

  @ApiProperty({ nullable: true })
  periodoId!: string | null;

  @ApiProperty({ nullable: true })
  periodoNombre!: string | null;

  @ApiProperty()
  enCurso!: boolean;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  csp!: IndicadorCalculadoDto<DesgloseCspDto>;

  @ApiProperty({ type: () => IndicadorCalculadoDto })
  igm!: IndicadorCalculadoDto<DesgloseIgmDto>;

  @ApiProperty({ type: [DetalleCursoDocenteIndicadorDto] })
  cursos!: DetalleCursoDocenteIndicadorDto[];
}
