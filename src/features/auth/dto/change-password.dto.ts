import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({
    description: "Contraseña actual del usuario",
    example: "Admin123!",
  })
  @IsString({ message: "La contraseña actual debe ser texto" })
  @IsNotEmpty({ message: "La contraseña actual es obligatoria" })
  currentPassword!: string;

  @ApiProperty({
    description:
      "Nueva contraseña con letras y números. La longitud mínima es configurable (variable seguridad.longitud_minima_contrasena, por defecto 8); se valida en el servicio.",
    example: "NuevaClave2026!",
  })
  @IsString({ message: "La nueva contraseña debe ser texto" })
  @IsNotEmpty({ message: "La nueva contraseña es obligatoria" })
  newPassword!: string;
}
