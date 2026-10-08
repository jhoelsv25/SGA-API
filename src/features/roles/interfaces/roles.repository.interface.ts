import { RoleDetailResponseDto, RoleResponseDto } from "../dto/role-response.dto";

export interface CreateRoleData {
  nombre: string;
  descripcion?: string;
  esSistema?: boolean;
}

export interface UpdateRoleData {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface IRolesRepository {
  findAll(soloActivos?: boolean): Promise<RoleResponseDto[]>;
  findById(id: string): Promise<RoleDetailResponseDto | null>;
  findByName(name: string): Promise<RoleResponseDto | null>;
  create(data: CreateRoleData): Promise<RoleResponseDto>;
  update(id: string, data: UpdateRoleData): Promise<RoleResponseDto>;
  countAssignedUsers(rolId: string): Promise<number>;
  /** RF-002 V2: cuántos de los IDs son opciones de menú vigentes. */
  countMenusVigentes(menuIds: string[]): Promise<number>;
  /** RF-002 V2: reemplaza los menús del rol. */
  assignMenus(rolId: string, menuIds: string[], actorId: string): Promise<void>;
}
