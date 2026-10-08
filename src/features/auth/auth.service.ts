import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../../common/services/audit.service";
import { VariablesSistemaRepository } from "../variables-sistema/repositories";
import {
  DEFAULT_INTENTOS_BLOQUEO,
  DEFAULT_LONGITUD_CONTRASENA,
  PASSWORD_LETRAS_Y_NUMEROS,
  VAR_INTENTOS_BLOQUEO,
  VAR_LONGITUD_CONTRASENA,
} from "./constants";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "./dto/auth-response.dto";
import { SwitchProfileDto } from "./dto/switch-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import type { PerfilRecord, UsuarioRecord } from "./interfaces/auth-repository.interface";
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
    @Optional() private readonly variablesRepository?: VariablesSistemaRepository,
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

    // 5. Cargar perfil y permisos: ingresa con su perfil principal (RF-001 V2)
    const { userDto, modules, activeProfile } = await this.buildUserProfile(user);

    // 6. Generar token y persistir sesión mediante SessionService
    const payload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeProfile.rolId,
      role: activeProfile.nombre,
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

  async checkToken(userId: string, activeRoleId?: string): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }

    this.assertUserIsActive(user);

    const { userDto, modules } = await this.buildUserProfile(user, activeRoleId);

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

    // 4. Construir perfil (conserva el perfil activo si sigue asignado) y generar nuevo token
    const { userDto, modules, activeProfile } = await this.buildUserProfile(user, payload.roleId);

    const newPayload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeProfile.rolId,
      role: activeProfile.nombre,
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

  /**
   * RF-001 V2: cambia el perfil activo sin volver a pedir la contraseña.
   * Emite un token nuevo con el perfil elegido y cierra la sesión del token anterior.
   */
  async switchProfile(
    userId: string,
    dto: SwitchProfileDto,
    oldToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }
    this.assertUserIsActive(user);

    const profiles = await this.resolveProfiles(user);
    const target = profiles.find((p) => p.rolId === dto.roleId);
    if (!target) {
      throw new ForbiddenException("No tiene asignado ese perfil.");
    }

    const { userDto, modules, activeProfile } = await this.buildUserProfile(user, target.rolId);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeProfile.rolId,
      role: activeProfile.nombre,
      personaId: user.personaId,
    };

    if (oldToken) {
      await this.sessionService.revokeSession(oldToken);
    }
    const accessToken = this.sessionService.generateAccessToken(payload, false);
    await this.sessionService.recordSession({
      userId: user.id,
      token: accessToken,
      rememberMe: false,
      ipAddress,
      userAgent,
    });

    await this.auditService?.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "usuario_roles",
      registroId: user.id,
      valorNuevo: { perfilActivo: activeProfile.nombre, perfilActivoId: activeProfile.rolId },
      direccionIp: ipAddress,
    });

    return {
      message: `Perfil cambiado a ${activeProfile.nombre}.`,
      accessToken,
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

    // 2. Validar la política de contraseña (longitud configurable, letras y números)
    const longitudMinima = await this.leerVariableNumerica(
      VAR_LONGITUD_CONTRASENA,
      DEFAULT_LONGITUD_CONTRASENA,
    );
    if (
      dto.newPassword.length < longitudMinima ||
      !PASSWORD_LETRAS_Y_NUMEROS.test(dto.newPassword)
    ) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${longitudMinima} caracteres, con letras y números.`,
      );
    }

    // 3. Validar que la nueva contraseña sea distinta de la actual
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("La nueva contraseña debe ser distinta de la actual.");
    }

    // 4. Generar hash seguro de la nueva contraseña
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // 5. Actualizar contraseña y desmarcar cambio obligatorio
    await this.authRepository.updatePassword(user.id, newHash);

    // 6. Cerrar las demás sesiones abiertas del usuario
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
      const maxIntentos = await this.leerVariableNumerica(
        VAR_INTENTOS_BLOQUEO,
        DEFAULT_INTENTOS_BLOQUEO,
      );
      const attempts = user.intentosFallidos + 1;
      const mustLock = attempts >= maxIntentos;

      try {
        await this.authRepository.updateLoginAttempts(user.id, attempts, mustLock);
      } catch (error) {
        this.logger.error(`Error actualizando intentos fallidos: ${(error as Error).message}`);
      }

      if (mustLock) {
        this.logger.warn(
          `Usuario ${user.nombreUsuario} bloqueado tras ${maxIntentos} intentos fallidos`,
        );

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

  /** Valor numérico vigente de una variable del sistema, o el valor por defecto. */
  private async leerVariableNumerica(codigo: string, porDefecto: number): Promise<number> {
    try {
      const variable = await this.variablesRepository?.findByCodigoVigente(codigo);
      const valor = Number(variable?.valor);
      return variable && Number.isFinite(valor) ? valor : porDefecto;
    } catch (error) {
      this.logger.warn(`No se pudo leer la variable ${codigo}: ${(error as Error).message}`);
      return porDefecto;
    }
  }

  /**
   * Perfiles vigentes del usuario (tabla usuario_roles), el principal primero.
   * Si aún no tiene filas (datos previos a la migración 0002), usa usuarios.rol_id.
   */
  private async resolveProfiles(user: UsuarioRecord): Promise<PerfilRecord[]> {
    const profiles = await this.authRepository.findUserProfiles(user.id);
    if (profiles.length > 0) return profiles;

    const role = await this.authRepository.findRoleById(user.rolId);
    return role
      ? [{ rolId: role.id, nombre: role.nombre, esSistema: role.esSistema, esPrincipal: true }]
      : [];
  }

  private async buildUserProfile(
    user: UsuarioRecord,
    requestedRoleId?: string,
  ): Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeProfile: PerfilRecord;
  }> {
    const profiles = await this.resolveProfiles(user);
    const activeProfile =
      profiles.find((p) => p.rolId === requestedRoleId) ??
      profiles.find((p) => p.esPrincipal) ??
      profiles[0];
    if (!activeProfile) {
      throw new UnauthorizedException("La cuenta no tiene perfiles asignados.");
    }

    const persona = await this.authRepository.findPersonaById(user.personaId);
    const inst = await this.authRepository.findInstitution();
    const [modules, permissions] = await Promise.all([
      this.authRepository.getUserModules(activeProfile.rolId, activeProfile.esSistema),
      this.authRepository.getPermissionCodes(activeProfile.rolId, activeProfile.esSistema),
    ]);

    const userDto: CurrentUserDto = {
      id: user.id,
      username: user.nombreUsuario,
      email: persona?.correo ?? undefined,
      firstName: persona?.nombres ?? undefined,
      lastName: persona
        ? `${persona.apellidoPaterno} ${persona.apellidoMaterno ?? ""}`.trim()
        : undefined,
      roles: profiles.map((p) => p.nombre),
      profiles: profiles.map((p) => ({ id: p.rolId, name: p.nombre, isPrincipal: p.esPrincipal })),
      activeProfileId: activeProfile.rolId,
      activeProfileName: activeProfile.nombre,
      institutionId: inst?.id ?? undefined,
      institutionName: inst?.nombre ?? undefined,
      avatarUrl: persona?.fotoUrl ?? undefined,
      mustChangePassword: user.debeCambiarContrasena,
      permissions,
    };

    return { userDto, modules, activeProfile };
  }
}
