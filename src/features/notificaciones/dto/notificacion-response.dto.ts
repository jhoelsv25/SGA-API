import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NotificacionResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  usuarioId!: string;

  @ApiProperty({ example: "Matrícula Registrada con Éxito" })
  titulo!: string;

  @ApiProperty({ example: "El estudiante Juan Pérez fue matriculado en 1.° A." })
  mensaje!: string;

  @ApiProperty({ example: "informacion", enum: ["informacion", "alerta", "recordatorio"] })
  tipo!: string;

  @ApiPropertyOptional({ example: "/admin/enrollment/550e8400-e29b-41d4-a716-446655440000" })
  enlaceUrl?: string | null;

  @ApiPropertyOptional()
  comunicadoId?: string | null;

  @ApiPropertyOptional()
  sesionClaseId?: string | null;

  @ApiProperty({ example: false })
  leida!: boolean;

  @ApiPropertyOptional({ example: "2027-03-01 10:30:00" })
  leidaEn?: string | null;

  @ApiProperty({ example: "2027-03-01 10:00:00" })
  creadoEn!: string;
}

export class PaginatedNotificacionesResponseDto {
  @ApiProperty({ type: [NotificacionResponseDto] })
  data!: NotificacionResponseDto[];

  @ApiProperty({ example: 3, description: "Total de notificaciones no leídas del usuario" })
  unreadCount!: number;

  @ApiPropertyOptional({
    description: "Cursor opaco en base64url para la siguiente página, o null si es la última",
  })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;

  @ApiProperty({ example: 20 })
  limit!: number;
}
