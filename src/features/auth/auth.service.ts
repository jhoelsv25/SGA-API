import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { CacheService } from "../../core/cache/cache.service";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "./dto/auth-response.dto";
import { ImpersonateDto } from "./dto/impersonate.dto";
import { SwitchRoleDto } from "./dto/switch-role.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import type {
  ContextoSesionSqlResult,
  UsuarioRolRecord,
  UsuarioRecord,
} from "./interfaces/auth-repository.interface";
import type {
  AuthenticatedUser,
  ImpersonatorInfo,
  JwtPayload,
} from "./interfaces/jwt-payload.interface";
import { AuthRepository } from "./repositories/auth.repository";
import { AuthPasswordService, SessionService } from "./services";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";

const TTL_CONTEXTO_CACHE_SEGUNDOS = 60;

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
    @Optional() private readonly cacheService?: CacheService,
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
    await this.invalidarCacheUsuario(user.id);

    // 5. Cargar rol y menús: ingresa con su rol principal (RF-001 V2)
    const { userDto, modules, activeRole } = await this.buildUserRole(user);

    // RF-001 V3: el paso 2 del login fija el rol; solo queda pendiente si el usuario tiene más de un rol
    const tieneMultiplesRoles = (userDto.roles?.length ?? 0) > 1;

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

  async checkToken(
    userId: string,
    activeRoleId?: string,
    impersonatedBy?: ImpersonatorInfo,
  ): Promise<AuthResponseDto> {
    const claveCache = `auth:contexto:${userId}:${activeRoleId ?? "principal"}`;
    const respuestaBase = this.cacheService
      ? await this.cacheService.getOrSet<AuthResponseDto>(
          claveCache,
          () => this.resolverRespuestaCheckToken(userId, activeRoleId),
          TTL_CONTEXTO_CACHE_SEGUNDOS,
        )
      : await this.resolverRespuestaCheckToken(userId, activeRoleId);

    if (!impersonatedBy) {
      return respuestaBase;
    }

    return {
      ...respuestaBase,
      user: {
        ...respuestaBase.user,
        impersonatedBy: {
          userId: impersonatedBy.userId,
          username: impersonatedBy.username,
          role: impersonatedBy.role,
        },
      },
    };
  }

  private async resolverRespuestaCheckToken(
    userId: string,
    activeRoleId?: string,
  ): Promise<AuthResponseDto> {
    if (this.authRepository.obtenerContextoSesion) {
      const contexto = await this.authRepository.obtenerContextoSesion(userId, activeRoleId);
      if (!contexto) {
        throw new UnauthorizedException("Sesión inválida o expirada");
      }
      this.assertUserIsActive(contexto.usuario);
      const { userDto, modules } = this.armarRespuestaDesdeContexto(contexto);
      return { user: userDto, modules };
    }

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
    // 1. Verificar firma y vigencia del token previo (refresh_token o access_token vigente)
    const payload = this.sessionService.verifyAccessToken(oldToken);

    // 1b. Rechazar si este token ya fue revocado por logout o rotación previa
    if (
      this.authRepository.isSessionClosed &&
      (await this.authRepository.isSessionClosed(this.sessionService.hashToken(oldToken)))
    ) {
      throw new UnauthorizedException("La sesión fue cerrada o renovada. Ingrese nuevamente.");
    }

    // 2. Validar que la cuenta permanezca activa
    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Cuenta no encontrada o dada de baja");
    }

    this.assertUserIsActive(user);

    // 3. Revocar sesión anterior
    await this.sessionService.revokeSession(oldToken);

    const rememberMe = payload.recordar === true;

    // 4. Construir rol (conserva el rol activo si sigue asignado) y generar nuevo token
    const { userDto, modules, activeRole } = await this.buildUserRole(user, payload.roleId);
    if (payload.impersonatedBy) {
      userDto.impersonatedBy = {
        userId: payload.impersonatedBy.userId,
        username: payload.impersonatedBy.username,
        role: payload.impersonatedBy.role,
      };
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      username: user.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: user.personaId,
      rolPendiente: payload.rolPendiente === true,
      recordar: rememberMe,
      impersonatedBy: payload.impersonatedBy,
    };

    const newAccessToken = this.sessionService.generateAccessToken(newPayload, rememberMe);
    await this.sessionService.recordSession({
      userId: user.id,
      token: newAccessToken,
      rememberMe,
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
      recordar: session.recordar === true,
    };

    if (oldToken) {
      await this.sessionService.revokeSession(oldToken);
    }
    await this.invalidarCacheUsuario(user.id);
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

  /**
   * Inicia una vista simulada ("Ver como usuario").
   * Exclusivo para Administrador o Soporte TI.
   */
  async impersonate(
    adminUser: AuthenticatedUser,
    dto: ImpersonateDto,
    oldToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!["Administrador", "Soporte TI"].includes(adminUser.role)) {
      throw new ForbiddenException(
        "Solo el Administrador o Soporte TI pueden ingresar en modo vista simulada.",
      );
    }

    if (adminUser.impersonatedBy) {
      throw new BadRequestException(
        "Ya se encuentra en una vista simulada. Vuelva a su cuenta original primero.",
      );
    }

    if (dto.userId === adminUser.id) {
      throw new BadRequestException("No puede simular su propia cuenta.");
    }

    const targetUser = await this.authRepository.findUserById(dto.userId);
    if (!targetUser) {
      throw new NotFoundException("Usuario destino no encontrado.");
    }

    this.assertUserIsActive(targetUser);

    const roles = await this.resolveRoles(targetUser);
    let targetRoleId: string | undefined;

    if (dto.roleId) {
      const encontrado = roles.find((r) => r.rolId === dto.roleId);
      if (!encontrado) {
        throw new BadRequestException("El usuario destino no tiene asignado ese rol.");
      }
      targetRoleId = encontrado.rolId;
    }

    const { userDto, modules, activeRole } = await this.buildUserRole(targetUser, targetRoleId);

    const impersonatedBy: ImpersonatorInfo = {
      userId: adminUser.id,
      username: adminUser.username,
      roleId: adminUser.roleId,
      role: adminUser.role,
    };

    userDto.impersonatedBy = {
      userId: impersonatedBy.userId,
      username: impersonatedBy.username,
      role: impersonatedBy.role,
    };

    const payload: JwtPayload = {
      sub: targetUser.id,
      username: targetUser.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: targetUser.personaId,
      impersonatedBy,
    };

    if (oldToken) {
      await this.sessionService.revokeSession(oldToken);
    }

    const accessToken = this.sessionService.generateAccessToken(payload, false);
    await this.sessionService.recordSession({
      userId: targetUser.id,
      token: accessToken,
      rememberMe: false,
      ipAddress,
      userAgent,
    });

    await this.auditService?.log({
      usuarioId: adminUser.id,
      accion: "iniciar_sesion",
      tabla: "usuarios",
      registroId: targetUser.id,
      valorNuevo: {
        vistaSimulada: true,
        usuarioSimulado: targetUser.nombreUsuario,
        rolSimulado: activeRole.nombre,
      },
      direccionIp: ipAddress,
    });

    return {
      message: `Vista simulada iniciada como ${targetUser.nombreUsuario} (${activeRole.nombre}).`,
      accessToken,
      user: userDto,
      modules,
    };
  }

  /**
   * Finaliza la vista simulada y restaura la sesión del Administrador o Soporte TI.
   */
  async stopImpersonate(
    currentUser: AuthenticatedUser,
    oldToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!currentUser.impersonatedBy) {
      throw new BadRequestException("La sesión actual no está en modo vista simulada.");
    }

    const adminInfo = currentUser.impersonatedBy;
    const adminUser = await this.authRepository.findUserById(adminInfo.userId);
    if (!adminUser) {
      throw new UnauthorizedException("La cuenta administradora original ya no existe.");
    }

    this.assertUserIsActive(adminUser);

    const { userDto, modules, activeRole } = await this.buildUserRole(adminUser, adminInfo.roleId);

    const payload: JwtPayload = {
      sub: adminUser.id,
      username: adminUser.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: adminUser.personaId,
    };

    if (oldToken) {
      await this.sessionService.revokeSession(oldToken);
    }

    const accessToken = this.sessionService.generateAccessToken(payload, false);
    await this.sessionService.recordSession({
      userId: adminUser.id,
      token: accessToken,
      rememberMe: false,
      ipAddress,
      userAgent,
    });

    await this.auditService?.log({
      usuarioId: adminUser.id,
      accion: "cerrar_sesion",
      tabla: "usuarios",
      registroId: currentUser.id,
      valorAnterior: {
        vistaSimulada: true,
        usuarioSimulado: currentUser.username,
        rolSimulado: currentUser.role,
      },
      direccionIp: ipAddress,
    });

    return {
      message: `Sesión restaurada como ${adminUser.nombreUsuario} (${activeRole.nombre}).`,
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
        await Promise.all([
          this.invalidarCacheUsuario(payload.sub),
          this.auditService?.log({
            usuarioId: payload.sub,
            accion: "cerrar_sesion",
            tabla: "usuarios",
            registroId: payload.sub,
            direccionIp: ipAddress,
          }),
        ]);
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
    const res = await this.authPasswordService.changePassword(userId, dto, currentToken);
    await this.invalidarCacheUsuario(userId);
    return res;
  }

  // --- MÉTODOS PRIVADOS / HELPERS COHESIVOS ---

  private async invalidarCacheUsuario(userId: string): Promise<void> {
    if (!this.cacheService) return;
    await Promise.all([
      this.cacheService.del(`auth:jwt:${userId}`),
      this.cacheService.delByPattern(`auth:contexto:${userId}:*`),
    ]);
  }

  private assertUserIsActive(user: Pick<UsuarioRecord, "estado">): void {
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

  private armarRespuestaDesdeContexto(contexto: ContextoSesionSqlResult): {
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  } {
    if (!contexto.activeRole) {
      throw new UnauthorizedException("La cuenta no tiene roles asignados.");
    }

    const {
      usuario,
      persona,
      institucion: inst,
      roles,
      activeRole,
      modules,
      menuRoutes,
    } = contexto;
    const userDto: CurrentUserDto = {
      id: usuario.id,
      username: usuario.nombreUsuario,
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
      mustChangePassword: usuario.debeCambiarContrasena,
      menuRoutes,
    };

    return {
      userDto,
      modules: modules.map((mod) => ({ ...mod, icon: mod.icon ?? undefined })),
      activeRole,
    };
  }

  private async buildUserRole(
    user: UsuarioRecord,
    requestedRoleId?: string,
  ): Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  }> {
    if (this.authRepository.obtenerContextoSesion) {
      const contexto = await this.authRepository.obtenerContextoSesion(user.id, requestedRoleId);
      if (contexto) {
        return this.armarRespuestaDesdeContexto(contexto);
      }
    }

    const [roles, persona, inst] = await Promise.all([
      this.resolveRoles(user),
      this.authRepository.findPersonaById(user.personaId),
      this.authRepository.findInstitution(),
    ]);
    const activeRole =
      roles.find((p) => p.rolId === requestedRoleId) ??
      roles.find((p) => p.esPrincipal) ??
      roles[0];
    if (!activeRole) {
      throw new UnauthorizedException("La cuenta no tiene roles asignados.");
    }

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
