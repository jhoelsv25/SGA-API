import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({
    description: "Contraseña actual del usuario",
    example: "Admin123!",
  })
  @IsString({ message: "La contraseña actual debe ser texto" })
  @IsNotEmpty({ message: "La contraseña actual es obligatoria" })
  currentPassword!: string;

  @ApiProperty({
    description: "Nueva contraseña segura (mínimo 8 caracteres, letras y números)",
    example: "NuevaClave2026!",
    minLength: 8,
  })
  @IsString({ message: "La nueva contraseña debe ser texto" })
  @IsNotEmpty({ message: "La nueva contraseña es obligatoria" })
  @MinLength(8, {
    message: "La contraseña debe tener al menos 8 caracteres, con letras y números.",
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "La contraseña debe tener al menos 8 caracteres, con letras y números.",
  })
  newPassword!: string;
}
