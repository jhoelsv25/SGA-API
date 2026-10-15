import { IsOptional, IsString, IsUUID } from "class-validator";

export class ConsolidadoQueryDto {
  @IsUUID()
  periodoId!: string;

  @IsOptional()
  @IsString()
  ordenarPor?: string;

  @IsOptional()
  @IsString()
  orden?: "asc" | "desc";
}
