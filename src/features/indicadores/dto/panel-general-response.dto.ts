import { ApiProperty } from "@nestjs/swagger";

export class ResumenAsistenciaHoyDto {
  @ApiProperty({ example: 350 })
  totalEstudiantesMatriculados!: number;

  @ApiProperty({ example: 336 })
  estudiantesConIngreso!: number;

  @ApiProperty({ example: 96.0 })
  porcentajeAsistencia!: number;

  @ApiProperty({ example: "96.00 %" })
  porcentajeAsistenciaTexto!: string;
}

export class ResumenTardanzasHoyDto {
  @ApiProperty({ example: 14 })
  totalTardanzas!: number;
}

export class ResumenSesionesHoyDto {
  @ApiProperty({ example: 28 })
  totalSesiones!: number;

  @ApiProperty({ example: 20 })
  cumplidas!: number;

  @ApiProperty({ example: 4 })
  enCurso!: number;

  @ApiProperty({ example: 2 })
  pendientes!: number;

  @ApiProperty({ example: 1 })
  noCumplidas!: number;

  @ApiProperty({ example: 1 })
  justificadas!: number;
}

export class ResumenLibretasPendientesDto {
  @ApiProperty({ example: 8 })
  totalPendientes!: number;

  @ApiProperty({ example: 3, description: "Con fecha límite anterior a hoy" })
  vencidas!: number;

  @ApiProperty({ example: 5, description: "Con fecha límite hoy o futura" })
  porVencer!: number;
}

export class IndicadoresBimestreActualDto {
  @ApiProperty({ nullable: true })
  periodoId!: string | null;

  @ApiProperty({ nullable: true })
  periodoNombre!: string | null;

  @ApiProperty({ example: true })
  enCurso!: boolean;

  @ApiProperty({ example: 96.61, nullable: true })
  cspPorcentaje!: number | null;

  @ApiProperty({ example: 95.24, nullable: true })
  isaPorcentaje!: number | null;

  @ApiProperty({ example: 88.0, nullable: true })
  igmPorcentaje!: number | null;
}

export class PanelGeneralResponseDto {
  @ApiProperty({ example: "2026-10-16" })
  fecha!: string;

  @ApiProperty({ type: ResumenAsistenciaHoyDto })
  asistenciaHoy!: ResumenAsistenciaHoyDto;

  @ApiProperty({ type: ResumenTardanzasHoyDto })
  tardanzasHoy!: ResumenTardanzasHoyDto;

  @ApiProperty({ type: ResumenSesionesHoyDto })
  sesionesHoy!: ResumenSesionesHoyDto;

  @ApiProperty({ type: ResumenLibretasPendientesDto })
  libretasPendientes!: ResumenLibretasPendientesDto;

  @ApiProperty({ type: IndicadoresBimestreActualDto })
  indicadoresBimestreActual!: IndicadoresBimestreActualDto;
}
