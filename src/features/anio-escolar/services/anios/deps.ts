import { Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { AuditService } from "../../../../common/services/audit.service";
import { AnioPersistido } from "../../interfaces";
import { NotificacionesService } from "../../../notificaciones/notificaciones.service";
import { AniosAcademicosRepository } from "../../repositories/anios.repository";

export type AniosAcademicosServiceDeps = {
  aniosRepository: AniosAcademicosRepository;
  auditService: AuditService;
  cola: Queue | undefined;
  notificacionesService: NotificacionesService | undefined;
  logger: Logger;
};

export type AniosAcademicosServiceCalls = {
  cerrarReaperturasVencidas: (hoy?: string) => Promise<number>;
  anioVigente: () => Promise<AnioPersistido | null>;
  requireAnio: (id: string) => Promise<AnioPersistido>;
  assertPlanificado: (anio: AnioPersistido) => void;
  assertRangoAnio: (inicio: string, fin: string) => void;
  assertBimestres: (
    anio: { fechaInicio: string; fechaFin: string },
    bimestres: { numero: number; fechaInicio: string; fechaFin: string }[],
  ) => void;
  resumen: (anio: AnioPersistido) => Record<string, unknown>;
  auditarEstado: (
    tabla: string,
    registroId: string,
    anterior: string,
    nuevo: string,
    actorId: string,
    ip?: string,
  ) => Promise<void>;
};
