import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogItemDto {
  @ApiProperty({ description: "ID autoincremental del registro en bitácora", example: 104 })
  id!: number;

  @ApiProperty({
    description: "Fecha y hora del servidor del evento (zona Lima)",
    example: "2026-10-05T19:30:00.000Z",
  })
  registradoEn!: string;

  @ApiPropertyOptional({
    description: "ID del usuario que ejecutó la acción (null si fue el Sistema)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  usuarioId!: string | null;

  @ApiProperty({
    description: "Nombre del usuario o 'Sistema' si la acción fue automática",
    example: "admin",
  })
  usuario!: string;

  @ApiProperty({
    description: "Tipo de acción realizada",
    example: "actualizar",
    enum: ["crear", "actualizar", "eliminar", "iniciar_sesion", "cerrar_sesion"],
  })
  accion!: string;

  @ApiProperty({
    description: "Entidad/tabla afectada en el sistema",
    example: "usuarios",
  })
  entidad!: string;

  @ApiPropertyOptional({
    description: "Identificador del registro afectado (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  registroId!: string | null;

  @ApiPropertyOptional({
    description: "Dirección IP desde la que se ejecutó la acción",
    example: "192.168.1.10",
    nullable: true,
  })
  direccionIp!: string | null;
}

export class AuditDiffFieldDto {
  @ApiProperty({ description: "Nombre del campo afectado", example: "estado" })
  campo!: string;

  @ApiProperty({
    description: "Valor previo del campo antes del cambio (null si fue creación)",
    example: "activo",
    nullable: true,
  })
  valorAnterior!: unknown;

  @ApiProperty({
    description: "Valor nuevo del campo después del cambio (null si fue eliminación)",
    example: "bloqueado",
    nullable: true,
  })
  valorNuevo!: unknown;
}

export class AuditDetailResponseDto {
  @ApiProperty({ description: "ID autoincremental del registro", example: 104 })
  id!: number;

  @ApiProperty({
    description: "Fecha y hora del servidor",
    example: "2026-10-05T19:30:00.000Z",
  })
  registradoEn!: string;

  @ApiPropertyOptional({
    description: "ID del usuario",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  usuarioId!: string | null;

  @ApiProperty({
    description: "Nombre del usuario o 'Sistema'",
    example: "Sistema",
  })
  usuario!: string;

  @ApiProperty({
    description: "Acción",
    example: "actualizar",
  })
  accion!: string;

  @ApiProperty({
    description: "Entidad afectada",
    example: "usuarios",
  })
  entidad!: string;

  @ApiPropertyOptional({
    description: "ID del registro afectado",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  registroId!: string | null;

  @ApiPropertyOptional({
    description: "Dirección IP",
    example: "192.168.1.50",
    nullable: true,
  })
  direccionIp!: string | null;

  @ApiPropertyOptional({
    description: "Objeto con valores anteriores (sin credenciales)",
    nullable: true,
  })
  valorAnterior!: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: "Objeto con valores nuevos (sin credenciales)",
    nullable: true,
  })
  valorNuevo!: Record<string, unknown> | null;

  @ApiProperty({
    description: "Comparativa campo a campo antes vs después",
    type: [AuditDiffFieldDto],
  })
  diferencias!: AuditDiffFieldDto[];
}

export class PaginatedAuditResponseDto {
  @ApiProperty({
    description: "Listado de eventos de auditoría",
    type: [AuditLogItemDto],
  })
  data!: AuditLogItemDto[];

  @ApiPropertyOptional({
    description:
      "Cursor opaco para solicitar la siguiente página de resultados (o null si no hay más)",
    example: "eyJyZWdpc3RyYWRvRW4iOiIyMDI2LTEwLTA4IDA5OjMwOjAwIiwiaWQiOjE0MjUwfQ",
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({
    description: "Indica si existen más registros en las siguientes páginas",
    example: true,
  })
  hasMore!: boolean;

  @ApiProperty({ description: "Registros por página", example: 50 })
  limit!: number;

  @ApiPropertyOptional({
    description: "Mensaje informativo (ej. cuando no hay resultados)",
    example: "No hay registros de auditoría para los filtros seleccionados.",
  })
  mensaje?: string;
}
