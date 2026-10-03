import { personas, roles, usuarios } from "../../../core/database/schema";
import { AuthModuleDto } from "../dto/auth-response.dto";

export type UsuarioRecord = typeof usuarios.$inferSelect;
export type PersonaRecord = typeof personas.$inferSelect;
export type RolRecord = typeof roles.$inferSelect;

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

export interface IAuthRepository {
  findUserByUsername(username: string): Promise<UsuarioRecord | null>;
  findUserById(id: string): Promise<UsuarioRecord | null>;
  findUserWithPersonaByUsername(username: string): Promise<UserWithPersonaBirthdate | null>;
  findPersonaById(personaId: string): Promise<PersonaRecord | null>;
  findRoleById(rolId: string): Promise<RolRecord | null>;
  findInstitution(): Promise<InstitutionSummary | null>;
  updateLoginAttempts(userId: string, attempts: number, blockAccount: boolean): Promise<void>;
  resetLoginAttempts(userId: string): Promise<void>;
  createSession(data: SessionData): Promise<void>;
  closeSession(tokenHash: string): Promise<void>;
  closeOtherSessions(userId: string, currentTokenHash: string): Promise<void>;
  updatePassword(userId: string, newHash: string): Promise<void>;
  getUserModules(rolId: string, esSistema: boolean): Promise<AuthModuleDto[]>;
}
