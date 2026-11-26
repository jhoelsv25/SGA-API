import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AuditService } from "../../common/services/audit.service";
import { QUEUES } from "../../core/queues/queues.constants";
import {
  AnioAcademicoResponseDto,
  BimestreFechaDto,
  BimestreResponseDto,
  CreateAnioAcademicoDto,
  ReabrirAnioDto,
  UpdateAnioAcademicoDto,
} from "./dto";
import { AnioPersistido } from "./interfaces";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { AniosAcademicosRepository } from "./repositories/anios.repository";
import { hoyEnColegio } from "./utils";
import type {
  AniosAcademicosServiceDeps,
  AniosAcademicosServiceCalls,
} from "./services/anios/deps";
import * as parte1 from "./services/anios/on-module-init";
import * as parte2 from "./services/anios/verificar-fin-bimestre";

@Injectable()
export class AniosAcademicosService implements OnModuleInit {
  private readonly logger = new Logger(AniosAcademicosService.name);

  constructor(
    private readonly aniosRepository: AniosAcademicosRepository,
    private readonly auditService: AuditService,
    @Optional()
    @InjectQueue(QUEUES.ANIO_ESCOLAR)
    private readonly cola?: Queue,
    @Optional()
    private readonly notificacionesService?: NotificacionesService,
  ) {}

  private dependencias(): AniosAcademicosServiceDeps {
    return {
      aniosRepository: this.aniosRepository,
      auditService: this.auditService,
      cola: this.cola,
      notificacionesService: this.notificacionesService,
      logger: this.logger,
    };
  }

  private llamadas(): AniosAcademicosServiceCalls {
    return {
      cerrarReaperturasVencidas: (hoy) => this.cerrarReaperturasVencidas(hoy),
      anioVigente: () => this.anioVigente(),
      requireAnio: (id) => this.requireAnio(id),
      assertPlanificado: (anio) => this.assertPlanificado(anio),
      assertRangoAnio: (inicio, fin) => this.assertRangoAnio(inicio, fin),
      assertBimestres: (anio, bimestres) => this.assertBimestres(anio, bimestres),
      resumen: (anio) => this.resumen(anio),
      auditarEstado: (tabla, registroId, anterior, nuevo, actorId, ip) =>
        this.auditarEstado(tabla, registroId, anterior, nuevo, actorId, ip),
    };
  }

  async onModuleInit(): Promise<void> {
    return parte1.onModuleInit(this.dependencias());
  }

  async findAll(): Promise<AnioAcademicoResponseDto[]> {
    return parte1.findAll(this.dependencias(), this.llamadas());
  }

  async findEnCurso(): Promise<AnioAcademicoResponseDto> {
    return parte1.findEnCurso(this.llamadas());
  }

  async findById(id: string): Promise<AnioAcademicoResponseDto> {
    return parte1.findById(this.dependencias(), id);
  }

  async create(
    dto: CreateAnioAcademicoDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    return parte1.create(this.dependencias(), this.llamadas(), dto, actorId, ip);
  }

  async update(
    id: string,
    dto: UpdateAnioAcademicoDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    return parte1.update(this.dependencias(), this.llamadas(), id, dto, actorId, ip);
  }

  async guardarBimestres(
    id: string,
    bimestres: BimestreFechaDto[],
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    return parte1.guardarBimestres(
      this.dependencias(),
      this.llamadas(),
      id,
      bimestres,
      actorId,
      ip,
    );
  }

  async iniciar(id: string, actorId: string, ip?: string): Promise<AnioAcademicoResponseDto> {
    return parte1.iniciar(this.dependencias(), this.llamadas(), id, actorId, ip);
  }

  async cerrar(id: string, actorId: string, ip?: string): Promise<AnioAcademicoResponseDto> {
    return parte1.cerrar(this.dependencias(), this.llamadas(), id, actorId, ip);
  }

  async reabrir(
    id: string,
    dto: ReabrirAnioDto,
    actorId: string,
    ip?: string,
  ): Promise<AnioAcademicoResponseDto> {
    return parte1.reabrir(this.dependencias(), this.llamadas(), id, dto, actorId, ip);
  }

  async iniciarBimestre(
    anioId: string,
    bimestreId: string,
    actorId: string,
    ip?: string,
  ): Promise<BimestreResponseDto> {
    return parte1.iniciarBimestre(
      this.dependencias(),
      this.llamadas(),
      anioId,
      bimestreId,
      actorId,
      ip,
    );
  }

  async cerrarBimestre(
    anioId: string,
    bimestreId: string,
    actorId: string,
    ip?: string,
  ): Promise<BimestreResponseDto> {
    return parte1.cerrarBimestre(
      this.dependencias(),
      this.llamadas(),
      anioId,
      bimestreId,
      actorId,
      ip,
    );
  }

  /** Lo consulta RF-011: un bimestre cerrado bloquea sesiones y ausencias de sus fechas. */
  async sesionesBloqueadasEn(fecha: string): Promise<boolean> {
    return parte1.sesionesBloqueadasEn(this.dependencias(), fecha);
  }

  async cerrarReaperturasVencidas(hoy = hoyEnColegio()): Promise<number> {
    return parte1.cerrarReaperturasVencidas(this.dependencias(), hoy);
  }

  /**
   * Proceso de recordatorio periódico (BullMQ diario):
   * 1. Si faltan 5 o 2 días para el fin del bimestre en curso, avisa a los docentes con carga
   *    para que regularicen sesiones, notas de tareas y materiales de reforzamiento.
   * 2. Si hoy es la fecha fin del bimestre, alerta a los directivos para coordinar el cierre.
   */
  async verificarYNotificarFinBimestre(hoy = hoyEnColegio()): Promise<{
    docentesNotificados: number;
    directivosNotificados: number;
  }> {
    return parte2.verificarYNotificarFinBimestre(this.dependencias(), this.llamadas(), hoy);
  }

  async anioVigente(): Promise<AnioPersistido | null> {
    return parte2.anioVigente(this.dependencias());
  }

  private async requireAnio(id: string): Promise<AnioPersistido> {
    return parte2.requireAnio(this.dependencias(), id);
  }

  private assertPlanificado(anio: AnioPersistido): void {
    return parte2.assertPlanificado(anio);
  }

  private assertRangoAnio(inicio: string, fin: string): void {
    return parte2.assertRangoAnio(inicio, fin);
  }

  private assertBimestres(
    anio: { fechaInicio: string; fechaFin: string },
    bimestres: { numero: number; fechaInicio: string; fechaFin: string }[],
  ): void {
    return parte2.assertBimestres(anio, bimestres);
  }

  private resumen(anio: AnioPersistido): Record<string, unknown> {
    return parte2.resumen(anio);
  }

  private async auditarEstado(
    tabla: string,
    registroId: string,
    anterior: string,
    nuevo: string,
    actorId: string,
    ip?: string,
  ): Promise<void> {
    return parte2.auditarEstado(
      this.dependencias(),
      tabla,
      registroId,
      anterior,
      nuevo,
      actorId,
      ip,
    );
  }
}
