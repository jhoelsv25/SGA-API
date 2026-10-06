import { MethodNotAllowedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ROLES_KEY } from "@/common/decorators";
import { AuditController } from "@/features/audit/audit.controller";
import { AuditService } from "@/features/audit/audit.service";
import {
  AuditDetailResponseDto,
  PaginatedAuditResponseDto,
} from "@/features/audit/dto/audit-response.dto";

describe("AuditController (RF-003: Endpoints de Auditoría)", () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockService }],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get(AuditService);
  });

  it("debe exigir el rol de Administrador a nivel de clase", () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AuditController) as string[] | undefined;
    expect(roles).toEqual(["Administrador"]);
  });

  describe("findAll()", () => {
    it("debe delegar la búsqueda al servicio con los parámetros recibidos", async () => {
      const mockResponse: PaginatedAuditResponseDto = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        mensaje: "No hay registros de auditoría para los filtros seleccionados.",
      };
      service.findAll.mockResolvedValue(mockResponse);

      const query = { page: 1, limit: 50 };
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(mockResponse);
    });
  });

  describe("findById()", () => {
    it("debe delegar la consulta del detalle al servicio", async () => {
      const mockDetail: AuditDetailResponseDto = {
        id: 1,
        registradoEn: "2026-10-05 14:00:00",
        usuarioId: "u-1",
        usuario: "admin",
        accion: "actualizar",
        entidad: "usuarios",
        registroId: "reg-1",
        direccionIp: "127.0.0.1",
        valorAnterior: { test: 1 },
        valorNuevo: { test: 2 },
        diferencias: [{ campo: "test", valorAnterior: 1, valorNuevo: 2 }],
      };
      service.findById.mockResolvedValue(mockDetail);

      const result = await controller.findById(1);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(mockDetail);
    });
  });

  describe("Inmutabilidad (Escenario: Intento de modificar o eliminar un registro)", () => {
    it("debe rechazar llamadas PUT lanzando MethodNotAllowedException", () => {
      expect(() => controller.updateForbidden()).toThrow(
        new MethodNotAllowedException(
          "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
        ),
      );
    });

    it("debe rechazar llamadas PATCH lanzando MethodNotAllowedException", () => {
      expect(() => controller.patchForbidden()).toThrow(
        new MethodNotAllowedException(
          "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
        ),
      );
    });

    it("debe rechazar llamadas DELETE lanzando MethodNotAllowedException", () => {
      expect(() => controller.deleteForbidden()).toThrow(
        new MethodNotAllowedException(
          "Los registros de auditoría son inmutables y no pueden ser modificados ni eliminados.",
        ),
      );
    });
  });
});
