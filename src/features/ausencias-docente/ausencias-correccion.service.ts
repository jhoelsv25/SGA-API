import { Injectable, NotImplementedException } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import type {
  AnularAusenciaDto,
  AusenciaResponseDto,
  CorregirAusenciaDto,
  HistorialAusenciaResponseDto,
} from "./dto";
import { AusenciasDocenteRepository } from "./repositories";

@Injectable()
export class AusenciasCorreccionService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU2: Corregir una ausencia dentro de las 24 horas y antes del descargo.
   * Traza: CP-RF012-10, 11, 14, 15, 18 (a implementar en T04).
   */
  corregir(
    _id: string,
    _dto: CorregirAusenciaDto,
    _fotos: Express.Multer.File[] | undefined,
    _actorId: string,
    _ip?: string,
  ): Promise<AusenciaResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de corrección implementada en T04."),
    );
  }

  /**
   * HU2: Anular una ausencia con motivo obligatorio.
   * Traza: CP-RF012-16, 17, 18 (a implementar en T04).
   */
  anular(
    _id: string,
    _dto: AnularAusenciaDto,
    _actorId: string,
    _ip?: string,
  ): Promise<AusenciaResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de anulación implementada en T04."),
    );
  }

  /**
   * HU2: Consultar el historial completo de versiones de una ausencia.
   * Traza: CP-RF012-12 (a implementar en T04).
   */
  obtenerHistorial(_id: string): Promise<HistorialAusenciaResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de historial implementada en T04."),
    );
  }
}
