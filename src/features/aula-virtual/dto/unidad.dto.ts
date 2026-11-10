import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CrearUnidadDto {
  @ApiProperty({ maxLength: 150, example: "Ecuaciones" })
  @IsString({ message: "El título debe ser texto." })
  @IsNotEmpty({ message: "Ingrese el título de la unidad." })
  @MaxLength(150, { message: "El título no puede exceder los 150 caracteres." })
  titulo!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: "La descripción no puede exceder los 1000 caracteres." })
  descripcion?: string;

  @ApiProperty({ description: "UUID del bimestre" })
  @IsUUID("4", { message: "Seleccione el bimestre de la unidad." })
  periodoId!: string;

  @ApiProperty({ example: "2027-05-12" })
  @IsDateString({}, { message: "Ingrese la fecha de inicio de la unidad." })
  fechaInicio!: string;

  @ApiProperty({ example: "2027-06-06" })
  @IsDateString({}, { message: "Ingrese la fecha de fin de la unidad." })
  fechaFin!: string;

  @ApiPropertyOptional({ description: "Posición dentro del curso; por defecto, al final." })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @ApiPropertyOptional({ description: "Visible para los estudiantes (por defecto sí)." })
  @IsOptional()
  @IsBoolean()
  publicada?: boolean;
}

export class ActualizarUnidadDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Ingrese el título de la unidad." })
  @MaxLength(150)
  titulo?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @ApiPropertyOptional({ description: "UUID del bimestre" })
  @IsOptional()
  @IsUUID("4", { message: "Seleccione un bimestre válido." })
  periodoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @ApiPropertyOptional({ description: "false oculta la unidad a los estudiantes." })
  @IsOptional()
  @IsBoolean()
  publicada?: boolean;
}
