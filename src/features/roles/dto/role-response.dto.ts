import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RoleResponseDto {
  @ApiProperty({ description: "ID único del rol (UUID)" })
  id!: string;

  @ApiProperty({ description: "Nombre del rol" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Descripción del rol" })
  descripcion?: string | null;

  @ApiProperty({ description: "Indica si es un rol protegido del sistema" })
  esSistema!: boolean;

  @ApiProperty({ description: "Estado activo/inactivo del rol" })
  activo!: boolean;

  @ApiPropertyOptional({ description: "Número de usuarios vigentes con este rol" })
  usuariosCount?: number;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización" })
  actualizadoEn!: string;
}

export class PermissionCatalogItemDto {
  @ApiProperty({ description: "ID único del permiso" })
  id!: string;

  @ApiProperty({ description: "Código del permiso (ej. sesiones.registrar)" })
  codigo!: string;

  @ApiProperty({ description: "Nombre legible del permiso" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Descripción del permiso" })
  descripcion?: string | null;

  @ApiProperty({ description: "ID del módulo al que pertenece" })
  moduloId!: string;

  @ApiProperty({ description: "Nombre del módulo" })
  moduloNombre!: string;

  @ApiProperty({ description: "Código del módulo" })
  moduloCodigo!: string;
}

export class RoleDetailResponseDto extends RoleResponseDto {
  @ApiProperty({
    description: "Lista de IDs de permisos asignados",
    type: [String],
  })
  permisos!: string[];
}
