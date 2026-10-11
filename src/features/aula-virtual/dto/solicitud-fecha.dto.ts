import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ESTADOS_SOLICITUD_FECHA, type EstadoSolicitudFecha } from "../constants";

export class SolicitarCambioFechaDto {
  @ApiProperty({ example: "2027-06-06" })
  @IsDateString({}, { message: "Ingrese la nueva fecha programada." })
  fechaSolicitada!: string;

  @ApiPropertyOptional({ maxLength: 500, description: "Obligatorio; se valida en el servicio." })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "El motivo no puede exceder los 500 caracteres." })
  motivo?: string;
}

export class ResolverSolicitudDto {
  @ApiPropertyOptional({ maxLength: 500, description: "Obligatoria al rechazar." })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "La respuesta no puede exceder los 500 caracteres." })
  respuesta?: string;
}

export class SolicitudesQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_SOLICITUD_FECHA })
  @IsOptional()
  @IsIn(ESTADOS_SOLICITUD_FECHA)
  estado?: EstadoSolicitudFecha;
}

export class SeguimientoQueryDto {
  @ApiPropertyOptional({ description: "Bimestre; por defecto, el que está en curso." })
  @IsOptional()
  @IsUUID("4", { message: "El bimestre no es válido." })
  periodoId?: string;
}
