import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import type {
  UsuarioRecord,
  UserWithPersonaBirthdate,
} from "@/features/auth/interfaces/auth-repository.interface";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { AuthPasswordService, SessionService } from "@/features/auth/services";
import { VariablesSistemaRepository } from "@/features/variables-sistema/repositories";

describe("AuthPasswordService (RF-001: Políticas, validación y contraseñas)", () => {
  let service: AuthPasswordService;
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepo = {
      findUserById: jest.fn().mockResolvedValue(mockUser),
      findUserWithPersonaByUsername: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      updateLoginAttempts: jest.fn().mockResolvedValue(undefined),
    };

    const mockSession = {
      revokeOtherSessions: jest.fn().mockResolvedValue(undefined),
    };

    variablesRepository = {
      findByCodigoVigente: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: SessionService, useValue: mockSession },
        { provide: VariablesSistemaRepository, useValue: variablesRepository },
      ],
    }).compile();

    service = module.get<AuthPasswordService>(AuthPasswordService);
    authRepository = module.get(AuthRepository);
    sessionService = module.get(SessionService);
  });

  describe("verifyPassword", () => {
    it("debe validar exitosamente cuando la contraseña coincide", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      await expect(service.verifyPassword("correctPassword", mockUser)).resolves.toBeUndefined();
    });

    it("debe incrementar intentos fallidos y lanzar UnauthorizedException si no coincide", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.verifyPassword("wrongPassword", mockUser)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authRepository.updateLoginAttempts).toHaveBeenCalledWith(mockUser.id, 1, false);
    });

    it("debe bloquear la cuenta si supera el máximo de intentos", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const userAlmostLocked: UsuarioRecord = { ...mockUser, intentosFallidos: 4 };

      await expect(service.verifyPassword("wrongPassword", userAlmostLocked)).rejects.toThrow(
        /bloqueada/,
      );
      expect(authRepository.updateLoginAttempts).toHaveBeenCalledWith(mockUser.id, 5, true);
    });
  });

  describe("changePassword", () => {
    it("debe rechazar si la contraseña actual no es correcta", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changePassword("usr-uuid-1", {
          currentPassword: "wrongCurrentPassword",
          newPassword: "NewPassword2026!",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar si la nueva contraseña no cumple longitud o complejidad", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.changePassword("usr-uuid-1", {
          currentPassword: "OldPassword123",
          newPassword: "corta",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar si la nueva contraseña es igual a la actual", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.changePassword("usr-uuid-1", {
          currentPassword: "Password123",
          newPassword: "Password123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe cambiar la contraseña, revocar otras sesiones y actualizar en BD", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce("hashedNewPassword");

      const res = await service.changePassword(
        "usr-uuid-1",
        {
          currentPassword: "OldPassword123",
          newPassword: "NewPassword123",
        },
        "currentToken",
      );

      expect(authRepository.updatePassword).toHaveBeenCalledWith("usr-uuid-1", "hashedNewPassword");
      expect(sessionService.revokeOtherSessions).toHaveBeenCalledWith("usr-uuid-1", "currentToken");
      expect(res.message).toContain("actualizada exitosamente");
    });
  });

  describe("forgotPassword", () => {
    const personaMatch: UserWithPersonaBirthdate = {
      id: "usr-uuid-1",
      nombreUsuario: "jdoe",
      fechaNacimiento: "1990-05-15",
    };

    it("debe rechazar si la fecha de nacimiento no coincide", async () => {
      authRepository.findUserWithPersonaByUsername.mockResolvedValueOnce(personaMatch);

      await expect(
        service.forgotPassword({
          username: "jdoe",
          birthdate: "2000-01-01",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe responder con mensaje de verificación si los datos coinciden", async () => {
      authRepository.findUserWithPersonaByUsername.mockResolvedValueOnce(personaMatch);

      const res = await service.forgotPassword({
        username: "jdoe",
        birthdate: "1990-05-15",
      });

      expect(res.message).toContain("identidad ha sido verificada");
    });
  });
});
