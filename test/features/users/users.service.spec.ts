import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import { DRIZZLE } from "@/core/database";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import { UsersRepository } from "@/features/users/repositories/users.repository";
import { UserRolesService } from "@/features/users/services";
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
      update: jest.fn(),
      syncPrincipalRole: jest.fn(),
      findPersonaById: jest.fn(),
      findPersonaByDocumento: jest.fn(),
      existeCorreo: jest.fn().mockResolvedValue(false),
      isCargoVigente: jest.fn().mockResolvedValue(true),
      findRolesSugeridosActivos: jest.fn(),
      registrarCuenta: jest.fn(),
      findRoles: jest.fn(),
      findTiposFichaVigente: jest.fn().mockResolvedValue([]),
      addRole: jest.fn(),
      setPrincipalRole: jest.fn(),
      retireRole: jest.fn(),
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
        UserRolesService,
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

  describe("create() — RF-002 V3: registro único", () => {
    const rolActivo = (id: string, nombre: string) => ({
      id,
      nombre,
      esSistema: true,
      activo: true,
      creadoEn: "2026-10-05T00:00:00Z",
      actualizadoEn: "2026-10-05T00:00:00Z",
      menus: [],
    });

    const nuevaPersona = {
      tipoDocumento: "dni",
      numeroDocumento: "09876543",
      nombres: "Diego",
      apellidoPaterno: "Ramos",
      sexo: "M",
    };

    beforeEach(() => {
      usersRepository.findUserByPersonaId.mockResolvedValue(null);
      usersRepository.findUserByUsername.mockResolvedValue(null);
      usersRepository.registrarCuenta.mockResolvedValue(dummyUser.id);
      usersRepository.findUserById.mockResolvedValue(dummyUser);
    });

    it("Registrar personal nuevo: crea persona, cargo, cuenta y el rol sugerido del cargo", async () => {
      usersRepository.findPersonaByDocumento.mockResolvedValue(null);
      usersRepository.findRolesSugeridosActivos.mockResolvedValue(["rol-director"]);

      const result = await service.create(
        { persona: nuevaPersona, cargoId: "cargo-director" },
        currentAdmin.id,
        "127.0.0.1",
      );

      expect(usersRepository.registrarCuenta).toHaveBeenCalledWith({
        personaId: undefined,
        nuevaPersona,
        cargoId: "cargo-director",
        rolIds: ["rol-director"],
        usuarioExistenteId: undefined,
        nombreUsuario: "09876543",
        contrasenaHash: expect.any(String) as string,
        actorId: currentAdmin.id,
      });
      expect(result.cuentaExistente).toBe(false);
      expect(result.tempPassword?.length).toBeGreaterThanOrEqual(10);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "usuarios" }),
      );
    });

    it("Persona ya registrada: reutiliza la persona por su documento", async () => {
      usersRepository.findPersonaByDocumento.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "09876543",
      });
      usersRepository.findRolesSugeridosActivos.mockResolvedValue(["rol-soporte"]);

      await service.create({ persona: nuevaPersona, cargoId: "cargo-ti" }, currentAdmin.id);

      expect(usersRepository.registrarCuenta).toHaveBeenCalledWith(
        expect.objectContaining({ personaId: "persona-1", nuevaPersona: undefined }),
      );
    });

    it("Persona que ya tiene cuenta: no crea otra ni genera contraseña, solo agrega roles", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      usersRepository.findUserByPersonaId.mockResolvedValue(dummyUser);
      rolesRepository.findById.mockResolvedValue(rolActivo("rol-docente", "Docente"));
      usersRepository.findTiposFichaVigente.mockResolvedValue(["docente"]);

      const result = await service.create(
        { personaId: "persona-1", cargoId: "cargo-ti", rolIds: ["rol-docente"] },
        currentAdmin.id,
      );

      expect(usersRepository.registrarCuenta).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioExistenteId: dummyUser.id,
          contrasenaHash: undefined,
          rolIds: ["rol-docente"],
        }),
      );
      expect(usersRepository.findUserByUsername).not.toHaveBeenCalled();
      expect(result.tempPassword).toBeNull();
      expect(result.cuentaExistente).toBe(true);
    });

    it("RF-002 V4: rechaza el rol Docente si la persona no tiene ficha vigente", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      rolesRepository.findById.mockResolvedValue(rolActivo("rol-docente", "Docente"));

      await expect(
        service.create(
          { personaId: "persona-1", cargoId: "cargo-ti", rolIds: ["rol-docente"] },
          currentAdmin.id,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'El rol Docente requiere una ficha vigente. Regístrela desde "Docentes".',
        ),
      );
      expect(usersRepository.registrarCuenta).not.toHaveBeenCalled();
    });

    it("Roles indicados: usa esos roles en el orden dado (el primero es el principal)", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      rolesRepository.findById.mockImplementation((id: string) =>
        Promise.resolve(rolActivo(id, id)),
      );

      await service.create(
        { personaId: "persona-1", cargoId: "cargo-ti", rolIds: ["rol-soporte", "rol-admin"] },
        currentAdmin.id,
      );

      expect(usersRepository.findRolesSugeridosActivos).not.toHaveBeenCalled();
      expect(usersRepository.registrarCuenta).toHaveBeenCalledWith(
        expect.objectContaining({ rolIds: ["rol-soporte", "rol-admin"] }),
      );
    });

    it("Cargo sin roles sugeridos: pide indicar al menos un rol", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      usersRepository.findRolesSugeridosActivos.mockResolvedValue([]);

      await expect(
        service.create({ personaId: "persona-1", cargoId: "cargo-psicologo" }, currentAdmin.id),
      ).rejects.toThrow(
        new BadRequestException("El cargo no tiene roles sugeridos. Indique al menos un rol."),
      );
      expect(usersRepository.registrarCuenta).not.toHaveBeenCalled();
    });

    it("Rechaza si el cargo no existe o no está vigente", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      usersRepository.isCargoVigente.mockResolvedValue(false);

      await expect(
        service.create({ personaId: "persona-1", cargoId: "cargo-x" }, currentAdmin.id),
      ).rejects.toThrow(
        new NotFoundException("El cargo seleccionado no existe o no está vigente."),
      );
      expect(usersRepository.registrarCuenta).not.toHaveBeenCalled();
    });

    it("Rechaza un rol inexistente o inactivo", async () => {
      usersRepository.findPersonaById.mockResolvedValue({
        id: "persona-1",
        numeroDocumento: "48123456",
      });
      rolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(
          { personaId: "persona-1", cargoId: "cargo-ti", rolIds: ["rol-x"] },
          currentAdmin.id,
        ),
      ).rejects.toThrow(new NotFoundException("El rol seleccionado no existe o no está activo."));
    });

    it("Sin persona o con persona y datos nuevos a la vez: lo rechaza", async () => {
      await expect(service.create({ cargoId: "cargo-ti" }, currentAdmin.id)).rejects.toThrow(
        new BadRequestException("Seleccione una persona del padrón o registre una nueva."),
      );
      await expect(
        service.create(
          { personaId: "persona-1", persona: nuevaPersona, cargoId: "cargo-ti" },
          currentAdmin.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("Persona inexistente en el padrón: NotFoundException", async () => {
      usersRepository.findPersonaById.mockResolvedValue(null);

      await expect(
        service.create({ personaId: "persona-x", cargoId: "cargo-ti" }, currentAdmin.id),
      ).rejects.toThrow(new NotFoundException("La persona seleccionada no existe en el padrón."));
    });

    it("Correo repetido en una persona nueva: ConflictException", async () => {
      usersRepository.findPersonaByDocumento.mockResolvedValue(null);
      usersRepository.existeCorreo.mockResolvedValue(true);

      await expect(
        service.create(
          { persona: { ...nuevaPersona, correo: "diego@colegio.edu.pe" }, cargoId: "cargo-ti" },
          currentAdmin.id,
        ),
      ).rejects.toThrow(new ConflictException("El correo ya está registrado para otra persona."));
    });

    it("Nombre de usuario repetido: no guarda nada (registro incompleto no deja datos a medias)", async () => {
      usersRepository.findPersonaByDocumento.mockResolvedValue(null);
      usersRepository.findRolesSugeridosActivos.mockResolvedValue(["rol-director"]);
      usersRepository.findUserByUsername.mockResolvedValue(dummyUser);

      await expect(
        service.create({ persona: nuevaPersona, cargoId: "cargo-director" }, currentAdmin.id),
      ).rejects.toThrow(new ConflictException("El nombre de usuario ya está en uso."));
      expect(usersRepository.registrarCuenta).not.toHaveBeenCalled();
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
        menus: [],
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
      // RF-001 V2: el nuevo rol pasa a ser el principal en usuario_roles
      expect(usersRepository.syncPrincipalRole).toHaveBeenCalledWith(
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

    it("usa la contraseña escrita por el administrador si cumple la política", async () => {
      usersRepository.findUserById.mockResolvedValue(dummyUser);
      usersRepository.update.mockResolvedValue(dummyUser);

      const result = await service.resetPassword(dummyUser.id, currentAdmin.id, undefined, {
        contrasena: "Clave2026",
        debeCambiarContrasena: false,
      });

      expect(result.tempPassword).toBe("Clave2026");
      expect(usersRepository.update).toHaveBeenCalledWith(
        dummyUser.id,
        expect.objectContaining({ debeCambiarContrasena: false, intentosFallidos: 0 }),
      );
      expect(usersRepository.closeAllUserSessions).toHaveBeenCalledWith(dummyUser.id);
    });

    it.each(["corta1", "SoloLetras", "12345678"])(
      "rechaza la contraseña manual %s que no cumple la política",
      async (contrasena) => {
        usersRepository.findUserById.mockResolvedValue(dummyUser);

        await expect(
          service.resetPassword(dummyUser.id, currentAdmin.id, undefined, { contrasena }),
        ).rejects.toThrow(BadRequestException);
        expect(usersRepository.update).not.toHaveBeenCalled();
      },
    );
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

  describe("RF-002 V2 (HU1): varios roles por cuenta", () => {
    const rol = (rolId: string, rolNombre: string, esPrincipal: boolean) => ({
      id: `asig-${rolId}`,
      rolId,
      rolNombre,
      esPrincipal,
      vigente: true,
      asignadoEn: "2026-10-09 10:00:00",
      asignadoPor: "admin",
      retiradoEn: null,
      retiradoPor: null,
    });
    const docente = rol("rol-docente", "Docente", true);
    const apoderado = rol("rol-apoderado", "Apoderado", false);

    beforeEach(() => {
      usersRepository.findUserById.mockResolvedValue(dummyUser);
    });

    it("Asignar un segundo rol: lo agrega como no principal y lo audita", async () => {
      // Arrange
      rolesRepository.findById.mockResolvedValue({
        id: "rol-apoderado",
        nombre: "Apoderado",
        esSistema: true,
        activo: true,
        creadoEn: "",
        actualizadoEn: "",
        menus: [],
      });
      usersRepository.findRoles
        .mockResolvedValueOnce([docente])
        .mockResolvedValueOnce([docente, apoderado]);
      usersRepository.findTiposFichaVigente.mockResolvedValue(["docente", "apoderado"]);

      // Act
      const result = await service.addRole(dummyUser.id, { rolId: "rol-apoderado" }, currentAdmin);

      // Assert
      expect(usersRepository.addRole).toHaveBeenCalledWith(
        dummyUser.id,
        "rol-apoderado",
        currentAdmin.id,
      );
      expect(result).toHaveLength(2);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ accion: "crear", tabla: "usuario_roles" }),
      );
    });

    it("Asignar un rol que ya tiene: rechaza con ConflictException", async () => {
      rolesRepository.findById.mockResolvedValue({
        id: "rol-docente",
        nombre: "Docente",
        esSistema: true,
        activo: true,
        creadoEn: "",
        actualizadoEn: "",
        menus: [],
      });
      usersRepository.findRoles.mockResolvedValue([docente]);

      await expect(
        service.addRole(dummyUser.id, { rolId: "rol-docente" }, currentAdmin),
      ).rejects.toThrow(new ConflictException("La cuenta ya tiene ese rol."));
      expect(usersRepository.addRole).not.toHaveBeenCalled();
    });

    it("Cambiar el rol principal: marca el nuevo principal y lo audita", async () => {
      usersRepository.findRoles.mockResolvedValue([docente, apoderado]);

      await service.setPrincipalRole(dummyUser.id, "rol-apoderado", currentAdmin);

      expect(usersRepository.setPrincipalRole).toHaveBeenCalledWith(dummyUser.id, "rol-apoderado");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          valorAnterior: { rolPrincipal: "Docente" },
          valorNuevo: { rolPrincipal: "Apoderado" },
        }),
      );
    });

    it("Cambiar a principal un rol no asignado: rechaza con NotFoundException", async () => {
      usersRepository.findRoles.mockResolvedValue([docente]);

      await expect(
        service.setPrincipalRole(dummyUser.id, "rol-director", currentAdmin),
      ).rejects.toThrow(new NotFoundException("La cuenta no tiene ese rol."));
    });

    it("Retirar un rol con historial: lo retira dejando quién y cuándo", async () => {
      usersRepository.findRoles.mockResolvedValue([docente, apoderado]);

      await service.retireRole(dummyUser.id, "rol-apoderado", currentAdmin);

      expect(usersRepository.retireRole).toHaveBeenCalledWith(
        dummyUser.id,
        "rol-apoderado",
        currentAdmin.id,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          valorNuevo: expect.objectContaining({ vigente: false }) as Record<string, unknown>,
        }),
      );
    });

    it("Dejar una cuenta sin roles: rechaza retirar el único rol", async () => {
      usersRepository.findRoles.mockResolvedValue([docente]);

      await expect(service.retireRole(dummyUser.id, "rol-docente", currentAdmin)).rejects.toThrow(
        new BadRequestException("La cuenta debe tener al menos un rol."),
      );
      expect(usersRepository.retireRole).not.toHaveBeenCalled();
    });

    it("Retirar el rol principal: pide marcar otro como principal primero", async () => {
      usersRepository.findRoles.mockResolvedValue([docente, apoderado]);

      await expect(service.retireRole(dummyUser.id, "rol-docente", currentAdmin)).rejects.toThrow(
        new BadRequestException(
          "No puede retirar el rol principal. Marque otro rol como principal primero.",
        ),
      );
    });

    it("Autoprotección: el Administrador no puede retirarse su propio rol Administrador", async () => {
      usersRepository.findUserById.mockResolvedValue({ ...dummyUser, id: currentAdmin.id });
      usersRepository.findRoles.mockResolvedValue([
        rol("rol-admin-uuid", "Administrador", true),
        apoderado,
      ]);

      await expect(
        service.retireRole(currentAdmin.id, "rol-admin-uuid", currentAdmin),
      ).rejects.toThrow(
        new BadRequestException("No puede retirarse el rol Administrador a sí mismo."),
      );
    });
  });
});
