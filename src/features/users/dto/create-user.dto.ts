import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "ID de la persona a quien se asignará la cuenta (RF-007)",
    example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  })
  @IsUUID("4", { message: "El ID de la persona debe ser un UUID válido" })
  @IsNotEmpty({ message: "La persona es obligatoria" })
  personaId!: string;

  @ApiProperty({
    description: "ID del rol que se le asignará a la cuenta",
    example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  })
  @IsUUID("4", { message: "El ID del rol debe ser un UUID válido" })
  @IsNotEmpty({ message: "El rol es obligatorio" })
  rolId!: string;

  @ApiProperty({
    description: "Nombre de usuario único (por defecto DNI o código SIAGIE)",
    example: "48123456",
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: "El nombre de usuario debe ser texto" })
  @IsNotEmpty({ message: "El nombre de usuario es obligatorio" })
  @MinLength(3, { message: "El nombre de usuario debe tener al menos 3 caracteres" })
  @MaxLength(50, { message: "El nombre de usuario no puede exceder 50 caracteres" })
  nombreUsuario!: string;
}
