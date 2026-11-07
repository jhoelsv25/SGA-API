import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ESTADOS_EQUIPO_ACCESO, EstadoEquipoAcceso } from "../constants";

export class EquipoAccesoResponseDto {
  @ApiProperty({ description: "ID de la solicitud (UUID)" })
  id!: string;

  @ApiProperty({ description: "ID del usuario que inicia sesión desde el equipo" })
  usuarioId!: string;

  @ApiProperty({ description: "Nombre de usuario" })
  nombreUsuario!: string;

  @ApiProperty({ description: "Nombre que reporta el equipo" })
  nombre!: string;

  @ApiProperty({ description: "Plataforma: 0 otro, 1 Windows, 2 Android, 3 web" })
  plataforma!: number;

  @ApiProperty({
    description: "Estado: 1 pendiente, 2 autorizado, 3 rechazado, 4 revocado",
    enum: ESTADOS_EQUIPO_ACCESO,
  })
  estado!: EstadoEquipoAcceso;

  @ApiProperty({ description: "Cuándo se solicitó (ISO-8601)" })
  solicitadoEn!: string;

  @ApiPropertyOptional({ description: "Cuándo se resolvió (ISO-8601)" })
  resueltoEn?: string | null;

  @ApiPropertyOptional({ description: "Usuario que resolvió" })
  resueltoPor?: string | null;

  @ApiPropertyOptional({ description: "Motivo del rechazo o la revocación" })
  motivo?: string | null;

  @ApiPropertyOptional({ description: "Último ingreso desde el equipo (ISO-8601)" })
  ultimoAcceso?: string | null;

  @ApiPropertyOptional({ description: "Fecha límite de la autorización (ISO-8601)" })
  vigenteHasta?: string | null;

  @ApiPropertyOptional({ description: "IP desde la que se solicitó" })
  ip?: string | null;
}
