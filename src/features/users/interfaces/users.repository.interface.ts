import { PaginatedUsersResponseDto, UserResponseDto } from "../dto/user-response.dto";
import { UserQueryDto } from "../dto/user-query.dto";

export interface CreateUserData {
  personaId: string;
  rolId: string;
  nombreUsuario: string;
  contrasenaHash: string;
}

export interface UpdateUserData {
  rolId?: string;
  nombreUsuario?: string;
  contrasenaHash?: string;
  estado?: "activo" | "bloqueado" | "inactivo";
  intentosFallidos?: number;
  debeCambiarContrasena?: boolean;
}

export interface IUsersRepository {
  findUserById(id: string): Promise<UserResponseDto | null>;
  findUserByPersonaId(personaId: string): Promise<UserResponseDto | null>;
  findUserByUsername(username: string): Promise<UserResponseDto | null>;
  create(data: CreateUserData): Promise<UserResponseDto>;
  update(id: string, data: UpdateUserData): Promise<UserResponseDto>;
  findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto>;
  closeAllUserSessions(userId: string): Promise<void>;
}
