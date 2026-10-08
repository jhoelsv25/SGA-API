import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import { RolesService } from "@/features/roles/roles.service";

describe("RolesService (RF-002: HU 2)", () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countAssignedUsers: jest.fn(),
      countMenusVigentes: jest.fn(),
      assignMenus: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get(RolesRepository);
    auditService = module.get(AuditService);
  });

  describe("create()", () => {
    it("should create an active role and log audit when valid data is provided (Escenario: Crear un rol adicional)", async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: "rol-1",
        nombre: "Coordinador",
        descripcion: "Coordinador pedagógico",
        esSistema: false,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
      });

      // Act
      const result = await service.create(
        { nombre: "Coordinador", descripcion: "Coordinador pedagógico" },
        "admin-id",
        "127.0.0.1",
      );

      // Assert
      expect(result.nombre).toBe("Coordinador");
      expect(result.esSistema).toBe(false);
      expect(result.activo).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "roles" }),
      );
    });

    it("should throw ConflictException when role name already exists (Escenario: Nombre de rol repetido)", async () => {
      // Arrange
      repository.findByName.mockResolvedValue({
        id: "rol-existente",
        nombre: "Coordinador",
        esSistema: false,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
      });

      // Act & Assert
      await expect(service.create({ nombre: "Coordinador" }, "admin-id")).rejects.toThrow(
        new ConflictException("Ya existe un rol con ese nombre."),
      );
    });
  });

  describe("update()", () => {
    it("should throw BadRequestException when attempting to rename a system role (Escenario: Renombrar o eliminar un rol del sistema)", async () => {
      // Arrange
      repository.findById.mockResolvedValue({
        id: "rol-docente",
        nombre: "Docente",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        menus: [],
      });

      // Act & Assert
      await expect(
        service.update("rol-docente", { nombre: "Profesor" }, "admin-id"),
      ).rejects.toThrow(
        new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar."),
      );
    });

    it("should throw BadRequestException when deactivating a role with assigned accounts (Escenario: Desactivar un rol con cuentas)", async () => {
      // Arrange
      repository.findById.mockResolvedValue({
        id: "rol-auxiliar",
        nombre: "Auxiliar",
        esSistema: false,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        menus: [],
      });
      repository.countAssignedUsers.mockResolvedValue(3);

      // Act & Assert
      await expect(service.update("rol-auxiliar", { activo: false }, "admin-id")).rejects.toThrow(
        new BadRequestException("No se puede desactivar un rol que tiene cuentas asignadas."),
      );
    });
  });

  describe("delete()", () => {
    it("should throw BadRequestException when attempting to delete a system role (Escenario: Renombrar o eliminar un rol del sistema)", async () => {
      // Arrange
      repository.findById.mockResolvedValue({
        id: "rol-docente",
        nombre: "Docente",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        menus: [],
      });

      // Act & Assert
      await expect(service.delete("rol-docente", "admin-id")).rejects.toThrow(
        new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar."),
      );
    });
  });

  describe("assignMenus() (RF-002 V2: Roles-Menú)", () => {
    const rolDocente = {
      id: "rol-docente",
      nombre: "Docente",
      esSistema: true,
      activo: true,
      creadoEn: "2026-10-05T00:00:00Z",
      actualizadoEn: "2026-10-05T00:00:00Z",
      menus: ["m-viejo"],
    };

    it("Asignar menús a un rol: reemplaza sus opciones y lo audita", async () => {
      // Arrange
      repository.findById.mockResolvedValue(rolDocente);
      repository.countMenusVigentes.mockResolvedValue(2);

      // Act
      const result = await service.assignMenus(
        "rol-docente",
        { menuIds: ["m1", "m2", "m1"] },
        "admin-id",
        "127.0.0.1",
      );

      // Assert
      expect(result.count).toBe(2);
      expect(repository.assignMenus).toHaveBeenCalledWith("rol-docente", ["m1", "m2"], "admin-id");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "actualizar",
          tabla: "rol_menus",
          valorAnterior: { menus: ["m-viejo"] },
          valorNuevo: { menus: ["m1", "m2"] },
        }),
      );
    });

    it("Menú inexistente o no vigente: rechaza la asignación", async () => {
      repository.findById.mockResolvedValue(rolDocente);
      repository.countMenusVigentes.mockResolvedValue(1);

      await expect(
        service.assignMenus("rol-docente", { menuIds: ["m1", "m9"] }, "admin-id"),
      ).rejects.toThrow(new BadRequestException("Uno de los menús no existe o no está vigente."));
      expect(repository.assignMenus).not.toHaveBeenCalled();
    });

    it("Menús del Administrador: no se modifican, ya ve todo", async () => {
      repository.findById.mockResolvedValue({
        ...rolDocente,
        id: "rol-admin",
        nombre: "Administrador",
      });

      await expect(
        service.assignMenus("rol-admin", { menuIds: ["m1"] }, "admin-id"),
      ).rejects.toThrow(
        new BadRequestException("El rol Administrador tiene acceso a todos los menús."),
      );
    });

    it("Rol inexistente: NotFoundException", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.assignMenus("x", { menuIds: [] }, "admin-id")).rejects.toThrow(
        new NotFoundException("Rol no encontrado."),
      );
    });
  });
});
