import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../../common/services/audit.service";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "./dto/auth-response.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import type { UsuarioRecord } from "./interfaces/auth-repository.interface";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";
import { AuthRepository } from "./repositories/auth.repository";
import { SessionService } from "./services/session.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const normalizedUsername = dto.username.trim().toLowerCase();

    // 1. Buscar y validar existencia del usuario
    const user = await this.authRepository.findUserByUsername(normalizedUsername);
    if (!user) {
      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }

    // 2. Validar estado de la cuenta
    this.assertUserIsActive(user);

    // 3. Comparar contraseñas
    await this.verifyPassword(dto.password, user);

    // 4. Reiniciar intentos fallidos
    await this.authRepository.resetLoginAttempts(user.id);

    // 5. Cargar perfil y permisos
    const { userDto, modules, roleName } = await this.buildUserProfile(user);

    // 6. Generar token y persistir sesión mediante SessionService
    const payload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: user.rolId,
      role: roleName,
      personaId: user.personaId,
    };

    const accessToken = this.sessionService.generateAccessToken(payload, dto.rememberMe);
    await this.sessionService.recordSession({
      userId: user.id,
      token: accessToken,
      rememberMe: dto.rememberMe,
      ipAddress,
      userAgent,
    });

    await this.auditService?.log({
      usuarioId: user.id,
      accion: "iniciar_sesion",
      tabla: "usuarios",
      registroId: user.id,
      valorNuevo: { rememberMe: dto.rememberMe },
      direccionIp: ipAddress,
    });

    return {
      message: "Inicio de sesión exitoso",
      accessToken,
      user: userDto,
      modules,
    };
  }

  async checkToken(userId: string): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }

    this.assertUserIsActive(user);

    const { userDto, modules } = await this.buildUserProfile(user);

    return {
      user: userDto,
      modules,
    };
  }

  async refreshToken(
    oldToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // 1. Verificar firma y vigencia del token previo
    const payload = this.sessionService.verifyAccessToken(oldToken);

    // 2. Validar que la cuenta permanezca activa
    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Cuenta no encontrada o dada de baja");
    }

    this.assertUserIsActive(user);

    // 3. Revocar sesión anterior
    await this.sessionService.revokeSession(oldToken);

    // 4. Construir perfil y generar nuevo token
    const { userDto, modules, roleName } = await this.buildUserProfile(user);

    const newPayload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: user.rolId,
      role: roleName,
      personaId: user.personaId,
    };

    const newAccessToken = this.sessionService.generateAccessToken(newPayload, false);
    await this.sessionService.recordSession({
      userId: user.id,
      token: newAccessToken,
      rememberMe: false,
      ipAddress,
      userAgent,
    });

    return {
      message: "Token renovado exitosamente",
      accessToken: newAccessToken,
      user: userDto,
      modules,
    };
  }

  async logout(token?: string, ipAddress?: string): Promise<void> {
    if (!token) return;
    try {
      const payload = this.sessionService.verifyAccessToken(token);
      if (payload?.sub) {
        await this.auditService?.log({
          usuarioId: payload.sub,
          accion: "cerrar_sesion",
          tabla: "usuarios",
          registroId: payload.sub,
          direccionIp: ipAddress,
        });
      }
    } catch {
      // Token may be expired or already revoked, continue to revoke
    }
    await this.sessionService.revokeSession(token);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const userWithPersona =
      await this.authRepository.findUserWithPersonaByUsername(normalizedUsername);

    if (!userWithPersona) {
      throw new BadRequestException("Los datos no coinciden con ningún registro.");
    }

    if (userWithPersona.fechaNacimiento !== dto.birthdate) {
      throw new BadRequestException(
        "No se pudo procesar la solicitud. Verifica el usuario y tu fecha de nacimiento.",
      );
    }

    return {
      message:
        "Tu identidad ha sido verificada. Comunícate con la administración académica para obtener tu clave de restablecimiento.",
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentToken?: string,
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    this.assertUserIsActive(user);

    // 1. Validar que la contraseña actual sea correcta
    let isCurrentValid = false;
    try {
      isCurrentValid = await bcrypt.compare(dto.currentPassword, user.contrasenaHash);
    } catch (error) {
      this.logger.error(`Error comparando contraseña actual: ${(error as Error).message}`);
    }

    if (!isCurrentValid) {
      throw new BadRequestException("Usuario o contraseña incorrectos.");
    }

    // 2. Validar que la nueva contraseña sea distinta de la actual
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("La nueva contraseña debe ser distinta de la actual.");
    }

    // 3. Generar hash seguro de la nueva contraseña
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // 4. Actualizar contraseña y desmarcar cambio obligatorio
    await this.authRepository.updatePassword(user.id, newHash);

    // 5. Cerrar las demás sesiones abiertas del usuario
    if (currentToken) {
      await this.sessionService.revokeOtherSessions(user.id, currentToken);
    }

    await this.auditService?.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: user.id,
      valorAnterior: { contrasenaCambiada: false },
      valorNuevo: { contrasenaCambiada: true, debeCambiarContrasena: false },
    });

    return {
      message: "Contraseña actualizada exitosamente.",
    };
  }

  // --- MÉTODOS PRIVADOS / HELPERS COHESIVOS ---

  private assertUserIsActive(user: UsuarioRecord): void {
    if (user.estado === "bloqueado") {
      throw new UnauthorizedException(
        "Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Contacta al administrador.",
      );
    }
    if (user.estado !== "activo") {
      throw new UnauthorizedException("Tu cuenta se encuentra inactiva");
    }
  }

  private async verifyPassword(plainPassword: string, user: UsuarioRecord): Promise<void> {
    let isValid = false;
    try {
      isValid = await bcrypt.compare(plainPassword, user.contrasenaHash);
    } catch (error) {
      this.logger.error(`Error al comparar hash con bcrypt: ${(error as Error).message}`);
      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }

    if (!isValid) {
      const attempts = user.intentosFallidos + 1;
      const mustLock = attempts >= 5;

      try {
        await this.authRepository.updateLoginAttempts(user.id, attempts, mustLock);
      } catch (error) {
        this.logger.error(`Error actualizando intentos fallidos: ${(error as Error).message}`);
      }

      if (mustLock) {
        this.logger.warn(`Usuario ${user.nombreUsuario} bloqueado tras 5 intentos fallidos`);

        await this.auditService?.log({
          usuarioId: null, // Sistema
          accion: "actualizar",
          tabla: "usuarios",
          registroId: user.id,
          valorAnterior: { estado: user.estado, intentosFallidos: user.intentosFallidos },
          valorNuevo: { estado: "bloqueado", intentosFallidos: attempts },
        });

        throw new UnauthorizedException(
          "Tu cuenta ha sido bloqueada por superar el límite de intentos fallidos.",
        );
      }

      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }
  }

  private async buildUserProfile(user: UsuarioRecord): Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    roleName: string;
  }> {
    const persona = await this.authRepository.findPersonaById(user.personaId);
    const role = await this.authRepository.findRoleById(user.rolId);
    const inst = await this.authRepository.findInstitution();
    const roleName = role?.nombre ?? "usuario";
    const modules = await this.authRepository.getUserModules(user.rolId, role?.esSistema ?? false);

    const userDto: CurrentUserDto = {
      id: user.id,
      username: user.nombreUsuario,
      email: persona?.correo ?? undefined,
      firstName: persona?.nombres ?? undefined,
      lastName: persona
        ? `${persona.apellidoPaterno} ${persona.apellidoMaterno ?? ""}`.trim()
        : undefined,
      roles: role ? [role.nombre] : [],
      institutionId: inst?.id ?? undefined,
      institutionName: inst?.nombre ?? undefined,
      avatarUrl: persona?.fotoUrl ?? undefined,
      mustChangePassword: user.debeCambiarContrasena,
    };

    return { userDto, modules, roleName };
  }
}
