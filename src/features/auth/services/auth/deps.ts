import { AuditService } from "../../../../common/services/audit.service";
import { CacheService } from "../../../../core/cache/cache.service";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "../../dto/auth-response.dto";
import type {
  ContextoSesionSqlResult,
  UsuarioRolRecord,
  UsuarioRecord,
} from "../../interfaces/auth-repository.interface";
import { AuthRepository } from "../../repositories/auth.repository";
import { AuthPasswordService, SessionService } from "../../services";
import { NotificacionesService } from "../../../notificaciones/notificaciones.service";
import { VariablesSistemaService } from "../../../variables-sistema/variables-sistema.service";

export type AuthServiceDeps = {
  authRepository: AuthRepository;
  sessionService: SessionService;
  authPasswordService: AuthPasswordService;
  auditService: AuditService | undefined;
  notificacionesService: NotificacionesService | undefined;
  variablesService: VariablesSistemaService | undefined;
  cacheService: CacheService | undefined;
};

export type AuthServiceCalls = {
  resolverRespuestaCheckToken: (userId: string, activeRoleId?: string) => Promise<AuthResponseDto>;
  invalidarCacheUsuario: (userId: string) => Promise<void>;
  assertUserIsActive: (user: Pick<UsuarioRecord, "estado">) => void;
  resolveRoles: (user: UsuarioRecord) => Promise<UsuarioRolRecord[]>;
  armarRespuestaDesdeContexto: (contexto: ContextoSesionSqlResult) => {
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  };
  buildUserRole: (
    user: UsuarioRecord,
    requestedRoleId?: string,
  ) => Promise<{
    userDto: CurrentUserDto;
    modules: AuthModuleDto[];
    activeRole: UsuarioRolRecord;
  }>;
  despacharAlertaNuevoDispositivo: (userId: string, ipAddress: string) => Promise<void>;
};
