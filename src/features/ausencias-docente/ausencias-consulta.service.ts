import { Injectable, NotImplementedException } from "@nestjs/common";
import { AnioLectivoCls } from "../../common/anio-lectivo";
import { AuditService } from "../../common/services/audit.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import type {
  AusenciaResponseDto,
  FiltroAusenciasQueryDto,
  MensajeAusenciaResponseDto,
  RegistrarDescargoDto,
  ResumenAusenciasSupervisorResponseDto,
} from "./dto";
import { AusenciasDocenteRepository } from "./repositories";

@Injectable()
export class AusenciasConsultaService {
  constructor(
    private readonly repository: AusenciasDocenteRepository,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
    private readonly anioLectivoCls: AnioLectivoCls,
  ) {}

  /**
   * HU4: Listar ausencias para supervisores con filtros y cálculo de total de minutos.
   * Traza: CP-RF012-24 (a implementar en T05).
   */
  listarSupervisor(
    _query: FiltroAusenciasQueryDto,
  ): Promise<ResumenAusenciasSupervisorResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de listado supervisor implementada en T05."),
    );
  }

  /**
   * HU3: Listar ausencias del docente autenticado.
   * Traza: CP-RF012-13, 19, 23 (a implementar en T05).
   */
  misAusencias(_personaId: string): Promise<AusenciaResponseDto[]> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de mis ausencias implementada en T05."),
    );
  }

  /**
   * HU3: Obtener el detalle de una ausencia para el docente autenticado.
   * Traza: CP-RF012-13, 19, 23 (a implementar en T05).
   */
  obtenerDetalleDocente(_id: string, _personaId: string): Promise<AusenciaResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de detalle docente implementada en T05."),
    );
  }

  /**
   * HU3: Registrar el descargo único del docente dentro del plazo de 7 días.
   * Traza: CP-RF012-20, 21, 22, 23, 18 (a implementar en T05).
   */
  presentarDescargo(
    _id: string,
    _dto: RegistrarDescargoDto,
    _personaId: string,
    _actorId: string,
    _ip?: string,
  ): Promise<MensajeAusenciaResponseDto> {
    return Promise.reject(
      new NotImplementedException("Funcionalidad de descargo implementada en T05."),
    );
  }
}
