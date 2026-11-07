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

export class IndicadorTesisItemDto {
  @ApiProperty()
  codigo!: "CSP" | "ISA" | "IGM";

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  porcentaje!: number;

  @ApiPropertyOptional()
  pretestPorcentaje?: number | null;

  @ApiPropertyOptional()
  variacionPuntos?: number | null;

  @ApiProperty()
  estado!: "en_curso" | "cerrado" | "sin_datos";
}

export class DirectivoAlertaDiaDto {
  @ApiProperty()
  tipo!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  detalle!: string;

  @ApiProperty()
  enlace!: string;

  @ApiProperty({ enum: ["info", "warning", "danger"] })
  nivel!: "info" | "warning" | "danger";
}

export class DocenteSemaforoItemDto {
  @ApiProperty()
  docenteId!: string;

  @ApiProperty()
  docenteNombre!: string;

  @ApiProperty()
  porcentajeCumplimiento!: number;

  @ApiProperty({ enum: ["verde", "amarillo", "rojo"] })
  estado!: "verde" | "amarillo" | "rojo";

  @ApiProperty()
  sesionesRegistradas!: number;

  @ApiProperty()
  totalSesiones!: number;
}

export class DirectivoDashboardDataDto {
  @ApiProperty({ type: DirectivoKpisDto })
  kpis!: DirectivoKpisDto;

  @ApiProperty({ type: [DirectivoGraficoAsistenciaDto] })
  graficoAsistencia!: DirectivoGraficoAsistenciaDto[];

  @ApiProperty({ type: [DirectivoDistribucionGradosDto] })
  distribucionGrados!: DirectivoDistribucionGradosDto[];

  @ApiPropertyOptional({ type: [IndicadorTesisItemDto] })
  indicadoresTesis?: IndicadorTesisItemDto[];

  @ApiPropertyOptional({ type: [DirectivoAlertaDiaDto] })
  alertasDelDia?: DirectivoAlertaDiaDto[];

  @ApiPropertyOptional({ type: [DocenteSemaforoItemDto] })
  docentesSemaforo?: DocenteSemaforoItemDto[];
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

export class AdminKpisDto {
  @ApiProperty()
  totalUsuarios!: number;

  @ApiProperty()
  usuariosActivos!: number;

  @ApiProperty()
  usuariosBloqueados!: number;

  @ApiProperty()
  usuariosInactivos!: number;

  @ApiProperty()
  intentosFallidosHoy!: number;

  @ApiProperty()
  sinAcceso30Dias!: number;

  @ApiProperty()
  totalEquipos!: number;

  @ApiProperty()
  equiposActivos!: number;
}

export class DistribucionUsuariosRolDto {
  @ApiProperty()
  rol!: string;

  @ApiProperty()
  cantidad!: number;

  @ApiProperty()
  fill!: string;
}

export class AuditoriaRecienteItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  accion!: string;

  @ApiProperty()
  tabla!: string;

  @ApiProperty()
  usuarioNombre!: string;

  @ApiProperty()
  fecha!: string;

  @ApiPropertyOptional()
  ip?: string | null;
}

export class AdminActividadSemanalDto {
  @ApiProperty()
  dia!: string;

  @ApiProperty()
  fecha!: string;

  @ApiProperty()
  totalEventos!: number;

  @ApiProperty()
  iniciosSesion!: number;

  @ApiProperty()
  cambios!: number;
}

export class AdminEquipoRecienteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  tipo!: string;

  @ApiPropertyOptional()
  ultimoAcceso?: string | null;

  @ApiProperty()
  autorizado!: boolean;

  @ApiProperty()
  activo!: boolean;
}

export class AdminServicioEstadoDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: ["operacional", "degradado", "inactivo"] })
  estado!: "operacional" | "degradado" | "inactivo";

  @ApiProperty()
  detalle!: string;
}

export class AdminDashboardDataDto {
  @ApiProperty({ type: AdminKpisDto })
  kpis!: AdminKpisDto;

  @ApiProperty({ type: [DistribucionUsuariosRolDto] })
  distribucionRoles!: DistribucionUsuariosRolDto[];

  @ApiProperty({ type: [AuditoriaRecienteItemDto] })
  ultimasAuditorias!: AuditoriaRecienteItemDto[];

  @ApiPropertyOptional({ type: [AdminActividadSemanalDto] })
  actividadSemanal?: AdminActividadSemanalDto[];

  @ApiPropertyOptional({ type: [AdminEquipoRecienteDto] })
  equiposRecientes?: AdminEquipoRecienteDto[];

  @ApiPropertyOptional({ type: [AdminServicioEstadoDto] })
  servicios?: AdminServicioEstadoDto[];
}

export class SecretariaKpisDto {
  @ApiProperty()
  matriculasMes!: number;

  @ApiProperty()
  retiradosMes!: number;

  @ApiProperty()
  trasladadosMes!: number;

  @ApiProperty()
  estudiantesSinApoderado!: number;

  @ApiProperty()
  estudiantesSinDocumento!: number;

  @ApiProperty()
  libretasPendientes!: number;

  @ApiProperty()
  asistenciaHoyPorcentaje!: number;
}

export class SecretariaMatriculasGradoDto {
  @ApiProperty()
  grado!: string;

  @ApiProperty()
  matriculados!: number;
}

export class SecretariaEstudianteAlertaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombreCompleto!: string;

  @ApiProperty()
  grado!: string;

  @ApiProperty()
  seccion!: string;

  @ApiProperty()
  tipoAlerta!: "sin_apoderado" | "sin_documento";
}

export class SecretariaComunicadoRecienteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  publicadoEn!: string;
}

export class SecretariaDashboardDataDto {
  @ApiProperty({ type: SecretariaKpisDto })
  kpis!: SecretariaKpisDto;

  @ApiProperty({ type: [SecretariaMatriculasGradoDto] })
  matriculasPorGrado!: SecretariaMatriculasGradoDto[];

  @ApiProperty({ type: [SecretariaEstudianteAlertaDto] })
  estudiantesConAlerta!: SecretariaEstudianteAlertaDto[];

  @ApiProperty({ type: [SecretariaComunicadoRecienteDto] })
  comunicadosRecientes!: SecretariaComunicadoRecienteDto[];
}

export class DashboardResponseDto {
  @ApiProperty({
    enum: ["directivo", "docente", "estudiante", "apoderado", "admin", "secretaria"],
  })
  rolCategoria!: "directivo" | "docente" | "estudiante" | "apoderado" | "admin" | "secretaria";

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

  @ApiPropertyOptional({ type: AdminDashboardDataDto })
  admin?: AdminDashboardDataDto;

  @ApiPropertyOptional({ type: SecretariaDashboardDataDto })
  secretaria?: SecretariaDashboardDataDto;
}
