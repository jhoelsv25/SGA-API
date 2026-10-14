import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ACCIONES_ACTIVIDAD_AULA, type AccionActividadAula } from "../constants";

export class CrearPublicacionDto {
  @ApiPropertyOptional({
    description: "Texto de la publicación.",
    example: "¿Alguien entendió el ejercicio 7?",
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, { message: "El texto no puede exceder los 3000 caracteres." })
  contenido?: string;

  @ApiPropertyOptional({
    description: "Enlace adjunto opcional si no es archivo subido.",
    example: "https://ejemplo.com/recurso",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  enlaceAdjunto?: string;
}

export class EditarPublicacionDto {
  @ApiPropertyOptional({
    description: "Nuevo texto de la publicación.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, { message: "El texto no puede exceder los 3000 caracteres." })
  contenido?: string;

  @ApiPropertyOptional({
    description: "Nuevo enlace adjunto opcional.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  enlaceAdjunto?: string;
}

export class FijarPublicacionDto {
  @ApiProperty({
    description: "Indica si la publicación está fijada arriba del muro.",
    example: true,
  })
  @IsBoolean({ message: "El valor de fijada debe ser booleano." })
  fijada!: boolean;
}

export class CrearComentarioDto {
  @ApiProperty({
    description: "Texto del comentario.",
    example: "Yo lo resolví factorizando.",
  })
  @IsString({ message: "El comentario debe ser texto." })
  @IsNotEmpty({ message: "Escriba un texto o agregue un adjunto." })
  @MaxLength(1500, { message: "El comentario no puede exceder los 1500 caracteres." })
  contenido!: string;
}

export class EditarComentarioDto {
  @ApiProperty({
    description: "Texto actualizado del comentario.",
  })
  @IsString({ message: "El comentario debe ser texto." })
  @IsNotEmpty({ message: "Escriba un texto o agregue un adjunto." })
  @MaxLength(1500, { message: "El comentario no puede exceder los 1500 caracteres." })
  contenido!: string;
}

export class EnviarMensajeChatDto {
  @ApiPropertyOptional({
    description: "Texto del mensaje de chat.",
    example: "¿La tarea es para el lunes?",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "El mensaje no puede exceder los 2000 caracteres." })
  mensaje?: string;

  @ApiPropertyOptional({
    description: "Enlace opcional.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  enlaceAdjunto?: string;
}

export class OcultarContenidoDto {
  @ApiProperty({
    description: "Motivo del ocultamiento por moderación.",
    example: "Lenguaje inapropiado",
  })
  @IsString({ message: "El motivo debe ser texto." })
  @IsNotEmpty({ message: "Indique el motivo para ocultar el contenido." })
  @MaxLength(255, { message: "El motivo no puede exceder los 255 caracteres." })
  motivo!: string;
}

export class RegistrarActividadDto {
  @ApiPropertyOptional({
    description: "ID del material (si la actividad es sobre un material).",
  })
  @IsOptional()
  @IsUUID("4", { message: "El ID del material no es válido." })
  materialId?: string;

  @ApiPropertyOptional({
    description: "ID de la tarea (si la actividad es sobre una tarea).",
  })
  @IsOptional()
  @IsUUID("4", { message: "El ID de la tarea no es válido." })
  tareaId?: string;

  @ApiProperty({
    description: "Acción efectuada por el estudiante.",
    enum: ACCIONES_ACTIVIDAD_AULA,
    example: "visualizo",
  })
  @IsIn(ACCIONES_ACTIVIDAD_AULA, { message: "La acción de actividad no es válida." })
  accion!: AccionActividadAula;
}
