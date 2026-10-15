import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { DECISIONES_CONSOLIDADO, type DecisionConsolidado } from "../constants";

export class RegistrarDecisionDto {
  /**
   * Decisión directiva adoptada por el Director.
   * Valores válidos: 'ninguna' | 'llamada_atencion' | 'compromiso_mejora' | 'derivado'.
   */
  @ApiProperty({
    enum: DECISIONES_CONSOLIDADO,
    description: "Decisión directiva adoptada por el Director",
    example: "compromiso_mejora",
  })
  @IsIn(DECISIONES_CONSOLIDADO, {
    message: "La decisión debe ser: ninguna, llamada_atencion, compromiso_mejora o derivado.",
  })
  @IsNotEmpty({ message: "La decisión es obligatoria." })
  decision!: DecisionConsolidado;

  /**
   * Observación o comentario que acompaña a la decisión (ej. fecha de compromiso o acta).
   */
  @ApiPropertyOptional({
    description: "Observación o comentario complementario del Director",
    maxLength: 1000,
    example: "Reunión el 20/07",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: "La observación no puede exceder los 1000 caracteres." })
  observacion?: string;
}
