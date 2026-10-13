import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MOTIVOS_AUSENCIA, type MotivoAusencia } from "../constants";

export class AusenciaFotoDto {
  @ApiProperty({ example: "ev-1-uuid" })
  id!: string;

  @ApiProperty({ example: "/uploads/ausencias/foto1.png" })
  archivoUrl!: string;

  @ApiPropertyOptional({ example: "2027-05-13T08:55:00.000Z", nullable: true })
  tomadaEn!: string | null;

  @ApiProperty({ example: 1 })
  orden!: number;
}

export class SesionResumenAusenciaDto {
  @ApiProperty({ example: "ses-mate-5a" })
  id!: string;

  @ApiProperty({ example: "2027-05-13" })
  fecha!: string;

  @ApiProperty({ example: "08:30" })
  horaInicio!: string;

  @ApiProperty({ example: "10:00" })
  horaFin!: string;

  @ApiProperty({ example: "Matemática" })
  cursoNombre!: string;

  @ApiProperty({ example: "5.° A" })
  seccionNombre!: string;

  @ApiProperty({ example: "doc-quispe-uuid" })
  docenteId!: string;

  @ApiProperty({ example: "Quispe, Juan" })
  docenteNombre!: string;
}

export class AusenciaResponseDto {
  @ApiProperty({ example: "aus-1-uuid" })
  id!: string;

  @ApiProperty({ example: "aus-1-uuid" })
  ausenciaRaizId!: string;

  @ApiProperty({ example: "ses-mate-5a" })
  sesionClaseId!: string;

  @ApiProperty({ type: () => SesionResumenAusenciaDto })
  sesion!: SesionResumenAusenciaDto;

  @ApiProperty({ example: "08:50" })
  horaDesde!: string;

  @ApiProperty({ example: "09:10" })
  horaHasta!: string;

  @ApiProperty({ example: 20 })
  minutos!: number;

  @ApiProperty({ enum: MOTIVOS_AUSENCIA, example: "desayunando" })
  motivo!: MotivoAusencia;

  @ApiPropertyOptional({ example: "En la cafetería", nullable: true })
  observacion!: string | null;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  motivoCambio?: string | null;

  @ApiProperty({ example: true })
  vigente!: boolean;

  @ApiProperty({ example: false })
  anulada!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  anuladaEn!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  motivoAnulacion!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  descargo!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  descargoEn!: string | null;

  @ApiPropertyOptional({ example: "2027-05-20T23:59:59.000Z", nullable: true })
  fechaLimiteDescargo!: string | null;

  @ApiPropertyOptional({ example: "20/05/2027", nullable: true })
  fechaLimiteDescargoFormateada!: string | null;

  @ApiProperty({ example: true })
  puedeDescargar!: boolean;

  @ApiProperty({ example: true })
  puedeCorregir!: boolean;

  @ApiProperty({ example: true })
  puedeAnular!: boolean;

  @ApiProperty({ type: () => [AusenciaFotoDto] })
  fotos!: AusenciaFotoDto[];

  @ApiProperty({
    example: { id: "user-director-uuid", nombreCompleto: "Director Escolar" },
  })
  registradoPor!: {
    id: string;
    nombreCompleto: string;
  };

  @ApiProperty({ example: "2027-05-13T09:15:00.000Z" })
  registradoEn!: string;
}

export class MensajeAusenciaResponseDto {
  @ApiProperty({ example: "Ausencia registrada: 20 minutos. Se notificó al docente." })
  mensaje!: string;

  @ApiPropertyOptional({ example: "aus-1-uuid" })
  id?: string;

  @ApiPropertyOptional({ example: 20 })
  minutos?: number;
}

export class AusenciaHistorialItemDto {
  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: true })
  vigente!: boolean;

  @ApiProperty({ example: "08:50" })
  horaDesde!: string;

  @ApiProperty({ example: "09:10" })
  horaHasta!: string;

  @ApiProperty({ example: 20 })
  minutos!: number;

  @ApiProperty({ example: "desayunando" })
  motivo!: string;

  @ApiPropertyOptional({ example: "En cafetería", nullable: true })
  observacion!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  motivoCambio!: string | null;

  @ApiProperty({
    example: { id: "user-director-uuid", nombreCompleto: "Director Escolar" },
  })
  registradoPor!: {
    id: string;
    nombreCompleto: string;
  };

  @ApiProperty({ example: "2027-05-13T09:15:00.000Z" })
  registradoEn!: string;

  @ApiProperty({ type: () => [AusenciaFotoDto] })
  fotos!: AusenciaFotoDto[];
}

export class HistorialAusenciaResponseDto {
  @ApiProperty({ example: "aus-1-uuid" })
  ausenciaRaizId!: string;

  @ApiProperty({ type: () => [AusenciaHistorialItemDto] })
  versiones!: AusenciaHistorialItemDto[];
}

export class ResumenAusenciasSupervisorResponseDto {
  @ApiProperty({ type: () => [AusenciaResponseDto] })
  data!: AusenciaResponseDto[];

  @ApiProperty({ example: 20, description: "Suma de minutos SOLO de las vigentes no anuladas" })
  totalMinutos!: number;

  @ApiProperty({ example: 1 })
  totalAusencias!: number;

  @ApiProperty({ example: 0 })
  totalAnuladas!: number;
}
