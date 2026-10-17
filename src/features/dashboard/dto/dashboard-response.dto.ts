import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PeriodoActualInfoDto {
  @ApiProperty()
  anioId!: string;

  @ApiProperty()
  anio!: number;

  @ApiPropertyOptional()
  periodoId?: string | null;

  @ApiPropertyOptional()
  periodoNombre?: string | null;
}

export class DirectivoKpisDto {
  @ApiProperty()
  totalMatriculados!: number;

  @ApiProperty()
  totalDocentes!: number;

  @ApiProperty()
  totalSecciones!: number;

  @ApiProperty()
  porcentajeAsistencia!: number;

  @ApiProperty()
  asistenciaHoy!: {
    presentes: number;
    tardanzas: number;
    faltas: number;
    justificados: number;
    totalEsperado: number;
    porcentaje: number;
  };

  @ApiProperty()
  aulaVirtual!: {
    totalTareas: number;
    totalEntregas: number;
    tareasPendientesCalificar: number;
  };

  @ApiProperty()
  sesionesHoy!: {
    programadas: number;
    completadas: number;
    enCurso: number;
    porcentajeCumplimiento: number;
  };
}

export class DirectivoGraficoAsistenciaDto {
  @ApiProperty()
  etiqueta!: string;

  @ApiProperty()
  porcentaje!: number;

  @ApiProperty()
  presentes!: number;

  @ApiProperty()
  tardanzas!: number;

  @ApiProperty()
  faltas!: number;
}

export class DirectivoDistribucionGradosDto {
  @ApiProperty()
  grado!: string;

  @ApiProperty()
  matriculados!: number;

  @ApiProperty()
  porcentaje!: number;
}

export class DirectivoDashboardDataDto {
  @ApiProperty({ type: DirectivoKpisDto })
  kpis!: DirectivoKpisDto;

  @ApiProperty({ type: [DirectivoGraficoAsistenciaDto] })
  graficoAsistencia!: DirectivoGraficoAsistenciaDto[];

  @ApiProperty({ type: [DirectivoDistribucionGradosDto] })
  distribucionGrados!: DirectivoDistribucionGradosDto[];
}

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

export class DashboardResponseDto {
  @ApiProperty({ enum: ["directivo", "docente", "estudiante", "apoderado"] })
  rolCategoria!: "directivo" | "docente" | "estudiante" | "apoderado";

  @ApiProperty()
  rolNombre!: string;

  @ApiProperty({ type: PeriodoActualInfoDto })
  periodoActual!: PeriodoActualInfoDto;

  @ApiPropertyOptional({ type: DirectivoDashboardDataDto })
  directivo?: DirectivoDashboardDataDto;

  @ApiPropertyOptional({ type: DocenteDashboardDataDto })
  docente?: DocenteDashboardDataDto;

  @ApiPropertyOptional({ type: EstudianteDashboardDataDto })
  estudiante?: EstudianteDashboardDataDto;
}
