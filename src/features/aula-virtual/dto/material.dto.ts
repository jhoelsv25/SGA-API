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
import { TIPOS_MATERIAL, type TipoMaterial } from "../constants";

export class PlanificarMaterialDto {
  @ApiProperty({ maxLength: 150, example: "Video de repaso de ecuaciones" })
  @IsString({ message: "El título debe ser texto." })
  @IsNotEmpty({ message: "Ingrese el título del material." })
  @MaxLength(150, { message: "El título no puede exceder los 150 caracteres." })
  titulo!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @ApiProperty({ enum: TIPOS_MATERIAL })
  @IsIn(TIPOS_MATERIAL, { message: "Seleccione un tipo de material válido." })
  tipo!: TipoMaterial;

  @ApiPropertyOptional({
    description: "Bloque del horario que el material refuerza (usa la fecha de esa clase).",
  })
  @IsOptional()
  @IsUUID("4", { message: "El bloque del horario no es válido." })
  horarioId?: string;

  @ApiPropertyOptional({
    description: "Fecha de la clase del bloque elegido (obligatoria si hay horarioId).",
    example: "2027-05-15",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha de la clase no es válida." })
  fechaClase?: string;

  @ApiPropertyOptional({
    description: "Fecha programada cuando el material no está ligado a una clase.",
    example: "2027-05-30",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha programada no es válida." })
  fechaProgramada?: string;
}

export class ActualizarMaterialDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Ingrese el título del material." })
  @MaxLength(150)
  titulo?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  horarioId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaClase?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @ApiPropertyOptional({ description: "false oculta el material a los estudiantes." })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

/** Cuerpo multipart al publicar o reemplazar: el archivo va en el campo `archivo`. */
export class ContenidoMaterialDto {
  @ApiPropertyOptional({ description: "URL del material cuando el tipo es enlace." })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Ingrese un enlace válido que empiece con http:// o https://." })
  enlace?: string;
}

export class PublicarMaterialExtraDto extends ContenidoMaterialDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty({ message: "Ingrese el título del material." })
  @MaxLength(150, { message: "El título no puede exceder los 150 caracteres." })
  titulo!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @ApiProperty({ enum: TIPOS_MATERIAL })
  @IsIn(TIPOS_MATERIAL, { message: "Seleccione un tipo de material válido." })
  tipo!: TipoMaterial;
}
