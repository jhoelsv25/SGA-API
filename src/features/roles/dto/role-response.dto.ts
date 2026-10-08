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

export class RoleDetailResponseDto extends RoleResponseDto {
  @ApiProperty({
    description: "RF-002 V2: IDs de las opciones de menú asignadas al rol",
    type: [String],
  })
  menus!: string[];
}
