import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type {
  AuthenticatedUser,
  JwtPayload,
} from "@/features/auth/interfaces/jwt-payload.interface";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { JwtStrategy } from "@/features/auth/strategies/jwt.strategy";
import type { Request } from "express";

describe("JwtStrategy (RF-001: Validación de Token y Sesión)", () => {
  let strategy: JwtStrategy;
  let authRepository: jest.Mocked<AuthRepository>;

  const mockRequest = {
    headers: { authorization: "Bearer jwt_de_prueba" },
  } as unknown as Request;

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
      findUserRoles: jest.fn().mockResolvedValue([]),
      isSessionClosed: jest.fn().mockResolvedValue(false),
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

      const result: AuthenticatedUser = await strategy.validate(mockRequest, mockPayload);

      expect(result).toEqual({
        id: mockUserRecord.id,
        username: mockUserRecord.nombreUsuario,
        roleId: mockUserRecord.rolId,
        role: mockPayload.role,
        personaId: mockUserRecord.personaId,
        rolPendiente: false,
        recordar: false,
      });
      expect(authRepository.findUserById).toHaveBeenCalledWith(mockPayload.sub);
    });

    it("debe lanzar UnauthorizedException si el usuario no existe", async () => {
      authRepository.findUserById.mockResolvedValue(null);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException("Usuario no encontrado o dado de baja"),
      );
    });

    it("debe lanzar UnauthorizedException si el usuario ha sido marcado como eliminado", async () => {
      authRepository.findUserById.mockResolvedValue({
        ...mockUserRecord,
        eliminadoEn: "2026-10-02T00:00:00Z",
      });

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException("Usuario no encontrado o dado de baja"),
      );
    });

    it("debe lanzar UnauthorizedException si la cuenta no se encuentra en estado 'activo'", async () => {
      authRepository.findUserById.mockResolvedValue({
        ...mockUserRecord,
        estado: "bloqueado",
      });

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException("La cuenta de usuario no se encuentra activa"),
      );
    });

    it("RF-001 V2: rechaza el token si su rol activo ya no está asignado", async () => {
      authRepository.findUserById.mockResolvedValue(mockUserRecord);
      authRepository.findUserRoles.mockResolvedValue([
        { rolId: "otro-rol", nombre: "Apoderado", esSistema: false, esPrincipal: true },
      ]);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        "Su rol ya no está asignado. Ingrese nuevamente.",
      );
    });

    it("RF-001 V2: usa el rol activo del token cuando sigue asignado", async () => {
      authRepository.findUserById.mockResolvedValue(mockUserRecord);
      authRepository.findUserRoles.mockResolvedValue([
        { rolId: "x", nombre: "Docente", esSistema: false, esPrincipal: true },
        { rolId: mockPayload.roleId, nombre: "Apoderado", esSistema: false, esPrincipal: false },
      ]);

      const result = await strategy.validate(mockRequest, mockPayload);

      expect(result.roleId).toBe(mockPayload.roleId);
      expect(result.role).toBe("Apoderado");
    });

    it("debe rechazar un token cuya sesión ya fue cerrada (logout o rol ya elegido)", async () => {
      authRepository.isSessionClosed.mockResolvedValue(true);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente."),
      );
      expect(authRepository.findUserById).not.toHaveBeenCalled();
    });

    it("debe validar en una sola consulta usando fn_validar_jwt_usuario y cachear el resultado en Redis", async () => {
      const cacheGet = jest.fn().mockResolvedValue(null);
      const cacheSet = jest.fn().mockResolvedValue(true);
      const validarJwtUsuario = jest.fn().mockResolvedValue({
        sesionCerrada: false,
        usuario: mockUserRecord,
        roles: [
          { rolId: mockPayload.roleId, nombre: "Docente", esSistema: false, esPrincipal: true },
        ],
      });

      const estrategiaConCache = new JwtStrategy(
        { get: jest.fn().mockReturnValue("sga_test_secret_key") } as unknown as ConfigService,
        { validarJwtUsuario } as unknown as AuthRepository,
        {
          get: cacheGet,
          set: cacheSet,
        } as unknown as import("@/core/cache/cache.service").CacheService,
      );

      const res = await estrategiaConCache.validate(mockRequest, mockPayload);

      expect(res.id).toBe(mockUserRecord.id);
      expect(validarJwtUsuario).toHaveBeenCalledTimes(1);
      expect(cacheSet).toHaveBeenCalledWith(
        `auth:jwt:${mockPayload.sub}`,
        expect.objectContaining({ usuario: mockUserRecord }),
        60,
      );
    });

    it("debe evitar consultas a BD cuando Redis ya tiene la sesión cacheada y rechazar tokens revocados en Redis", async () => {
      const validarJwtUsuario = jest.fn();
      const cacheServiceHit = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key.startsWith("auth:revoked:")) return Promise.resolve(null);
          return Promise.resolve({
            usuario: mockUserRecord,
            roles: [
              { rolId: mockPayload.roleId, nombre: "Docente", esSistema: false, esPrincipal: true },
            ],
          });
        }),
        set: jest.fn(),
      };

      const estrategiaCacheada = new JwtStrategy(
        { get: jest.fn().mockReturnValue("sga_test_secret_key") } as unknown as ConfigService,
        { validarJwtUsuario } as unknown as AuthRepository,
        cacheServiceHit as unknown as import("@/core/cache/cache.service").CacheService,
      );

      const res = await estrategiaCacheada.validate(mockRequest, mockPayload);
      expect(res.role).toBe("Docente");
      expect(validarJwtUsuario).not.toHaveBeenCalled();

      const estrategiaRevocada = new JwtStrategy(
        { get: jest.fn().mockReturnValue("sga_test_secret_key") } as unknown as ConfigService,
        { validarJwtUsuario } as unknown as AuthRepository,
        {
          get: jest.fn().mockResolvedValue(true),
          set: jest.fn(),
        } as unknown as import("@/core/cache/cache.service").CacheService,
      );

      await expect(estrategiaRevocada.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente."),
      );
      expect(validarJwtUsuario).not.toHaveBeenCalled();
    });
  });
});
