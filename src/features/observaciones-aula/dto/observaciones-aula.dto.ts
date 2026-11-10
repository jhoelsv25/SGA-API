import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from "class-validator";
import {
  ESTADOS_OBSERVACION,
  MENSAJES_OBSERVACION,
  RESULTADOS_COMPROMISO_OBS,
  type EstadoObservacion,
  type ResultadoCompromisoObs,
} from "../constants";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MSG_FECHA = "La fecha debe tener el formato AAAA-MM-DD.";
const MSG_HORA = "La hora debe tener el formato HH:MM.";
const MOTIVO = { message: MENSAJES_OBSERVACION.SIN_MOTIVO };

export class ProgramarObservacionDto {
  @ApiProperty() @IsUUID() docenteId!: string;
  @ApiProperty({ description: "Curso en la sección (carga académica) que se observa" })
  @IsUUID()
  cursoSeccionId!: string;
  @ApiProperty({ example: "2027-03-18" }) @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
  @ApiPropertyOptional({
    example: "08:30",
    description: "Solo si el docente dicta el curso en varios bloques ese día",
  })
  @IsOptional()
  @Matches(HORA, { message: MSG_HORA })
  horaInicio?: string;
  @ApiPropertyOptional({ description: "Usuario observador; por defecto, quien programa" })
  @IsOptional()
  @IsUUID()
  observadorUsuarioId?: string;
}

export class ReprogramarObservacionDto {
  @ApiProperty() @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HORA, { message: MSG_HORA }) horaInicio?: string;
  @ApiProperty() @IsString(MOTIVO) @IsNotEmpty(MOTIVO) @MaxLength(500) motivo!: string;
}

export class CancelarObservacionDto {
  @ApiProperty() @IsString(MOTIVO) @IsNotEmpty(MOTIVO) @MaxLength(500) motivo!: string;
}

export class IniciarObservacionDto {
  @ApiProperty({ example: "08:32" }) @Matches(HORA, { message: MSG_HORA }) horaInicio!: string;
  @ApiProperty({ example: 16 }) @IsInt() @Min(0) @Max(200) estudiantesPresentes!: number;
}

export class RegistrarNotaDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt({ message: MENSAJES_OBSERVACION.DESEMPENO_INVALIDO })
  @Min(1, { message: MENSAJES_OBSERVACION.DESEMPENO_INVALIDO })
  @Max(5, { message: MENSAJES_OBSERVACION.DESEMPENO_INVALIDO })
  desempeno!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) aspecto?: string;
  @ApiProperty({ description: "Conducta observable (no una calificación)" })
  @IsString({ message: MENSAJES_OBSERVACION.NOTA_VACIA })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.NOTA_VACIA })
  @MaxLength(1000)
  texto!: string;
  @ApiPropertyOptional({ example: "08:45" })
  @IsOptional()
  @Matches(HORA, { message: MSG_HORA })
  horaAproximada?: string;
}

export class EditarNotaDto {
  @ApiProperty()
  @IsString({ message: MENSAJES_OBSERVACION.NOTA_VACIA })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.NOTA_VACIA })
  @MaxLength(1000)
  texto!: string;
}

export class CerrarNotasDto {
  @ApiProperty({ example: "09:25" }) @Matches(HORA, { message: MSG_HORA }) horaFin!: string;
  @ApiPropertyOptional({
    description: "Confirma guardar aunque la duración quede fuera de 45 a 90 minutos",
  })
  @IsOptional()
  @IsBoolean()
  confirmarDuracion?: boolean;
}

export class CalificarDesempenoDto {
  @ApiProperty({ minimum: 1, maximum: 4, description: "1 = I … 4 = IV" })
  @IsInt({ message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  @Min(1, { message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  @Max(4, { message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  nivel!: number;
  @ApiProperty()
  @IsString({ message: MENSAJES_OBSERVACION.FUNDAMENTO })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.FUNDAMENTO })
  @MaxLength(1000)
  fundamento!: string;
}

export class CorregirCalificacionDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 4 })
  @IsOptional()
  @IsInt({ message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  @Min(1, { message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  @Max(4, { message: MENSAJES_OBSERVACION.NIVEL_INVALIDO })
  nivel?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) fundamento?: string;
  @ApiProperty()
  @IsString({ message: MENSAJES_OBSERVACION.MOTIVO_CAMBIO })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.MOTIVO_CAMBIO })
  @MaxLength(500)
  motivo!: string;
}

export class RegistrarReunionDto {
  @ApiProperty({ example: "2027-03-19" }) @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
  @ApiProperty({ example: "10:00" }) @Matches(HORA, { message: MSG_HORA }) horaInicio!: string;
  @ApiProperty({ example: "10:30" }) @Matches(HORA, { message: MSG_HORA }) horaFin!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(2000) resumen!: string;
}

export class AgregarCompromisoDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt({ message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  @Min(1, { message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  @Max(5, { message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  desempeno!: number;
  @ApiProperty()
  @IsString({ message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  @MaxLength(500)
  descripcion!: string;
  @ApiProperty({ example: "2027-04-30" })
  @Matches(FECHA, { message: MENSAJES_OBSERVACION.COMPROMISO_INCOMPLETO })
  fechaRevision!: string;
}

export class CorregirCompromisoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) descripcion?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(FECHA, { message: MSG_FECHA })
  fechaRevision?: string;
  @ApiPropertyOptional({ description: "Obligatorio cuando la observación ya está retroalimentada" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

export class CerrarRetroalimentacionDto {
  @ApiPropertyOptional({
    description: "Confirma que no hace falta ningún compromiso (todos en nivel IV)",
  })
  @IsOptional()
  @IsBoolean()
  sinCompromisos?: boolean;
}

export class CerrarCompromisoObsDto {
  @ApiProperty({ enum: RESULTADOS_COMPROMISO_OBS })
  @IsIn(RESULTADOS_COMPROMISO_OBS)
  resultado!: ResultadoCompromisoObs;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) observacion!: string;
}

export class ReobservacionDto {
  @ApiProperty() @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(HORA, { message: MSG_HORA }) horaInicio?: string;
}

export class ComentarioDocenteDto {
  @ApiProperty()
  @IsString({ message: MENSAJES_OBSERVACION.COMENTARIO_VACIO })
  @IsNotEmpty({ message: MENSAJES_OBSERVACION.COMENTARIO_VACIO })
  @MaxLength(1000)
  texto!: string;
}

export class FiltroObservacionesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() docenteId?: string;
  @ApiPropertyOptional({ enum: ESTADOS_OBSERVACION })
  @IsOptional()
  @IsIn(ESTADOS_OBSERVACION)
  estado?: EstadoObservacion;
  @ApiPropertyOptional() @IsOptional() @IsUUID() periodoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() anioAcademicoId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(FECHA, { message: MSG_FECHA }) desde?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(FECHA, { message: MSG_FECHA }) hasta?: string;
}

export class AnioQueryDto {
  @ApiPropertyOptional({ description: "Por defecto, el año lectivo de trabajo" })
  @IsOptional()
  @IsUUID()
  anioAcademicoId?: string;
}

export class MatrizQueryDto extends AnioQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 4, description: "Filtra por nivel (1 a 4)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  nivel?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: "Filtra por desempeño" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  desempeno?: number;
}

export class ResumenConsolidadoQueryDto {
  @ApiProperty() @IsUUID() docenteId!: string;
  @ApiProperty() @IsUUID() periodoId!: string;
}

export class NivelInstrumentoDto {
  @ApiProperty({ minimum: 1, maximum: 4 }) @IsInt() @Min(1) @Max(4) nivel!: number;
  @ApiProperty() @IsString() @MaxLength(1500) descripcion!: string;
}

export class DesempenoInstrumentoDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) numero!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(250) nombre!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  aspectos!: string[];
  @ApiProperty({ type: [NivelInstrumentoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NivelInstrumentoDto)
  niveles!: NivelInstrumentoDto[];
}

export class CrearInstrumentoDto {
  @ApiProperty({ example: "instructivo-2025" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo!: string;
  @ApiProperty({ example: "Instructivo 2025 (Informe 00545-2025-MINEDU)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) fuente?: string;
  @ApiProperty({ type: [DesempenoInstrumentoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesempenoInstrumentoDto)
  desempenos!: DesempenoInstrumentoDto[];
  @ApiPropertyOptional({ description: "Marcarla como la vigente para observaciones nuevas" })
  @IsOptional()
  @IsBoolean()
  vigente?: boolean;
}
