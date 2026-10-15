import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { ESTADOS_SOLICITUD_REVISION, type EstadoSolicitudRevision } from "../constants";

export class FiltroSolicitudesQueryDto {
  @ApiPropertyOptional({
    description: "Filtrar por período académico (UUID)",
    example: "b1098c1a-f86e-11da-bd1a-00112444be2e",
  })
  @IsOptional()
  @IsUUID("4")
  periodoId?: string;

  @ApiPropertyOptional({
    description: "Filtrar por estado de la solicitud",
    enum: ESTADOS_SOLICITUD_REVISION,
    example: "solicitada",
  })
  @IsOptional()
  @IsIn(ESTADOS_SOLICITUD_REVISION)
  estado?: EstadoSolicitudRevision;
}
