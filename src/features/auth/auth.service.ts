import { Injectable, Logger, Optional } from "@nestjs/common";
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
import type { AuthenticatedUser, ImpersonatorInfo } from "./interfaces/jwt-payload.interface";
import { AuthRepository } from "./repositories/auth.repository";
import { AuthPasswordService, SessionService } from "./services";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../variables-sistema/variables-sistema.service";
import type { AuthServiceDeps, AuthServiceCalls } from "./services/auth/deps";
import * as parte1 from "./services/auth/login";
import * as parte2 from "./services/auth/impersonate";
import * as parte3 from "./services/auth/despachar-alerta-nuevo-dispositivo";

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

  private dependencias(): AuthServiceDeps {
    return {
      authRepository: this.authRepository,
      sessionService: this.sessionService,
      authPasswordService: this.authPasswordService,
      auditService: this.auditService,
      notificacionesService: this.notificacionesService,
      variablesService: this.variablesService,
      cacheService: this.cacheService,
    };
  }

  private llamadas(): AuthServiceCalls {
    return {
      resolverRespuestaCheckToken: (userId, activeRoleId) =>
        this.resolverRespuestaCheckToken(userId, activeRoleId),
      invalidarCacheUsuario: (userId) => this.invalidarCacheUsuario(userId),
      assertUserIsActive: (user) => this.assertUserIsActive(user),
      resolveRoles: (user) => this.resolveRoles(user),
      armarRespuestaDesdeContexto: (contexto) => this.armarRespuestaDesdeContexto(contexto),
      buildUserRole: (user, requestedRoleId) => this.buildUserRole(user, requestedRoleId),
      despacharAlertaNuevoDispositivo: (userId, ipAddress) =>
        this.despacharAlertaNuevoDispositivo(userId, ipAddress),
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    return parte1.login(this.dependencias(), this.llamadas(), dto, ipAddress, userAgent);
  }

  async checkToken(
    userId: string,
    activeRoleId?: string,
    impersonatedBy?: ImpersonatorInfo,
  ): Promise<AuthResponseDto> {
    return parte1.checkToken(
      this.dependencias(),
      this.llamadas(),
      userId,
      activeRoleId,
      impersonatedBy,
    );
  }

  private async resolverRespuestaCheckToken(
    userId: string,
    activeRoleId?: string,
  ): Promise<AuthResponseDto> {
    return parte1.resolverRespuestaCheckToken(
      this.dependencias(),
      this.llamadas(),
      userId,
      activeRoleId,
    );
  }

  async refreshToken(
    oldToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    return parte1.refreshToken(
      this.dependencias(),
      this.llamadas(),
      oldToken,
      ipAddress,
      userAgent,
    );
  }

  async switchRole(
    userId: string,
    dto: SwitchRoleDto,
    session: { rolPendiente?: boolean; recordar?: boolean },
    oldToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    return parte1.switchRole(
      this.dependencias(),
      this.llamadas(),
      userId,
      dto,
      session,
      oldToken,
      ipAddress,
      userAgent,
    );
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
    return parte2.impersonate(
      this.dependencias(),
      this.llamadas(),
      adminUser,
      dto,
      oldToken,
      ipAddress,
      userAgent,
    );
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
    return parte2.stopImpersonate(
      this.dependencias(),
      this.llamadas(),
      currentUser,
      oldToken,
      ipAddress,
      userAgent,
    );
  }

  async logout(token?: string, ipAddress?: string): Promise<void> {
    return parte2.logout(this.dependencias(), this.llamadas(), token, ipAddress);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    return parte2.forgotPassword(this.dependencias(), dto);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentToken?: string,
  ): Promise<{ message: string }> {
    return parte2.changePassword(this.dependencias(), this.llamadas(), userId, dto, currentToken);
  }

  // --- MÉTODOS PRIVADOS / HELPERS COHESIVOS ---
  private async invalidarCacheUsuario(userId: string): Promise<void> {
    return parte2.invalidarCacheUsuario(this.dependencias(), userId);
  }

  private assertUserIsActive(user: Pick<UsuarioRecord, "estado">): void {
    return parte2.assertUserIsActive(user);
  }

  private async resolveRoles(user: UsuarioRecord): Promise<UsuarioRolRecord[]> {
    return parte2.resolveRoles(this.dependencias(), user);
  }

  private armarRespuestaDesdeContexto(contexto: ContextoSesionSqlResult): {
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  } {
    return parte2.armarRespuestaDesdeContexto(contexto);
  }

  private async buildUserRole(
    user: UsuarioRecord,
    requestedRoleId?: string,
  ): Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  }> {
    return parte2.buildUserRole(this.dependencias(), this.llamadas(), user, requestedRoleId);
  }

  /**
   * Envía una notificación si el switch 'notificacion.alerta_nuevo_dispositivo'
   * está habilitado en la base de datos (RF-001 / RF-004).
   */
  private async despacharAlertaNuevoDispositivo(userId: string, ipAddress: string): Promise<void> {
    return parte3.despacharAlertaNuevoDispositivo(this.dependencias(), userId, ipAddress);
  }
}
