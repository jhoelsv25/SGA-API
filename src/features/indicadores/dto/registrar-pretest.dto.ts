import { IsDateString, IsIn, IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { INDICADORES, type Indicador, MENSAJES_INDICADORES } from "../constants";

export class RegistrarPretestDto {
  @ApiProperty({ enum: INDICADORES, example: "CSP", description: "Indicador de la tesis" })
  @IsIn(INDICADORES, { message: "El indicador debe ser CSP, ISA o IGM." })
  @IsNotEmpty({ message: "El indicador es obligatorio." })
  indicador!: Indicador;

  @ApiProperty({
    example: "I Bimestre 2026",
    description: "Descripción textual del período evaluado",
  })
  @IsString({ message: "El período descrito debe ser texto." })
  @IsNotEmpty({ message: "El período descrito es obligatorio." })
  @MaxLength(120, { message: "El período descrito no puede superar los 120 caracteres." })
  periodoDescrito!: string;

  @ApiProperty({ example: "2026-03-01", description: "Fecha de inicio del pretest (YYYY-MM-DD)" })
  @IsDateString({}, { message: "La fecha de inicio debe ser válida (YYYY-MM-DD)." })
  @IsNotEmpty({ message: "La fecha de inicio es obligatoria." })
  fechaInicio!: string;

  @ApiProperty({ example: "2026-05-08", description: "Fecha de fin del pretest (YYYY-MM-DD)" })
  @IsDateString({}, { message: "La fecha de fin debe ser válida (YYYY-MM-DD)." })
  @IsNotEmpty({ message: "La fecha de fin es obligatoria." })
  fechaFin!: string;

  @ApiProperty({ example: 942, description: "Numerador del indicador (conteo favorable)" })
  @IsInt({ message: "El numerador debe ser un número entero." })
  @Min(0, { message: MENSAJES_INDICADORES.NUMERADOR_NEGATIVO })
  numerador!: number;

  @ApiProperty({ example: 1200, description: "Denominador del indicador (total programado)" })
  @IsInt({ message: "El denominador debe ser un número entero." })
  @Min(1, { message: MENSAJES_INDICADORES.DENOMINADOR_CERO })
  denominador!: number;

  @ApiProperty({
    example: "Hojas físicas de firma de la subdirección",
    description:
      "Fuente física o documental obligatoria de donde se obtuvo la información histórica",
  })
  @IsString({ message: "La fuente debe ser texto." })
  @IsNotEmpty({ message: MENSAJES_INDICADORES.PRETEST_SIN_FUENTE })
  @MaxLength(500, { message: "La fuente no puede superar los 500 caracteres." })
  fuente!: string;
}
