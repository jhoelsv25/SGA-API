import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateEquipoDto {
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

  @ApiProperty({ description: "Tipos de personas habilitadas", example: "estudiantes" })
  @IsString()
  @IsNotEmpty({ message: "Indique quién puede usar este equipo." })
  @MaxLength(100)
  usuariosPermitidos!: string;

  @ApiPropertyOptional({ description: "Número de serie" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroSerie?: string | null;
}
