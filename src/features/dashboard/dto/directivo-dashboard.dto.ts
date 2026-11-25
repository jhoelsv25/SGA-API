import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
