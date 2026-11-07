import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { MenusRepository } from "@/features/menus/repositories/menus.repository";
import { MenusService } from "@/features/menus/menus.service";

describe("MenusService (RF-002: HU 3)", () => {
  let service: MenusService;
  let repository: jest.Mocked<MenusRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findAllModules: jest.fn(),
      findModuleById: jest.fn(),
      findModuleByCode: jest.fn(),
      createModule: jest.fn(),
      updateModule: jest.fn(),
      findAllMenuItems: jest.fn(),
      findMenuItemById: jest.fn(),
      createMenuItem: jest.fn(),
      updateMenuItem: jest.fn(),
      deleteMenuItem: jest.fn(),
      getMenuTreeForRole: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenusService,
        { provide: MenusRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<MenusService>(MenusService);
    repository = module.get(MenusRepository);
    auditService = module.get(AuditService);
  });

  describe("createModule()", () => {
    it("should throw ConflictException when module code already exists (Escenario: Código de módulo repetido)", async () => {
      // Arrange
      repository.findModuleByCode.mockResolvedValue({
        id: "mod-1",
        codigo: "seguridad",
        nombre: "Seguridad",
        icono: "shield",
        orden: 1,
        vigente: true,
        creadoEn: "2026-10-05T00:00:00Z",
      });

      // Act & Assert
      await expect(
        service.createModule({ codigo: "seguridad", nombre: "Seguridad 2", orden: 2 }, "admin-id"),
      ).rejects.toThrow(new ConflictException("Ya existe un módulo con ese código."));
    });
  });

  describe("updateModule()", () => {
    it("should update module details and log audit (Escenario: Editar un módulo)", async () => {
      // Arrange
      repository.findModuleById.mockResolvedValue({
        id: "mod-1",
        codigo: "seguridad",
        nombre: "Seguridad",
        icono: "shield",
        orden: 1,
        vigente: true,
        creadoEn: "2026-10-05T00:00:00Z",
      });
      repository.updateModule.mockResolvedValue({
        id: "mod-1",
        codigo: "seguridad",
        nombre: "Seguridad y Accesos",
        icono: "lock",
        orden: 2,
        vigente: true,
        creadoEn: "2026-10-05T00:00:00Z",
      });

      // Act
      const updated = await service.updateModule(
        "mod-1",
        { nombre: "Seguridad y Accesos", icono: "lock", orden: 2 },
        "admin-id",
        "127.0.0.1",
      );

      // Assert
      expect(updated.nombre).toBe("Seguridad y Accesos");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "modulos" }),
      );
    });
  });

  describe("createContainer()", () => {
    it("should create container without path or parent (Escenario: Crear un contenedor)", async () => {
      // Arrange
      repository.findModuleById.mockResolvedValue({
        id: "mod-seguimiento",
        codigo: "seguimiento",
        nombre: "Seguimiento docente",
        icono: null,
        orden: 1,
        vigente: true,
        creadoEn: "2026-10-05T00:00:00Z",
      });

      repository.createMenuItem.mockResolvedValue({
        id: "cont-reportes",
        moduloId: "mod-seguimiento",
        menuPadreId: null,
        nombre: "Reportes",
        ruta: null,
        icono: null,
        orden: 1,
        esContenedor: true,
        vigente: true,
        aplicaciones: ["web"],
        creadoEn: "2026-10-05T00:00:00Z",
      });

      // Act
      const result = await service.createContainer(
        { moduloId: "mod-seguimiento", nombre: "Reportes", orden: 1 },
        "admin-id",
      );

      // Assert
      expect(result.esContenedor).toBe(true);
      expect(result.menuPadreId).toBeNull();
      expect(result.ruta).toBeNull();
      expect(repository.createMenuItem).toHaveBeenCalledWith(
        expect.objectContaining({
          esContenedor: true,
          menuPadreId: null,
          ruta: null,
        }),
      );
    });
  });

  describe("createOption()", () => {
    it("should create menu option inside container with path and order (Escenario: Crear una opción)", async () => {
      // Arrange
      repository.findModuleById.mockResolvedValue({
        id: "mod-seguimiento",
        codigo: "seguimiento",
        nombre: "Seguimiento docente",
        icono: null,
        orden: 1,
        vigente: true,
        creadoEn: "2026-10-05T00:00:00Z",
      });

      repository.findMenuItemById.mockResolvedValue({
        id: "cont-operaciones",
        moduloId: "mod-seguimiento",
        menuPadreId: null,
        nombre: "Operaciones",
        ruta: null,
        icono: null,
        orden: 1,
        esContenedor: true,
        vigente: true,
        aplicaciones: ["web"],
        creadoEn: "2026-10-05T00:00:00Z",
      });

      repository.createMenuItem.mockResolvedValue({
        id: "opt-sesiones",
        moduloId: "mod-seguimiento",
        menuPadreId: "cont-operaciones",
        nombre: "Registrar sesión de clase",
        ruta: "/sesiones/registrar",
        icono: null,
        orden: 1,
        esContenedor: false,
        vigente: true,
        aplicaciones: ["web"],
        creadoEn: "2026-10-05T00:00:00Z",
      });

      // Act
      const result = await service.createOption(
        {
          moduloId: "mod-seguimiento",
          menuPadreId: "cont-operaciones",
          nombre: "Registrar sesión de clase",
          ruta: "/sesiones/registrar",
          orden: 1,
        },
        "admin-id",
      );

      // Assert
      expect(result.esContenedor).toBe(false);
      expect(result.menuPadreId).toBe("cont-operaciones");
      expect(result.ruta).toBe("/sesiones/registrar");
    });

    it("should throw BadRequestException when option lacks container or path (Escenario: Opción sin contenedor o sin ruta)", async () => {
      // Act & Assert
      await expect(
        service.createOption(
          {
            moduloId: "mod-seguimiento",
            menuPadreId: "",
            nombre: "Opción sin contenedor",
            ruta: "/ruta",
            orden: 1,
          },
          "admin-id",
        ),
      ).rejects.toThrow(
        new BadRequestException("Una opción del menú debe tener contenedor y ruta."),
      );

      await expect(
        service.createOption(
          {
            moduloId: "mod-seguimiento",
            menuPadreId: "cont-id",
            nombre: "Opción sin ruta",
            ruta: "   ",
            orden: 1,
          },
          "admin-id",
        ),
      ).rejects.toThrow(
        new BadRequestException("Una opción del menú debe tener contenedor y ruta."),
      );
    });
  });

  describe("getUserMenu()", () => {
    it("should retrieve hierarchical menu tree filtered by role (Escenario: Menú visible según el rol y Opción no vigente)", async () => {
      // Arrange
      const mockTree = [
        {
          id: "mod-1",
          codigo: "seguimiento",
          nombre: "Seguimiento docente",
          icono: null,
          orden: 1,
          contenedores: [
            {
              id: "cont-1",
              nombre: "Operaciones",
              icono: null,
              orden: 1,
              vigente: true,
              opciones: [
                {
                  id: "opt-1",
                  nombre: "Registrar sesión de clase",
                  ruta: "/sesiones/registrar",
                  icono: null,
                  orden: 1,
                  vigente: true,
                },
              ],
            },
          ],
        },
      ];

      repository.getMenuTreeForRole.mockResolvedValue(mockTree);

      // Act
      const tree = await service.getUserMenu("rol-docente", "Docente");

      // Assert
      expect(tree).toEqual(mockTree);
      expect(repository.getMenuTreeForRole).toHaveBeenCalledWith("rol-docente", false);
    });
  });
});
