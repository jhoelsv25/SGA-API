import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class RetirarMatriculaDto {
  @ApiProperty({
    description: "Fecha de retiro del estudiante (YYYY-MM-DD)",
    example: "2027-08-15",
  })
  @IsDateString({}, { message: "Formato de fecha inválido (debe ser YYYY-MM-DD)" })
  @IsNotEmpty({ message: "La fecha de retiro es obligatoria" })
  fechaRetiro!: string;

  @ApiProperty({ description: "Motivo del retiro", example: "Cambio de domicilio a otra región" })
  @IsString({ message: "El motivo debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El motivo del retiro es obligatorio" })
  @MinLength(3, { message: "El motivo debe tener al menos 3 caracteres" })
  @MaxLength(255, { message: "El motivo no puede exceder 255 caracteres" })
  motivoRetiro!: string;
}
