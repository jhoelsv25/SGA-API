import { AnioLectivoCls } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { AniosAcademicosService } from "../../anio-escolar/anios.service";
import { NotificacionesService } from "../../notificaciones/notificaciones.service";
import { AulaVirtualRepository } from "../repositories";
import { AulaActividadService } from "./aula-actividad.service";
import { AulaCalificacionesService } from "./aula-calificaciones.service";
import { AulaContextoHelper } from "./aula-contexto.helper";
import { AulaEntregasService } from "./aula-entregas.service";
import { AulaInteraccionService } from "./aula-interaccion.service";
import { AulaMaterialesService } from "./aula-materiales.service";
import { AulaRecordatoriosService } from "./aula-recordatorios.service";
import { AulaSolicitudesService } from "./aula-solicitudes.service";
import { AulaTareasService } from "./aula-tareas.service";
import { AulaUnidadesService } from "./aula-unidades.service";

export interface SubServiciosAula {
  unidadesSvc: AulaUnidadesService;
  materialesSvc: AulaMaterialesService;
  solicitudesSvc: AulaSolicitudesService;
  tareasSvc: AulaTareasService;
  entregasSvc: AulaEntregasService;
  calificacionesSvc: AulaCalificacionesService;
  recordatoriosSvc: AulaRecordatoriosService;
  interaccionSvc: AulaInteraccionService;
  actividadSvc: AulaActividadService;
}

export function inicializarSubServiciosAula(
  repository: AulaVirtualRepository,
  aniosService: AniosAcademicosService,
  anioLectivoCls: AnioLectivoCls,
  notificaciones: NotificacionesService,
  auditService: AuditService,
  inyectados: Partial<SubServiciosAula> = {},
): SubServiciosAula {
  const ctx = new AulaContextoHelper(repository, aniosService, anioLectivoCls, auditService);
  return {
    unidadesSvc:
      inyectados.unidadesSvc ??
      new AulaUnidadesService(repository, aniosService, anioLectivoCls, auditService, ctx),
    materialesSvc:
      inyectados.materialesSvc ??
      new AulaMaterialesService(
        repository,
        aniosService,
        anioLectivoCls,
        notificaciones,
        auditService,
        ctx,
      ),
    solicitudesSvc:
      inyectados.solicitudesSvc ??
      new AulaSolicitudesService(
        repository,
        aniosService,
        anioLectivoCls,
        notificaciones,
        auditService,
        ctx,
      ),
    tareasSvc:
      inyectados.tareasSvc ??
      new AulaTareasService(
        repository,
        aniosService,
        anioLectivoCls,
        notificaciones,
        auditService,
        ctx,
      ),
    entregasSvc:
      inyectados.entregasSvc ??
      new AulaEntregasService(
        repository,
        aniosService,
        anioLectivoCls,
        notificaciones,
        auditService,
        ctx,
      ),
    calificacionesSvc:
      inyectados.calificacionesSvc ??
      new AulaCalificacionesService(repository, aniosService, anioLectivoCls, auditService, ctx),
    recordatoriosSvc:
      inyectados.recordatoriosSvc ?? new AulaRecordatoriosService(repository, notificaciones),
    interaccionSvc:
      inyectados.interaccionSvc ??
      new AulaInteraccionService(
        repository,
        aniosService,
        anioLectivoCls,
        notificaciones,
        auditService,
        ctx,
      ),
    actividadSvc:
      inyectados.actividadSvc ??
      new AulaActividadService(repository, aniosService, anioLectivoCls, auditService, ctx),
  };
}
