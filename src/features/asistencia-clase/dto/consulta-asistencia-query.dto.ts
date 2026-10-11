import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

export class ConsultaAsistenciaQueryDto {
  @ApiProperty({ example: "2027-03-01", description: "Inicio del rango (p. ej. del bimestre)" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  desde!: string;

  @ApiProperty({ example: "2027-05-14" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "La fecha debe tener el formato AAAA-MM-DD." })
  hasta!: string;
}
