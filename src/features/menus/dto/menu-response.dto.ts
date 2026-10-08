import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ModuleResponseDto {
  @ApiProperty({ description: "ID del módulo" })
  id!: string;

  @ApiProperty({ description: "Código del módulo" })
  codigo!: string;

  @ApiProperty({ description: "Nombre del módulo" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Ícono del módulo" })
  icono?: string | null;

  @ApiProperty({ description: "Orden del módulo" })
  orden!: number;

  @ApiProperty({ description: "Vigencia del módulo" })
  vigente!: boolean;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn!: string;
}

export class MenuOptionResponseDto {
  @ApiProperty({ description: "ID de la opción" })
  id!: string;

  @ApiProperty({ description: "Nombre de la opción" })
  nombre!: string;

  @ApiProperty({ description: "Ruta de navegación" })
  ruta!: string;

  @ApiPropertyOptional({ description: "Ícono de la opción" })
  icono?: string | null;

  @ApiProperty({ description: "Orden dentro del contenedor" })
  orden!: number;

  @ApiProperty({ description: "Vigencia de la opción" })
  vigente!: boolean;
}

export class MenuContainerResponseDto {
  @ApiProperty({ description: "ID del contenedor" })
  id!: string;

  @ApiProperty({ description: "Nombre del contenedor" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Ícono del contenedor" })
  icono?: string | null;

  @ApiProperty({ description: "Orden dentro del módulo" })
  orden!: number;

  @ApiProperty({ description: "Vigencia del contenedor" })
  vigente!: boolean;

  @ApiProperty({
    description: "Lista de opciones pertenecientes a este contenedor",
    type: [MenuOptionResponseDto],
  })
  opciones!: MenuOptionResponseDto[];
}

export class ModuleMenuTreeResponseDto {
  @ApiProperty({ description: "ID del módulo" })
  id!: string;

  @ApiProperty({ description: "Código del módulo" })
  codigo!: string;

  @ApiProperty({ description: "Nombre del módulo" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Ícono del módulo" })
  icono?: string | null;

  @ApiProperty({ description: "Orden del módulo" })
  orden!: number;

  @ApiProperty({
    description: "Contenedores de este módulo con sus opciones visibles",
    type: [MenuContainerResponseDto],
  })
  contenedores!: MenuContainerResponseDto[];
}

export class MenuItemResponseDto {
  @ApiProperty({ description: "ID del elemento de menú" })
  id!: string;

  @ApiPropertyOptional({ description: "ID del menú padre (si es opción)" })
  menuPadreId?: string | null;

  @ApiProperty({ description: "ID del módulo" })
  moduloId!: string;

  @ApiProperty({ description: "Nombre" })
  nombre!: string;

  @ApiPropertyOptional({ description: "Ruta" })
  ruta?: string | null;

  @ApiPropertyOptional({ description: "Ícono" })
  icono?: string | null;

  @ApiProperty({ description: "Orden" })
  orden!: number;

  @ApiProperty({ description: "Es contenedor" })
  esContenedor!: boolean;

  @ApiProperty({ description: "Vigente" })
  vigente!: boolean;

  @ApiProperty({ description: "Fecha de creación" })
  creadoEn!: string;
}
