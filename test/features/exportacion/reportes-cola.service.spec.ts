import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { existsSync, unlinkSync } from "fs";
import type { Job, Queue } from "bullmq";
import type { ClsService } from "nestjs-cls";
import type { AnioLectivoCls } from "@/common/anio-lectivo";
import type { AuditService } from "@/common/services/audit.service";
import type { ExportacionService } from "@/features/exportacion/exportacion.service";
import {
  type ReporteJobPayload,
  type ReporteJobResultado,
  ReportesColaService,
} from "@/features/exportacion/services/reportes-cola.service";

const adminUser = {
  id: "u-admin",
  username: "admin",
  roleId: "r-admin",
  role: "Administrador",
  personaId: "p-admin",
};

const docenteUser = {
  id: "u-doc",
  username: "docente",
  roleId: "r-doc",
  role: "Docente",
  personaId: "p-doc",
};

describe("ReportesColaService (BullMQ reports-queue)", () => {
  let service: ReportesColaService;
  let cola: jest.Mocked<Pick<Queue, "add" | "getJobs" | "getJob">>;
  let exportacion: jest.Mocked<
    Pick<ExportacionService, "matriculasExcel" | "asistenciaSeccionExcel">
  >;
  let audit: jest.Mocked<Pick<AuditService, "log">>;
  let cls: jest.Mocked<Pick<ClsService, "run" | "set">>;

  beforeEach(() => {
    cola = {
      add: jest.fn().mockResolvedValue({ id: "job-test-1", timestamp: Date.now() }),
      getJobs: jest.fn().mockResolvedValue([]),
      getJob: jest.fn(),
    };
    exportacion = {
      matriculasExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from("xlsx-bytes"),
        nombreArchivo: "sga_matriculas_2026-11-21.xlsx",
        totalFilas: 15,
      }),
      asistenciaSeccionExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from("xlsx-asistencia"),
        nombreArchivo: "sga_asistencia-seccion_2026-11-21.xlsx",
        totalFilas: 28,
      }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    cls = {
      run: jest.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
      set: jest.fn(),
    };
    const anioLectivo = { id: jest.fn().mockReturnValue("anio-2026") } as unknown as AnioLectivoCls;

    service = new ReportesColaService(
      cola as unknown as Queue<ReporteJobPayload, ReporteJobResultado>,
      exportacion as unknown as ExportacionService,
      anioLectivo,
      cls as unknown as ClsService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza encolar si el rol no tiene permiso para ese tipo de reporte", async () => {
    await expect(service.encolar({ tipo: "usuarios" }, docenteUser)).rejects.toThrow(
      ForbiddenException,
    );
    expect(cola.add).not.toHaveBeenCalled();
  });

  it("exige periodoId al encolar reporte de libretas", async () => {
    await expect(service.encolar({ tipo: "libretas" }, adminUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("encola el trabajo en BullMQ con el año lectivo activo", async () => {
    const res = await service.encolar(
      { tipo: "asistencia-seccion", gradoId: "grado-1" },
      adminUser,
      "127.0.0.1",
    );

    expect(res.jobId).toBe("job-test-1");
    expect(res.estado).toBe("encolado");
    expect(cola.add).toHaveBeenCalledWith(
      "generar-reporte-excel",
      expect.objectContaining({
        anioAcademicoId: "anio-2026",
        usuario: adminUser,
      }),
      expect.objectContaining({ attempts: 2 }),
    );
  });

  it("procesa el trabajo dentro de CLS, guarda el archivo temporal y audita", async () => {
    const job = {
      id: "job-proc-spec",
      data: {
        dto: { tipo: "matriculas" as const, gradoId: "grado-1" },
        anioAcademicoId: "anio-2026",
        usuario: adminUser,
        ip: "127.0.0.1",
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<ReporteJobPayload, ReporteJobResultado>;

    const resultado = await service.procesarTrabajo(job);

    expect(cls.set).toHaveBeenCalledWith("anioAcademicoId", "anio-2026");
    expect(exportacion.matriculasExcel).toHaveBeenCalled();
    expect(resultado.nombreArchivo).toBe("sga_matriculas_2026-11-21.xlsx");
    expect(resultado.rutaArchivo).not.toBeNull();
    expect(existsSync(resultado.rutaArchivo!)).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        registroId: "grado-1",
      }),
    );

    // Limpiar archivo temporal de prueba
    if (resultado.rutaArchivo && existsSync(resultado.rutaArchivo)) {
      unlinkSync(resultado.rutaArchivo);
    }
  });

  it("no genera archivo en disco cuando el reporte tiene 0 registros", async () => {
    exportacion.matriculasExcel.mockResolvedValueOnce({
      buffer: Buffer.from("vacio"),
      nombreArchivo: "sga_matriculas_2026-11-21.xlsx",
      totalFilas: 0,
    });

    const job = {
      id: "job-vacio-spec",
      data: {
        dto: { tipo: "matriculas" as const },
        anioAcademicoId: "anio-2026",
        usuario: adminUser,
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<ReporteJobPayload, ReporteJobResultado>;

    const resultado = await service.procesarTrabajo(job);
    expect(resultado.totalFilas).toBe(0);
    expect(resultado.rutaArchivo).toBeNull();
  });

  it("impide que otro usuario consulte un trabajo que no le pertenece", async () => {
    cola.getJob.mockResolvedValue({
      id: "job-ajeno",
      data: { dto: { tipo: "matriculas" }, usuario: adminUser },
    } as never);

    await expect(service.obtenerTrabajo("job-ajeno", docenteUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("permite quitar un reporte completado y elimina el job de la cola", async () => {
    const removeMock = jest.fn().mockResolvedValue(undefined);
    cola.getJob.mockResolvedValue({
      id: "job-cerrar",
      data: { dto: { tipo: "matriculas" }, usuario: adminUser },
      getState: jest.fn().mockResolvedValue("completed"),
      returnvalue: { rutaArchivo: null, nombreArchivo: "sga.xlsx", totalFilas: 0, tamanoBytes: 0 },
      remove: removeMock,
    } as never);

    await service.eliminarTrabajo("job-cerrar", adminUser);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("impide quitar un reporte que todavía está en proceso", async () => {
    cola.getJob.mockResolvedValue({
      id: "job-activo",
      data: { dto: { tipo: "matriculas" }, usuario: adminUser },
      getState: jest.fn().mockResolvedValue("active"),
      remove: jest.fn(),
    } as never);

    await expect(service.eliminarTrabajo("job-activo", adminUser)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("limpia solo los reportes finalizados del usuario actual", async () => {
    const removePropio = jest.fn().mockResolvedValue(undefined);
    const removeAjeno = jest.fn().mockResolvedValue(undefined);
    cola.getJobs.mockResolvedValue([
      {
        id: "j1",
        data: { dto: { tipo: "matriculas" }, usuario: adminUser },
        returnvalue: { rutaArchivo: null },
        remove: removePropio,
      },
      {
        id: "j2",
        data: { dto: { tipo: "matriculas" }, usuario: docenteUser },
        returnvalue: { rutaArchivo: null },
        remove: removeAjeno,
      },
    ] as never);

    const res = await service.limpiarTrabajosUsuario(adminUser);
    expect(res.eliminados).toBe(1);
    expect(removePropio).toHaveBeenCalledTimes(1);
    expect(removeAjeno).not.toHaveBeenCalled();
  });
});
