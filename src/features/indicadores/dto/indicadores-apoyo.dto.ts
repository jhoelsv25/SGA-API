import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { INDICADORES_APOYO, type IndicadorApoyo } from "../constants";
import { FiltroIndicadoresQueryDto } from "./filtro-indicadores-query.dto";

export class FiltroApoyoQueryDto extends FiltroIndicadoresQueryDto {
  @ApiPropertyOptional({ enum: INDICADORES_APOYO, description: "Columna del ranking" })
  @IsOptional()
  @IsIn(INDICADORES_APOYO)
  ordenarPor?: IndicadorApoyo;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  orden?: "asc" | "desc";
}

export class JornadasEfectivasDto {
  @ApiProperty() sinDatos!: boolean;
  @ApiProperty({ nullable: true, description: "Porcentaje con 2 decimales" }) valor!: number | null;
  @ApiProperty() minutosProgramados!: number;
  @ApiProperty() minutosEfectivos!: number;
}

export class MinutosPerdidosDto {
  @ApiProperty() sinDatos!: boolean;
  @ApiProperty({ nullable: true }) total!: number | null;
  @ApiProperty({ nullable: true, description: "Promedio por sesión ejecutada, 2 decimales" })
  promedioPorSesion!: number | null;
  @ApiProperty() sesionesEjecutadas!: number;
}

export class PuntualidadDto {
  @ApiProperty() sinDatos!: boolean;
  @ApiProperty({ nullable: true, description: "Porcentaje con 2 decimales" }) valor!: number | null;
  @ApiProperty() puntuales!: number;
  @ApiProperty() sesionesConIngreso!: number;
}

export class MinutosFueraAulaDto {
  @ApiProperty() sinDatos!: boolean;
  @ApiProperty({ nullable: true }) minutos!: number | null;
  @ApiProperty() supervisiones!: number;
}

export class TiempoResolucionDto {
  @ApiProperty() sinDatos!: boolean;
  @ApiProperty({ nullable: true, description: "Días calendario, 1 decimal" })
  promedioDias!: number | null;
  @ApiProperty() resueltas!: number;
  @ApiProperty() vencidas!: number;
}

/** Los cinco indicadores de apoyo. Sin meta, semáforo ni calificación. */
export class ResumenApoyoDto {
  @ApiProperty({ type: JornadasEfectivasDto }) jornadasEfectivas!: JornadasEfectivasDto;
  @ApiProperty({ type: MinutosPerdidosDto }) minutosPerdidos!: MinutosPerdidosDto;
  @ApiProperty({ type: PuntualidadDto }) puntualidad!: PuntualidadDto;
  @ApiProperty({ type: MinutosFueraAulaDto }) minutosFueraAula!: MinutosFueraAulaDto;
  @ApiProperty({ type: TiempoResolucionDto }) tiempoResolucion!: TiempoResolucionDto;
}

export class FilaRankingApoyoDto {
  @ApiProperty() docenteId!: string;
  @ApiProperty() docenteNombre!: string;
  @ApiProperty({ type: ResumenApoyoDto }) resumen!: ResumenApoyoDto;
}

export class EvolucionApoyoDto {
  @ApiProperty() periodoId!: string;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty() enCurso!: boolean;
  @ApiPropertyOptional({ nullable: true }) mensajeEnCurso!: string | null;
  @ApiProperty({ type: ResumenApoyoDto }) resumen!: ResumenApoyoDto;
}

export class IndicadoresApoyoResponseDto {
  @ApiProperty({ example: "Indicadores de apoyo" }) titulo!: string;
  @ApiProperty({
    example: "Indicadores de apoyo: informativos, no forman parte de los indicadores de la tesis.",
  })
  mensaje!: string;
  @ApiProperty({ example: "Sin datos" }) etiquetaSinDatos!: string;
  @ApiPropertyOptional({ nullable: true }) periodoId!: string | null;
  @ApiPropertyOptional({ nullable: true }) periodoNombre!: string | null;
  @ApiProperty() desde!: string;
  @ApiProperty() hasta!: string;
  @ApiProperty({ description: "El rango incluye el día de hoy, que aún no se cierra" })
  enCurso!: boolean;
  @ApiPropertyOptional({ nullable: true }) mensajeEnCurso!: string | null;
  @ApiProperty({ type: ResumenApoyoDto }) resumen!: ResumenApoyoDto;
  @ApiPropertyOptional({
    type: [FilaRankingApoyoDto],
    nullable: true,
    description: "Solo Director y Subdirector; el docente no recibe ranking",
  })
  ranking!: FilaRankingApoyoDto[] | null;
  @ApiProperty({ type: [EvolucionApoyoDto] }) evolucion!: EvolucionApoyoDto[];
}
