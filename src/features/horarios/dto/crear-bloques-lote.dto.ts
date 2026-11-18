import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, ValidateNested } from "class-validator";
import { BloqueHorarioResponseDto } from "./bloque-horario-response.dto";
import { CreateBloqueHorarioDto } from "./create-bloque-horario.dto";

export class CrearBloquesLoteDto {
  @ApiProperty({
    type: [CreateBloqueHorarioDto],
    description: "Lista de bloques de horario a registrar en lote",
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Debe enviar al menos un bloque de horario." })
  @ValidateNested({ each: true })
  @Type(() => CreateBloqueHorarioDto)
  bloques!: CreateBloqueHorarioDto[];

  @ApiPropertyOptional({
    default: false,
    description:
      "Si es true, reemplaza los bloques actuales de la sección siempre que no tengan sesiones registradas.",
  })
  @IsOptional()
  @IsBoolean()
  reemplazarExistentes?: boolean;
}

export class BloquesLoteResponseDto {
  @ApiProperty({ type: [BloqueHorarioResponseDto] })
  bloques!: BloqueHorarioResponseDto[];

  @ApiProperty({ example: 30 })
  totalCreados!: number;

  @ApiProperty({ type: [String] })
  advertencias!: string[];
}
