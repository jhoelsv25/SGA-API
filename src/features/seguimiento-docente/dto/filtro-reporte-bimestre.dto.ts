import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class FiltroReporteBimestreQueryDto {
  @ApiPropertyOptional({
    description: "Campo por el cual ordenar el listado consolidado",
    enum: [
      "docente",
      "sesionesProgramadas",
      "sesionesCumplidas",
      "minutosPerdidosFirma",
      "totalAusencias",
      "minutosFueraAula",
      "totalMinutosFueraClase",
    ],
    example: "totalMinutosFueraClase",
  })
  @IsOptional()
  @IsString()
  @IsIn([
    "docente",
    "sesionesProgramadas",
    "sesionesCumplidas",
    "minutosPerdidosFirma",
    "totalAusencias",
    "minutosFueraAula",
    "totalMinutosFueraClase",
  ])
  ordenarPor?: string;

  @ApiPropertyOptional({
    description: "Dirección del ordenamiento",
    enum: ["asc", "desc"],
    example: "desc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  direccion?: "asc" | "desc";
}
