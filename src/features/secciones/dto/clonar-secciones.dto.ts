import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class ClonarSeccionesDto {
  @ApiProperty({
    description: "UUID del año escolar origen del cual se copiará la estructura de secciones",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID("4", { message: "El ID del año académico de origen debe ser un UUID válido." })
  anioOrigenId!: string;

  @ApiPropertyOptional({
    description: "Indica si se intentará asignar el mismo tutor si sigue activo y disponible",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  copiarTutores?: boolean;

  @ApiPropertyOptional({
    description: "Indica si se conservará el nombre/código del aula física",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  copiarAulas?: boolean;
}

export class SeccionClonadaDetalleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  gradoNombre!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  aula!: string | null;

  @ApiProperty()
  vacantes!: number;

  @ApiProperty()
  tutorAsignado!: boolean;
}

export class SeccionOmitidaDetalleDto {
  @ApiProperty()
  gradoNombre!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  motivo!: string;
}

export class ClonarSeccionesResultadoDto {
  @ApiProperty()
  mensaje!: string;

  @ApiProperty()
  totalClonadas!: number;

  @ApiProperty()
  totalOmitidas!: number;

  @ApiProperty({ type: [SeccionClonadaDetalleDto] })
  clonadas!: SeccionClonadaDetalleDto[];

  @ApiProperty({ type: [SeccionOmitidaDetalleDto] })
  omitidas!: SeccionOmitidaDetalleDto[];
}
