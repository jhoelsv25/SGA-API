import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

/**
 * Baja de la ficha académica vigente (docente o estudiante) cuando la persona
 * pasa a la otra condición. Se envía junto con la creación de la nueva ficha.
 */
export class DarBajaFichaActualDto {
  @ApiProperty({
    description: "Motivo de la baja de la ficha vigente",
    example: "Pasa a ser estudiante del colegio",
  })
  @IsString()
  @IsNotEmpty({ message: "Indique el motivo de la baja." })
  @MinLength(5, { message: "El motivo debe tener al menos 5 caracteres." })
  @MaxLength(255)
  motivo: string;

  @ApiPropertyOptional({
    description: "Fecha de la baja (YYYY-MM-DD). Si se omite se usa la fecha de hoy.",
    example: "2026-11-07",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha de baja debe tener formato YYYY-MM-DD." })
  fecha?: string;
}
