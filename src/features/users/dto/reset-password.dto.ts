import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MinLength } from "class-validator";
import { PASSWORD_LETRAS_Y_NUMEROS } from "../../auth/constants";

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description:
      "Contraseña temporal personalizada (opcional). Si se omite, el sistema generará una aleatoria segura.",
    example: "Temporal123*",
  })
  @IsOptional()
  @IsString({ message: "La contraseña debe ser una cadena de texto" })
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  @Matches(PASSWORD_LETRAS_Y_NUMEROS, {
    message: "La contraseña debe contener al menos una letra y un número",
  })
  nuevaContrasena?: string;
}
