import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EstudianteKpisDto {
  @ApiProperty()
  porcentajeAsistencia!: number;

  @ApiProperty()
  presentes!: number;

  @ApiProperty()
  tardanzas!: number;

  @ApiProperty()
  faltas!: number;

  @ApiProperty()
  justificadas!: number;

  @ApiProperty()
  cursosInscritos!: number;

  @ApiProperty()
  tareasPendientes!: number;

  @ApiProperty()
  tareasEntregadas!: number;
}

export class EstudianteTareaProximaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  curso!: string;

  @ApiProperty()
  fechaLimite!: string;

  @ApiProperty()
  tipo!: string;

  @ApiProperty()
  puntajeMaximo!: number;

  @ApiProperty()
  estadoEntrega!: "pendiente" | "entregada" | "calificada";

  @ApiPropertyOptional()
  nota?: number | null;
}

export class EstudianteHorarioClaseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  curso!: string;

  @ApiPropertyOptional()
  docente?: string | null;

  @ApiPropertyOptional()
  aula?: string | null;

  @ApiProperty()
  horaInicio!: string;

  @ApiProperty()
  horaFin!: string;

  @ApiProperty()
  estado!: string;
}

export class EstudianteResumenTareasGraficoDto {
  @ApiProperty()
  estado!: string;

  @ApiProperty()
  cantidad!: number;

  @ApiProperty()
  fill!: string;
}

export class EstudianteAsociadoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombreCompleto!: string;

  @ApiProperty()
  grado!: string;

  @ApiProperty()
  seccion!: string;
}

export class EstudianteDashboardDataDto {
  @ApiProperty({ type: EstudianteKpisDto })
  kpis!: EstudianteKpisDto;

  @ApiProperty({ type: [EstudianteResumenTareasGraficoDto] })
  graficoTareas!: EstudianteResumenTareasGraficoDto[];

  @ApiProperty({ type: [EstudianteTareaProximaDto] })
  proximasTareas!: EstudianteTareaProximaDto[];

  @ApiProperty({ type: [EstudianteHorarioClaseDto] })
  horarioHoy!: EstudianteHorarioClaseDto[];

  @ApiPropertyOptional({ type: [EstudianteAsociadoDto] })
  estudiantesAsociados?: EstudianteAsociadoDto[];
}
