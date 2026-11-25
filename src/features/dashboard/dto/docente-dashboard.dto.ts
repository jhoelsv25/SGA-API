import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DocenteKpisDto {
  @ApiProperty()
  misCursos!: number;

  @ApiProperty()
  misSecciones!: number;

  @ApiProperty()
  misEstudiantes!: number;

  @ApiProperty()
  sesionesHoyTotal!: number;

  @ApiProperty()
  sesionesHoyCompletadas!: number;

  @ApiProperty()
  tareasActivas!: number;

  @ApiProperty()
  entregasPendientesCalificar!: number;

  @ApiProperty()
  porcentajeAsistenciaPromedio!: number;
}

export class DocenteEstadoEntregasDto {
  @ApiProperty()
  estado!: string;

  @ApiProperty()
  cantidad!: number;

  @ApiProperty()
  fill!: string;
}

export class DocenteSesionHoyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  curso!: string;

  @ApiProperty()
  seccion!: string;

  @ApiProperty()
  grado!: string;

  @ApiPropertyOptional()
  aula?: string | null;

  @ApiProperty()
  horaInicio!: string;

  @ApiProperty()
  horaFin!: string;

  @ApiProperty()
  estado!: string;
}

export class DocenteTareaResumenDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  curso!: string;

  @ApiProperty()
  seccion!: string;

  @ApiProperty()
  fechaLimite!: string;

  @ApiProperty()
  entregadas!: number;

  @ApiProperty()
  calificadas!: number;

  @ApiProperty()
  totalAlumnos!: number;
}

export class DocenteDashboardDataDto {
  @ApiProperty({ type: DocenteKpisDto })
  kpis!: DocenteKpisDto;

  @ApiProperty({ type: [DocenteEstadoEntregasDto] })
  graficoEntregas!: DocenteEstadoEntregasDto[];

  @ApiProperty({ type: [DocenteSesionHoyDto] })
  sesionesHoy!: DocenteSesionHoyDto[];

  @ApiProperty({ type: [DocenteTareaResumenDto] })
  tareasPorCorregir!: DocenteTareaResumenDto[];
}
