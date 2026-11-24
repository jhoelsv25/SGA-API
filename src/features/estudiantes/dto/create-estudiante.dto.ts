import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
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

export class CreateEstudianteDto {
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
  @ValidateIf((o: CreateEstudianteDto) => !o.personaId)
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

  @ApiProperty({
    description: "Código SIAGIE único de identificación del estudiante",
    example: "20261234567890",
  })
  @IsNotEmpty({ message: "El código SIAGIE del estudiante es obligatorio." })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({
    description: "Fecha de ingreso a la institución escolar (YYYY-MM-DD)",
    example: "2026-03-01",
  })
  @IsNotEmpty({ message: "La fecha de ingreso es obligatoria." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de ingreso debe tener formato YYYY-MM-DD.",
  })
  fechaIngreso: string;

  @ApiPropertyOptional({
    description: "Lengua materna del estudiante",
    example: "Castellano",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lenguaMaterna?: string;

  @ApiPropertyOptional({
    description: "Religión profesada por el estudiante",
    example: "Católica",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({
    description: "Indica si el estudiante posee alguna discapacidad certificada",
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  tieneDiscapacidad?: boolean;

  @ApiPropertyOptional({
    description: "Detalle de la discapacidad (solo si tieneDiscapacidad es verdadero)",
    example: "Discapacidad auditiva moderada",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  detalleDiscapacidad?: string;

  @ApiPropertyOptional({
    description: "Grupo y factor sanguíneo (ej. O+, A+, etc.)",
    example: "O+",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  grupoSanguineo?: string;

  @ApiPropertyOptional({
    description: "Alergias conocidas a medicamentos o alimentos",
    example: "Penicilina",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alergias?: string;

  @ApiPropertyOptional({
    description: "Condiciones médicas relevantes para emergencias",
    example: "Asma leve controlada",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  condicionesMedicas?: string;

  @ApiPropertyOptional({
    description: "Seguro de salud vigente (SIS, EsSalud, Particular)",
    example: "SIS",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  seguroSalud?: string;

  @ApiPropertyOptional({
    description:
      "Estado inicial de la ficha del estudiante (por defecto activo; útil para carga histórica)",
    enum: ["activo", "retirado", "trasladado", "egresado"],
    default: "activo",
    example: "activo",
  })
  @IsOptional()
  @IsIn(["activo", "retirado", "trasladado", "egresado"], {
    message: "El estado debe ser activo, retirado, trasladado o egresado.",
  })
  estado?: "activo" | "retirado" | "trasladado" | "egresado";
}
