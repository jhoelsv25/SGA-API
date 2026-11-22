import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

// ─── Preview de promoción (1.° a 4.° grado) ─────────────────────────────────

export class PreviewPromocionDto {
  @ApiProperty({ description: "ID de la sección del año que cerró (origen)" })
  @IsUUID("all", { message: "ID de sección origen inválido" })
  @IsNotEmpty({ message: "La sección de origen es obligatoria" })
  seccionOrigenId!: string;

  @ApiProperty({ description: "ID de la sección del año nuevo (destino)" })
  @IsUUID("all", { message: "ID de sección destino inválido" })
  @IsNotEmpty({ message: "La sección destino es obligatoria" })
  seccionDestinoId!: string;
}

export class PreviewEstudianteItemDto {
  @ApiProperty()
  estudianteId!: string;

  @ApiProperty()
  nombreCompleto!: string;

  @ApiProperty()
  numeroDocumento!: string;

  @ApiProperty()
  tipoDocumento!: string;

  @ApiPropertyOptional({ description: "Motivo por el que no se procesaría" })
  motivo?: string;
}

export class PreviewSeccionInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  grado!: string;

  @ApiProperty()
  anio!: number;

  @ApiPropertyOptional()
  totalCulminados?: number;

  @ApiPropertyOptional()
  vacantesDisponibles?: number;
}

export class PreviewPromocionResultadoDto {
  @ApiProperty({ type: PreviewSeccionInfoDto })
  seccionOrigen!: PreviewSeccionInfoDto;

  @ApiProperty({ type: PreviewSeccionInfoDto })
  seccionDestino!: PreviewSeccionInfoDto;

  @ApiProperty({ type: [PreviewEstudianteItemDto] })
  aPromover!: PreviewEstudianteItemDto[];

  @ApiProperty({ type: [PreviewEstudianteItemDto] })
  noPromovidos!: PreviewEstudianteItemDto[];

  @ApiProperty({ example: 28 })
  totalAPromover!: number;

  @ApiProperty({ example: 2 })
  totalNoPromovidos!: number;

  @ApiProperty({ description: "Estudiantes que no entrarían por falta de vacantes", example: 0 })
  sinVacantes!: number;
}

// ─── Egreso (5.° grado) ─────────────────────────────────────────────────────

export class PreviewEgresoDto {
  @ApiProperty({ description: "ID de la sección de 5.° grado a revisar para egreso" })
  @IsUUID("all", { message: "ID de sección inválido" })
  @IsNotEmpty({ message: "La sección es obligatoria" })
  seccionId!: string;
}

export class PreviewEgresoResultadoDto {
  @ApiProperty({ type: PreviewSeccionInfoDto })
  seccion!: PreviewSeccionInfoDto;

  @ApiProperty({ type: [PreviewEstudianteItemDto] })
  aEgresar!: PreviewEstudianteItemDto[];

  @ApiProperty({ type: [PreviewEstudianteItemDto] })
  noEgresables!: PreviewEstudianteItemDto[];

  @ApiProperty({ example: 25 })
  totalAEgresar!: number;

  @ApiProperty({ example: 1 })
  totalNoEgresables!: number;
}

export class EgresarSeccionDto {
  @ApiProperty({ description: "ID de la sección de 5.° grado a egresar" })
  @IsUUID("all", { message: "ID de sección inválido" })
  @IsNotEmpty({ message: "La sección es obligatoria" })
  seccionId!: string;

  @ApiPropertyOptional({
    description:
      "Lista opcional de IDs de estudiantes a egresar. Si se omite, se egresan todos los culminados activos.",
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: "estudianteIds debe ser un arreglo de UUIDs" })
  @ArrayNotEmpty({ message: "Si especifica estudianteIds, debe incluir al menos uno" })
  @IsUUID("all", { each: true, message: "Cada elemento debe ser un UUID válido" })
  estudianteIds?: string[];
}

export class EgresadoItemDto {
  @ApiProperty()
  estudianteId!: string;

  @ApiProperty()
  nombreCompleto!: string;
}

export class NoEgresadoItemDto {
  @ApiProperty()
  estudianteId!: string;

  @ApiProperty()
  nombreCompleto!: string;

  @ApiProperty()
  motivo!: string;
}

export class EgresarSeccionResultadoDto {
  @ApiProperty({ example: "Se egresaron 25 estudiantes de 5.° A. 0 no fueron procesados." })
  message!: string;

  @ApiProperty({ example: 25 })
  totalEgresados!: number;

  @ApiProperty({ example: 0 })
  totalNoEgresados!: number;

  @ApiProperty({ type: [EgresadoItemDto] })
  egresados!: EgresadoItemDto[];

  @ApiProperty({ type: [NoEgresadoItemDto] })
  noEgresados!: NoEgresadoItemDto[];
}

// ─── Resumen persistido de avance por año ───────────────────────────────────

export class ResumenPromocionQueryDto {
  @ApiProperty({ description: "ID del año académico que cierra (origen)" })
  @IsUUID("all", { message: "ID de año origen inválido" })
  @IsNotEmpty({ message: "El año de origen es obligatorio" })
  anioOrigenId!: string;

  @ApiPropertyOptional({ description: "ID del año académico nuevo (destino)" })
  @IsOptional()
  @IsUUID("all", { message: "ID de año destino inválido" })
  anioDestinoId?: string;
}

export class ResumenSeccionPromocionItemDto {
  @ApiProperty()
  seccionId!: string;

  @ApiProperty()
  gradoNumero!: number;

  @ApiProperty()
  gradoNombre!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ example: 28 })
  totalCulminados!: number;

  @ApiProperty({ example: 26 })
  yaMatriculadosDestino!: number;

  @ApiProperty({ example: 0 })
  yaEgresados!: number;

  @ApiProperty({ example: 2 })
  pendientes!: number;
}

export class ResumenPromocionResultadoDto {
  @ApiProperty()
  anioOrigenId!: string;

  @ApiPropertyOptional({ nullable: true })
  anioDestinoId!: string | null;

  @ApiProperty({ example: 420 })
  totalCulminados!: number;

  @ApiProperty({ example: 310 })
  totalMatriculadosDestino!: number;

  @ApiProperty({ example: 80 })
  totalEgresados!: number;

  @ApiProperty({ example: 30 })
  totalPendientes!: number;

  @ApiProperty({ type: [ResumenSeccionPromocionItemDto] })
  secciones!: ResumenSeccionPromocionItemDto[];
}
