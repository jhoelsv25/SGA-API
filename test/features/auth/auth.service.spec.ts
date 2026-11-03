import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import { AuthService } from "@/features/auth/auth.service";
import { VariablesSistemaRepository } from "@/features/variables-sistema/repositories";
import type {
  InstitutionSummary,
  PersonaRecord,
  RolRecord,
  UsuarioRecord,
  UserWithPersonaBirthdate,
} from "@/features/auth/interfaces/auth-repository.interface";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { AuthPasswordService, SessionService } from "@/features/auth/services";

describe("AuthService (RF-001: Acceso al Sistema)", () => {
  let authService: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let sessionService: jest.Mocked<SessionService>;
  let variablesRepository: { findByCodigoVigente: jest.Mock };

  const mockUser: UsuarioRecord = {
    id: "usr-uuid-1",
    nombreUsuario: "jdoe",
    contrasenaHash: "$2a$10$hashedPasswordSampleForTesting",
    estado: "activo",
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    ultimoAcceso: null,
    creadoEn: "2026-10-01T00:00:00.000Z",
    actualizadoEn: "2026-10-01T00:00:00.000Z",
    eliminadoEn: null,
    personaId: "per-uuid-1",
    rolId: "rol-uuid-1",
  };

  const mockPersona: PersonaRecord = {
    id: "per-uuid-1",
    tipoDocumento: "dni",
    numeroDocumento: "12345678",
    nombres: "Juan",
    apellidoPaterno: "Perez",
    apellidoMaterno: "Gomez",
    sexo: "M",
    fechaNacimiento: "1990-05-15",
    correo: "juan.perez@colegio.edu.pe",
    telefono: "999888777",
    celular: "999888777",
    direccion: "Av. Principal 123",
    distrito: "Miraflores",
    fotoUrl: "https://cdn.colegio.edu.pe/foto.jpg",
    codigoBiometrico: null,
    creadoEn: "2026-10-01T00:00:00.000Z",
    actualizadoEn: "2026-10-01T00:00:00.000Z",
    eliminadoEn: null,
  };

  const mockRole: RolRecord = {
    id: "rol-uuid-1",
    nombre: "Docente",
    descripcion: "Rol para docentes del colegio",
    esSistema: false,
    activo: true,
    creadoEn: "2026-10-01T00:00:00.000Z",
    actualizadoEn: "2026-10-01T00:00:00.000Z",
  };

  const mockInstitution: InstitutionSummary = {
    id: "inst-uuid-1",
    nombre: "Colegio Nacional San Juan",
  };

  beforeEach(async () => {
    const mockRepo = {
      findUserByUsername: jest.fn(),
      findUserById: jest.fn(),
      findUserWithPersonaByUsername: jest.fn(),
      findPersonaById: jest.fn(),
      findRoleById: jest.fn(),
      findInstitution: jest.fn(),
      updateLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createSession: jest.fn(),
      closeSession: jest.fn(),
      closeOtherSessions: jest.fn(),
      updatePassword: jest.fn(),
      getUserModules: jest.fn(),
      getMenuRoutes: jest.fn().mockResolvedValue([]),
      // Sin filas en usuario_roles: usa usuarios.rol_id como rol principal (respaldo)
      findUserRoles: jest.fn().mockResolvedValue([]),
    };

    const mockSession = {
      generateAccessToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      recordSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeOtherSessions: jest.fn(),
      hashToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthPasswordService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: SessionService, useValue: mockSession },
        {
          // Sin variable vigente: se usan los valores por defecto (5 intentos, 8 caracteres)
          provide: VariablesSistemaRepository,
          useValue: { findByCodigoVigente: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    sessionService = module.get(SessionService);
    variablesRepository = module.get(VariablesSistemaRepository);

    jest.clearAllMocks();
  });

  describe("HU 1: Inicio de sesión", () => {
    describe("Escenario: Ingreso exitoso", () => {
      it("debe autenticar al usuario activo con credenciales correctas, resetear intentos y retornar rol con token", async () => {
        authRepository.findUserByUsername.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        authRepository.resetLoginAttempts.mockResolvedValue(undefined);
        authRepository.findPersonaById.mockResolvedValue(mockPersona);
        authRepository.findRoleById.mockResolvedValue(mockRole);
        authRepository.findInstitution.mockResolvedValue(mockInstitution);
        authRepository.getUserModules.mockResolvedValue([
          { id: "mod-1", name: "Seguridad", code: "seguridad", path: "/seguridad" },
        ]);
        sessionService.generateAccessToken.mockReturnValue("jwt_valid_token_xyz");
        sessionService.recordSession.mockResolvedValue(undefined);

        const result = await authService.login(
          { username: "  jDoe  ", password: "Password123!", rememberMe: true },
          "192.168.1.10",
          "Mozilla/5.0",
        );

        expect(authRepository.findUserByUsername).toHaveBeenCalledWith("jdoe");
        expect(authRepository.resetLoginAttempts).toHaveBeenCalledWith(mockUser.id);
        expect(sessionService.generateAccessToken).toHaveBeenCalledWith(
          // RF-001 V3: el token del paso 1 deja el rol pendiente de elegir
          expect.objectContaining({
            sub: mockUser.id,
            username: mockUser.nombreUsuario,
            rolPendiente: true,
            recordar: true,
          }),
          true,
        );
        expect(sessionService.recordSession).toHaveBeenCalledWith({
          userId: mockUser.id,
          token: "jwt_valid_token_xyz",
          rememberMe: true,
          ipAddress: "192.168.1.10",
          userAgent: "Mozilla/5.0",
        });
        expect(result.accessToken).toBe("jwt_valid_token_xyz");
        expect(result.user.username).toBe(mockUser.nombreUsuario);
        expect(result.user.institutionName).toBe(mockInstitution.nombre);
        expect(result.modules).toHaveLength(1);
      });
    });

    describe("Escenario: Credenciales incorrectas", () => {
      it("debe lanzar UnauthorizedException si el usuario no existe", async () => {
        authRepository.findUserByUsername.mockResolvedValue(null);

        await expect(
          authService.login({ username: "unknown", password: "Password123!" }),
        ).rejects.toThrow(new UnauthorizedException("Usuario o contraseña incorrectos"));
      });

      it("debe incrementar intentos fallidos y lanzar UnauthorizedException si la contraseña es incorrecta", async () => {
        authRepository.findUserByUsername.mockResolvedValue({
          ...mockUser,
          intentosFallidos: 1,
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          authService.login({ username: "jdoe", password: "wrong-password" }),
        ).rejects.toThrow(new UnauthorizedException("Usuario o contraseña incorrectos"));

        expect(authRepository.updateLoginAttempts).toHaveBeenCalledWith(mockUser.id, 2, false);
      });
    });

    describe("Escenario: Bloqueo al quinto intento fallido", () => {
      it("debe bloquear la cuenta cuando los intentos fallidos alcanzan 5 y lanzar UnauthorizedException", async () => {
        authRepository.findUserByUsername.mockResolvedValue({
          ...mockUser,
          intentosFallidos: 4,
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          authService.login({ username: "jdoe", password: "wrong-password" }),
        ).rejects.toThrow(
          new UnauthorizedException(
            "Tu cuenta ha sido bloqueada por superar el límite de intentos fallidos.",
          ),
        );

        expect(authRepository.updateLoginAttempts).toHaveBeenCalledWith(mockUser.id, 5, true);
      });
    });

    describe("Escenario: Cuenta bloqueada", () => {
      it("debe rechazar el acceso si el estado del usuario es 'bloqueado'", async () => {
        authRepository.findUserByUsername.mockResolvedValue({
          ...mockUser,
          estado: "bloqueado",
        });

        await expect(
          authService.login({ username: "jdoe", password: "Password123!" }),
        ).rejects.toThrow(
          new UnauthorizedException(
            "Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Contacta al administrador.",
          ),
        );
      });
    });

    describe("Escenario: Cuenta inactiva", () => {
      it("debe rechazar el acceso si el estado del usuario es 'inactivo'", async () => {
        authRepository.findUserByUsername.mockResolvedValue({
          ...mockUser,
          estado: "inactivo",
        });

        await expect(
          authService.login({ username: "jdoe", password: "Password123!" }),
        ).rejects.toThrow(new UnauthorizedException("Tu cuenta se encuentra inactiva"));
      });
    });
  });

  describe("HU 2: Cambio de contraseña", () => {
    describe("Escenario: Cambio exitoso", () => {
      it("debe actualizar el hash de la contraseña y revocar las demás sesiones", async () => {
        authRepository.findUserById.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue("new_secure_bcrypt_hash");
        authRepository.updatePassword.mockResolvedValue(undefined);
        sessionService.revokeOtherSessions.mockResolvedValue(undefined);

        const response = await authService.changePassword(
          mockUser.id,
          { currentPassword: "OldPassword1!", newPassword: "NewPassword2@" },
          "current_session_token",
        );

        expect(bcrypt.compare).toHaveBeenCalledWith("OldPassword1!", mockUser.contrasenaHash);
        expect(authRepository.updatePassword).toHaveBeenCalledWith(
          mockUser.id,
          "new_secure_bcrypt_hash",
        );
        expect(sessionService.revokeOtherSessions).toHaveBeenCalledWith(
          mockUser.id,
          "current_session_token",
        );
        expect(response.message).toBe("Contraseña actualizada exitosamente.");
      });
    });

    describe("Escenario: Contraseña actual incorrecta", () => {
      it("debe rechazar el cambio con BadRequestException si la contraseña actual no coincide", async () => {
        authRepository.findUserById.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          authService.changePassword(mockUser.id, {
            currentPassword: "WrongPassword!",
            newPassword: "NewPassword2@",
          }),
        ).rejects.toThrow(new BadRequestException("Usuario o contraseña incorrectos."));
      });
    });

    describe("Escenario: Nueva contraseña igual a la actual", () => {
      it("debe rechazar el cambio si la nueva contraseña es igual a la actual", async () => {
        authRepository.findUserById.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(
          authService.changePassword(mockUser.id, {
            currentPassword: "SamePassword1!",
            newPassword: "SamePassword1!",
          }),
        ).rejects.toThrow(
          new BadRequestException("La nueva contraseña debe ser distinta de la actual."),
        );
      });
    });
  });

  describe("HU 3: Recuperación de contraseña", () => {
    describe("Escenario: Solicitud de recuperación con datos válidos", () => {
      it("debe confirmar verificación si el usuario existe y la fecha de nacimiento coincide", async () => {
        const userWithPersona: UserWithPersonaBirthdate = {
          id: mockUser.id,
          nombreUsuario: mockUser.nombreUsuario,
          fechaNacimiento: "1990-05-15",
        };
        authRepository.findUserWithPersonaByUsername.mockResolvedValue(userWithPersona);

        const result = await authService.forgotPassword({
          username: "jdoe",
          birthdate: "1990-05-15",
        });

        expect(result.message).toContain("Tu identidad ha sido verificada");
      });
    });

    describe("Escenario: Datos incorrectos o usuario inexistente", () => {
      it("debe lanzar BadRequestException si el usuario no existe", async () => {
        authRepository.findUserWithPersonaByUsername.mockResolvedValue(null);

        await expect(
          authService.forgotPassword({
            username: "nonexistent",
            birthdate: "1990-05-15",
          }),
        ).rejects.toThrow(new BadRequestException("Los datos no coinciden con ningún registro."));
      });

      it("debe lanzar BadRequestException si la fecha de nacimiento no coincide", async () => {
        const userWithPersona: UserWithPersonaBirthdate = {
          id: mockUser.id,
          nombreUsuario: mockUser.nombreUsuario,
          fechaNacimiento: "1990-05-15",
        };
        authRepository.findUserWithPersonaByUsername.mockResolvedValue(userWithPersona);

        await expect(
          authService.forgotPassword({
            username: "jdoe",
            birthdate: "2000-01-01",
          }),
        ).rejects.toThrow(
          new BadRequestException(
            "No se pudo procesar la solicitud. Verifica el usuario y tu fecha de nacimiento.",
          ),
        );
      });
    });
  });

  describe("HU 4: Sesiones y Token", () => {
    describe("Escenario: checkToken", () => {
      it("debe retornar rol del usuario activo al verificar token", async () => {
        authRepository.findUserById.mockResolvedValue(mockUser);
        authRepository.findPersonaById.mockResolvedValue(mockPersona);
        authRepository.findRoleById.mockResolvedValue(mockRole);
        authRepository.findInstitution.mockResolvedValue(mockInstitution);
        authRepository.getUserModules.mockResolvedValue([]);

        const result = await authService.checkToken(mockUser.id);

        expect(result.user.id).toBe(mockUser.id);
        expect(result.user.email).toBe(mockPersona.correo);
      });

      it("debe lanzar UnauthorizedException si el usuario ya no existe", async () => {
        authRepository.findUserById.mockResolvedValue(null);

        await expect(authService.checkToken("non-existing-user")).rejects.toThrow(
          new UnauthorizedException("Sesión inválida o expirada"),
        );
      });
    });

    describe("Escenario: refreshToken", () => {
      it("debe revocar la sesión antigua y generar nuevo token", async () => {
        sessionService.verifyAccessToken.mockReturnValue({
          sub: mockUser.id,
          username: mockUser.nombreUsuario,
          roleId: mockUser.rolId,
          role: "Docente",
          personaId: mockUser.personaId,
        });
        authRepository.findUserById.mockResolvedValue(mockUser);
        authRepository.findPersonaById.mockResolvedValue(mockPersona);
        authRepository.findRoleById.mockResolvedValue(mockRole);
        authRepository.findInstitution.mockResolvedValue(mockInstitution);
        authRepository.getUserModules.mockResolvedValue([]);
        sessionService.revokeSession.mockResolvedValue(undefined);
        sessionService.generateAccessToken.mockReturnValue("new_fresh_token");
        sessionService.recordSession.mockResolvedValue(undefined);

        const result = await authService.refreshToken("old_valid_token", "127.0.0.1", "JestTest");

        expect(sessionService.verifyAccessToken).toHaveBeenCalledWith("old_valid_token");
        expect(sessionService.revokeSession).toHaveBeenCalledWith("old_valid_token");
        expect(result.accessToken).toBe("new_fresh_token");
        expect(result.message).toBe("Token renovado exitosamente");
      });
    });

    describe("Escenario: logout", () => {
      it("debe revocar la sesión si se provee un token", async () => {
        sessionService.revokeSession.mockResolvedValue(undefined);

        await authService.logout("token_to_revoke");

        expect(sessionService.revokeSession).toHaveBeenCalledWith("token_to_revoke");
      });

      it("no debe llamar a revocar sesión si el token es undefined", async () => {
        await authService.logout(undefined);

        expect(sessionService.revokeSession).not.toHaveBeenCalled();
      });
    });
  });

  describe("RF-001 V2: Varios roles y valores configurables", () => {
    const rolDocente = {
      rolId: "rol-docente",
      nombre: "Docente",
      esSistema: false,
      esPrincipal: true,
    };
    const rolApoderado = {
      rolId: "rol-apoderado",
      nombre: "Apoderado",
      esSistema: false,
      esPrincipal: false,
    };

    const prepararRol = (roles: (typeof rolDocente)[]) => {
      authRepository.findUserRoles.mockResolvedValue(roles);
      authRepository.findPersonaById.mockResolvedValue(mockPersona);
      authRepository.findInstitution.mockResolvedValue(mockInstitution);
      authRepository.getUserModules.mockResolvedValue([]);
      sessionService.generateAccessToken.mockReturnValue("jwt_nuevo");
    };

    it("CP-RF001-23 Ingreso con varios roles: entra con el principal y devuelve todos sus roles", async () => {
      authRepository.findUserByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prepararRol([rolDocente, rolApoderado]);

      const result = await authService.login({
        username: "jdoe",
        password: "x",
        rememberMe: false,
      });

      expect(sessionService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: "rol-docente", role: "Docente" }),
        false,
      );
      expect(authRepository.getUserModules).toHaveBeenCalledWith("rol-docente", false);
      expect(result.user.activeRoleName).toBe("Docente");
      expect(result.user.userRoles).toEqual([
        { id: "rol-docente", name: "Docente", isPrincipal: true },
        { id: "rol-apoderado", name: "Apoderado", isPrincipal: false },
      ]);
    });

    it("RF-001 V3 Elegir rol al ingresar: emite token con el rol elegido, sin rol pendiente, y revoca el del paso 1", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      prepararRol([rolDocente, rolApoderado]);

      const result = await authService.switchRole(
        mockUser.id,
        { roleId: "rol-apoderado" },
        { rolPendiente: true, recordar: true },
        "jwt_anterior",
      );

      expect(sessionService.revokeSession).toHaveBeenCalledWith("jwt_anterior");
      const [payload, recordar] = sessionService.generateAccessToken.mock.calls[0];
      expect(payload).toMatchObject({ roleId: "rol-apoderado", role: "Apoderado" });
      expect(payload.rolPendiente).toBeUndefined();
      expect(recordar).toBe(true);
      expect(authRepository.getUserModules).toHaveBeenCalledWith("rol-apoderado", false);
      expect(result.user.activeRoleId).toBe("rol-apoderado");
      expect(result.message).toBe("Rol cambiado a Apoderado.");
    });

    it("Cambiar a un rol no asignado: rechaza con ForbiddenException", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      prepararRol([rolDocente]);

      await expect(
        authService.switchRole(
          mockUser.id,
          { roleId: "rol-director" },
          { rolPendiente: true },
          "jwt_anterior",
        ),
      ).rejects.toThrow(new ForbiddenException("No tiene asignado ese rol."));
      expect(sessionService.revokeSession).not.toHaveBeenCalled();
    });

    it("RF-001 V3 Sin cambio de rol dentro del sistema: rechaza si el rol ya se eligió", async () => {
      await expect(
        authService.switchRole(mockUser.id, { roleId: "rol-apoderado" }, {}, "jwt_final"),
      ).rejects.toThrow(
        new ForbiddenException(
          "El rol se elige al iniciar sesión. Cierre sesión para ingresar con otro rol.",
        ),
      );
      expect(authRepository.findUserById).not.toHaveBeenCalled();
      expect(sessionService.revokeSession).not.toHaveBeenCalled();
    });

    it("CP-RF001-25 Usuario con un solo rol: devuelve un único rol (el frontend oculta «Cambiar rol»)", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      prepararRol([rolDocente]);

      const result = await authService.checkToken(mockUser.id, "rol-docente");

      expect(result.user.userRoles).toHaveLength(1);
    });

    it("checkToken conserva el rol activo del token si sigue asignado", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      prepararRol([rolDocente, rolApoderado]);

      const result = await authService.checkToken(mockUser.id, "rol-apoderado");

      expect(result.user.activeRoleName).toBe("Apoderado");
    });

    it("P-10 Intentos configurables: bloquea al llegar a seguridad.intentos_fallidos_bloqueo (3)", async () => {
      variablesRepository.findByCodigoVigente.mockImplementation((codigo: string) =>
        Promise.resolve(codigo === "seguridad.intentos_fallidos_bloqueo" ? { valor: "3" } : null),
      );
      authRepository.findUserByUsername.mockResolvedValue({ ...mockUser, intentosFallidos: 2 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ username: "jdoe", password: "mala", rememberMe: false }),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.updateLoginAttempts).toHaveBeenCalledWith(mockUser.id, 3, true);
    });

    it("P-10 Longitud configurable: exige seguridad.longitud_minima_contrasena (10)", async () => {
      variablesRepository.findByCodigoVigente.mockImplementation((codigo: string) =>
        Promise.resolve(codigo === "seguridad.longitud_minima_contrasena" ? { valor: "10" } : null),
      );
      authRepository.findUserById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: "Actual123",
          newPassword: "Clave1234",
        }),
      ).rejects.toThrow(
        new BadRequestException(
          "La contraseña debe tener al menos 10 caracteres, con letras y números.",
        ),
      );
      expect(authRepository.updatePassword).not.toHaveBeenCalled();
    });

    it("Contraseña sin números: rechaza con el mensaje de la política", async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: "Actual123",
          newPassword: "SoloLetrasLargas",
        }),
      ).rejects.toThrow(
        new BadRequestException(
          "La contraseña debe tener al menos 8 caracteres, con letras y números.",
        ),
      );
    });
  });
});
