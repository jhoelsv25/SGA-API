import { IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CerrarMedicionDto {
  @ApiProperty({ description: "UUID del período académico cerrado a medir" })
  @IsUUID("4", { message: "El ID del período debe ser un UUID válido." })
  @IsNotEmpty({ message: "El ID del período es obligatorio." })
  periodoId!: string;
}
