import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { CacheService } from "@/core/cache";
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
      getAllPermissions: jest.fn(),
      assignPermissions: jest.fn(),
      getAllPermissionIds: jest.fn(),
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
        permisos: [],
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
        permisos: [],
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
        permisos: [],
      });

      // Act & Assert
      await expect(service.delete("rol-docente", "admin-id")).rejects.toThrow(
        new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar."),
      );
    });
  });

  describe("assignPermissions()", () => {
    it("should throw BadRequestException when modifying permissions of Administrator (Escenario: Permisos del Administrador)", async () => {
      // Arrange
      repository.findById.mockResolvedValue({
        id: "rol-admin",
        nombre: "Administrador",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        permisos: ["p1", "p2"],
      });

      // Act & Assert
      await expect(
        service.assignPermissions("rol-admin", { permisoIds: ["p1"] }, "admin-id"),
      ).rejects.toThrow(
        new BadRequestException("No se pueden modificar los permisos del rol Administrador."),
      );
    });

    it("should assign permissions to a role and log audit (Escenario: Asignar permisos a un rol)", async () => {
      // Arrange
      repository.findById.mockResolvedValue({
        id: "rol-docente",
        nombre: "Docente",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        permisos: [],
      });
      repository.assignPermissions.mockResolvedValue(undefined);

      // Act
      const result = await service.assignPermissions(
        "rol-docente",
        { permisoIds: ["permiso-1", "permiso-2"] },
        "admin-id",
        "127.0.0.1",
      );

      // Assert
      expect(result.count).toBe(2);
      expect(repository.assignPermissions).toHaveBeenCalledWith("rol-docente", [
        "permiso-1",
        "permiso-2",
      ]);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "rol_permisos" }),
      );
    });
  });

  describe("getPermissionsCatalog()", () => {
    it("should return permissions directly from repository when cacheService is undefined", async () => {
      const mockCatalog = [
        {
          id: "p1",
          codigo: "usuarios.ver",
          nombre: "Ver usuarios",
          descripcion: "Permite ver usuarios",
          moduloId: "m1",
          moduloNombre: "Seguridad",
          moduloCodigo: "seguridad",
        },
      ];
      repository.getAllPermissions.mockResolvedValue(mockCatalog);

      const result = await service.getPermissionsCatalog();

      expect(result).toEqual(mockCatalog);
      expect(repository.getAllPermissions).toHaveBeenCalledTimes(1);
    });

    it("should use cacheService.getOrSet when cacheService is provided", async () => {
      const mockCatalog = [
        {
          id: "p1",
          codigo: "usuarios.ver",
          nombre: "Ver usuarios",
          descripcion: "Permite ver usuarios",
          moduloId: "m1",
          moduloNombre: "Seguridad",
          moduloCodigo: "seguridad",
        },
      ];
      const mockCacheService: Partial<Record<keyof CacheService, jest.Mock>> = {
        getOrSet: jest
          .fn()
          .mockImplementation((_key: string, factory: () => Promise<unknown>): Promise<unknown> =>
            factory(),
          ),
      };

      const serviceWithCache = new RolesService(
        repository,
        auditService,
        mockCacheService as unknown as CacheService,
      );
      repository.getAllPermissions.mockResolvedValue(mockCatalog);

      const result = await serviceWithCache.getPermissionsCatalog();

      expect(result).toEqual(mockCatalog);
      expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
        "catalog:permissions",
        expect.any(Function),
        86400,
      );
    });
  });
});
