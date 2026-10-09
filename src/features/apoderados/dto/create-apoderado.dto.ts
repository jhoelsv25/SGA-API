import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { CreatePersonaDto } from "../../personas/dto/create-persona.dto";
import {
  GRADOS_INSTRUCCION,
  PARENTESCOS,
  type GradoInstruccion,
  type Parentesco,
} from "../constants";

export class CreateApoderadoDto {
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
  @ValidateIf((o: CreateApoderadoDto) => !o.personaId)
  @ValidateNested()
  @Type(() => CreatePersonaDto)
  nuevaPersona?: CreatePersonaDto;

  @ApiPropertyOptional({
    description: "Ocupación o profesión del apoderado",
    example: "Ingeniero Civil",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ocupacion?: string;

  @ApiPropertyOptional({
    description: "Empresa o centro de trabajo del apoderado",
    example: "Constructora del Sur S.A.C.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  centroLaboral?: string;

  @ApiPropertyOptional({
    description: "Teléfono fijo o anexo del centro laboral",
    example: "014567890",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefonoLaboral?: string;

  @ApiPropertyOptional({
    description: "Grado de instrucción alcanzado",
    enum: GRADOS_INSTRUCCION,
    example: "universitaria",
  })
  @IsOptional()
  @IsIn(GRADOS_INSTRUCCION, {
    message:
      "El grado de instrucción debe ser: sin_estudios, primaria, secundaria, tecnica, universitaria o posgrado.",
  })
  gradoInstruccion?: GradoInstruccion;

  // Datos opcionales de vinculación inmediata con un estudiante
  @ApiPropertyOptional({
    description: "ID de estudiante al que se vinculará de inmediato (si aplica)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID("4")
  estudianteId?: string;

  @ApiPropertyOptional({
    description: "Parentesco con el estudiante si se envía estudianteId",
    enum: PARENTESCOS,
    example: "padre",
  })
  @ValidateIf((o: CreateApoderadoDto) => Boolean(o.estudianteId))
  @IsNotEmpty({ message: "El parentesco es obligatorio si se indica un estudiante." })
  @IsIn(PARENTESCOS, {
    message: "Parentesco no válido.",
  })
  parentesco?: Parentesco;

  @ApiPropertyOptional({
    description: "Indica si es el apoderado principal del estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiPropertyOptional({
    description: "Indica si el apoderado reside con el estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  viveConEstudiante?: boolean;

  @ApiPropertyOptional({
    description: "Indica si está autorizado para recoger al estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autorizadoRecoger?: boolean;

  @ApiPropertyOptional({
    description: "Indica si es contacto de emergencia preferente",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  contactoEmergencia?: boolean;
}
