import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class PendientesQueryDto {
  @ApiPropertyOptional({ description: "Filtra por bimestre" })
  @IsOptional()
  @IsUUID()
  periodoId?: string;

  @ApiPropertyOptional({ description: "Filtra por docente" })
  @IsOptional()
  @IsUUID()
  docenteId?: string;
}

export class InformeMensualQueryDto {
  @ApiProperty({ example: "2026-11", description: "Mes calendario AAAA-MM" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El mes debe tener el formato AAAA-MM." })
  mes!: string;
}
