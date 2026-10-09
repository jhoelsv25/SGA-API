import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonaResponseDto } from "../../personas/dto/persona-response.dto";
import type { EstudianteResponseDto } from "../../estudiantes/dto/estudiante-response.dto";

export class EstudianteVinculadoDto {
  @ApiProperty({ description: "UUID del estudiante" })
  estudianteId!: string;

  @ApiProperty({ description: "Código SIAGIE del estudiante" })
  codigoSiagie!: string;

  @ApiProperty({ description: "Nombre completo del estudiante" })
  nombreCompleto!: string;

  @ApiProperty({ description: "Parentesco registrado" })
  parentesco!: string;

  @ApiProperty({ description: "Indica si es el apoderado principal" })
  esPrincipal!: boolean;

  @ApiProperty({ description: "Indica si convive con el estudiante" })
  viveConEstudiante!: boolean;

  @ApiProperty({ description: "Indica si está autorizado para recoger" })
  autorizadoRecoger!: boolean;

  @ApiProperty({ description: "Indica si es contacto de emergencia" })
  contactoEmergencia!: boolean;
}

export class ApoderadoUsuarioDto {
  @ApiProperty({ description: "UUID de usuario" })
  id!: string;

  @ApiProperty({ description: "Nombre de usuario de acceso" })
  nombreUsuario!: string;

  @ApiProperty({ description: "Estado de la cuenta" })
  estado!: string;
}

export class ApoderadoResponseDto {
  @ApiProperty({ description: "UUID único del registro de apoderado" })
  id!: string;

  @ApiProperty({ description: "UUID de la persona asociada" })
  personaId!: string;

  @ApiPropertyOptional({ description: "Ocupación o profesión" })
  ocupacion!: string | null;

  @ApiPropertyOptional({ description: "Centro laboral o empresa" })
  centroLaboral!: string | null;

  @ApiPropertyOptional({ description: "Teléfono laboral" })
  telefonoLaboral!: string | null;

  @ApiPropertyOptional({ description: "Grado de instrucción" })
  gradoInstruccion!: string | null;

  @ApiPropertyOptional({ description: "Cargo vigente en la institución" })
  cargoVigente!: string | null;

  @ApiPropertyOptional({ description: "Cuenta de usuario asignada" })
  usuario!: ApoderadoUsuarioDto | null;

  @ApiProperty({
    description: "Lista de estudiantes vinculados",
    type: [EstudianteVinculadoDto],
  })
  estudiantes!: EstudianteVinculadoDto[];

  @ApiProperty({ description: "Fecha de registro de la ficha" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última modificación" })
  actualizadoEn!: string;

  @ApiProperty({ description: "Datos personales del padrón único", type: PersonaResponseDto })
  persona!: PersonaResponseDto;
}

export class VinculoFamiliarResponseDto {
  @ApiProperty({ description: "UUID del estudiante" })
  estudianteId!: string;

  @ApiProperty({ description: "UUID del apoderado" })
  apoderadoId!: string;

  @ApiProperty({ description: "Parentesco" })
  parentesco!: string;

  @ApiProperty({ description: "Indica si es el apoderado principal" })
  esPrincipal!: boolean;

  @ApiProperty({ description: "Indica si vive con el estudiante" })
  viveConEstudiante!: boolean;

  @ApiProperty({ description: "Indica si está autorizado para recoger" })
  autorizadoRecoger!: boolean;

  @ApiProperty({ description: "Indica si es contacto de emergencia" })
  contactoEmergencia!: boolean;

  @ApiProperty({ description: "Fecha de creación del vínculo" })
  creadoEn!: string;

  @ApiPropertyOptional({ description: "Ficha del estudiante vinculado" })
  estudiante?: EstudianteResponseDto;

  @ApiPropertyOptional({ description: "Ficha del apoderado vinculado" })
  apoderado?: ApoderadoResponseDto;
}

export class CreateApoderadoResponseDto {
  @ApiProperty({ description: "Ficha de apoderado creada", type: ApoderadoResponseDto })
  apoderado!: ApoderadoResponseDto;

  @ApiPropertyOptional({
    description: "Contraseña temporal si se generó una cuenta nueva",
    example: "Temp*8842",
  })
  tempPassword!: string | null;

  @ApiPropertyOptional({
    description: "Vínculo familiar si se indicó estudianteId",
    type: VinculoFamiliarResponseDto,
  })
  vinculo?: VinculoFamiliarResponseDto | null;
}

export class PaginatedApoderadosResponseDto {
  @ApiProperty({ type: [ApoderadoResponseDto] })
  data!: ApoderadoResponseDto[];

  @ApiPropertyOptional({
    description: "Cursor para solicitar la siguiente página (null si es la última)",
  })
  nextCursor!: string | null;

  @ApiProperty({ description: "Indica si existen registros adicionales" })
  hasMore!: boolean;

  @ApiProperty({ description: "Límite de registros solicitados" })
  limit!: number;
}
