import { ApiProperty } from "@nestjs/swagger";
import { PERSONA_TYPES_TURNO, PersonaTypeTurno } from "../constants";

export class TurnoResponseDto {
  @ApiProperty({ description: "ID del turno (UUID)" })
  id!: string;

  @ApiProperty({ description: "Tipo de persona a la que aplica", enum: PERSONA_TYPES_TURNO })
  aplicaA!: PersonaTypeTurno;

  @ApiProperty({ description: "Hora oficial de entrada", example: "07:45:00" })
  horaEntrada!: string;

  @ApiProperty({ description: "Hora oficial de salida", example: "13:15:00" })
  horaSalida!: string;

  @ApiProperty({ description: "Inicio de ventana de entrada", example: "06:30:00" })
  ventanaEntradaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de entrada", example: "09:30:00" })
  ventanaEntradaFin!: string;

  @ApiProperty({ description: "Inicio de ventana de salida", example: "12:30:00" })
  ventanaSalidaInicio!: string;

  @ApiProperty({ description: "Fin de ventana de salida", example: "15:00:00" })
  ventanaSalidaFin!: string;

  @ApiProperty({ description: "Tolerancia en minutos", example: 10 })
  toleranciaMin!: number;

  @ApiProperty({ description: "Días laborables (ej: 1,2,3,4,5)", example: "1,2,3,4,5" })
  diasLaborables!: string;

  @ApiProperty({ description: "Indica si el turno está activo" })
  activo!: boolean;

  @ApiProperty({ description: "Fecha de creación ISO-8601" })
  creadoEn!: string;

  @ApiProperty({ description: "Fecha de última actualización ISO-8601" })
  actualizadoEn!: string;
}
