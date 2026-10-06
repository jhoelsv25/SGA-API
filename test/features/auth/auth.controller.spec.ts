import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Response } from "express";
import { AuthController } from "@/features/auth/auth.controller";
import { AuthService } from "@/features/auth/auth.service";
import type { AuthResponseDto } from "@/features/auth/dto/auth-response.dto";
import type { ChangePasswordDto } from "@/features/auth/dto/change-password.dto";
import type { ForgotPasswordDto } from "@/features/auth/dto/forgot-password.dto";
import type { LoginDto } from "@/features/auth/dto/login.dto";
import type { AuthenticatedUser } from "@/features/auth/interfaces/jwt-payload.interface";

describe("AuthController (RF-001: Endpoints de Autenticación)", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  const mockAuthResponse: AuthResponseDto = {
    message: "Inicio de sesión exitoso",
    accessToken: "mock_access_token_jwt",
    user: {
      id: "usr-uuid-1",
      username: "jdoe",
      email: "jdoe@colegio.edu.pe",
      roles: ["Docente"],
      mustChangePassword: false,
    },
    modules: [],
  };

  const mockUser: AuthenticatedUser = {
    id: "usr-uuid-1",
    username: "jdoe",
    roleId: "rol-uuid-1",
    role: "Docente",
    personaId: "per-uuid-1",
  };

  beforeEach(async () => {
    const mockAuthServiceObj = {
      login: jest.fn(),
      checkToken: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthServiceObj }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe("login", () => {
    it("debe delegar a authService.login y configurar la cookie de sesión", async () => {
      authService.login.mockResolvedValue(mockAuthResponse);
      const dto: LoginDto = { username: "jdoe", password: "Password123!", rememberMe: true };
      const clientInfo = { ip: "127.0.0.1", userAgent: "JestAgent" };

      const result = await controller.login(dto, clientInfo, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(dto, "127.0.0.1", "JestAgent");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "access_token",
        "mock_access_token_jwt",
        expect.any(Object),
      );
      expect(result).toBe(mockAuthResponse);
    });
  });

  describe("checkToken", () => {
    it("debe retornar los datos del usuario delegando en authService.checkToken", async () => {
      authService.checkToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.checkToken(mockUser);

      expect(authService.checkToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBe(mockAuthResponse);
    });
  });

  describe("logout", () => {
    it("debe revocar el token si existe, limpiar la cookie y retornar mensaje", async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout("sample_token", mockResponse);

      expect(authService.logout).toHaveBeenCalledWith("sample_token");
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
      expect(result).toEqual({ message: "Sesión cerrada correctamente" });
    });

    it("debe limpiar cookie aun si no se envió token", async () => {
      const result = await controller.logout(undefined, mockResponse);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
      expect(result).toEqual({ message: "Sesión cerrada correctamente" });
    });
  });

  describe("refreshToken", () => {
    it("debe renovar el token y actualizar la cookie", async () => {
      authService.refreshToken.mockResolvedValue({
        ...mockAuthResponse,
        accessToken: "new_refreshed_token",
      });
      const clientInfo = { ip: "127.0.0.1", userAgent: "JestAgent" };

      const result = await controller.refreshToken("valid_old_token", clientInfo, mockResponse);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        "valid_old_token",
        "127.0.0.1",
        "JestAgent",
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "access_token",
        "new_refreshed_token",
        expect.any(Object),
      );
      expect(result.accessToken).toBe("new_refreshed_token");
    });

    it("debe lanzar UnauthorizedException si no se provee token", async () => {
      const clientInfo = { ip: "127.0.0.1", userAgent: "JestAgent" };

      await expect(controller.refreshToken(undefined, clientInfo, mockResponse)).rejects.toThrow(
        new UnauthorizedException("No se proporcionó token para renovación de sesión"),
      );
    });
  });

  describe("forgotPassword", () => {
    it("debe delegar en authService.forgotPassword", async () => {
      authService.forgotPassword.mockResolvedValue({
        message: "Tu identidad ha sido verificada.",
      });
      const dto: ForgotPasswordDto = { username: "jdoe", birthdate: "1990-05-15" };

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result.message).toBe("Tu identidad ha sido verificada.");
    });
  });

  describe("changePassword", () => {
    it("debe delegar en authService.changePassword con el userId y token", async () => {
      authService.changePassword.mockResolvedValue({
        message: "Contraseña actualizada exitosamente.",
      });
      const dto: ChangePasswordDto = {
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword2@",
      };

      const result = await controller.changePassword(mockUser, "current_token", dto);

      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, dto, "current_token");
      expect(result.message).toBe("Contraseña actualizada exitosamente.");
    });
  });
});
