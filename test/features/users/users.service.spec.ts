import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { DRIZZLE } from "@/core/database";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import { UsersRepository } from "@/features/users/repositories/users.repository";
import { UsersService } from "@/features/users/users.service";

describe("UsersService (RF-002: HU 1)", () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;
  let mockDb: { select: jest.Mock };

  const currentAdmin: AuthenticatedUser = {
    id: "admin-uuid",
    username: "admin",
    roleId: "role-admin-uuid",
    role: "Administrador",
    personaId: "persona-admin-uuid",
  };

  const dummyUser = {
    id: "user-target-uuid",
    nombreUsuario: "48123456",
    estado: "activo" as const,
    debeCambiarContrasena: true,
    intentosFallidos: 0,
    ultimoAcceso: null,
    creadoEn: "2026-10-05T00:00:00Z",
    actualizadoEn: "2026-10-05T00:00:00Z",
    persona: {
      id: "persona-1",
      tipoDocumento: "dni",
      numeroDocumento: "48123456",
      nombres: "Juan",
      apellidoPaterno: "Perez",
      apellidoMaterno: "Gomez",
      correo: "juan@example.com",
      fotoUrl: null,
    },
    rol: {
      id: "rol-docente",
      nombre: "Docente",
      esSistema: true,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUsersRepo = {
      findUserById: jest.fn(),
      findUserByPersonaId: jest.fn(),
      findUserByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      syncPrincipalProfile: jest.fn(),
      findUsers: jest.fn(),
      closeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const mockRolesRepo = {
      findById: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      select: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepo },
        { provide: RolesRepository, useValue: mockRolesRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
    rolesRepository = module.get(RolesRepository);
    auditService = module.get(AuditService);
  });

  describe("create()", () => {
    it("should create user with active state, temporary password and log audit (Escenario: Crear una cuenta)", async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: "persona-1" }]),
          }),
        }),
      });

      usersRepository.findUserByPersonaId.mockResolvedValue(null);
      usersRepository.findUserByUsername.mockResolvedValue(null);
      rolesRepository.findById.mockResolvedValue({
        id: "rol-docente",
        nombre: "Docente",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        permisos: [],
      });
      usersRepository.create.mockResolvedValue(dummyUser);

      // Act
      const result = await service.create(
        { personaId: "persona-1", rolId: "rol-docente", nombreUsuario: "48123456" },
        currentAdmin.id,
        "127.0.0.1",
      );

      // Assert
      expect(result.usuario.id).toBe(dummyUser.id);
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBeGreaterThanOrEqual(10);
      // RF-001 V2: el perfil elegido queda como principal en usuario_roles
      expect(usersRepository.syncPrincipalProfile).toHaveBeenCalledWith(
        dummyUser.id,
        expect.any(String),
        expect.anything(),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "usuarios" }),
      );
    });

    it("should throw ConflictException when persona already has an active account (Escenario: Persona que ya tiene cuenta)", async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: "persona-1" }]),
          }),
        }),
      });

      usersRepository.findUserByPersonaId.mockResolvedValue(dummyUser);

      // Act & Assert
      await expect(
        service.create(
          { personaId: "persona-1", rolId: "rol-docente", nombreUsuario: "48123456" },
          currentAdmin.id,
        ),
      ).rejects.toThrow(new ConflictException("Esta persona ya tiene una cuenta en el sistema."));
    });

    it("should throw ConflictException when username already in use (Escenario: Nombre de usuario repetido)", async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: "persona-1" }]),
          }),
        }),
      });

      usersRepository.findUserByPersonaId.mockResolvedValue(null);
      usersRepository.findUserByUsername.mockResolvedValue(dummyUser);

      // Act & Assert
      await expect(
        service.create(
          { personaId: "persona-1", rolId: "rol-docente", nombreUsuario: "48123456" },
          currentAdmin.id,
        ),
      ).rejects.toThrow(new ConflictException("El nombre de usuario ya está en uso."));
    });
  });

  describe("changeRole()", () => {
    it("should throw BadRequestException when admin attempts to change own role (Escenario: Intento de cambiarse el rol a sí mismo)", async () => {
      // Act & Assert
      await expect(
        service.changeRole(currentAdmin.id, { rolId: "otro-rol" }, currentAdmin),
      ).rejects.toThrow(
        new BadRequestException("No puede desactivar su propia cuenta ni cambiar su propio rol."),
      );
    });

    it("should update role and log audit (Escenario: Cambiar el rol de una cuenta)", async () => {
      // Arrange
      usersRepository.findUserById.mockResolvedValue(dummyUser);
      rolesRepository.findById.mockResolvedValue({
        id: "rol-director",
        nombre: "Director",
        esSistema: true,
        activo: true,
        creadoEn: "2026-10-05T00:00:00Z",
        actualizadoEn: "2026-10-05T00:00:00Z",
        permisos: [],
      });
      usersRepository.update.mockResolvedValue({
        ...dummyUser,
        rol: { id: "rol-director", nombre: "Director", esSistema: true },
      });

      // Act
      const updated = await service.changeRole(
        dummyUser.id,
        { rolId: "rol-director" },
        currentAdmin,
      );

      // Assert
      expect(updated.rol.nombre).toBe("Director");
      // RF-001 V2: el nuevo perfil pasa a ser el principal en usuario_roles
      expect(usersRepository.syncPrincipalProfile).toHaveBeenCalledWith(
        dummyUser.id,
        "rol-director",
        currentAdmin.id,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "actualizar", tabla: "usuarios" }),
      );
    });
  });

  describe("unlock()", () => {
    it("should change state to active and reset login attempts to 0 (Escenario: Desbloquear una cuenta)", async () => {
      // Arrange
      usersRepository.findUserById.mockResolvedValue({
        ...dummyUser,
        estado: "bloqueado",
        intentosFallidos: 5,
      });
      usersRepository.update.mockResolvedValue({
        ...dummyUser,
        estado: "activo",
        intentosFallidos: 0,
      });

      // Act
      const result = await service.unlock(dummyUser.id, currentAdmin.id);

      // Assert
      expect(result.estado).toBe("activo");
      expect(result.intentosFallidos).toBe(0);
      expect(usersRepository.update).toHaveBeenCalledWith(dummyUser.id, {
        estado: "activo",
        intentosFallidos: 0,
      });
    });
  });

  describe("deactivate()", () => {
    it("should throw BadRequestException when admin attempts to deactivate own account (Escenario: Intento de auto-desactivarse)", async () => {
      // Act & Assert
      await expect(service.deactivate(currentAdmin.id, currentAdmin)).rejects.toThrow(
        new BadRequestException("No puede desactivar su propia cuenta ni cambiar su propio rol."),
      );
    });

    it("should deactivate account and close all open sessions (Escenario: Desactivar una cuenta)", async () => {
      // Arrange
      usersRepository.findUserById.mockResolvedValue(dummyUser);
      usersRepository.update.mockResolvedValue({
        ...dummyUser,
        estado: "inactivo",
      });

      // Act
      const result = await service.deactivate(dummyUser.id, currentAdmin);

      // Assert
      expect(result.estado).toBe("inactivo");
      expect(usersRepository.closeAllUserSessions).toHaveBeenCalledWith(dummyUser.id);
    });
  });

  describe("reactivate()", () => {
    it("should reactivate inactive account (Escenario: Reactivar una cuenta)", async () => {
      // Arrange
      usersRepository.findUserById.mockResolvedValue({
        ...dummyUser,
        estado: "inactivo",
      });
      usersRepository.update.mockResolvedValue({
        ...dummyUser,
        estado: "activo",
      });

      // Act
      const result = await service.reactivate(dummyUser.id, currentAdmin.id);

      // Assert
      expect(result.estado).toBe("activo");
      expect(usersRepository.update).toHaveBeenCalledWith(dummyUser.id, {
        estado: "activo",
      });
    });
  });

  describe("resetPassword()", () => {
    it("should generate new temp password, set mustChangePassword and close sessions (Escenario: Restablecer la contraseña)", async () => {
      // Arrange
      usersRepository.findUserById.mockResolvedValue(dummyUser);
      usersRepository.update.mockResolvedValue(dummyUser);

      // Act
      const result = await service.resetPassword(dummyUser.id, currentAdmin.id);

      // Assert
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBeGreaterThanOrEqual(10);
      expect(usersRepository.update).toHaveBeenCalledWith(
        dummyUser.id,
        expect.objectContaining({
          debeCambiarContrasena: true,
          intentosFallidos: 0,
        }),
      );
      expect(usersRepository.closeAllUserSessions).toHaveBeenCalledWith(dummyUser.id);
    });
  });

  describe("findUsers()", () => {
    it("should delegate to repository and return cursor-paginated users", async () => {
      const mockResult = {
        data: [dummyUser],
        nextCursor: "mock-next-cursor",
        hasMore: true,
        limit: 10,
      };
      usersRepository.findUsers.mockResolvedValue(mockResult);

      const query = { limit: 10, cursor: "mock-cursor" };
      const result = await service.findUsers(query);

      expect(usersRepository.findUsers).toHaveBeenCalledWith(query);
      expect(result).toBe(mockResult);
      expect(result.nextCursor).toBe("mock-next-cursor");
      expect(result.hasMore).toBe(true);
    });
  });
});
