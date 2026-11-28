import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { EstadoSolicitudKiosko } from "../constants";

export class AprobarSolicitudKioskoDto {
  @ApiProperty({ description: "Kiosko al que se vincula el navegador" })
  @IsUUID("all", { message: "Seleccione un equipo válido." })
  equipoId!: string;
}

export class EstadoSolicitudKioskoDto {
  @ApiProperty({ description: "Código visible del equipo", example: "KSK-7F3A-92BD" })
  codigo!: string;

  @ApiProperty({ description: "1 pendiente, 2 aprobada, 3 rechazada" })
  estado!: EstadoSolicitudKiosko;
}

export class SolicitudKioskoResponseDto extends EstadoSolicitudKioskoDto {
  @ApiProperty({ description: "ID de la solicitud (UUID)" })
  id!: string;

  @ApiPropertyOptional({ description: "Kiosko vinculado" })
  equipoId?: string | null;

  @ApiPropertyOptional({ description: "Nombre del kiosko vinculado" })
  equipoNombre?: string | null;

  @ApiProperty({ description: "Primera solicitud (ISO-8601)" })
  solicitadoEn!: string;

  @ApiProperty({ description: "Última vez que el equipo consultó (ISO-8601)" })
  ultimaConsultaEn!: string;

  @ApiPropertyOptional({ description: "Fecha de resolución (ISO-8601)" })
  resueltoEn?: string | null;
}
