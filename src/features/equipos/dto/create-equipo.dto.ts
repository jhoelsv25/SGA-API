import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { EQUIPO_PROPOSITOS, EQUIPO_TIPOS, EquipoProposito, EquipoTipo } from "../constants";

export class CreateEquipoDto {
  @ApiProperty({ description: "Nombre identificador del equipo", example: "Kiosko Estudiantes" })
  @IsString()
  @IsNotEmpty({ message: "El nombre del equipo es obligatorio." })
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ description: "Ubicación física en el colegio", example: "Puerta principal" })
  @IsString()
  @IsNotEmpty({ message: "La ubicación del equipo es obligatoria." })
  @MaxLength(150)
  ubicacion!: string;

  @ApiProperty({ description: "Tipo de equipo", enum: EQUIPO_TIPOS, example: "kiosko" })
  @IsIn(EQUIPO_TIPOS, { message: "El tipo debe ser kiosko o biometrico." })
  tipo!: EquipoTipo;

  @ApiProperty({
    description: "Propósito del equipo",
    enum: EQUIPO_PROPOSITOS,
    example: "marcacion",
  })
  @IsIn(EQUIPO_PROPOSITOS, { message: "El propósito debe ser marcacion o sesiones." })
  proposito!: EquipoProposito;

  @ApiProperty({
    description: "Tipos de personas habilitadas (ej: estudiantes, docentes)",
    example: "estudiantes",
  })
  @IsString()
  @IsNotEmpty({ message: "Indique quién puede usar este equipo." })
  @MaxLength(100)
  usuariosPermitidos!: string;

  @ApiPropertyOptional({ description: "Número de serie (obligatorio para biométricos)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroSerie?: string | null;
}
