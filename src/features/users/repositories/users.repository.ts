import { Inject, Injectable } from "@nestjs/common";
import { and, eq, exists, or } from "drizzle-orm";
import { Database, DRIZZLE } from "../../../core/database";
import { personas, roles, usuarioRoles, usuarios } from "../../../core/database/schema";
import {
  PaginatedUsersResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "../dto/user-response.dto";
import { UserQueryDto } from "../dto/user-query.dto";
import { UserRoleAssignmentDto } from "../dto/user-role.dto";
import { TipoFichaDeRol } from "../constants";
import {
  IUsersRepository,
  PersonaBasica,
  RegistrarCuentaData,
  UpdateUserData,
} from "../interfaces/users.repository.interface";
import type { UsersRepositoryDeps, UsersRepositoryCalls } from "./users/deps";
import * as parte1 from "./users/map-user-result";
import * as parte2 from "./users/find-tipos-ficha-vigente";

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private dependencias(): UsersRepositoryDeps {
    return {
      db: this.db,
    };
  }

  private llamadas(): UsersRepositoryCalls {
    return {
      mapUserResult: (row) => this.mapUserResult(row),
      findUserById: (id) => this.findUserById(id),
    };
  }

  private mapUserResult(row: {
    usuario: typeof usuarios.$inferSelect;
    persona: typeof personas.$inferSelect;
    rol: typeof roles.$inferSelect;
  }): UserResponseDto {
    return parte1.mapUserResult(row);
  }

  async findUserById(id: string): Promise<UserResponseDto | null> {
    return parte1.findUserById(this.dependencias(), this.llamadas(), id);
  }

  async findUserByPersonaId(personaId: string): Promise<UserResponseDto | null> {
    return parte1.findUserByPersonaId(this.dependencias(), this.llamadas(), personaId);
  }

  async findUserByUsername(username: string): Promise<UserResponseDto | null> {
    return parte1.findUserByUsername(this.dependencias(), this.llamadas(), username);
  }

  async findPersonaById(id: string): Promise<PersonaBasica | null> {
    return parte1.findPersonaById(this.dependencias(), id);
  }

  async findPersonaByDocumento(
    tipoDocumento: string,
    numeroDocumento: string,
  ): Promise<PersonaBasica | null> {
    return parte1.findPersonaByDocumento(this.dependencias(), tipoDocumento, numeroDocumento);
  }

  async existeCorreo(correo: string): Promise<boolean> {
    return parte1.existeCorreo(this.dependencias(), correo);
  }

  async isCargoVigente(cargoId: string): Promise<boolean> {
    return parte1.isCargoVigente(this.dependencias(), cargoId);
  }

  async findRolesSugeridosActivos(cargoId: string): Promise<string[]> {
    return parte1.findRolesSugeridosActivos(this.dependencias(), cargoId);
  }

  async registrarCuenta(data: RegistrarCuentaData): Promise<string> {
    return parte1.registrarCuenta(this.dependencias(), data);
  }

  async syncPrincipalRole(userId: string, rolId: string, actorId: string | null): Promise<void> {
    return parte1.syncPrincipalRole(this.dependencias(), userId, rolId, actorId);
  }

  async findTiposFichaVigente(personaId: string): Promise<TipoFichaDeRol[]> {
    return parte2.findTiposFichaVigente(this.dependencias(), personaId);
  }

  async findRoles(userId: string, includeRetired: boolean): Promise<UserRoleAssignmentDto[]> {
    return parte2.findRoles(this.dependencias(), userId, includeRetired);
  }

  async addRole(userId: string, rolId: string, actorId: string): Promise<void> {
    return parte2.addRole(this.dependencias(), userId, rolId, actorId);
  }

  async setPrincipalRole(userId: string, rolId: string): Promise<void> {
    return parte2.setPrincipalRole(this.dependencias(), userId, rolId);
  }

  async retireRole(userId: string, rolId: string, actorId: string): Promise<void> {
    return parte2.retireRole(this.dependencias(), userId, rolId, actorId);
  }

  async update(id: string, data: UpdateUserData): Promise<UserResponseDto> {
    return parte2.update(this.dependencias(), this.llamadas(), id, data);
  }

  async findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    return parte2.findUsers(this.dependencias(), query);
  }

  async findEligiblePersonas(search?: string): Promise<UserPersonaDto[]> {
    return parte2.findEligiblePersonas(this.dependencias(), search);
  }

  /** Tiene el rol Administrador, como principal o adicional vigente. */
  async esAdministrador(userId: string): Promise<boolean> {
    const filas = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(
        roles,
        or(
          eq(roles.id, usuarios.rolId),
          exists(
            this.db
              .select({ id: usuarioRoles.id })
              .from(usuarioRoles)
              .where(
                and(
                  eq(usuarioRoles.usuarioId, usuarios.id),
                  eq(usuarioRoles.rolId, roles.id),
                  eq(usuarioRoles.vigente, true),
                ),
              ),
          ),
        ),
      )
      .where(and(eq(usuarios.id, userId), eq(roles.nombre, "Administrador")))
      .limit(1);
    return filas.length > 0;
  }

  async closeAllUserSessions(userId: string): Promise<void> {
    return parte2.closeAllUserSessions(this.dependencias(), userId);
  }
}
