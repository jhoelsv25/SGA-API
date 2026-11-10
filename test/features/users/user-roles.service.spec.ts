import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "@/common/services/audit.service";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";
import type { RoleDetailResponseDto } from "@/features/roles/dto";
import { RolesRepository } from "@/features/roles/repositories/roles.repository";
import type { UserRoleAssignmentDto } from "@/features/users/dto/user-role.dto";
import { UsersRepository } from "@/features/users/repositories/users.repository";
import { UserRolesService } from "@/features/users/services";

describe("UserRolesService (RF-002: HU 1 - Asignación y ciclo de roles)", () => {
  let service: UserRolesService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let auditService: jest.Mocked<AuditService>;

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
    debeCambiarContrasena: false,
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
      findUserById: jest.fn().mockResolvedValue(dummyUser),
      findRoles: jest.fn(),
      findTiposFichaVigente: jest.fn().mockResolvedValue([]),
      addRole: jest.fn(),
      setPrincipalRole: jest.fn(),
      retireRole: jest.fn(),
      update: jest.fn(),
      syncPrincipalRole: jest.fn(),
    };

    const mockRolesRepo = {
      findById: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesService,
        { provide: UsersRepository, useValue: mockUsersRepo },
        { provide: RolesRepository, useValue: mockRolesRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UserRolesService>(UserRolesService);
    usersRepository = module.get(UsersRepository);
    rolesRepository = module.get(RolesRepository);
    auditService = module.get(AuditService);
  });

  describe("addRole", () => {
    it("debe rechazar si el rol no existe o está inactivo", async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.addRole("user-target-uuid", { rolId: "nonexistent" }, currentAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe rechazar si el rol ya está asignado y vigente", async () => {
      rolesRepository.findById.mockResolvedValue({
        id: "rol-1",
        nombre: "Auxiliar",
        activo: true,
      } as unknown as RoleDetailResponseDto);

      const rolesVigentes: UserRoleAssignmentDto[] = [
        {
          id: "ur-1",
          rolId: "rol-1",
          rolNombre: "Auxiliar",
          esPrincipal: false,
          vigente: true,
          asignadoEn: "2026-10-05T00:00:00Z",
          retiradoEn: null,
        },
      ];
      usersRepository.findRoles.mockResolvedValueOnce(rolesVigentes);

      await expect(
        service.addRole("user-target-uuid", { rolId: "rol-1" }, currentAdmin),
      ).rejects.toThrow(ConflictException);
    });

    it("debe agregar el rol y auditar la creación", async () => {
      rolesRepository.findById.mockResolvedValue({
        id: "rol-2",
        nombre: "Tutor",
        activo: true,
      } as unknown as RoleDetailResponseDto);

      const nuevoRol: UserRoleAssignmentDto = {
        id: "ur-2",
        rolId: "rol-2",
        rolNombre: "Tutor",
        esPrincipal: false,
        vigente: true,
        asignadoEn: "2026-10-05T00:00:00Z",
        retiradoEn: null,
      };

      usersRepository.findRoles.mockResolvedValueOnce([]).mockResolvedValueOnce([nuevoRol]);

      const res = await service.addRole("user-target-uuid", { rolId: "rol-2" }, currentAdmin);
      expect(usersRepository.addRole).toHaveBeenCalledWith(
        "user-target-uuid",
        "rol-2",
        currentAdmin.id,
      );
      expect(auditService.log).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });
  });

  describe("retireRole", () => {
    it("debe rechazar retiro del rol Administrador a sí mismo", async () => {
      const rolesAdmin: UserRoleAssignmentDto[] = [
        {
          id: "ur-admin",
          rolId: "role-admin-uuid",
          rolNombre: "Administrador",
          esPrincipal: true,
          vigente: true,
          asignadoEn: "2026-10-05T00:00:00Z",
          retiradoEn: null,
        },
        {
          id: "ur-otro",
          rolId: "role-otro",
          rolNombre: "Docente",
          esPrincipal: false,
          vigente: true,
          asignadoEn: "2026-10-05T00:00:00Z",
          retiradoEn: null,
        },
      ];
      usersRepository.findRoles.mockResolvedValueOnce(rolesAdmin);

      await expect(
        service.retireRole("admin-uuid", "role-admin-uuid", currentAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar retiro del único rol que tiene la cuenta", async () => {
      const unicoRol: UserRoleAssignmentDto[] = [
        {
          id: "ur-docente",
          rolId: "rol-docente",
          rolNombre: "Docente",
          esPrincipal: false,
          vigente: true,
          asignadoEn: "2026-10-05T00:00:00Z",
          retiradoEn: null,
        },
      ];
      usersRepository.findRoles.mockResolvedValueOnce(unicoRol);

      await expect(
        service.retireRole("user-target-uuid", "rol-docente", currentAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("RF-002 V4: roles que dependen de una ficha", () => {
    const rolCatalogo = (id: string, nombre: string) =>
      ({ id, nombre, esSistema: true, activo: true }) as unknown as RoleDetailResponseDto;
    const asignacion = (rolId: string, rolNombre: string, esPrincipal: boolean) =>
      ({ id: rolId, rolId, rolNombre, esPrincipal, vigente: true }) as UserRoleAssignmentDto;

    it.each([
      ["Docente", "Docentes"],
      ["Estudiante", "Estudiantes"],
      ["Apoderado", "Apoderados"],
    ])("rechaza agregar el rol %s sin ficha vigente", async (rol, opcion) => {
      rolesRepository.findById.mockResolvedValue(rolCatalogo("rol-x", rol));
      usersRepository.findRoles.mockResolvedValue([]);

      await expect(
        service.addRole("user-target-uuid", { rolId: "rol-x" }, currentAdmin),
      ).rejects.toThrow(
        new ConflictException(
          `El rol ${rol} requiere una ficha vigente. Regístrela desde "${opcion}".`,
        ),
      );
      expect(usersRepository.addRole).not.toHaveBeenCalled();
    });

    it("agrega el rol cuando la persona tiene su ficha vigente", async () => {
      rolesRepository.findById.mockResolvedValue(rolCatalogo("rol-docente", "Docente"));
      usersRepository.findRoles.mockResolvedValue([]);
      usersRepository.findTiposFichaVigente.mockResolvedValue(["docente"]);

      await service.addRole("user-target-uuid", { rolId: "rol-docente" }, currentAdmin);

      expect(usersRepository.findTiposFichaVigente).toHaveBeenCalledWith("persona-1");
      expect(usersRepository.addRole).toHaveBeenCalled();
    });

    it("no consulta fichas para un rol que no depende de ellas", async () => {
      rolesRepository.findById.mockResolvedValue(rolCatalogo("rol-sec", "Secretaria"));
      usersRepository.findRoles.mockResolvedValue([]);

      await service.addRole("user-target-uuid", { rolId: "rol-sec" }, currentAdmin);

      expect(usersRepository.findTiposFichaVigente).not.toHaveBeenCalled();
      expect(usersRepository.addRole).toHaveBeenCalled();
    });

    it("rechaza retirar el rol mientras la ficha siga vigente", async () => {
      usersRepository.findRoles.mockResolvedValue([
        asignacion("rol-sec", "Secretaria", true),
        asignacion("rol-docente", "Docente", false),
      ]);
      usersRepository.findTiposFichaVigente.mockResolvedValue(["docente"]);

      await expect(
        service.retireRole("user-target-uuid", "rol-docente", currentAdmin),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.retireRole).not.toHaveBeenCalled();
    });

    it("permite retirar el rol cuando la ficha ya no está vigente", async () => {
      usersRepository.findRoles.mockResolvedValue([
        asignacion("rol-sec", "Secretaria", true),
        asignacion("rol-docente", "Docente", false),
      ]);

      await service.retireRole("user-target-uuid", "rol-docente", currentAdmin);

      expect(usersRepository.retireRole).toHaveBeenCalled();
    });

    it("rechaza cambiar el rol principal si eso retira un rol con ficha vigente", async () => {
      rolesRepository.findById.mockResolvedValue(rolCatalogo("rol-sec", "Secretaria"));
      usersRepository.findTiposFichaVigente.mockResolvedValue(["docente"]);

      await expect(
        service.changeRole("user-target-uuid", { rolId: "rol-sec" }, currentAdmin),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.update).not.toHaveBeenCalled();
    });

    it("rechaza cambiar al rol Docente sin ficha vigente", async () => {
      rolesRepository.findById.mockResolvedValue(rolCatalogo("rol-docente", "Docente"));

      await expect(
        service.changeRole("user-target-uuid", { rolId: "rol-docente" }, currentAdmin),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.syncPrincipalRole).not.toHaveBeenCalled();
    });
  });
});
