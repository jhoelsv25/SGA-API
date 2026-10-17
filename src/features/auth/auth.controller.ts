import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  ClientInfo,
  type ClientInfoData,
  CurrentUser,
  ExtractToken,
  Public,
} from "../../common/decorators";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { SwitchRoleDto } from "./dto/switch-role.dto";
import type { AuthenticatedUser } from "./interfaces/jwt-payload.interface";
import { clearAuthCookie, setAuthCookie } from "./utils";

@ApiTags("Autenticación")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión en el sistema SGA" })
  @ApiResponse({
    status: 200,
    description: "Credenciales válidas, sesión iniciada",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Credenciales incorrectas o cuenta bloqueada" })
  async login(
    @Body() dto: LoginDto,
    @ClientInfo() client: ClientInfoData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto, client.ip, client.userAgent);
    setAuthCookie({ res, token: result.accessToken, rememberMe: dto.rememberMe });
    return result;
  }

  @Get("check-token")
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Verificar validez del token y obtener rol del usuario actual" })
  @ApiResponse({
    status: 200,
    description: "Token válido, datos de usuario y módulos retornados",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Sesión inválida o expirada" })
  async checkToken(@CurrentUser() user: AuthenticatedUser): Promise<AuthResponseDto> {
    return this.authService.checkToken(user.id, user.roleId);
  }

  @Post("switch-role")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: "Fijar el rol elegido en el paso 2 del inicio de sesión",
  })
  @ApiResponse({
    status: 200,
    description: "Rol cambiado; se emite un token nuevo con el rol elegido",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "No tiene ese rol, o el rol ya se eligió (solo se elige al iniciar sesión)",
  })
  async switchRole(
    @CurrentUser() user: AuthenticatedUser,
    @ExtractToken() token: string | undefined,
    @Body() dto: SwitchRoleDto,
    @ClientInfo() client: ClientInfoData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.switchRole(
      user.id,
      dto,
      user,
      token,
      client.ip,
      client.userAgent,
    );
    setAuthCookie({ res, token: result.accessToken, rememberMe: user.recordar });
    return result;
  }

  @Get("logout")
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Cerrar sesión e invalidar cookie/token" })
  @ApiResponse({ status: 200, description: "Sesión cerrada con éxito" })
  async logout(
    @ExtractToken() token: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @ClientInfo() client?: ClientInfoData,
  ): Promise<{ message: string }> {
    if (token) {
      if (client?.ip) {
        await this.authService.logout(token, client.ip);
      } else {
        await this.authService.logout(token);
      }
    }

    clearAuthCookie(res);
    return { message: "Sesión cerrada correctamente" };
  }

  @Public()
  @Get("refresh-token")
  @ApiOperation({ summary: "Renovar sesión silenciosamente utilizando cookie o token previo" })
  @ApiResponse({
    status: 200,
    description: "Token renovado con éxito",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Token inválido o expirado" })
  async refreshToken(
    @ExtractToken() token: string | undefined,
    @ClientInfo() client: ClientInfoData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    if (!token) {
      throw new UnauthorizedException("No se proporcionó token para renovación de sesión");
    }

    const result = await this.authService.refreshToken(token, client.ip, client.userAgent);
    setAuthCookie({ res, token: result.accessToken, rememberMe: false });
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicitar recuperación de contraseña verificando identidad" })
  @ApiResponse({ status: 200, description: "Identidad verificada exitosamente" })
  @ApiResponse({ status: 400, description: "Datos incorrectos" })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Cambiar contraseña del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Contraseña actualizada exitosamente" })
  @ApiResponse({
    status: 400,
    description: "Contraseña actual incorrecta o nueva no cumple la política",
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @ExtractToken() token: string | undefined,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto, token);
  }
}
