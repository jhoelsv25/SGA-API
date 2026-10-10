import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { MATRICULA_MESSAGES } from "@/features/matriculas/constants";
import { MatriculasRepository } from "@/features/matriculas/repositories";
import { MatriculaOperacionesService } from "@/features/matriculas/services";

describe("MatriculaOperacionesService (RF-009: HU3 Retiro, Traslado, Cambio de sección, Anulación)", () => {
  let service: MatriculaOperacionesService;
  let repo: jest.Mocked<MatriculasRepository>;
  let audit: jest.Mocked<AuditService>;

  const mockMatricula = {
    id: "mat-1",
    codigo: "2027-000001",
    fechaMatricula: "2027-03-01",
    tipo: "nuevo",
    estado: "matriculado",
    esRepitente: false,
    colegioProcedencia: null,
    fechaRetiro: null,
    motivoRetiro: null,
    observaciones: null,
    anioAcademicoId: "anio-2027",
    anioNumero: 2027,
    gradoId: "grado-5",
    gradoNumero: 5,
    gradoNombre: "5.° de Secundaria",
    seccionId: "sec-a",
    seccionNombre: "A",
    estudiante: {
      id: "est-1",
      codigo: "EST-001",
      nombres: "Carlos",
      apellidos: "Perez Ruiz",
      tipoDocumento: "dni",
      numeroDocumento: "70123456",
      estado: "activo",
    },
    creadoEn: "2027-03-01T00:00:00Z",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findMatriculaById: jest.fn().mockResolvedValue(mockMatricula),
      findSeccionById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      desactivarEstudianteYCredenciales: jest.fn().mockResolvedValue(undefined),
      hasActividadRegistrada: jest.fn().mockResolvedValue(false),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatriculaOperacionesService,
        { provide: MatriculasRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MatriculaOperacionesService>(MatriculaOperacionesService);
    repo = module.get(MatriculasRepository);
    audit = module.get(AuditService);
  });

  describe("retirar", () => {
    it("debe rechazar si falta motivo de retiro", async () => {
      await expect(
        service.retirar("mat-1", { fechaRetiro: "2027-08-15", motivoRetiro: "" }, "sec-user"),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe retirar al estudiante, desactivar sus credenciales y auditar", async () => {
      const res = await service.retirar(
        "mat-1",
        { fechaRetiro: "2027-08-15", motivoRetiro: "Cambio de domicilio" },
        "sec-user",
      );

      expect(repo.update).toHaveBeenCalledWith("mat-1", {
        estado: "retirado",
        fechaRetiro: "2027-08-15",
        motivoRetiro: "Cambio de domicilio",
      });
      expect(repo.desactivarEstudianteYCredenciales).toHaveBeenCalledWith("est-1", "retirado");
      expect(audit.log).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });

  describe("trasladar", () => {
    it("debe rechazar si falta colegio de destino", async () => {
      await expect(
        service.trasladar("mat-1", { fechaRetiro: "2027-08-15", colegioDestino: "" }, "sec-user"),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe trasladar al estudiante y desactivar credenciales", async () => {
      await service.trasladar(
        "mat-1",
        { fechaRetiro: "2027-08-15", colegioDestino: "I.E. Alfonso Ugarte" },
        "sec-user",
      );

      expect(repo.update).toHaveBeenCalledWith("mat-1", {
        estado: "trasladado",
        fechaRetiro: "2027-08-15",
        motivoRetiro: "Traslado a: I.E. Alfonso Ugarte",
      });
      expect(repo.desactivarEstudianteYCredenciales).toHaveBeenCalledWith("est-1", "trasladado");
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("cambiarSeccion", () => {
    it("debe rechazar cambio si la sección destino pertenece a otro grado", async () => {
      repo.findSeccionById.mockResolvedValueOnce({
        id: "sec-4b",
        anioAcademicoId: "anio-2027",
        anioNumero: 2027,
        gradoId: "grado-4", // Distinto grado
        gradoNumero: 4,
        gradoNombre: "4.° de Secundaria",
        nombre: "B",
        vacantes: 35,
        estado: "activa",
        matriculadosCount: 20,
        vacantesDisponibles: 15,
      });

      await expect(
        service.cambiarSeccion(
          "mat-1",
          { nuevaSeccionId: "sec-4b", motivo: "Ajuste de grado" },
          "sec-user",
        ),
      ).rejects.toThrow(MATRICULA_MESSAGES.CAMBIO_OTRO_GRADO);
    });

    it("debe rechazar cambio si la sección destino no tiene vacantes", async () => {
      repo.findSeccionById.mockResolvedValueOnce({
        id: "sec-5b",
        anioAcademicoId: "anio-2027",
        anioNumero: 2027,
        gradoId: "grado-5",
        gradoNumero: 5,
        gradoNombre: "5.° de Secundaria",
        nombre: "B",
        vacantes: 35,
        estado: "activa",
        matriculadosCount: 35,
        vacantesDisponibles: 0, // Sin vacantes
      });

      await expect(
        service.cambiarSeccion(
          "mat-1",
          { nuevaSeccionId: "sec-5b", motivo: "Convivencia" },
          "sec-user",
        ),
      ).rejects.toThrow(/no tiene vacantes/);
    });

    it("debe cambiar de sección exitosamente al mismo grado con vacantes", async () => {
      repo.findSeccionById.mockResolvedValueOnce({
        id: "sec-5b",
        anioAcademicoId: "anio-2027",
        anioNumero: 2027,
        gradoId: "grado-5",
        gradoNumero: 5,
        gradoNombre: "5.° de Secundaria",
        nombre: "B",
        vacantes: 35,
        estado: "activa",
        matriculadosCount: 30,
        vacantesDisponibles: 5,
      });

      await service.cambiarSeccion(
        "mat-1",
        { nuevaSeccionId: "sec-5b", motivo: "Cambio por turno" },
        "sec-user",
      );

      expect(repo.update).toHaveBeenCalledWith("mat-1", { seccionId: "sec-5b" });
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("anular", () => {
    it("debe rechazar la anulación si el estudiante ya tiene asistencias o tareas", async () => {
      repo.hasActividadRegistrada.mockResolvedValueOnce(true);

      await expect(service.anular("mat-1", "sec-user")).rejects.toThrow(
        MATRICULA_MESSAGES.ANULACION_CON_ACTIVIDAD,
      );
    });

    it("debe anular la matrícula si no tiene actividad registrada", async () => {
      repo.hasActividadRegistrada.mockResolvedValueOnce(false);

      const res = await service.anular("mat-1", "sec-user");
      expect(repo.delete).toHaveBeenCalledWith("mat-1");
      expect(audit.log).toHaveBeenCalled();
      expect(res.message).toContain("anulada exitosamente");
    });
  });
});
