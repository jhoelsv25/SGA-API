import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FilaPrevisualizadaDto {
  @ApiProperty({ description: "Número de fila en el archivo Excel", example: 2 })
  numeroFila: number;

  @ApiProperty({ description: "Datos leídos de la fila" })
  datos: Record<string, unknown>;

  @ApiProperty({
    description: "Estado de la fila: valida, ya_registrada o error",
    enum: ["valida", "ya_registrada", "error"],
    example: "valida",
  })
  estado: "valida" | "ya_registrada" | "error";

  @ApiProperty({
    description: "Acción prevista si se confirma",
    enum: ["crear", "reutilizar", "omitir"],
    example: "crear",
  })
  accion: "crear" | "reutilizar" | "omitir";

  @ApiPropertyOptional({
    description: "Mensaje explicativo o descripción del error encontrado",
    example: "Esta persona ya está registrada como estudiante.",
  })
  mensaje?: string;
}

export class VistaPreviaResponseDto {
  @ApiProperty({ description: "Total de filas leídas del archivo", example: 120 })
  totalFilas: number;

  @ApiProperty({ description: "Cantidad de filas válidas listas para importar", example: 115 })
  validasCount: number;

  @ApiProperty({
    description: "Cantidad de filas que ya están registradas (se omitirán)",
    example: 2,
  })
  omitidasCount: number;

  @ApiProperty({ description: "Cantidad de filas con errores de formato o validación", example: 3 })
  erroresCount: number;

  @ApiProperty({
    description: "Lista detallada de filas analizadas",
    type: [FilaPrevisualizadaDto],
  })
  filas: FilaPrevisualizadaDto[];
}

export class CredencialEmitidaDto {
  @ApiProperty({ description: "Nombres y apellidos completos" })
  nombreCompleto: string;

  @ApiProperty({ description: "Número de documento" })
  numeroDocumento: string;

  @ApiProperty({ description: "Rol asignado", example: "Estudiante" })
  tipoRol: string;

  @ApiPropertyOptional({ description: "Nombre de usuario para aula virtual", example: "12345678" })
  nombreUsuario?: string;

  @ApiPropertyOptional({ description: "Contraseña temporal de acceso (mostrada una sola vez)" })
  tempPassword?: string;

  @ApiPropertyOptional({ description: "Código de credencial de marcación", example: "CR-12345678" })
  codigoCredencial?: string;

  @ApiPropertyOptional({
    description: "PIN numérico de marcación (mostrado una sola vez)",
    example: "4589",
  })
  pin?: string;
}

export class EjecutarImportacionResponseDto {
  @ApiProperty({ description: "Total de registros importados exitosamente", example: 115 })
  importadosCount: number;

  @ApiProperty({ description: "Total de registros omitidos", example: 5 })
  omitidosCount: number;

  @ApiProperty({
    description: "Mensaje resumen del resultado",
    example: "Se importaron 115 estudiantes. 5 filas se omitieron; descargue el resumen.",
  })
  mensaje: string;

  @ApiProperty({
    description: "Listado de credenciales y cuentas emitidas para descargar",
    type: [CredencialEmitidaDto],
  })
  credenciales: CredencialEmitidaDto[];
}

export class IniciarImportacionResponseDto {
  @ApiProperty({ description: "Identificador del trabajo en cola", example: "import-job-12345" })
  jobId: string;

  @ApiProperty({
    description: "Estado inicial del trabajo",
    enum: ["en_cola", "procesando", "completado"],
    example: "en_cola",
  })
  estado: "en_cola" | "procesando" | "completado";

  @ApiProperty({
    description: "Mensaje informativo",
    example: "Importación masiva iniciada en segundo plano con BullMQ.",
  })
  mensaje: string;

  @ApiPropertyOptional({
    description: "Resultado directo si se procesó de forma síncrona",
    type: EjecutarImportacionResponseDto,
  })
  resultado?: EjecutarImportacionResponseDto;
}

export class EstadoImportacionJobDto {
  @ApiProperty({ description: "Identificador del trabajo", example: "import-job-12345" })
  jobId: string;

  @ApiProperty({
    description: "Estado actual del trabajo",
    enum: ["en_cola", "procesando", "completado", "fallido"],
    example: "completado",
  })
  estado: "en_cola" | "procesando" | "completado" | "fallido";

  @ApiProperty({ description: "Porcentaje de avance (0 a 100)", example: 100 })
  progreso: number;

  @ApiPropertyOptional({
    description: "Mensaje descriptivo del estado o progreso actual",
    example: "Procesando registros (45%)...",
  })
  mensaje?: string;

  @ApiPropertyOptional({
    description: "Resultado final de la importación",
    type: EjecutarImportacionResponseDto,
  })
  resultado?: EjecutarImportacionResponseDto;

  @ApiPropertyOptional({
    description: "Mensaje de error si el trabajo falló",
    example: "Error al procesar el archivo.",
  })
  error?: string;
}
