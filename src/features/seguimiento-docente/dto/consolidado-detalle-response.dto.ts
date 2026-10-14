import { ApiProperty } from "@nestjs/swagger";
import { ConsolidadoResumenDto } from "./consolidado-resumen.dto";

export class EvidenciaFotoConsolidadoDto {
  @ApiProperty({ example: "f1098c1a-f86e-11da-bd1a-00112444be7e" })
  id!: string;

  @ApiProperty({ example: "/uploads/evidencias/foto-1.jpg" })
  archivoUrl!: string;

  @ApiProperty({ example: "2027-06-15T10:15:00.000Z", nullable: true })
  tomadaEn!: string | null;

  @ApiProperty({ example: 1 })
  orden!: number;
}

export class DetalleAusenciaConsolidadoDto {
  @ApiProperty({ example: "a1098c1a-f86e-11da-bd1a-00112444be8e" })
  id!: string;

  @ApiProperty({ example: "10:15" })
  horaDesde!: string; // "HH:mm"

  @ApiProperty({ example: "10:35" })
  horaHasta!: string; // "HH:mm"

  @ApiProperty({ example: 20 })
  minutos!: number;

  @ApiProperty({ example: "fuera_del_aula" })
  motivo!: string;

  @ApiProperty({ example: "Observación de supervisión", nullable: true })
  observacion!: string | null;

  @ApiProperty({ example: "Descargo del docente", nullable: true })
  descargo!: string | null;

  @ApiProperty({ example: "2027-06-16T12:00:00.000Z", nullable: true })
  descargoEn!: string | null;

  @ApiProperty({ type: [EvidenciaFotoConsolidadoDto] })
  fotos!: EvidenciaFotoConsolidadoDto[];
}

export class DetalleSesionConsolidadoDto {
  @ApiProperty({ example: "s1098c1a-f86e-11da-bd1a-00112444be9e" })
  id!: string;

  @ApiProperty({ example: "2027-06-15" })
  fecha!: string; // "YYYY-MM-DD"

  @ApiProperty({ example: "Matemática" })
  cursoNombre!: string;

  @ApiProperty({ example: "3.° A" })
  seccionNombre!: string;

  @ApiProperty({ example: "Ecuaciones cuadráticas", nullable: true })
  tema!: string | null;

  @ApiProperty({ example: "08:00", nullable: true })
  horaInicioPlan!: string | null; // "HH:mm"

  @ApiProperty({ example: "09:30", nullable: true })
  horaFinPlan!: string | null; // "HH:mm"

  @ApiProperty({ example: "08:05", nullable: true })
  horaInicioReal!: string | null; // "HH:mm"

  @ApiProperty({ example: "09:30", nullable: true })
  horaFinReal!: string | null; // "HH:mm"

  @ApiProperty({ example: 5 })
  minutosRetraso!: number;

  @ApiProperty({ example: 5 })
  minutosPerdidos!: number;

  @ApiProperty({ example: "parcial" })
  estado!: string;

  @ApiProperty({ example: null, nullable: true })
  justificacionComentario!: string | null;

  @ApiProperty({ type: [DetalleAusenciaConsolidadoDto] })
  ausencias!: DetalleAusenciaConsolidadoDto[];
}

export class ConsolidadoDetalleResponseDto extends ConsolidadoResumenDto {
  @ApiProperty({ example: "/firmas/docente-quispe.png", nullable: true })
  firmaDocenteUrl!: string | null;

  @ApiProperty({ type: [DetalleSesionConsolidadoDto] })
  sesiones!: DetalleSesionConsolidadoDto[];
}
