import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  ESTADOS_PLANIFICACION,
  MOMENTOS,
  type EstadoPlanificacion,
  type Momento,
} from "../constants";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MSG_FECHA = "La fecha debe tener el formato AAAA-MM-DD.";
const MSG_HORA = "La hora debe tener el formato HH:MM.";

export class DesempenoPlanDto {
  @ApiPropertyOptional({ description: "Desempeño del catálogo del que parte; vacío si es propio" })
  @IsOptional()
  @IsUUID()
  desempenoId?: string;
  @ApiProperty({ description: "Desempeño precisado (texto que el docente redacta para su sesión)" })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  texto!: string;
}

export class CompetenciaPlanDto {
  @ApiProperty() @IsUUID() competenciaId!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  capacidades!: string[];
  @ApiProperty({ type: [DesempenoPlanDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DesempenoPlanDto)
  desempenos!: DesempenoPlanDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) campoTematico?: string;
}

export class TransversalPlanDto {
  @ApiProperty() @IsUUID() competenciaId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) capacidades!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) desempeno?: string;
}

export class EnfoquePlanDto {
  @ApiProperty() @IsUUID() enfoqueId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) valores!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) acciones!: string[];
}

export class MaterialesPlanDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impresos?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manipulativos?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  digitales?: string[];
  @ApiPropertyOptional({ type: [String], description: "Materiales y recursos del MINEDU" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  recursos?: string[];
  @ApiPropertyOptional({
    type: [String],
    description: "Espacios de interacción con sabios, familias y comunidad",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  comunidad?: string[];
}

export class ConceptoMapaDto {
  @ApiProperty() @IsString() @MaxLength(100) concepto!: string;
  @ApiProperty() @IsString() @MaxLength(500) definicion!: string;
}

export class MomentoPlanDto {
  @ApiProperty({ enum: MOMENTOS }) @IsIn(MOMENTOS) momento!: Momento;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) actividades?: string;
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @IsInt() @Min(0) @Max(600) minutos?: number;
}

export class GuardarPlanificacionDto {
  @ApiProperty({ description: "Bloque del horario del docente que se planifica" })
  @IsUUID()
  horarioId!: string;
  @ApiProperty({ example: "2027-03-18" }) @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) numero?: number;
  @ApiPropertyOptional({ example: "U7" }) @IsOptional() @IsString() @MaxLength(50) unidad?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(250) titulo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) proposito?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) evidencia?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  criterios?: string[];
  @ApiPropertyOptional({
    description: "Código de `catalogo_sesion_opciones` (tipo instrumento_evaluacion)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  instrumentoCodigo?: string;
  @ApiPropertyOptional({ type: [CompetenciaPlanDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CompetenciaPlanDto)
  competencias?: CompetenciaPlanDto[];
  @ApiPropertyOptional({ type: [TransversalPlanDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransversalPlanDto)
  competenciasTransversales?: TransversalPlanDto[];
  @ApiPropertyOptional({ type: [EnfoquePlanDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnfoquePlanDto)
  enfoques?: EnfoquePlanDto[];
  @ApiPropertyOptional({ type: MaterialesPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialesPlanDto)
  materiales?: MaterialesPlanDto;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  referencias?: string[];
  @ApiPropertyOptional({ description: "Producto de la sesión" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  producto?: string;
  @ApiPropertyOptional({ description: "Coordinador(a) que firma el documento" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  coordinador?: string;
  @ApiPropertyOptional({ type: [String], description: "Acuerdos de convivencia" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  acuerdos?: string[];
  @ApiPropertyOptional({ type: [ConceptoMapaDto], description: "Mapa visual del desarrollo" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ConceptoMapaDto)
  mapaVisual?: ConceptoMapaDto[];
  @ApiPropertyOptional({
    type: [String],
    description: "Otras secciones del mismo curso y grado que usan esta sesión",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("all", { each: true })
  seccionesAdicionales?: string[];
  @ApiPropertyOptional({ type: [MomentoPlanDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MomentoPlanDto)
  momentos?: MomentoPlanDto[];
}

export class DestinoCopiaDto {
  @ApiProperty() @IsUUID() horarioId!: string;
  @ApiProperty({ example: "2027-03-25" }) @Matches(FECHA, { message: MSG_FECHA }) fecha!: string;
}

export class CopiarPlanificacionDto {
  @ApiProperty({ type: [DestinoCopiaDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => DestinoCopiaDto)
  destinos!: DestinoCopiaDto[];
}

export class SemanaQueryDto {
  @ApiPropertyOptional({
    example: "2027-03-15",
    description: "Cualquier fecha de la semana; por defecto, hoy",
  })
  @IsOptional()
  @Matches(FECHA, { message: MSG_FECHA })
  fecha?: string;
}

export class ComentarioPlanificacionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) texto!: string;
}

export class VerificacionAulaDto {
  @ApiProperty({ description: "true = estuvo en el aula; false = no estuvo" })
  @IsBoolean()
  enAula!: boolean;
  @ApiPropertyOptional({ example: "08:10" })
  @IsOptional()
  @Matches(HORA, { message: MSG_HORA })
  horaInicio?: string;
  @ApiPropertyOptional({ example: "09:00" })
  @IsOptional()
  @Matches(HORA, { message: MSG_HORA })
  horaFin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) observacion?: string;
}

export class SupervisionQueryDto {
  @ApiPropertyOptional({ example: "2027-03-18" })
  @IsOptional()
  @Matches(FECHA, { message: MSG_FECHA })
  fecha?: string;
}

export class CrearDesempenoDto {
  @ApiProperty() @IsUUID() competenciaId!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) grado!: number;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) texto!: string;
}

export class EditarDesempenoDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) texto!: string;
}

export class DesempenosQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  grado?: number;
}

export class CompetenciasQueryDto {
  @ApiPropertyOptional({ description: "Código del área (p. ej. educacion_fisica)" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  area?: string;
}

export class HistorialQueryDto {
  @ApiPropertyOptional({ example: "2026-09-01", description: "Por defecto, 60 días atrás" })
  @IsOptional()
  @Matches(FECHA, { message: MSG_FECHA })
  desde?: string;
  @ApiPropertyOptional({ example: "2026-12-19", description: "Por defecto, 30 días adelante" })
  @IsOptional()
  @Matches(FECHA, { message: MSG_FECHA })
  hasta?: string;
  @ApiPropertyOptional({ enum: ESTADOS_PLANIFICACION })
  @IsOptional()
  @IsIn(ESTADOS_PLANIFICACION)
  estado?: EstadoPlanificacion;
}

export class HistorialSupervisionQueryDto extends HistorialQueryDto {
  @ApiPropertyOptional({ description: "Solo las planificaciones de este docente" })
  @IsOptional()
  @IsUUID()
  docenteId?: string;
}
