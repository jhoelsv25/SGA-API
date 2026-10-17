import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { USER_STATUSES, UserStatus } from "../constants";

export class UserPersonaDto {
  @ApiProperty({ description: "ID de la persona" })
  id!: string;

  @ApiProperty({ description: "Tipo de documento (dni, pasaporte, etc.)" })
  tipoDocumento!: string;

  @ApiProperty({ description: "Número de documento de identidad" })
  numeroDocumento!: string;

  @ApiProperty({ description: "Nombres de la persona" })
  nombres!: string;

  @ApiProperty({ description: "Apellido paterno" })
  apellidoPaterno!: string;

  @ApiPropertyOptional({ description: "Apellido materno" })
  apellidoMaterno?: string | null;

  @ApiPropertyOptional({ description: "Correo electrónico" })
  correo?: string | null;

  @ApiPropertyOptional({ description: "URL de foto de rol" })
  fotoUrl?: string | null;
}

export class UserRoleDto {
  @ApiProperty({ description: "ID del rol" })
  id!: string;

  @ApiProperty({ description: "Nombre del rol" })
  nombre!: string;

  @ApiProperty({ description: "Indica si es un rol protegido del sistema" })
  esSistema!: boolean;
}

export class UserResponseDto {
  @ApiProperty({ description: "ID del usuario (UUID)" })
  id!: string;

  @ApiProperty({ description: "Nombre de usuario" })
  nombreUsuario!: string;

  @ApiProperty({
    description: "Estado de la cuenta: activo, bloqueado o inactivo",
    enum: USER_STATUSES,
  })
  estado!: UserStatus;

  @ApiProperty({ description: "Indica si debe cambiar contraseña en el primer/siguiente ingreso" })
  debeCambiarContrasena!: boolean;

  @ApiProperty({ description: "Número de intentos fallidos de inicio de sesión" })
  intentosFallidos!: number;

  @ApiPropertyOptional({ description: "Fecha y hora del último acceso" })
  ultimoAcceso?: string | null;

  @ApiProperty({ description: "Datos de la persona asociada a la cuenta" })
  persona!: UserPersonaDto;

  @ApiProperty({ description: "Rol asignado a la cuenta" })
  rol!: UserRoleDto;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización" })
  actualizadoEn!: string;
}

export class UserCreatedResponseDto {
  @ApiProperty({ description: "Datos del usuario creado" })
  usuario!: UserResponseDto;

  @ApiProperty({
    description:
      "Contraseña temporal autogenerada (se muestra UNA SOLA VEZ). null si la persona ya tenía cuenta",
    example: "Temp2026!aB",
    nullable: true,
    type: String,
  })
  tempPassword!: string | null;

  @ApiProperty({
    description: "true si la persona ya tenía cuenta y solo se le agregaron cargo y roles",
  })
  cuentaExistente!: boolean;
}

export class TempPasswordResetResponseDto {
  @ApiProperty({ description: "Mensaje confirmando la operación" })
  message!: string;

  @ApiProperty({
    description: "Nueva contraseña temporal autogenerada (se muestra UNA SOLA VEZ)",
    example: "Temp2026!aB",
  })
  tempPassword!: string;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiPropertyOptional({
    description:
      "Cursor opaco para solicitar la siguiente página de usuarios (o null si no hay más)",
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ description: "Indica si existen más registros en las siguientes páginas" })
  hasMore!: boolean;

  @ApiProperty({ description: "Elementos por página" })
  limit!: number;

  @ApiPropertyOptional({
    description: "Mensaje informativo opcional",
  })
  mensaje?: string;
}
