import {
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "./dto/auth-response.dto";
import { SwitchRoleDto } from "./dto/switch-role.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import type { UsuarioRolRecord, UsuarioRecord } from "./interfaces/auth-repository.interface";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";
import { AuthRepository } from "./repositories/auth.repository";
import { AuthPasswordService, SessionService } from "./services";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly authPasswordService: AuthPasswordService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly notificacionesService?: NotificacionesService,
    @Optional() private readonly variablesService?: VariablesSistemaService,
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

    // 3. Comparar contraseñas y gestionar intentos
    await this.authPasswordService.verifyPassword(dto.password, user);

    // 4. Reiniciar intentos fallidos tras login exitoso
    await this.authRepository.resetLoginAttempts(user.id);

    // 5. Cargar rol y menús: ingresa con su rol principal (RF-001 V2)
    const { userDto, modules, activeRole } = await this.buildUserRole(user);

    // RF-001 V3: el paso 2 del login fija el rol; solo queda pendiente si el usuario tiene más de un rol
    const roles = await this.resolveRoles(user);
    const tieneMultiplesRoles = roles.length > 1;

    // 6. Generar token y persistir sesión mediante SessionService
    const payload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: user.personaId,
      rolPendiente: tieneMultiplesRoles,
      recordar: dto.rememberMe === true,
    };

    const accessToken = this.sessionService.generateAccessToken(payload, dto.rememberMe);

    // Detectar si la IP es nueva para el usuario antes de persistir la sesión
    const esNuevaIp =
      Boolean(ipAddress) && this.authRepository.hasPreviousSessionFromIp
        ? !(await this.authRepository.hasPreviousSessionFromIp(user.id, ipAddress!))
        : false;

    await this.sessionService.recordSession({
      userId: user.id,
      token: accessToken,
      rememberMe: dto.rememberMe,
      ipAddress,
      userAgent,
    });

    if (esNuevaIp && ipAddress) {
      await this.despacharAlertaNuevoDispositivo(user.id, ipAddress);
    }

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

    const { userDto, modules } = await this.buildUserRole(user, activeRoleId);

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

    // 4. Construir rol (conserva el rol activo si sigue asignado) y generar nuevo token
    const { userDto, modules, activeRole } = await this.buildUserRole(user, payload.roleId);

    const newPayload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
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

  async switchRole(
    userId: string,
    dto: SwitchRoleDto,
    session: { rolPendiente?: boolean; recordar?: boolean },
    oldToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!session.rolPendiente) {
      throw new ForbiddenException(
        "El rol se elige al iniciar sesión. Cierre sesión para ingresar con otro rol.",
      );
    }

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }
    this.assertUserIsActive(user);

    const roles = await this.resolveRoles(user);
    const target = roles.find((p) => p.rolId === dto.roleId);
    if (!target) {
      throw new ForbiddenException("No tiene asignado ese rol.");
    }

    const { userDto, modules, activeRole } = await this.buildUserRole(user, target.rolId);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: user.personaId,
    };

    if (oldToken) {
      await this.sessionService.revokeSession(oldToken);
    }
    const accessToken = this.sessionService.generateAccessToken(payload, session.recordar);
    await this.sessionService.recordSession({
      userId: user.id,
      token: accessToken,
      rememberMe: session.recordar,
      ipAddress,
      userAgent,
    });

    await this.auditService?.log({
      usuarioId: user.id,
      accion: "actualizar",
      tabla: "usuario_roles",
      registroId: user.id,
      valorNuevo: { rolActivo: activeRole.nombre, rolActivoId: activeRole.rolId },
      direccionIp: ipAddress,
    });

    return {
      message: `Rol cambiado a ${activeRole.nombre}.`,
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
    return this.authPasswordService.forgotPassword(dto);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentToken?: string,
  ): Promise<{ message: string }> {
    return this.authPasswordService.changePassword(userId, dto, currentToken);
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

  private async resolveRoles(user: UsuarioRecord): Promise<UsuarioRolRecord[]> {
    const roles = await this.authRepository.findUserRoles(user.id);
    if (roles.length > 0) return roles;

    const role = await this.authRepository.findRoleById(user.rolId);
    return role
      ? [{ rolId: role.id, nombre: role.nombre, esSistema: role.esSistema, esPrincipal: true }]
      : [];
  }

  private async buildUserRole(
    user: UsuarioRecord,
    requestedRoleId?: string,
  ): Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  }> {
    const roles = await this.resolveRoles(user);
    const activeRole =
      roles.find((p) => p.rolId === requestedRoleId) ??
      roles.find((p) => p.esPrincipal) ??
      roles[0];
    if (!activeRole) {
      throw new UnauthorizedException("La cuenta no tiene roles asignados.");
    }

    const persona = await this.authRepository.findPersonaById(user.personaId);
    const inst = await this.authRepository.findInstitution();
    const [modules, menuRoutes] = await Promise.all([
      this.authRepository.getUserModules(activeRole.rolId, activeRole.esSistema),
      this.authRepository.getMenuRoutes(activeRole.rolId, activeRole.esSistema),
    ]);

    const userDto: CurrentUserDto = {
      id: user.id,
      username: user.nombreUsuario,
      email: persona?.correo ?? undefined,
      firstName: persona?.nombres ?? undefined,
      lastName: persona
        ? `${persona.apellidoPaterno} ${persona.apellidoMaterno ?? ""}`.trim()
        : undefined,
      roles: roles.map((p) => p.nombre),
      userRoles: roles.map((p) => ({ id: p.rolId, name: p.nombre, isPrincipal: p.esPrincipal })),
      activeRoleId: activeRole.rolId,
      activeRoleName: activeRole.nombre,
      institutionId: inst?.id ?? undefined,
      institutionName: inst?.nombre ?? undefined,
      avatarUrl: persona?.fotoUrl ?? undefined,
      mustChangePassword: user.debeCambiarContrasena,
      menuRoutes,
    };

    return { userDto, modules, activeRole };
  }

  /**
   * Envía una notificación si el switch 'notificacion.alerta_nuevo_dispositivo'
   * está habilitado en la base de datos (RF-001 / RF-004).
   */
  private async despacharAlertaNuevoDispositivo(userId: string, ipAddress: string): Promise<void> {
    if (!this.variablesService || !this.notificacionesService) return;

    try {
      const activo = await this.variablesService.isActiva(
        "notificacion.alerta_nuevo_dispositivo",
        true,
      );
      if (!activo) return;

      await this.notificacionesService.enviar({
        usuarioId: userId,
        titulo: "Alerta de nuevo dispositivo",
        mensaje: `Se ha detectado un inicio de sesión en tu cuenta desde una nueva dirección IP (${ipAddress}).`,
        tipo: "alerta",
      });
    } catch {
      // Silenciar para no bloquear la respuesta de inicio de sesión
    }
  }
}
