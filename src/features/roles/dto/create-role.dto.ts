import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({
    description: "Nombre único del rol",
    example: "Coordinador Pedagógico",
    maxLength: 50,
  })
  @IsString({ message: "El nombre del rol debe ser texto" })
  @IsNotEmpty({ message: "El nombre del rol es obligatorio" })
  @MaxLength(50, { message: "El nombre no puede exceder 50 caracteres" })
  nombre!: string;

  @ApiPropertyOptional({
    description: "Descripción de las responsabilidades del rol",
    example: "Supervisa la planificación y avance curricular de los docentes",
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: "La descripción debe ser texto" })
  @MaxLength(255, { message: "La descripción no puede exceder 255 caracteres" })
  descripcion?: string;
}
