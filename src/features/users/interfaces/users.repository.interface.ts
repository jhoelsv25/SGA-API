import { PaginatedUsersResponseDto, UserResponseDto } from "../dto/user-response.dto";
import { NuevaPersonaDto } from "../dto/create-user.dto";
import { UserQueryDto } from "../dto/user-query.dto";
import { UserRoleAssignmentDto } from "../dto/user-role.dto";

export interface PersonaBasica {
  id: string;
  numeroDocumento: string;
}

/**
 * RF-002 V3: registro único (persona → cargo → cuenta → roles) en una transacción.
 * Si `usuarioExistenteId` viene, solo se agregan el cargo y los roles que falten.
 */
export interface RegistrarCuentaData {
  personaId?: string;
  nuevaPersona?: NuevaPersonaDto;
  cargoId: string;
  /** El primero es el principal (solo si la cuenta es nueva). */
  rolIds: string[];
  usuarioExistenteId?: string;
  nombreUsuario?: string;
  contrasenaHash?: string;
  actorId: string;
}

export interface UpdateUserData {
  rolId?: string;
  nombreUsuario?: string;
  contrasenaHash?: string;
  estado?: "activo" | "bloqueado" | "inactivo";
  intentosFallidos?: number;
  debeCambiarContrasena?: boolean;
}

export interface UserCursorPayload {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  id: string;
}

export interface UserProcedureResultJson {
  data?: UserResponseDto[];
  hasMore?: boolean;
  nextCursorPaterno?: string | null;
  nextCursorMaterno?: string | null;
  nextCursorNombres?: string | null;
  nextCursorId?: string | null;
}

export interface DbUserProcedureExecutionResult {
  rows?: Array<{
    resultado?: UserProcedureResultJson;
  }>;
}

export interface IUsersRepository {
  findUserById(id: string): Promise<UserResponseDto | null>;
  findUserByPersonaId(personaId: string): Promise<UserResponseDto | null>;
  findUserByUsername(username: string): Promise<UserResponseDto | null>;
  update(id: string, data: UpdateUserData): Promise<UserResponseDto>;
  /**
   * RF-001 / RF-002 V2: deja `rolId` como rol principal vigente del usuario en
   * usuario_roles. El principal anterior (si es otro rol) queda con vigente false.
   */
  syncPrincipalRole(userId: string, rolId: string, actorId: string | null): Promise<void>;

  // RF-002 V3: registro único. El cargo es obligatorio (formal, no da accesos)
  findPersonaById(id: string): Promise<PersonaBasica | null>;
  findPersonaByDocumento(
    tipoDocumento: string,
    numeroDocumento: string,
  ): Promise<PersonaBasica | null>;
  existeCorreo(correo: string): Promise<boolean>;
  isCargoVigente(cargoId: string): Promise<boolean>;
  /** Roles activos sugeridos por el cargo (se usan si no se indican roles). */
  findRolesSugeridosActivos(cargoId: string): Promise<string[]>;
  /** Devuelve el id de la cuenta (creada o existente). */
  registrarCuenta(data: RegistrarCuentaData): Promise<string>;

  // RF-002 V2 (HU1): varios roles por cuenta
  findRoles(userId: string, includeRetired: boolean): Promise<UserRoleAssignmentDto[]>;
  addRole(userId: string, rolId: string, actorId: string): Promise<void>;
  /** Marca el rol como principal y sincroniza usuarios.rol_id. */
  setPrincipalRole(userId: string, rolId: string): Promise<void>;
  /** Retira el rol (vigente false) dejando historial de quién y cuándo. */
  retireRole(userId: string, rolId: string, actorId: string): Promise<void>;
  findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto>;
  findEligiblePersonas(
    search?: string,
  ): Promise<import("../dto/user-response.dto").UserPersonaDto[]>;
  closeAllUserSessions(userId: string): Promise<void>;
}
