import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";
import { MAX_TOLERANCIA_MIN, MIN_TOLERANCIA_MIN } from "../constants";

export class UpdateTurnoDto {
  @ApiProperty({ description: "Hora oficial de entrada (HH:mm o HH:mm:ss)", example: "07:45" })
  @IsString()
  @IsNotEmpty({ message: "La hora de entrada es obligatoria." })
  horaEntrada!: string;

  @ApiProperty({ description: "Hora oficial de salida (HH:mm o HH:mm:ss)", example: "13:15" })
  @IsString()
  @IsNotEmpty({ message: "La hora de salida es obligatoria." })
  horaSalida!: string;

  @ApiProperty({ description: "Inicio de ventana de entrada", example: "06:30" })
  @IsString()
  @IsNotEmpty({ message: "El inicio de la ventana de entrada es obligatorio." })
  ventanaEntradaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de entrada", example: "09:30" })
  @IsString()
  @IsNotEmpty({ message: "El fin de la ventana de entrada es obligatorio." })
  ventanaEntradaFin!: string;

  @ApiProperty({ description: "Inicio de ventana de salida", example: "12:30" })
  @IsString()
  @IsNotEmpty({ message: "El inicio de la ventana de salida es obligatorio." })
  ventanaSalidaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de salida", example: "15:00" })
  @IsString()
  @IsNotEmpty({ message: "El fin de la ventana de salida es obligatorio." })
  ventanaSalidaFin!: string;

  @ApiProperty({ description: "Tolerancia en minutos (0 a 60)", example: 10 })
  @IsInt({ message: "La tolerancia debe ser un número entero." })
  @Min(MIN_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  @Max(MAX_TOLERANCIA_MIN, { message: "La tolerancia debe estar entre 0 y 60 minutos." })
  toleranciaMin!: number;

  @ApiProperty({
    description: "Días laborables separados por coma (1=Lunes a 7=Domingo)",
    example: "1,2,3,4,5",
  })
  @IsString()
  @IsNotEmpty({ message: "Seleccione al menos un día laborable." })
  diasLaborables!: string;
}
