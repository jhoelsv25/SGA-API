import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

export const TIPOS_FOTOS_PERMITIDOS = ["estudiantes", "docentes"] as const;
export type TipoFotosPermitido = (typeof TIPOS_FOTOS_PERMITIDOS)[number];

export class SubirFotosMasivasDto {
  @ApiProperty({
    description: "Tipo de entidad al que pertenecen las fotos",
    enum: TIPOS_FOTOS_PERMITIDOS,
    example: "estudiantes",
  })
  @IsNotEmpty({ message: "El tipo de fotos es obligatorio (estudiantes o docentes)." })
  @IsString({ message: "El tipo debe ser una cadena de texto." })
  @IsIn(TIPOS_FOTOS_PERMITIDOS, {
    message: "El tipo debe ser 'estudiantes' o 'docentes'.",
  })
  tipo!: TipoFotosPermitido;
}

export class IniciarFotosJobResponseDto {
  @ApiProperty({ description: "ID del trabajo en BullMQ para seguimiento" })
  jobId!: string;

  @ApiProperty({ description: "Mensaje informativo" })
  mensaje!: string;

  @ApiProperty({ description: "Cantidad total de fotos válidas extraídas del paquete" })
  totalArchivos!: number;
}

export class DetalleFotoOmitidaDto {
  @ApiProperty({ description: "Nombre original del archivo" })
  archivo!: string;

  @ApiProperty({ description: "Motivo por el cual fue omitido o no encontrado" })
  motivo!: string;
}

export class DetalleFotoAsignadaDto {
  @ApiProperty({ description: "Nombre del archivo procesado" })
  archivo!: string;

  @ApiProperty({ description: "ID de la persona a la que se le asignó" })
  personaId!: string;

  @ApiProperty({ description: "Nombre completo de la persona" })
  nombreCompleto!: string;

  @ApiProperty({ description: "URL final de la foto guardada" })
  fotoUrl!: string;
}

export class ResultadoFotosDto {
  @ApiProperty({ description: "Total de archivos analizados" })
  total!: number;

  @ApiProperty({ description: "Cantidad de fotos asignadas exitosamente" })
  exitosos!: number;

  @ApiProperty({ description: "Cantidad de fotos no emparejadas u omitidas" })
  omitidos!: number;

  @ApiProperty({
    description: "Detalle de fotos asignadas",
    type: [DetalleFotoAsignadaDto],
  })
  asignados!: DetalleFotoAsignadaDto[];

  @ApiProperty({
    description: "Detalle de fotos no encontradas o con error",
    type: [DetalleFotoOmitidaDto],
  })
  detallesOmitidos!: DetalleFotoOmitidaDto[];
}

export class EstadoFotosJobDto {
  @ApiProperty({ description: "ID del trabajo" })
  id!: string;

  @ApiProperty({
    description: "Estado del trabajo",
    enum: ["esperando", "procesando", "completado", "fallido"],
  })
  estado!: "esperando" | "procesando" | "completado" | "fallido";

  @ApiProperty({ description: "Porcentaje de avance (0 a 100)" })
  progreso!: number;

  @ApiPropertyOptional({
    description: "Resultado de la asignación de fotos",
    type: ResultadoFotosDto,
  })
  resultado?: ResultadoFotosDto;

  @ApiPropertyOptional({ description: "Mensaje de error en caso de fallo crítico" })
  error?: string;
}
