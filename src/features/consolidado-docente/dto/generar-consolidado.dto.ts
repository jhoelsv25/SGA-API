import { IsOptional, IsUUID } from "class-validator";

export class GenerarConsolidadoDto {
  @IsUUID()
  periodoId!: string;

  @IsOptional()
  @IsUUID()
  docenteId?: string;
}
