import { IsOptional, IsString, MaxLength } from "class-validator";

export class CerrarConsolidadoDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivoCambio?: string;
}
