import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateUsernameDto {
  @ApiProperty({
    description: "Nuevo nombre de usuario único",
    example: "jdoe2026",
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: "El nombre de usuario debe ser texto" })
  @IsNotEmpty({ message: "El nombre de usuario es obligatorio" })
  @MinLength(3, { message: "El nombre de usuario debe tener al menos 3 caracteres" })
  @MaxLength(50, { message: "El nombre de usuario no puede exceder 50 caracteres" })
  nombreUsuario!: string;
}
