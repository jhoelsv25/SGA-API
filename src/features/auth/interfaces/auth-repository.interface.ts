import { personas, roles, usuarios } from "../../../core/database/schema";
import { AuthModuleDto } from "../dto/auth-response.dto";

export type UsuarioRecord = typeof usuarios.$inferSelect;
export type PersonaRecord = typeof personas.$inferSelect;
export type RolRecord = typeof roles.$inferSelect;

/** Rol vigente de un usuario. */
export interface UsuarioRolRecord {
  rolId: string;
  nombre: string;
  esSistema: boolean;
  esPrincipal: boolean;
}

export interface SessionData {
  usuarioId: string;
  tokenHash: string;
  direccionIp?: string | null;
  navegador?: string | null;
  expiraEn: string;
}

export interface UserWithPersonaBirthdate {
  id: string;
  nombreUsuario: string;
  fechaNacimiento: string | null;
}

export interface InstitutionSummary {
  id: string;
  nombre: string;
}

export type UsuarioJwtRecord = Pick<
  UsuarioRecord,
  | "id"
  | "nombreUsuario"
  | "personaId"
  | "rolId"
  | "estado"
  | "debeCambiarContrasena"
  | "eliminadoEn"
>;

export interface ValidacionJwtSqlResult {
  sesionCerrada: boolean;
  usuario: UsuarioJwtRecord | null;
  roles: UsuarioRolRecord[];
}

export interface ContextoSesionSqlResult {
  usuario: Omit<UsuarioJwtRecord, "eliminadoEn">;
  persona: Pick<
    PersonaRecord,
    "nombres" | "apellidoPaterno" | "apellidoMaterno" | "correo" | "fotoUrl"
  > | null;
  institucion: InstitutionSummary | null;
  roles: UsuarioRolRecord[];
  activeRole: UsuarioRolRecord | null;
  modules: AuthModuleDto[];
  menuRoutes: string[];
}

export interface IAuthRepository {
  findUserByUsername(username: string): Promise<UsuarioRecord | null>;
  findUserById(id: string): Promise<UsuarioRecord | null>;
  findUserWithPersonaByUsername(username: string): Promise<UserWithPersonaBirthdate | null>;
  findPersonaById(personaId: string): Promise<PersonaRecord | null>;
  findRoleById(rolId: string): Promise<RolRecord | null>;
  findUserRoles(userId: string): Promise<UsuarioRolRecord[]>;
  findInstitution(): Promise<InstitutionSummary | null>;
  validarJwtUsuario?(usuarioId: string, tokenHash: string | null): Promise<ValidacionJwtSqlResult>;
  obtenerContextoSesion?(
    usuarioId: string,
    rolId?: string,
  ): Promise<ContextoSesionSqlResult | null>;
  updateLoginAttempts(userId: string, attempts: number, blockAccount: boolean): Promise<void>;
  resetLoginAttempts(userId: string): Promise<void>;
  createSession(data: SessionData): Promise<void>;
  closeSession(tokenHash: string): Promise<void>;
  /** true si la sesión de ese token existe y ya fue cerrada (logout o revocación). */
  isSessionClosed(tokenHash: string): Promise<boolean>;
  closeOtherSessions(userId: string, currentTokenHash: string): Promise<void>;
  hasPreviousSessionFromIp?(userId: string, ipAddress: string): Promise<boolean>;
  updatePassword(userId: string, newHash: string): Promise<void>;
  getUserModules(rolId: string, esSistema: boolean): Promise<AuthModuleDto[]>;
  getMenuRoutes(rolId: string, esSistema: boolean): Promise<string[]>;
}
