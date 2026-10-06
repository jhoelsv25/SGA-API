import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { esRolDelSistema } from "./constants/roles.constants";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import {
  PermissionCatalogItemDto,
  RoleDetailResponseDto,
  RoleResponseDto,
} from "./dto/role-response.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesRepository } from "./repositories/roles.repository";

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(soloActivos?: boolean): Promise<RoleResponseDto[]> {
    return this.rolesRepository.findAll(soloActivos);
  }

  async findById(id: string): Promise<RoleDetailResponseDto> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException("Rol no encontrado.");
    }
    return role;
  }

  async create(dto: CreateRoleDto, actorId: string, ip?: string): Promise<RoleResponseDto> {
    const existing = await this.rolesRepository.findByName(dto.nombre);
    if (existing) {
      throw new ConflictException("Ya existe un rol con ese nombre.");
    }

    const created = await this.rolesRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      esSistema: false,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "roles",
      registroId: created.id,
      valorNuevo: { nombre: created.nombre, descripcion: created.descripcion },
      direccionIp: ip,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorId: string,
    ip?: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException("Rol no encontrado.");
    }

    // Regla: Roles del sistema no se pueden renombrar
    if (role.esSistema || esRolDelSistema(role.nombre)) {
      if (dto.nombre && dto.nombre.trim().toLowerCase() !== role.nombre.toLowerCase()) {
        throw new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar.");
      }
    }

    // Regla: Nombre de rol único
    if (dto.nombre && dto.nombre.trim().toLowerCase() !== role.nombre.toLowerCase()) {
      const existing = await this.rolesRepository.findByName(dto.nombre);
      if (existing && existing.id !== id) {
        throw new ConflictException("Ya existe un rol con ese nombre.");
      }
    }

    // Regla: Desactivar un rol con cuentas asignadas está prohibido
    if (dto.activo === false && role.activo === true) {
      if (role.esSistema || esRolDelSistema(role.nombre)) {
        throw new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar.");
      }

      const assignedUsers = await this.rolesRepository.countAssignedUsers(id);
      if (assignedUsers > 0) {
        throw new BadRequestException("No se puede desactivar un rol que tiene cuentas asignadas.");
      }
    }

    const updated = await this.rolesRepository.update(id, dto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "roles",
      registroId: updated.id,
      valorAnterior: {
        nombre: role.nombre,
        descripcion: role.descripcion,
        activo: role.activo,
      },
      valorNuevo: {
        nombre: updated.nombre,
        descripcion: updated.descripcion,
        activo: updated.activo,
      },
      direccionIp: ip,
    });

    return updated;
  }

  async delete(id: string, actorId: string, ip?: string): Promise<{ message: string }> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException("Rol no encontrado.");
    }

    if (role.esSistema || esRolDelSistema(role.nombre)) {
      throw new BadRequestException("Los roles del sistema no se pueden eliminar ni renombrar.");
    }

    const assignedUsers = await this.rolesRepository.countAssignedUsers(id);
    if (assignedUsers > 0) {
      throw new BadRequestException("No se puede desactivar un rol que tiene cuentas asignadas.");
    }

    // Desactivamos el rol
    await this.rolesRepository.update(id, { activo: false });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "roles",
      registroId: id,
      valorAnterior: { activo: role.activo },
      valorNuevo: { activo: false },
      direccionIp: ip,
    });

    return { message: "Rol desactivado exitosamente" };
  }

  async getPermissionsCatalog(): Promise<PermissionCatalogItemDto[]> {
    return this.rolesRepository.getAllPermissions();
  }

  async assignPermissions(
    rolId: string,
    dto: AssignPermissionsDto,
    actorId: string,
    ip?: string,
  ): Promise<{ message: string; count: number }> {
    const role = await this.rolesRepository.findById(rolId);
    if (!role) {
      throw new NotFoundException("Rol no encontrado.");
    }

    if (role.nombre === "Administrador") {
      throw new BadRequestException("No se pueden modificar los permisos del rol Administrador.");
    }

    await this.rolesRepository.assignPermissions(rolId, dto.permisoIds);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "rol_permisos",
      registroId: rolId,
      valorNuevo: { permisosCount: dto.permisoIds.length },
      direccionIp: ip,
    });

    return {
      message: "Permisos asignados exitosamente al rol",
      count: dto.permisoIds.length,
    };
  }
}
