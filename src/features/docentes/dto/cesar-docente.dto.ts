import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CesarDocenteDto {
  @ApiProperty({
    description: "Fecha en la que concluyen sus labores docentes (YYYY-MM-DD)",
    example: "2026-12-31",
  })
  @IsNotEmpty({ message: "La fecha de cese es obligatoria." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de cese debe tener formato YYYY-MM-DD.",
  })
  fechaCese: string;

  @ApiPropertyOptional({
    description: "Motivo justificatorio del cese docente",
    example: "Término de contrato laboral",
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
