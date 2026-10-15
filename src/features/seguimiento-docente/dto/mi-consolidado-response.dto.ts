import { ApiProperty } from "@nestjs/swagger";
import { ConsolidadoResumenDto } from "./consolidado-resumen.dto";
import { DetalleSesionConsolidadoDto } from "./consolidado-detalle-response.dto";
import { SolicitudRevisionResponseDto } from "./solicitud-revision-response.dto";

export class MiConsolidadoResponseDto {
  @ApiProperty({ type: ConsolidadoResumenDto })
  consolidado!: ConsolidadoResumenDto;

  @ApiProperty({ type: [DetalleSesionConsolidadoDto] })
  sesiones!: DetalleSesionConsolidadoDto[];

  @ApiProperty({ type: SolicitudRevisionResponseDto, nullable: true })
  solicitudPendiente!: SolicitudRevisionResponseDto | null;
}
