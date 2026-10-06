import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/features/audit/audit.service";
import { AuditRecord } from "@/features/audit/interfaces/audit.repository.interface";
import { AuditRepository } from "@/features/audit/repositories/audit.repository";

describe("AuditService (RF-003: Bitácora de Auditoría)", () => {
  let service: AuditService;
  let repository: jest.Mocked<AuditRepository>;

  const mockAuditRecord: AuditRecord = {
    id: 1,
    usuarioId: "usr-uuid-1",
    usuarioNombre: "admin",
    accion: "actualizar",
    tabla: "usuarios",
    registroId: "target-user-uuid",
    valorAnterior: { estado: "activo", rol: "Docente" },
    valorNuevo: { estado: "inactivo", rol: "Docente" },
    direccionIp: "192.168.1.100",
    registradoEn: "2026-10-05 14:30:00",
  };

  const mockSystemRecord: AuditRecord = {
    id: 2,
    usuarioId: null,
    usuarioNombre: null,
    accion: "actualizar",
    tabla: "usuarios",
    registroId: "target-user-uuid",
    valorAnterior: { estado: "activo", intentosFallidos: 4 },
    valorNuevo: { estado: "bloqueado", intentosFallidos: 5 },
    direccionIp: null,
    registradoEn: "2026-10-05 15:00:00",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: AuditRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get(AuditRepository);
  });

  describe("findAll()", () => {
    it("debe consultar los últimos 7 días por defecto y retornar listado paginado (Escenario: Consulta inicial)", async () => {
      // Arrange
      repository.findAll.mockResolvedValue({
        data: [mockAuditRecord],
        total: 1,
      });

      // Act
      const result = await service.findAll({});

      // Assert
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      const callArg = repository.findAll.mock.calls[0][0];
      expect(callArg.limit).toBe(50);
      expect(callArg.offset).toBe(0);
      expect(callArg.startDate).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/);
      expect(callArg.endDate).toMatch(/^\d{4}-\d{2}-\d{2} 23:59:59$/);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 1,
        registradoEn: "2026-10-05 14:30:00",
        usuarioId: "usr-uuid-1",
        usuario: "admin",
        accion: "actualizar",
        entidad: "usuarios",
        registroId: "target-user-uuid",
        direccionIp: "192.168.1.100",
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it("debe mapear el usuario a 'Sistema' si usuarioId es null (Escenario: Acción hecha por el sistema)", async () => {
      // Arrange
      repository.findAll.mockResolvedValue({
        data: [mockSystemRecord],
        total: 1,
      });

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.data[0].usuario).toBe("Sistema");
      expect(result.data[0].usuarioId).toBeNull();
    });

    it("debe aplicar filtros por usuario, acción y entidad correctamente (Escenario: Filtrar por usuario y acción)", async () => {
      // Arrange
      repository.findAll.mockResolvedValue({
        data: [mockAuditRecord],
        total: 1,
      });

      // Act
      await service.findAll({
        fechaInicio: "2026-10-01",
        fechaFin: "2026-10-07",
        usuario: "admin",
        accion: "actualizar",
        entidad: "usuarios",
        page: 2,
        limit: 20,
      });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({
        startDate: "2026-10-01 00:00:00",
        endDate: "2026-10-07 23:59:59",
        usuario: "admin",
        accion: "actualizar",
        entidad: "usuarios",
        offset: 20,
        limit: 20,
      });
    });

    it("debe lanzar BadRequestException si la fecha final es anterior a la inicial (Escenario: Rango de fechas invertido)", async () => {
      // Act & Assert
      await expect(
        service.findAll({
          fechaInicio: "2026-10-10",
          fechaFin: "2026-10-05",
        }),
      ).rejects.toThrow(
        new BadRequestException("La fecha final no puede ser anterior a la fecha inicial."),
      );
    });

    it("debe lanzar BadRequestException si el rango supera los 31 días (Escenario: Rango mayor a 31 días)", async () => {
      // Act & Assert
      await expect(
        service.findAll({
          fechaInicio: "2026-10-01",
          fechaFin: "2026-11-05", // 35 días
        }),
      ).rejects.toThrow(
        new BadRequestException("El rango de consulta no puede superar los 31 días."),
      );
    });

    it("debe retornar mensaje informativo cuando no hay resultados (Escenario: Sin resultados)", async () => {
      // Arrange
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.mensaje).toBe("No hay registros de auditoría para los filtros seleccionados.");
    });
  });

  describe("findById()", () => {
    it("debe retornar el detalle con comparativa antes y después (Escenario: Ver el detalle de un cambio)", async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockAuditRecord);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result.id).toBe(1);
      expect(result.usuario).toBe("admin");
      expect(result.accion).toBe("actualizar");
      expect(result.entidad).toBe("usuarios");
      expect(result.valorAnterior).toEqual({ estado: "activo", rol: "Docente" });
      expect(result.valorNuevo).toEqual({ estado: "inactivo", rol: "Docente" });
      expect(result.diferencias).toEqual([
        { campo: "estado", valorAnterior: "activo", valorNuevo: "inactivo" },
        { campo: "rol", valorAnterior: "Docente", valorNuevo: "Docente" },
      ]);
    });

    it("debe sanitizar contraseñas y hashes protegiéndolos (Escenario: Cambio de contraseña en el detalle)", async () => {
      // Arrange
      const passwordRecord: AuditRecord = {
        id: 3,
        usuarioId: "usr-uuid-1",
        usuarioNombre: "admin",
        accion: "actualizar",
        tabla: "usuarios",
        registroId: "target-user-uuid",
        valorAnterior: { contrasenaHash: "$2a$10$oldHash123", contrasena: "oldSecret" },
        valorNuevo: { contrasenaHash: "$2a$10$newHash456", contrasena: "newSecret" },
        direccionIp: "192.168.1.100",
        registradoEn: "2026-10-05 16:00:00",
      };
      repository.findById.mockResolvedValue(passwordRecord);

      // Act
      const result = await service.findById(3);

      // Assert
      expect(result.valorAnterior?.contrasenaHash).toBe("[PROTEGIDO]");
      expect(result.valorAnterior?.contrasena).toBe("[PROTEGIDO]");
      expect(result.valorNuevo?.contrasenaHash).toBe("[PROTEGIDO]");
      expect(result.valorNuevo?.contrasena).toBe("[PROTEGIDO]");
      for (const diff of result.diferencias) {
        expect(diff.valorAnterior).toBe("[PROTEGIDO]");
        expect(diff.valorNuevo).toBe("[PROTEGIDO]");
      }
    });

    it("debe lanzar NotFoundException si el registro no existe", async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(
        new NotFoundException("Registro de auditoría no encontrado."),
      );
    });
  });
});
