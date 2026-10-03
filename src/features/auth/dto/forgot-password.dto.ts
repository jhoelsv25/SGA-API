import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    description: "Nombre de usuario registrado en el sistema",
    example: "admin",
  })
  @IsString({ message: "El nombre de usuario debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de usuario es obligatorio" })
  @MaxLength(50, { message: "El nombre de usuario no puede exceder 50 caracteres" })
  username!: string;

  @ApiProperty({
    description: "Fecha de nacimiento del usuario registrada en su ficha (formato YYYY-MM-DD)",
    example: "1990-05-15",
  })
  @IsString({ message: "La fecha de nacimiento debe ser una cadena de texto" })
  @IsNotEmpty({ message: "La fecha de nacimiento es obligatoria" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha de nacimiento debe cumplir el formato YYYY-MM-DD",
  })
  birthdate!: string;
}
