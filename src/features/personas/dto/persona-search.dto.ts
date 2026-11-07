import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonaResponseDto } from "./persona-response.dto";

export class SearchPersonaResultDto {
  @ApiProperty({ example: true })
  encontrada: boolean;

  @ApiPropertyOptional({ type: PersonaResponseDto })
  persona?: PersonaResponseDto | null;

  @ApiPropertyOptional({ example: "Esta persona ya está registrada. Se usarán sus datos." })
  mensaje?: string;

  @ApiPropertyOptional({
    example: false,
    description: "True si la persona ya tiene la ficha indicada en destinoFicha",
  })
  yaTieneFicha?: boolean;

  @ApiPropertyOptional({
    example: "estudiante",
    description:
      "Ficha académica vigente que debe darse de baja para registrar a la persona en destinoFicha",
  })
  requiereBajaDe?: "docente" | "estudiante";
}
