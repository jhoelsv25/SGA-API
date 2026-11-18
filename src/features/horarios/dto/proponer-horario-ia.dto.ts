import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { MENSAJES_HORARIOS, REGEX_HORA_HH_MM } from "../constants";

export class ProponerHorarioIaDto {
  @ApiPropertyOptional({
    example: "07:45",
    description: "Hora de entrada en formato HH:mm. Si se omite, usa la configurada.",
  })
  @IsOptional()
  @IsString()
  @Matches(REGEX_HORA_HH_MM, { message: MENSAJES_HORARIOS.FORMATO_HORA_INVALIDO })
  horaEntrada?: string;

  @ApiPropertyOptional({
    example: "Priorizar Matemática y Comunicación temprano; evitar bloques triples.",
    maxLength: 500,
    description: "Preferencias pedagógicas en lenguaje natural para guiar a la IA.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  preferencias?: string;
}

export class BloqueHorarioPropuestoIaDto {
  @ApiProperty({ example: 1 })
  diaSemana!: number;

  @ApiProperty({ example: "07:45" })
  horaInicio!: string;

  @ApiProperty({ example: "08:30" })
  horaFin!: string;

  @ApiProperty({ enum: ["clase", "receso"] })
  tipoBloque!: "clase" | "receso";

  @ApiPropertyOptional({ nullable: true })
  cursoSeccionId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cursoNombre!: string | null;

  @ApiPropertyOptional({ nullable: true })
  docenteId!: string | null;
}

export class PropuestaHorarioIaResponseDto {
  @ApiProperty({ example: "07:45" })
  horaEntrada!: string;

  @ApiProperty({ type: [BloqueHorarioPropuestoIaDto] })
  bloques!: BloqueHorarioPropuestoIaDto[];

  @ApiProperty({ description: "Indica si la propuesta usó IA o solo algoritmo determinista." })
  usandoIa!: boolean;

  @ApiProperty({ type: [String] })
  advertencias!: string[];
}
