import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CambiarSeccionDto {
  @ApiProperty({
    description: "ID de la nueva sección (mismo grado y año)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("all", { message: "ID de sección inválido" })
  @IsNotEmpty({ message: "La nueva sección es obligatoria" })
  nuevaSeccionId!: string;

  @ApiProperty({
    description: "Motivo del cambio de sección",
    example: "Ajuste de convivencia escolar / solicitud de apoderado",
  })
  @IsString({ message: "El motivo debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El motivo del cambio es obligatorio" })
  @MinLength(3, { message: "El motivo debe tener al menos 3 caracteres" })
  @MaxLength(255, { message: "El motivo no puede exceder 255 caracteres" })
  motivo!: string;
}
