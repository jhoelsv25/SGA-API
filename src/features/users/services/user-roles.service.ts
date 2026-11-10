import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../../common/services/audit.service";
import type { AuthenticatedUser } from "../../auth/interfaces/jwt-payload.interface";
import { RolesRepository } from "../../roles/repositories/roles.repository";
import { ROLES_CON_FICHA, USER_ROLE_MESSAGES } from "../constants";
import { AddUserRoleDto, UserRoleAssignmentDto } from "../dto/user-role.dto";
import { ChangeUserRoleDto } from "../dto/change-user-role.dto";
import { UserResponseDto } from "../dto/user-response.dto";
import { UsersRepository } from "../repositories/users.repository";

@Injectable()
export class UserRolesService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  private async assertUserExists(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    return user;
  }

  /** RF-002 V4: rechaza los roles que dependen de una ficha que la persona no tiene vigente. */
  async exigirFichaParaRoles(personaId: string | undefined, rolIds: string[]): Promise<void> {
    const rolesPedidos = await Promise.all(rolIds.map((id) => this.rolesRepository.findById(id)));
    const conFicha = rolesPedidos.flatMap((rol) => {
      const ficha = rol ? ROLES_CON_FICHA.get(rol.nombre) : undefined;
      return rol && ficha ? [{ nombre: rol.nombre, ...ficha }] : [];
    });
    if (conFicha.length === 0) return;

    const vigentes = personaId ? await this.usersRepository.findTiposFichaVigente(personaId) : [];
    const faltante = conFicha.find((rol) => !vigentes.includes(rol.tipo));
    if (faltante) {
      throw new ConflictException(
        USER_ROLE_MESSAGES.ROL_REQUIERE_FICHA(faltante.nombre, faltante.opcion),
      );
    }
  }

  /** RF-002 V4: mientras la ficha siga vigente, su rol no se puede retirar. */
  private async exigirSinFichaVigente(personaId: string, rolNombre: string): Promise<void> {
    const ficha = ROLES_CON_FICHA.get(rolNombre);
    if (!ficha) return;

    const vigentes = await this.usersRepository.findTiposFichaVigente(personaId);
    if (vigentes.includes(ficha.tipo)) {
      throw new ConflictException(USER_ROLE_MESSAGES.RETIRO_CON_FICHA(rolNombre, ficha.opcion));
    }
  }

  async changeRole(
    id: string,
    dto: ChangeUserRoleDto,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserResponseDto> {
    // Regla: No puede cambiarse el rol a sí mismo
    if (actorUser.id === id) {
      throw new BadRequestException(
        "No puede desactivar su propia cuenta ni cambiar su propio rol.",
      );
    }

    const user = await this.assertUserExists(id);

    const role = await this.rolesRepository.findById(dto.rolId);
    if (!role || !role.activo) {
      throw new NotFoundException("El rol seleccionado no existe o no está activo.");
    }

    await this.exigirFichaParaRoles(user.persona.id, [dto.rolId]);
    // El cambio retira el rol principal anterior
    if (user.rol.id !== dto.rolId) {
      await this.exigirSinFichaVigente(user.persona.id, user.rol.nombre);
    }

    const updated = await this.usersRepository.update(id, { rolId: dto.rolId });
    // RF-001 V2: el rol principal en usuario_roles sigue a usuarios.rol_id
    await this.usersRepository.syncPrincipalRole(id, dto.rolId, actorUser.id);

    await this.auditService.log({
      usuarioId: actorUser.id,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorAnterior: { rolId: user.rol.id, rolNombre: user.rol.nombre },
      valorNuevo: { rolId: role.id, rolNombre: role.nombre },
      direccionIp: ip,
    });

    return updated;
  }

  // ── RF-002 V2 (HU1): varios roles por cuenta ──────────────────────────

  async listRoles(id: string, includeRetired = false): Promise<UserRoleAssignmentDto[]> {
    await this.assertUserExists(id);
    return this.usersRepository.findRoles(id, includeRetired);
  }

  async addRole(
    id: string,
    dto: AddUserRoleDto,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    const user = await this.assertUserExists(id);

    const role = await this.rolesRepository.findById(dto.rolId);
    if (!role || !role.activo) {
      throw new NotFoundException(USER_ROLE_MESSAGES.ROLE_NOT_FOUND);
    }

    const vigentes = await this.usersRepository.findRoles(id, false);
    if (vigentes.some((p) => p.rolId === dto.rolId)) {
      throw new ConflictException(USER_ROLE_MESSAGES.ALREADY_ASSIGNED);
    }

    await this.exigirFichaParaRoles(user.persona.id, [dto.rolId]);

    await this.usersRepository.addRole(id, dto.rolId, actorUser.id);

    await this.auditService.log({
      usuarioId: actorUser.id,
      accion: "crear",
      tabla: "usuario_roles",
      registroId: id,
      valorNuevo: { rolId: role.id, rolNombre: role.nombre, esPrincipal: false },
      direccionIp: ip,
    });

    return this.usersRepository.findRoles(id, false);
  }

  async setPrincipalRole(
    id: string,
    rolId: string,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    await this.assertUserExists(id);

    const vigentes = await this.usersRepository.findRoles(id, false);
    const target = vigentes.find((p) => p.rolId === rolId);
    if (!target) {
      throw new NotFoundException(USER_ROLE_MESSAGES.NOT_ASSIGNED);
    }

    const anterior = vigentes.find((p) => p.esPrincipal);
    if (!target.esPrincipal) {
      await this.usersRepository.setPrincipalRole(id, rolId);

      await this.auditService.log({
        usuarioId: actorUser.id,
        accion: "actualizar",
        tabla: "usuario_roles",
        registroId: id,
        valorAnterior: { rolPrincipal: anterior?.rolNombre ?? null },
        valorNuevo: { rolPrincipal: target.rolNombre },
        direccionIp: ip,
      });
    }

    return this.usersRepository.findRoles(id, false);
  }

  async retireRole(
    id: string,
    rolId: string,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    const user = await this.assertUserExists(id);

    const vigentes = await this.usersRepository.findRoles(id, false);
    const target = vigentes.find((p) => p.rolId === rolId);
    if (!target) {
      throw new NotFoundException(USER_ROLE_MESSAGES.NOT_ASSIGNED);
    }
    if (actorUser.id === id && target.rolNombre === "Administrador") {
      throw new BadRequestException(USER_ROLE_MESSAGES.SELF_ADMIN);
    }
    if (vigentes.length === 1) {
      throw new BadRequestException(USER_ROLE_MESSAGES.LAST_ROLE);
    }
    if (target.esPrincipal) {
      throw new BadRequestException(USER_ROLE_MESSAGES.RETIRE_PRINCIPAL);
    }

    await this.exigirSinFichaVigente(user.persona.id, target.rolNombre);

    await this.usersRepository.retireRole(id, rolId, actorUser.id);

    await this.auditService.log({
      usuarioId: actorUser.id,
      accion: "actualizar",
      tabla: "usuario_roles",
      registroId: id,
      valorAnterior: { rolId, rolNombre: target.rolNombre, vigente: true },
      valorNuevo: { rolId, rolNombre: target.rolNombre, vigente: false },
      direccionIp: ip,
    });

    return this.usersRepository.findRoles(id, false);
  }
}
