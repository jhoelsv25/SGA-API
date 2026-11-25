import { ApiProperty } from "@nestjs/swagger";

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
