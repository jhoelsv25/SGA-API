import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { DirigidoA, PrioridadComunicado } from "../interfaces";

export class CrearComunicadoDto {
  @ApiProperty({ description: "Título del comunicado", maxLength: 150 })
  @IsString({ message: "El título debe ser una cadena de texto" })
  @IsNotEmpty({ message: "Ingrese el título y el contenido del comunicado." })
  @MaxLength(150, { message: "El título no puede exceder los 150 caracteres" })
  titulo!: string;

  @ApiProperty({ description: "Cuerpo y contenido del comunicado" })
  @IsString({ message: "El contenido debe ser una cadena de texto" })
  @IsNotEmpty({ message: "Ingrese el título y el contenido del comunicado." })
  contenido!: string;

  @ApiProperty({
    description: "Público objetivo del comunicado",
    enum: ["todos", "docentes", "estudiantes", "apoderados"],
  })
  @IsIn(["todos", "docentes", "estudiantes", "apoderados"], {
    message: "El público objetivo debe ser todos, docentes, estudiantes o apoderados",
  })
  dirigidoA!: DirigidoA;

  @ApiPropertyOptional({ description: "ID del grado escolar si el alcance es por grado" })
  @IsOptional()
  @IsUUID("4", { message: "El gradoId debe ser un UUID válido" })
  gradoId?: string;

  @ApiPropertyOptional({ description: "ID de la sección escolar si el alcance es por sección" })
  @IsOptional()
  @IsUUID("4", { message: "El seccionId debe ser un UUID válido" })
  seccionId?: string;

  @ApiPropertyOptional({
    description: "Prioridad del comunicado",
    enum: ["normal", "importante", "urgente"],
    default: "normal",
  })
  @IsOptional()
  @IsIn(["normal", "importante", "urgente"], {
    message: "La prioridad debe ser normal, importante o urgente",
  })
  prioridad?: PrioridadComunicado = "normal";

  @ApiPropertyOptional({
    description: "URL del archivo adjunto (PDF o imagen)",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  adjuntoUrl?: string;

  @ApiPropertyOptional({
    description: "Fecha de vencimiento (ISO 8601)",
    example: "2026-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha de vencimiento debe tener formato ISO válido" })
  venceEn?: string;

  @ApiPropertyOptional({
    description:
      "Si es true, se publica inmediatamente notificando a los destinatarios. Si es false, se guarda en borrador.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  publicar?: boolean = false;
}
