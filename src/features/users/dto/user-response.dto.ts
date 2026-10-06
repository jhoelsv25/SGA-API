import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

  @ApiPropertyOptional({ description: "URL de foto de perfil" })
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

  @ApiProperty({ description: "Estado de la cuenta: activo, bloqueado o inactivo" })
  estado!: "activo" | "bloqueado" | "inactivo";

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
    description: "Contraseña temporal autogenerada (se muestra UNA SOLA VEZ)",
    example: "Temp2026!aB",
  })
  tempPassword!: string;
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

  @ApiProperty({ description: "Total de registros encontrados" })
  total!: number;

  @ApiProperty({ description: "Página actual" })
  page!: number;

  @ApiProperty({ description: "Elementos por página" })
  limit!: number;

  @ApiProperty({ description: "Total de páginas" })
  totalPages!: number;
}
