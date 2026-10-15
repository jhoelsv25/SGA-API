import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { DECISIONES_CONSOLIDADO, type DecisionConsolidado } from "../constants";

export class ActualizarDecisionDto {
  @IsIn(DECISIONES_CONSOLIDADO)
  decision!: DecisionConsolidado;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}
