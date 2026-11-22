import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { existsSync } from "fs";
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { ClsService } from "nestjs-cls";
import { AnioLectivoCls, CLS_ANIO_ACADEMICO_ID } from "../../../common/anio-lectivo";
import { AuditService } from "../../../common/services/audit.service";
import { QUEUES } from "../../../core/queues/queues.constants";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import {
  DIRECTORIO_REPORTES_TEMP,
  ETIQUETA_TIPO_REPORTE,
  JOB_GENERAR_REPORTE,
  ROLES_POR_TIPO_REPORTE,
  TTL_ARCHIVO_REPORTE_MS,
  type TipoReporteCola,
} from "../constants";
import type { EstadoTrabajoReporte, SolicitarReporteDto, TrabajoReporteResponseDto } from "../dto";
import { ExportacionService, type ReporteGenerado } from "../exportacion.service";

export interface ReporteJobPayload {
  dto: SolicitarReporteDto;
  anioAcademicoId?: string;
  usuario: AuthenticatedUser;
  ip?: string;
}

export interface ReporteJobResultado {
  nombreArchivo: string;
  rutaArchivo: string | null;
  tamanoBytes: number;
  totalFilas: number;
  etiqueta: string;
}

@Injectable()
export class ReportesColaService {
  private readonly logger = new Logger(ReportesColaService.name);

  constructor(
    @InjectQueue(QUEUES.REPORTS)
    private readonly cola: Queue<ReporteJobPayload, ReporteJobResultado>,
    private readonly exportacion: ExportacionService,
    private readonly anioLectivo: AnioLectivoCls,
    private readonly cls: ClsService,
    private readonly auditService: AuditService,
  ) {}

  async encolar(
    dto: SolicitarReporteDto,
    user: AuthenticatedUser,
    ip?: string,
  ): Promise<TrabajoReporteResponseDto> {
    this.exigirPermisoRol(dto.tipo, user.role);

    if (dto.tipo === "libretas" && !dto.periodoId) {
      throw new BadRequestException(
        "Debe seleccionar un período (bimestre) para generar el reporte de libretas.",
      );
    }

    const anioAcademicoId = dto.anioAcademicoId ?? this.anioLectivo.id();
    const job = await this.cola.add(
      JOB_GENERAR_REPORTE,
      { dto, anioAcademicoId, usuario: user, ip },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { age: 7200, count: 100 },
        removeOnFail: { age: 7200, count: 50 },
      },
    );

    return {
      jobId: String(job.id),
      tipo: dto.tipo,
      etiqueta: ETIQUETA_TIPO_REPORTE[dto.tipo],
      estado: "encolado",
      progreso: 0,
      mensajeEstado: "Preparando reporte...",
      nombreArchivo: null,
      tamanoBytes: null,
      totalFilas: null,
      disponibleDescarga: false,
      creadoEn: new Date(job.timestamp).toISOString(),
      finalizadoEn: null,
      error: null,
    };
  }

  async procesarTrabajo(
    job: Job<ReporteJobPayload, ReporteJobResultado>,
  ): Promise<ReporteJobResultado> {
    const { dto, anioAcademicoId, usuario, ip } = job.data;
    const etiqueta = ETIQUETA_TIPO_REPORTE[dto.tipo];

    await job.updateProgress(15);

    const generado = await this.cls.run(async () => {
      if (anioAcademicoId) {
        this.cls.set(CLS_ANIO_ACADEMICO_ID, anioAcademicoId);
      }
      await job.updateProgress(35);
      return this.generarSegunTipo(dto, anioAcademicoId, usuario);
    });

    await job.updateProgress(80);
    const registroAuditoriaId =
      dto.seccionId ?? dto.gradoId ?? dto.periodoId ?? anioAcademicoId ?? undefined;

    if (generado.totalFilas === 0) {
      await this.auditService.log({
        usuarioId: usuario.id,
        accion: "crear",
        tabla: "reportes",
        registroId: registroAuditoriaId,
        valorNuevo: {
          jobId: String(job.id),
          tipo: dto.tipo,
          etiqueta,
          totalFilas: 0,
          sinRegistros: true,
        },
        direccionIp: ip,
      });
      await job.updateProgress(100);
      return {
        nombreArchivo: generado.nombreArchivo,
        rutaArchivo: null,
        tamanoBytes: 0,
        totalFilas: 0,
        etiqueta,
      };
    }

    await mkdir(DIRECTORIO_REPORTES_TEMP, { recursive: true });
    const rutaArchivo = join(DIRECTORIO_REPORTES_TEMP, `${String(job.id)}.xlsx`);
    await writeFile(rutaArchivo, generado.buffer);

    await this.limpiarArchivosVencidos();

    await this.auditService.log({
      usuarioId: usuario.id,
      accion: "crear",
      tabla: "reportes",
      registroId: registroAuditoriaId,
      valorNuevo: {
        jobId: String(job.id),
        tipo: dto.tipo,
        etiqueta,
        anioAcademicoId: anioAcademicoId ?? null,
        periodoId: dto.periodoId ?? null,
        gradoId: dto.gradoId ?? null,
        seccionId: dto.seccionId ?? null,
        nombreArchivo: generado.nombreArchivo,
        tamanoBytes: generado.buffer.length,
        totalFilas: generado.totalFilas,
      },
      direccionIp: ip,
    });

    await job.updateProgress(100);

    return {
      nombreArchivo: generado.nombreArchivo,
      rutaArchivo,
      tamanoBytes: generado.buffer.length,
      totalFilas: generado.totalFilas,
      etiqueta,
    };
  }

  async listarTrabajosUsuario(user: AuthenticatedUser): Promise<TrabajoReporteResponseDto[]> {
    const trabajos = await this.cola.getJobs(
      ["waiting", "active", "delayed", "completed", "failed"],
      0,
      40,
      false,
    );
    const propios = trabajos
      .filter((job) => job.data?.usuario?.id === user.id)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, 15);

    return Promise.all(propios.map((job) => this.mapearTrabajo(job)));
  }

  async obtenerTrabajo(jobId: string, user: AuthenticatedUser): Promise<TrabajoReporteResponseDto> {
    const job = await this.cola.getJob(jobId);
    if (!job) {
      throw new NotFoundException("Trabajo de reporte no encontrado o expirado.");
    }
    if (job.data?.usuario?.id !== user.id && user.role !== "Administrador") {
      throw new ForbiddenException("No tiene permiso para consultar este reporte.");
    }
    return this.mapearTrabajo(job);
  }

  async obtenerArchivoDescarga(
    jobId: string,
    user: AuthenticatedUser,
    ip?: string,
  ): Promise<{ rutaArchivo: string; nombreArchivo: string }> {
    const job = await this.cola.getJob(jobId);
    if (!job) {
      throw new NotFoundException("Reporte no encontrado o expirado.");
    }
    if (job.data?.usuario?.id !== user.id && user.role !== "Administrador") {
      throw new ForbiddenException("No tiene permiso para descargar este reporte.");
    }

    const estado = await job.getState();
    if (estado !== "completed" || !job.returnvalue) {
      throw new BadRequestException("El reporte aún no ha terminado de generarse.");
    }

    const { rutaArchivo, nombreArchivo } = job.returnvalue;
    if (!rutaArchivo || !existsSync(rutaArchivo)) {
      throw new NotFoundException(
        "El archivo temporal no está disponible o no tuvo registros. Genere nuevamente el reporte.",
      );
    }

    const registroAuditoriaId =
      job.data.dto.seccionId ??
      job.data.dto.gradoId ??
      job.data.dto.periodoId ??
      job.data.anioAcademicoId ??
      undefined;

    await this.auditService.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "reportes",
      registroId: registroAuditoriaId,
      valorNuevo: { jobId: String(job.id), evento: "descarga", nombreArchivo },
      direccionIp: ip,
    });

    return { rutaArchivo, nombreArchivo };
  }

  async eliminarTrabajo(jobId: string, user: AuthenticatedUser): Promise<void> {
    const job = await this.cola.getJob(jobId);
    if (!job) return;

    if (job.data?.usuario?.id !== user.id && user.role !== "Administrador") {
      throw new ForbiddenException("No tiene permiso para quitar este reporte.");
    }

    const estado = await job.getState();
    if (estado === "active" || estado === "waiting" || estado === "delayed") {
      throw new BadRequestException(
        "No se puede quitar un reporte mientras todavía está en proceso.",
      );
    }

    const rutaArchivo = job.returnvalue?.rutaArchivo;
    if (rutaArchivo) {
      await unlink(rutaArchivo).catch(() => undefined);
    }

    await job.remove();
  }

  async limpiarTrabajosUsuario(user: AuthenticatedUser): Promise<{ eliminados: number }> {
    const trabajos = await this.cola.getJobs(["completed", "failed"], 0, 100, false);
    const propios = trabajos.filter((job) => job.data?.usuario?.id === user.id);
    let eliminados = 0;

    for (const job of propios) {
      const rutaArchivo = job.returnvalue?.rutaArchivo;
      if (rutaArchivo) {
        await unlink(rutaArchivo).catch(() => undefined);
      }
      await job.remove().catch(() => undefined);
      eliminados += 1;
    }

    return { eliminados };
  }

  private exigirPermisoRol(tipo: TipoReporteCola, rol: string): void {
    const permitidos = ROLES_POR_TIPO_REPORTE[tipo] ?? [];
    if (!permitidos.includes(rol)) {
      throw new ForbiddenException(
        `Su rol (${rol}) no tiene autorización para generar el reporte «${ETIQUETA_TIPO_REPORTE[tipo]}».`,
      );
    }
  }

  private async generarSegunTipo(
    dto: SolicitarReporteDto,
    anioAcademicoId: string | undefined,
    user: AuthenticatedUser,
  ): Promise<ReporteGenerado> {
    switch (dto.tipo) {
      case "matriculas":
        return this.exportacion.matriculasExcel(
          {
            anioAcademicoId,
            gradoId: dto.gradoId,
            seccionId: dto.seccionId,
            tipo: dto.tipoMatricula,
            estado: dto.estado,
            search: dto.search,
            limit: 100,
          },
          user,
        );
      case "marcaciones":
        return this.exportacion.marcacionesExcel(
          {
            periodoId: dto.periodoId,
            desde: dto.desde,
            hasta: dto.hasta,
            seccionId: dto.seccionId,
            tipoPersona: dto.tipoPersona,
          },
          user,
        );
      case "libretas":
        if (!dto.periodoId) {
          throw new BadRequestException("El período (bimestre) es obligatorio para libretas.");
        }
        return this.exportacion.libretasExcel(
          {
            periodoId: dto.periodoId,
            gradoId: dto.gradoId,
            seccionId: dto.seccionId,
          },
          user,
        );
      case "asistencia-seccion":
        return this.exportacion.asistenciaSeccionExcel(
          {
            gradoId: dto.gradoId,
            seccionId: dto.seccionId,
            periodoId: dto.periodoId,
            desde: dto.desde,
            hasta: dto.hasta,
          },
          user,
        );
      case "asistencia-personal":
        return this.exportacion.asistenciaPersonalExcel(
          {
            periodoId: dto.periodoId,
            desde: dto.desde,
            hasta: dto.hasta,
            tipoPersona:
              dto.tipoPersona === "docentes" || dto.tipoPersona === "administrativos"
                ? dto.tipoPersona
                : undefined,
          },
          user,
        );
      case "personas":
        return this.exportacion.personasExcel(
          { search: dto.search, tipoDocumento: dto.tipoDocumento },
          user,
        );
      case "estudiantes":
        return this.exportacion.estudiantesExcel({ search: dto.search }, user);
      case "docentes":
        return this.exportacion.docentesExcel({ search: dto.search }, user);
      case "apoderados":
        return this.exportacion.apoderadosExcel({ search: dto.search }, user);
      case "usuarios":
        return this.exportacion.usuariosExcel({ search: dto.search, limit: 100 }, user);
    }
  }

  private async mapearTrabajo(
    job: Job<ReporteJobPayload, ReporteJobResultado>,
  ): Promise<TrabajoReporteResponseDto> {
    const rawState = await job.getState();
    let estado: EstadoTrabajoReporte = "encolado";
    let mensajeEstado = "Preparando reporte...";

    if (rawState === "active") {
      estado = "procesando";
      mensajeEstado = "Consultando datos y construyendo Excel...";
    } else if (rawState === "completed") {
      estado = "completado";
      mensajeEstado = "Listo para descargar";
    } else if (rawState === "failed") {
      estado = "fallido";
      mensajeEstado = job.failedReason || "Ocurrió un error al generar el reporte.";
    }

    const progresoNum = typeof job.progress === "number" ? job.progress : 0;
    const resultado = estado === "completado" ? job.returnvalue : null;
    const sinRegistros = estado === "completado" && resultado?.totalFilas === 0;
    const disponibleDescarga = Boolean(
      !sinRegistros && resultado?.rutaArchivo && existsSync(resultado.rutaArchivo),
    );

    const mensajeFinal = sinRegistros
      ? "No se encontraron registros con los filtros seleccionados."
      : estado === "completado" && !disponibleDescarga
        ? "Archivo expirado (genere nuevamente)"
        : mensajeEstado;

    return {
      jobId: String(job.id),
      tipo: job.data.dto.tipo,
      etiqueta: ETIQUETA_TIPO_REPORTE[job.data.dto.tipo],
      estado,
      progreso: estado === "completado" ? 100 : progresoNum,
      mensajeEstado: mensajeFinal,
      nombreArchivo: sinRegistros ? null : (resultado?.nombreArchivo ?? null),
      tamanoBytes: resultado?.tamanoBytes ?? null,
      totalFilas: resultado?.totalFilas ?? null,
      disponibleDescarga,
      creadoEn: new Date(job.timestamp).toISOString(),
      finalizadoEn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      error: estado === "fallido" ? (job.failedReason ?? "Error desconocido") : null,
    };
  }

  private async limpiarArchivosVencidos(): Promise<void> {
    try {
      const archivos = await readdir(DIRECTORIO_REPORTES_TEMP);
      const ahora = Date.now();
      for (const nombre of archivos) {
        const ruta = join(DIRECTORIO_REPORTES_TEMP, nombre);
        const info = await stat(ruta).catch(() => null);
        if (info && ahora - info.mtimeMs > TTL_ARCHIVO_REPORTE_MS) {
          await unlink(ruta).catch(() => undefined);
        }
      }
    } catch (err) {
      this.logger.warn(`No se pudo limpiar temporales de reportes: ${(err as Error).message}`);
    }
  }
}
