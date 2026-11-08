import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Restablecimiento de contraseña por el administrador.
 * Sin `contrasena` el sistema genera una clave temporal; con ella se usa la que escribió el administrador.
 */
export class ResetPasswordDto {
  @ApiPropertyOptional({
    description:
      "Contraseña definida manualmente. Si se omite, se genera una temporal. Debe cumplir la política (seguridad.longitud_minima_contrasena, letras y números).",
    example: "Clave2026",
  })
  @IsOptional()
  @IsString({ message: "La contraseña debe ser texto" })
  @MaxLength(72, { message: "La contraseña no puede exceder 72 caracteres" })
  contrasena?: string;

  @ApiPropertyOptional({
    description: "Si el usuario debe cambiar la contraseña al iniciar sesión (por defecto true)",
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: "debeCambiarContrasena debe ser verdadero o falso" })
  debeCambiarContrasena?: boolean;
}
