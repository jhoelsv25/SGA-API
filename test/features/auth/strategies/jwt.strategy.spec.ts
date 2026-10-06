import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type {
  AuthenticatedUser,
  JwtPayload,
} from "@/features/auth/interfaces/jwt-payload.interface";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { JwtStrategy } from "@/features/auth/strategies/jwt.strategy";

describe("JwtStrategy (RF-001: Validación de Token y Sesión)", () => {
  let strategy: JwtStrategy;
  let authRepository: jest.Mocked<AuthRepository>;

  const mockPayload: JwtPayload = {
    sub: "usr-uuid-1",
    username: "jdoe",
    roleId: "rol-uuid-1",
    role: "Docente",
    personaId: "per-uuid-1",
  };

  const mockUserRecord = {
    id: "usr-uuid-1",
    nombreUsuario: "jdoe",
    contrasenaHash: "hash",
    estado: "activo",
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    ultimoAcceso: null,
    creadoEn: "2026-10-01",
    actualizadoEn: "2026-10-01",
    eliminadoEn: null,
    personaId: "per-uuid-1",
    rolId: "rol-uuid-1",
  };

  beforeEach(async () => {
    const mockRepo = {
      findUserById: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue("sga_test_secret_key"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authRepository = module.get(AuthRepository);

    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("debe retornar los datos del usuario autenticado si la cuenta está activa y existe", async () => {
      authRepository.findUserById.mockResolvedValue(mockUserRecord);

      const result: AuthenticatedUser = await strategy.validate(mockPayload);

      expect(result).toEqual({
        id: mockUserRecord.id,
        username: mockUserRecord.nombreUsuario,
        roleId: mockUserRecord.rolId,
        role: mockPayload.role,
        personaId: mockUserRecord.personaId,
      });
      expect(authRepository.findUserById).toHaveBeenCalledWith(mockPayload.sub);
    });

    it("debe lanzar UnauthorizedException si el usuario no existe", async () => {
      authRepository.findUserById.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException("Usuario no encontrado o dado de baja"),
      );
    });

    it("debe lanzar UnauthorizedException si el usuario ha sido marcado como eliminado", async () => {
      authRepository.findUserById.mockResolvedValue({
        ...mockUserRecord,
        eliminadoEn: "2026-10-02T00:00:00Z",
      });

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException("Usuario no encontrado o dado de baja"),
      );
    });

    it("debe lanzar UnauthorizedException si la cuenta no se encuentra en estado 'activo'", async () => {
      authRepository.findUserById.mockResolvedValue({
        ...mockUserRecord,
        estado: "bloqueado",
      });

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException("La cuenta de usuario no se encuentra activa"),
      );
    });
  });
});
