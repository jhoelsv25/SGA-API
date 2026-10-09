import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { PARENTESCOS, type Parentesco } from "../constants";

export class VincularEstudianteApoderadoDto {
  @ApiProperty({
    description: "UUID del estudiante",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsNotEmpty({ message: "El ID del estudiante es obligatorio." })
  @IsUUID("4")
  estudianteId!: string;

  @ApiProperty({
    description: "UUID del apoderado",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsNotEmpty({ message: "El ID del apoderado es obligatorio." })
  @IsUUID("4")
  apoderadoId!: string;

  @ApiProperty({
    description: "Parentesco o vínculo familiar",
    enum: PARENTESCOS,
    example: "madre",
  })
  @IsNotEmpty({ message: "El parentesco es obligatorio." })
  @IsIn(PARENTESCOS, {
    message:
      "Parentesco no válido. Valores permitidos: padre, madre, abuelo, abuela, hermano, hermana, tio, tia, tutor_legal, otro.",
  })
  parentesco!: Parentesco;

  @ApiPropertyOptional({
    description: "Indica si es el apoderado principal del estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiPropertyOptional({
    description: "Indica si el apoderado reside con el estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  viveConEstudiante?: boolean;

  @ApiPropertyOptional({
    description: "Indica si está autorizado para recoger al estudiante",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autorizadoRecoger?: boolean;

  @ApiPropertyOptional({
    description: "Indica si es contacto de emergencia",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  contactoEmergencia?: boolean;
}
