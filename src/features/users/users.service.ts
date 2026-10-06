import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { AuditService } from "../../common/services/audit.service";
import { Database, DRIZZLE } from "../../core/database";
import { personas } from "../../core/database/schema";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { RolesRepository } from "../roles/repositories/roles.repository";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUsernameDto } from "./dto/update-username.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import {
  PaginatedUsersResponseDto,
  TempPasswordResetResponseDto,
  UserCreatedResponseDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { UsersRepository } from "./repositories/users.repository";
import { generateTemporaryPassword } from "./utils/password-generator.util";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersRepository.findUsers(query);
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    return user;
  }

  async create(dto: CreateUserDto, actorId: string, ip?: string): Promise<UserCreatedResponseDto> {
    // 1. Validar que la persona existe en el padrón
    const [persona] = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, dto.personaId), isNull(personas.eliminadoEn)))
      .limit(1);

    if (!persona) {
      throw new NotFoundException("La persona seleccionada no existe en el padrón.");
    }

    // 2. Validar que la persona no tenga ya una cuenta vigente
    const existingPersonaUser = await this.usersRepository.findUserByPersonaId(dto.personaId);
    if (existingPersonaUser) {
      throw new ConflictException("Esta persona ya tiene una cuenta en el sistema.");
    }

    // 3. Validar que el nombre de usuario no esté repetido
    const existingUsername = await this.usersRepository.findUserByUsername(dto.nombreUsuario);
    if (existingUsername) {
      throw new ConflictException("El nombre de usuario ya está en uso.");
    }

    // 4. Validar que el rol exista
    const role = await this.rolesRepository.findById(dto.rolId);
    if (!role || !role.activo) {
      throw new NotFoundException("El rol seleccionado no existe o no está activo.");
    }

    // 5. Generar contraseña temporal segura y su hash
    const tempPassword = generateTemporaryPassword(10);
    const contrasenaHash = await bcrypt.hash(tempPassword, 10);

    // 6. Crear la cuenta
    const user = await this.usersRepository.create({
      personaId: dto.personaId,
      rolId: dto.rolId,
      nombreUsuario: dto.nombreUsuario,
      contrasenaHash,
    });

    // 7. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: "crear",
      tabla: "usuarios",
      registroId: user.id,
      valorNuevo: {
        nombreUsuario: user.nombreUsuario,
        personaId: user.persona.id,
        rolId: user.rol.id,
        estado: user.estado,
      },
      direccionIp: ip,
    });

    return {
      usuario: user,
      tempPassword,
    };
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

    const user = await this.findUserById(id);

    const role = await this.rolesRepository.findById(dto.rolId);
    if (!role || !role.activo) {
      throw new NotFoundException("El rol seleccionado no existe o no está activo.");
    }

    const updated = await this.usersRepository.update(id, { rolId: dto.rolId });

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

  async unlock(id: string, actorId: string, ip?: string): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    const updated = await this.usersRepository.update(id, {
      estado: "activo",
      intentosFallidos: 0,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorAnterior: { estado: user.estado, intentosFallidos: user.intentosFallidos },
      valorNuevo: { estado: "activo", intentosFallidos: 0 },
      direccionIp: ip,
    });

    return updated;
  }

  async deactivate(
    id: string,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserResponseDto> {
    // Regla: No puede desactivar su propia cuenta
    if (actorUser.id === id) {
      throw new BadRequestException(
        "No puede desactivar su propia cuenta ni cambiar su propio rol.",
      );
    }

    const user = await this.findUserById(id);

    const updated = await this.usersRepository.update(id, { estado: "inactivo" });

    // Cierra todas sus sesiones abiertas
    await this.usersRepository.closeAllUserSessions(id);

    await this.auditService.log({
      usuarioId: actorUser.id,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorAnterior: { estado: user.estado },
      valorNuevo: { estado: "inactivo" },
      direccionIp: ip,
    });

    return updated;
  }

  async reactivate(id: string, actorId: string, ip?: string): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    const updated = await this.usersRepository.update(id, { estado: "activo" });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorAnterior: { estado: user.estado },
      valorNuevo: { estado: "activo" },
      direccionIp: ip,
    });

    return updated;
  }

  async resetPassword(
    id: string,
    actorId: string,
    ip?: string,
  ): Promise<TempPasswordResetResponseDto> {
    await this.findUserById(id);

    // Generar nueva contraseña temporal
    const tempPassword = generateTemporaryPassword(10);
    const newHash = await bcrypt.hash(tempPassword, 10);

    await this.usersRepository.update(id, {
      contrasenaHash: newHash,
      debeCambiarContrasena: true,
      intentosFallidos: 0,
    });

    // Cierra todas las sesiones abiertas
    await this.usersRepository.closeAllUserSessions(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorNuevo: { debeCambiarContrasena: true, claveRestablecida: true },
      direccionIp: ip,
    });

    return {
      message: "Contraseña restablecida exitosamente",
      tempPassword,
    };
  }

  async updateUsername(
    id: string,
    dto: UpdateUsernameDto,
    actorId: string,
    ip?: string,
  ): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    if (user.nombreUsuario.toLowerCase() !== dto.nombreUsuario.trim().toLowerCase()) {
      const existing = await this.usersRepository.findUserByUsername(dto.nombreUsuario);
      if (existing && existing.id !== id) {
        throw new ConflictException("El nombre de usuario ya está en uso.");
      }
    }

    const updated = await this.usersRepository.update(id, {
      nombreUsuario: dto.nombreUsuario.trim(),
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorAnterior: { nombreUsuario: user.nombreUsuario },
      valorNuevo: { nombreUsuario: updated.nombreUsuario },
      direccionIp: ip,
    });

    return updated;
  }
}
