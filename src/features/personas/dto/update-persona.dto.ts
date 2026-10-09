import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import { CreatePersonaDto } from "./create-persona.dto";

export class UpdatePersonaDto extends PartialType(CreatePersonaDto) {
  @ApiPropertyOptional({
    example: "Corrección de apellido según partida de nacimiento",
    description:
      "Motivo de la corrección. Obligatorio cuando se modifican datos críticos de una persona con ficha o cuenta activa.",
  })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: "El motivo debe tener al menos 5 caracteres." })
  motivo?: string;
}
