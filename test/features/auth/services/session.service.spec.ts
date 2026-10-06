import { InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { hashSha256 } from "@/common/utils";
import type { JwtPayload } from "@/features/auth/interfaces/jwt-payload.interface";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { SessionService } from "@/features/auth/services/session.service";

describe("SessionService (RF-001: HU 4 - Sesiones y Tokens)", () => {
  let sessionService: SessionService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let authRepository: jest.Mocked<AuthRepository>;

  const mockPayload: JwtPayload = {
    sub: "usr-uuid-1",
    username: "jdoe",
    roleId: "rol-uuid-1",
    role: "Docente",
    personaId: "per-uuid-1",
  };

  beforeEach(async () => {
    const mockJwt = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn(),
    };

    const mockRepo = {
      createSession: jest.fn(),
      closeSession: jest.fn(),
      closeOtherSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuthRepository, useValue: mockRepo },
      ],
    }).compile();

    sessionService = module.get<SessionService>(SessionService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    authRepository = module.get(AuthRepository);

    jest.clearAllMocks();
  });

  describe("generateAccessToken", () => {
    it("debe generar un token JWT con vigencia de 30 días si rememberMe es true", () => {
      jwtService.sign.mockReturnValue("jwt_30d_token");

      const token = sessionService.generateAccessToken(mockPayload, true);

      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, { expiresIn: "30d" });
      expect(token).toBe("jwt_30d_token");
    });

    it("debe generar un token JWT con expiración configurada (ej. 1d) si rememberMe es false", () => {
      configService.get.mockReturnValue("1d");
      jwtService.sign.mockReturnValue("jwt_1d_token");

      const token = sessionService.generateAccessToken(mockPayload, false);

      expect(configService.get).toHaveBeenCalledWith("JWT_EXPIRES_IN", "1d");
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, { expiresIn: "1d" });
      expect(token).toBe("jwt_1d_token");
    });

    it("debe lanzar InternalServerErrorException si jwtService falla al firmar", () => {
      jwtService.sign.mockImplementation(() => {
        throw new Error("Signing failed");
      });

      expect(() => sessionService.generateAccessToken(mockPayload, false)).toThrow(
        new InternalServerErrorException("No se pudo generar el token de acceso"),
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("debe retornar el payload decodificado si el token es válido", () => {
      configService.get.mockReturnValue("secret_key");
      jwtService.verify.mockReturnValue(mockPayload);

      const result = sessionService.verifyAccessToken("valid_token");

      expect(jwtService.verify).toHaveBeenCalledWith("valid_token", { secret: "secret_key" });
      expect(result).toEqual(mockPayload);
    });

    it("debe lanzar UnauthorizedException si el token es inválido o expiró", () => {
      configService.get.mockReturnValue("secret_key");
      jwtService.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => sessionService.verifyAccessToken("expired_token")).toThrow(
        new UnauthorizedException("Token de sesión expirado o inválido"),
      );
    });
  });

  describe("recordSession", () => {
    it("debe persistir los datos de sesión con token hasheado en SHA-256", async () => {
      authRepository.createSession.mockResolvedValue(undefined);

      await sessionService.recordSession({
        userId: "usr-uuid-1",
        token: "token_to_hash",
        rememberMe: true,
        ipAddress: "192.168.1.100",
        userAgent: "Chrome Browser",
      });

      expect(authRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: "usr-uuid-1",
          tokenHash: hashSha256("token_to_hash"),
          direccionIp: "192.168.1.100",
          navegador: "Chrome Browser",
        }),
      );
    });
  });

  describe("revokeSession", () => {
    it("debe cerrar la sesión buscando por hash de token", async () => {
      authRepository.closeSession.mockResolvedValue(undefined);

      await sessionService.revokeSession("raw_token");

      expect(authRepository.closeSession).toHaveBeenCalledWith(hashSha256("raw_token"));
    });
  });

  describe("revokeOtherSessions", () => {
    it("debe cerrar todas las sesiones del usuario salvo la del token actual", async () => {
      authRepository.closeOtherSessions.mockResolvedValue(undefined);

      await sessionService.revokeOtherSessions("usr-uuid-1", "current_token");

      expect(authRepository.closeOtherSessions).toHaveBeenCalledWith(
        "usr-uuid-1",
        hashSha256("current_token"),
      );
    });
  });
});
