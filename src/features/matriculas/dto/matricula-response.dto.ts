import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MatriculaEstudianteItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty()
  tipoDocumento!: string;

  @ApiProperty()
  numeroDocumento!: string;

  @ApiProperty()
  estado!: string;
}

export class MatriculaResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ example: "2027-000001" })
  codigo!: string;

  @ApiProperty({ example: "2027-03-01" })
  fechaMatricula!: string;

  @ApiProperty({ example: "nuevo", enum: ["nuevo", "continuador", "traslado"] })
  tipo!: string;

  @ApiProperty({
    example: "matriculado",
    enum: ["matriculado", "retirado", "trasladado", "culminado"],
  })
  estado!: string;

  @ApiProperty({ example: false })
  esRepitente!: boolean;

  @ApiPropertyOptional({ example: "I.E. Los Próceres" })
  colegioProcedencia?: string | null;

  @ApiPropertyOptional({ example: "2027-08-15" })
  fechaRetiro?: string | null;

  @ApiPropertyOptional({ example: "Cambio de domicilio" })
  motivoRetiro?: string | null;

  @ApiPropertyOptional()
  observaciones?: string | null;

  @ApiProperty()
  anioAcademicoId!: string;

  @ApiProperty({ example: 2027 })
  anioNumero!: number;

  @ApiProperty()
  gradoId!: string;

  @ApiProperty({ example: 1 })
  gradoNumero!: number;

  @ApiProperty({ example: "1.° de Secundaria" })
  gradoNombre!: string;

  @ApiProperty()
  seccionId!: string;

  @ApiProperty({ example: "A" })
  seccionNombre!: string;

  @ApiProperty({ type: MatriculaEstudianteItemDto })
  estudiante!: MatriculaEstudianteItemDto;

  @ApiProperty()
  creadoEn!: string;
}

export class MatriculaCreatedResponseDto {
  @ApiProperty({ type: MatriculaResponseDto })
  matricula!: MatriculaResponseDto;

  @ApiPropertyOptional({
    description: "Advertencia si el estudiante no tiene apoderado principal registrado",
    example:
      "El estudiante no tiene apoderado principal registrado. Regístrelo para que reciba la libreta.",
  })
  advertencia?: string | null;
}

export class MatriculaNoProcesadaItemDto {
  @ApiProperty()
  estudianteId!: string;

  @ApiProperty()
  estudianteNombre!: string;

  @ApiProperty()
  motivo!: string;
}

export class MatriculaMasivaResultadoDto {
  @ApiProperty({
    example: "Se matricularon 30 estudiantes en 5.° A. 3 no se matricularon; revise el detalle.",
  })
  message!: string;

  @ApiProperty({ example: 30 })
  totalMatriculados!: number;

  @ApiProperty({ example: 3 })
  totalNoMatriculados!: number;

  @ApiProperty({ type: [MatriculaResponseDto] })
  matriculados!: MatriculaResponseDto[];

  @ApiProperty({ type: [MatriculaNoProcesadaItemDto] })
  noMatriculados!: MatriculaNoProcesadaItemDto[];
}

export class PaginatedMatriculasResponseDto {
  @ApiProperty({ type: [MatriculaResponseDto] })
  data!: MatriculaResponseDto[];

  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la página siguiente, o null si es la última",
    example: "eyJjcmVhZG9FbiI6IjIwMjctMDMtMDEiLCJpZCI6IjEyMyJ9",
  })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;

  @ApiProperty({ example: 20 })
  limit!: number;
}
