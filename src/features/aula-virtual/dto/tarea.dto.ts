import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CALCULOS_NOTA_INTENTOS,
  REVELAR_RESPUESTAS,
  TIPOS_PREGUNTA,
  TIPOS_TAREA,
  type CalculoNotaIntentos,
  type RevelarRespuestas,
  type TipoPregunta,
  type TipoTarea,
} from "../constants";

export class OpcionPreguntaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: "París" })
  @IsString({ message: "El texto de la opción es obligatorio." })
  @IsNotEmpty({ message: "El texto de la opción no puede estar vacío." })
  @MaxLength(255)
  texto!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  esCorrecta!: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CrearPreguntaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: "¿Cuál es la capital de Francia?" })
  @IsString({ message: "El enunciado de la pregunta es obligatorio." })
  @IsNotEmpty({ message: "El enunciado de la pregunta no puede estar vacío." })
  @MaxLength(1000)
  enunciado!: string;

  @ApiProperty({ enum: TIPOS_PREGUNTA })
  @IsIn(TIPOS_PREGUNTA, { message: "Tipo de pregunta inválido." })
  tipo!: TipoPregunta;

  @ApiProperty({ default: 2 })
  @IsNumber({}, { message: "El puntaje debe ser numérico." })
  @Min(0.1, { message: "El puntaje debe ser mayor a 0." })
  @Max(20, { message: "El puntaje no puede superar 20." })
  puntaje!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiPropertyOptional({ type: () => [OpcionPreguntaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionPreguntaDto)
  opciones?: OpcionPreguntaDto[];
}

export class CrearTareaDto {
  @ApiProperty({ maxLength: 150, example: "Resolver 10 ecuaciones cuadráticas" })
  @IsString({ message: "El título de la tarea es obligatorio." })
  @IsNotEmpty({ message: "Ingrese el título de la tarea." })
  @MaxLength(150, { message: "El título no puede exceder los 150 caracteres." })
  titulo!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instrucciones?: string;

  @ApiProperty({ enum: TIPOS_TAREA })
  @IsIn(TIPOS_TAREA, { message: "Seleccione un tipo de tarea válido." })
  tipo!: TipoTarea;

  @ApiPropertyOptional({ description: "Unidad de aprendizaje a la que pertenece." })
  @IsOptional()
  @IsUUID("4", { message: "La unidad no es válida." })
  unidadId?: string;

  @ApiPropertyOptional({ description: "Sesión de clase que refuerza." })
  @IsOptional()
  @IsUUID("4", { message: "La sesión de clase no es válida." })
  sesionClaseId?: string;

  @ApiPropertyOptional({ description: "Bimestre o periodo académico." })
  @IsOptional()
  @IsUUID("4", { message: "El periodo académico no es válido." })
  periodoId?: string;

  @ApiProperty({
    example: "2027-05-20T23:59:00Z",
    description: "Fecha y hora límite de entrega.",
  })
  @IsDateString({}, { message: "La fecha límite no es válida." })
  fechaLimite!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  permiteEntregaTardia?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  intentosMaximos?: number;

  @ApiPropertyOptional({ description: "Límite de tiempo en minutos para examen." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  limiteTiempoMinutos?: number;

  @ApiPropertyOptional({ enum: CALCULOS_NOTA_INTENTOS, default: "mas_alta" })
  @IsOptional()
  @IsIn(CALCULOS_NOTA_INTENTOS)
  calculoNotaIntentos?: CalculoNotaIntentos;

  @ApiPropertyOptional({ enum: REVELAR_RESPUESTAS, default: "al_terminar_intentos" })
  @IsOptional()
  @IsIn(REVELAR_RESPUESTAS)
  revelarRespuestas?: RevelarRespuestas;

  @ApiPropertyOptional({ example: "pdf, imagen, docx" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tiposArchivo?: string;

  @ApiPropertyOptional({ default: false, description: "Publicar inmediatamente." })
  @IsOptional()
  @IsBoolean()
  publicar?: boolean;

  @ApiPropertyOptional({ type: () => [CrearPreguntaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearPreguntaDto)
  preguntas?: CrearPreguntaDto[];
}

export class ActualizarTareaDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "El título no puede estar vacío." })
  @MaxLength(150)
  titulo?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instrucciones?: string;

  @ApiPropertyOptional({ description: "Unidad de aprendizaje a la que pertenece." })
  @IsOptional()
  @IsUUID("4", { message: "La unidad no es válida." })
  unidadId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaLimite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteEntregaTardia?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  intentosMaximos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limiteTiempoMinutos?: number;

  @ApiPropertyOptional({ enum: CALCULOS_NOTA_INTENTOS })
  @IsOptional()
  @IsIn(CALCULOS_NOTA_INTENTOS)
  calculoNotaIntentos?: CalculoNotaIntentos;

  @ApiPropertyOptional({ enum: REVELAR_RESPUESTAS })
  @IsOptional()
  @IsIn(REVELAR_RESPUESTAS)
  revelarRespuestas?: RevelarRespuestas;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tiposArchivo?: string;

  @ApiPropertyOptional({ type: () => [CrearPreguntaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearPreguntaDto)
  preguntas?: CrearPreguntaDto[];
}

export class CrearEntregaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  archivoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  archivoNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  archivoTamanoBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enlaceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  texto?: string;

  @ApiPropertyOptional({ description: "Respuestas marcadas para cuestionario o examen." })
  @IsOptional()
  respuestas?: Record<string, string | string[]>;

  @ApiPropertyOptional({
    default: false,
    description: "Si es verdadero, guarda como borrador/en progreso sin enviar formalmente.",
  })
  @IsOptional()
  @IsBoolean()
  esBorrador?: boolean;
}

export class CalificarEntregaDto {
  @ApiPropertyOptional({
    example: 15.5,
    description: "Nota numérica de 0 a 20 con hasta 2 decimales.",
  })
  @IsOptional()
  @IsNumber({}, { message: "La nota debe ser un número." })
  @Min(0, { message: "La nota debe estar entre 0 y 20." })
  @Max(20, { message: "La nota debe estar entre 0 y 20." })
  nota?: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  retroalimentacion?: string;

  @ApiPropertyOptional({
    description: "Calificación puntual de preguntas abiertas por su ID.",
  })
  @IsOptional()
  calificacionesPreguntas?: Record<string, { puntajeObtenido: number; comentario?: string }>;

  @ApiPropertyOptional({
    default: false,
    description: "Devolver la entrega al estudiante para que la corrija.",
  })
  @IsOptional()
  @IsBoolean()
  devolver?: boolean;
}

export class ProgresoIntentoDto {
  @ApiProperty({ description: "Respuestas temporales marcadas por el estudiante." })
  @IsNotEmpty({ message: "Las respuestas no pueden estar vacías." })
  respuestas!: Record<string, string | string[]>;
}

export class ListarTareasQueryDto {
  @ApiPropertyOptional({ description: "UUID del periodo académico o bimestre." })
  @IsOptional()
  @IsUUID("4")
  periodoId?: string;

  @ApiPropertyOptional({
    description: "UUID del estudiante o su persona (para consulta del apoderado).",
  })
  @IsOptional()
  @IsUUID("4")
  estudianteId?: string;
}

export class CerrarTareaDto {
  @ApiPropertyOptional({
    default: false,
    description: "Si es verdadero, asigna 0 a los estudiantes sin entrega cuando venció el plazo.",
  })
  @IsOptional()
  @IsBoolean()
  asignarCeroSinEntrega?: boolean;
}
