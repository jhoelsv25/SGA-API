import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CODIGOS_TIPO_NOVEDAD, type CodigoDia, type TipoNovedad } from "../constants";

const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MSG_FECHA = "La fecha debe tener el formato AAAA-MM-DD.";

export class MesQueryDto {
  @ApiProperty({ example: "2026-10" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El mes debe tener el formato AAAA-MM." })
  mes!: string;
}

export class CrearNovedadDto {
  @ApiProperty() @IsUUID() personaId!: string;
  @ApiProperty({ enum: CODIGOS_TIPO_NOVEDAD })
  @IsIn(CODIGOS_TIPO_NOVEDAD, { message: "Elija el tipo de justificación." })
  tipo!: TipoNovedad;
  @ApiProperty({ example: "2026-10-05" })
  @Matches(FECHA, { message: MSG_FECHA })
  fechaDesde!: string;
  @ApiProperty({ example: "2026-10-05" })
  @Matches(FECHA, { message: MSG_FECHA })
  fechaHasta!: string;
  @ApiPropertyOptional({ description: "Minutos del permiso; obligatorio si es sin goce" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  minutos?: number;
  @ApiProperty({ description: "Documento que lo acredita", example: "Papeleta N.° 12" })
  @IsString()
  @IsNotEmpty({ message: "Indique el documento que lo acredita." })
  @MaxLength(150)
  documento!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) observacion?: string;
  @ApiPropertyOptional({ enum: ["ingreso", "salida"], description: "Solo omisión de marca" })
  @IsOptional()
  @IsIn(["ingreso", "salida"], { message: "Indique si faltó el ingreso o la salida." })
  marcaOmitida?: "ingreso" | "salida";
  @ApiPropertyOptional({
    description: "Solo omisión de marca: cuándo se presentó el sustento (AAAA-MM-DDTHH:MM)",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}[T ]([01]\d|2[0-3]):[0-5]\d$/, {
    message: "La presentación debe tener el formato AAAA-MM-DD HH:MM.",
  })
  presentadoEn?: string;
}

export class AnularNovedadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: "Indique el motivo de la anulación." })
  @MaxLength(500)
  motivo!: string;
}

export interface NovedadDto {
  id: string;
  personaId: string;
  nombreCompleto: string;
  tipo: TipoNovedad;
  fechaDesde: string;
  fechaHasta: string;
  minutos: number | null;
  marcaOmitida: "ingreso" | "salida" | null;
  documento: string;
  observacion: string | null;
  anulada: boolean;
  motivoAnulacion: string | null;
}

export interface FilaReporteDto {
  personaId: string;
  dni: string;
  nombreCompleto: string;
  cargo: string;
  condicion: string;
  jornada: number | null;
  /** Un código por cada día del mes; vacío si no corresponde o aún no llega. */
  dias: CodigoDia[];
  diasInasistencia: number;
  tardanza: { horas: number; minutos: number };
  permisoSinGoce: { horas: number; minutos: number };
  diasHuelga: number;
  observaciones: string;
}

export interface ReporteUgelDto {
  mes: string;
  /** El mes no ha terminado: los documentos salen marcados como borrador. */
  borrador: boolean;
  encabezado: {
    dreUgel: string;
    institucion: string;
    nivelModalidad: string;
    turno: string;
    periodo: string;
    lugar: string;
    director: string;
  };
  /** Número e inicial de cada día del mes. */
  calendario: { numero: number; inicial: string }[];
  filas: FilaReporteDto[];
  /** Códigos del Anexo 03 vigentes según la configuración: [código, significado]. */
  leyenda: (readonly [string, string])[];
  /** Cosas que dirección debe revisar antes de firmar y enviar. */
  avisos: string[];
}
