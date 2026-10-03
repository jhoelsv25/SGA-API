import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Nombre de usuario o documento de identidad para ingresar",
    example: "admin",
  })
  @IsString({ message: "El nombre de usuario debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de usuario es obligatorio" })
  @MaxLength(50, { message: "El nombre de usuario no puede exceder 50 caracteres" })
  username!: string;

  @ApiProperty({
    description: "Contraseña de acceso del usuario",
    example: "Admin123!",
  })
  @IsString({ message: "La contraseña debe ser una cadena de texto" })
  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  password!: string;

  @ApiPropertyOptional({
    description: "Recordar sesión por tiempo prolongado (30 días en lugar de 1 día)",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: "rememberMe debe ser un valor booleano" })
  rememberMe?: boolean;
}
