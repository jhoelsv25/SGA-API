import { Injectable } from "@nestjs/common";
import type {
  CrearSolicitudRevisionDto,
  FiltroSolicitudesQueryDto,
  MensajeConsolidadoResponseDto,
  RechazarSolicitudDto,
  ResolverSolicitudDto,
  SolicitudRevisionResponseDto,
} from "../dto";

/**
 * Servicio de gestión de solicitudes de revisión de consolidado (HU3).
 * Firmas del contrato RF-013 (sección 4). La implementación completa corresponde a T06.
 */
@Injectable()
export class SolicitudesRevisionService {
  crear(
    _dto: CrearSolicitudRevisionDto,
    _adjunto: Express.Multer.File | undefined,
    _personaId: string,
    _actorId: string,
    _ip?: string,
  ): Promise<MensajeConsolidadoResponseDto & { solicitud: SolicitudRevisionResponseDto }> {
    return Promise.reject(new Error("No implementado en T03"));
  }

  listar(_query: FiltroSolicitudesQueryDto): Promise<SolicitudRevisionResponseDto[]> {
    return Promise.reject(new Error("No implementado en T03"));
  }

  aceptar(
    _id: string,
    _dto: ResolverSolicitudDto,
    _actorId: string,
    _rol: string,
    _ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    return Promise.reject(new Error("No implementado en T03"));
  }

  rechazar(
    _id: string,
    _dto: RechazarSolicitudDto,
    _actorId: string,
    _rol: string,
    _ip?: string,
  ): Promise<SolicitudRevisionResponseDto> {
    return Promise.reject(new Error("No implementado en T03"));
  }
}
