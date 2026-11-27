import { AuditService } from "../../../../common/services/audit.service";
import { InstitucionService } from "../../../institucion/institucion.service";
import { NotificacionesService } from "../../../notificaciones/notificaciones.service";
import type { ActorConsolidado } from "../../interfaces";
import { ConsolidadoDocenteRepository } from "../../repositories";

export type ConsolidadoDocenteServiceDeps = {
  repository: ConsolidadoDocenteRepository;
  auditService: AuditService;
  notificacionesService: NotificacionesService;
  institucionService: InstitucionService;
};

export type ConsolidadoDocenteServiceCalls = {
  exigirDirectorOAdmin: (actor: ActorConsolidado) => void;
  exigirAccesoGeneral: (actor: ActorConsolidado) => void;
  minutosHoraPedagogica: () => Promise<number>;
};
