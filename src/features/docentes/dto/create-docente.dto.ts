import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { DarBajaFichaActualDto } from "../../personas/dto/baja-ficha.dto";
import { CreatePersonaDto } from "../../personas/dto/create-persona.dto";
import { JORNADAS_HORAS, type JornadaHoras, TIPOS_CONTRATO, type TipoContrato } from "../constants";

export class CreateDocenteDto {
  @ApiPropertyOptional({
    description: "UUID de persona existente en el padrón para vincular la ficha",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID("4")
  personaId?: string;

  @ApiPropertyOptional({
    description: "Datos de la nueva persona si no existía en el padrón",
    type: CreatePersonaDto,
  })
  @ValidateIf((o: CreateDocenteDto) => !o.personaId)
  @ValidateNested()
  @Type(() => CreatePersonaDto)
  nuevaPersona?: CreatePersonaDto;

  @ApiPropertyOptional({
    description:
      "Si la persona tiene la otra ficha académica vigente, datos para darla de baja antes de crear esta.",
    type: DarBajaFichaActualDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DarBajaFichaActualDto)
  darBajaFichaActual?: DarBajaFichaActualDto;

  @ApiPropertyOptional({
    description:
      "Código único de identificación del docente en la institución. Si se omite, el sistema genera uno de 14 dígitos (YYYYMMDD + 6 dígitos de orden).",
    example: "20261124000001",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @ApiPropertyOptional({
    description: "Especialidad pedagógica o materia principal",
    example: "Matemáticas y Física",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  especialidad?: string;

  @ApiPropertyOptional({
    description: "Título profesional universitario o pedagógico",
    example: "Licenciado en Educación Secundaria",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tituloProfesional?: string;

  @ApiProperty({
    description: "Régimen o tipo de contrato laboral",
    enum: TIPOS_CONTRATO,
    example: "nombrado",
  })
  @IsNotEmpty({ message: "El tipo de contrato es obligatorio." })
  @IsIn(TIPOS_CONTRATO, {
    message: "El tipo de contrato debe ser nombrado, contratado, destacado, encargado o practicante.",
  })
  tipoContrato: TipoContrato;

  @ApiProperty({
    description: "Jornada laboral en horas pedagógicas semanales (20, 24, 30 o 40)",
    enum: JORNADAS_HORAS,
    default: 30,
    example: 30,
  })
  @IsNotEmpty({ message: "La jornada de horas es obligatoria." })
  @Type(() => Number)
  @IsInt()
  @IsIn(JORNADAS_HORAS, {
    message: "La jornada laboral debe ser de 20, 24, 30 o 40 horas.",
  })
  jornadaHoras: JornadaHoras = 30;

  @ApiProperty({
    description: "Fecha de ingreso a la institución (YYYY-MM-DD)",
    example: "2026-03-01",
  })
  @IsNotEmpty({ message: "La fecha de ingreso es obligatoria." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de ingreso debe tener formato YYYY-MM-DD.",
  })
  fechaIngreso: string;

  @ApiPropertyOptional({
    description:
      "ID del cargo docente a asignar. Si no se envía, se asigna automáticamente 'Docente de aula'.",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID("4")
  cargoId?: string;

  @ApiPropertyOptional({
    description: "URL o ruta de la imagen digitalizada de la firma del docente",
    example: "https://ejemplo.com/firmas/doc015.png",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firmaUrl?: string;
}
