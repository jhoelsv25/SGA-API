import { AuditService } from "../../../common/services/audit.service";
import { CacheService } from "../../../core/cache/cache.service";
import { IaService } from "../../../core/ia/ia.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { AulaVirtualService } from "../../aula-virtual/aula-virtual.service";
import { CalendarioService } from "../../calendario/calendario.service";
import { ConsolidadoDocenteService } from "../../consolidado-docente/services/consolidado-docente.service";
import { EquiposService } from "../../equipos/equipos.service";
import { MarcacionesService } from "../../marcaciones/services/marcaciones.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { PlanificacionSesionesService } from "../../planificacion-sesiones/services/planificacion-sesiones.service";
import { VariablesSistemaService } from "../../variables-sistema/variables-sistema.service";
import { SesionesClaseRepository } from "../repositories";
import { SesionesCicloService } from "./sesiones-ciclo.service";
import { SesionesContextoHelper } from "./sesiones-contexto.helper";
import { SesionesFirmasService } from "./sesiones-firmas.service";
import { SesionesIaService } from "./sesiones-ia.service";
import { SesionesJustificacionesService } from "./sesiones-justificaciones.service";
import { SesionesPanelService } from "./sesiones-panel.service";

export interface SubServiciosSesiones {
  cicloSvc: SesionesCicloService;
  iaSvc: SesionesIaService;
  firmasSvc: SesionesFirmasService;
  panelSvc: SesionesPanelService;
  justificacionesSvc: SesionesJustificacionesService;
}

export interface DependenciasSesiones {
  repository: SesionesClaseRepository;
  equiposService: EquiposService;
  marcacionesService: MarcacionesService;
  aniosService: AniosAcademicosService;
  calendarioService: CalendarioService;
  auditService: AuditService;
  consolidadoService?: ConsolidadoDocenteService;
  notificacionesService?: NotificacionesService;
  variablesService?: VariablesSistemaService;
  aulaVirtualService?: AulaVirtualService;
  iaService?: IaService;
  cacheService?: CacheService;
  planificacionesService?: PlanificacionSesionesService;
}

export function inicializarSubServiciosSesiones(
  deps: DependenciasSesiones,
  inyectados: Partial<SubServiciosSesiones> = {},
): SubServiciosSesiones {
  const ctx = new SesionesContextoHelper(
    deps.repository,
    deps.aniosService,
    deps.consolidadoService,
    deps.variablesService,
  );
  const cicloSvc =
    inyectados.cicloSvc ??
    new SesionesCicloService(
      deps.repository,
      deps.aniosService,
      deps.calendarioService,
      deps.auditService,
      ctx,
      deps.notificacionesService,
      deps.variablesService,
      deps.cacheService,
    );
  const iaSvc =
    inyectados.iaSvc ??
    new SesionesIaService(
      deps.repository,
      deps.aniosService,
      ctx,
      deps.aulaVirtualService,
      deps.iaService,
      deps.cacheService,
    );
  const firmasSvc =
    inyectados.firmasSvc ??
    new SesionesFirmasService(
      deps.repository,
      deps.equiposService,
      deps.marcacionesService,
      deps.auditService,
      ctx,
      cicloSvc,
      iaSvc,
      deps.cacheService,
      deps.planificacionesService,
    );
  const panelSvc =
    inyectados.panelSvc ??
    new SesionesPanelService(
      deps.repository,
      deps.auditService,
      ctx,
      cicloSvc,
      deps.notificacionesService,
    );
  const justificacionesSvc =
    inyectados.justificacionesSvc ??
    new SesionesJustificacionesService(
      deps.repository,
      deps.auditService,
      ctx,
      deps.notificacionesService,
    );

  return { cicloSvc, iaSvc, firmasSvc, panelSvc, justificacionesSvc };
}
