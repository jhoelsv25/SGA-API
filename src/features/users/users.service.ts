import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditService } from "../../common/services/audit.service";
import { hashPassword } from "../../common/utils";
import {
  DEFAULT_LONGITUD_CONTRASENA,
  PASSWORD_LETRAS_Y_NUMEROS,
  VAR_LONGITUD_CONTRASENA,
} from "../auth/constants";
import type { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { VariablesSistemaRepository } from "../variables-sistema/repositories";
import { RolesRepository } from "../roles/repositories/roles.repository";
import { TEMP_PASSWORD_LENGTH, USER_ROLE_MESSAGES } from "./constants";
import { AddUserRoleDto, UserRoleAssignmentDto } from "./dto/user-role.dto";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUsernameDto } from "./dto/update-username.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import {
  PaginatedUsersResponseDto,
  TempPasswordResetResponseDto,
  UserCreatedResponseDto,
  UserPersonaDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { UsersRepository } from "./repositories/users.repository";
import { UserRolesService } from "./services";
import { generateTemporaryPassword } from "./utils/password-generator.util";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly auditService: AuditService,
    private readonly userRolesService: UserRolesService,
    @Optional() private readonly variablesRepository?: VariablesSistemaRepository,
  ) {}

  async findUsers(query: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersRepository.findUsers(query);
  }

  async findEligiblePersonas(search?: string): Promise<UserPersonaDto[]> {
    return this.usersRepository.findEligiblePersonas(search);
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    return user;
  }

  /**
   * RF-002 V3: registro único. Persona (del padrón o nueva) → cargo → cuenta → roles,
   * en una sola transacción. Si la persona ya tiene cuenta, solo se le agregan el
   * cargo y los roles que le falten (no se crea otra cuenta).
   */
  async create(dto: CreateUserDto, actorId: string, ip?: string): Promise<UserCreatedResponseDto> {
    // 1. Persona: se indica una del padrón o una nueva, no ambas
    if (Boolean(dto.personaId) === Boolean(dto.persona)) {
      throw new BadRequestException(USER_ROLE_MESSAGES.PERSONA_REQUIRED);
    }

    let personaId = dto.personaId;
    let numeroDocumento: string;
    if (dto.personaId) {
      const persona = await this.usersRepository.findPersonaById(dto.personaId);
      if (!persona) {
        throw new NotFoundException("La persona seleccionada no existe en el padrón.");
      }
      numeroDocumento = persona.numeroDocumento;
    } else {
      const nueva = dto.persona!;
      // Padrón único: si el documento ya existe, se reutiliza la persona
      const existente = await this.usersRepository.findPersonaByDocumento(
        nueva.tipoDocumento,
        nueva.numeroDocumento,
      );
      if (existente) {
        personaId = existente.id;
      } else if (nueva.correo && (await this.usersRepository.existeCorreo(nueva.correo))) {
        throw new ConflictException(USER_ROLE_MESSAGES.CORREO_REPETIDO);
      }
      numeroDocumento = nueva.numeroDocumento.trim();
    }

    // 2. Cargo obligatorio (formal; los accesos los dan los roles)
    if (!(await this.usersRepository.isCargoVigente(dto.cargoId))) {
      throw new NotFoundException(USER_ROLE_MESSAGES.CARGO_NOT_FOUND);
    }

    // 3. Roles: los indicados o, si no se indican, los sugeridos por el cargo
    let rolIds = dto.rolIds ?? [];
    if (rolIds.length > 0) {
      for (const rolId of rolIds) {
        const role = await this.rolesRepository.findById(rolId);
        if (!role || !role.activo) {
          throw new NotFoundException(USER_ROLE_MESSAGES.ROLE_NOT_FOUND);
        }
      }
    } else {
      rolIds = await this.usersRepository.findRolesSugeridosActivos(dto.cargoId);
      if (rolIds.length === 0) {
        throw new BadRequestException(USER_ROLE_MESSAGES.CARGO_SIN_ROLES);
      }
    }

    // RF-002 V4: Docente, Estudiante y Apoderado exigen su ficha vigente
    await this.userRolesService.exigirFichaParaRoles(personaId, rolIds);

    // 4. Cuenta: si la persona ya tiene una, se reutiliza
    const cuentaExistente = personaId
      ? await this.usersRepository.findUserByPersonaId(personaId)
      : null;

    let tempPassword: string | null = null;
    let contrasenaHash: string | undefined;
    const nombreUsuario = (dto.nombreUsuario ?? numeroDocumento).trim();

    if (!cuentaExistente) {
      const existingUsername = await this.usersRepository.findUserByUsername(nombreUsuario);
      if (existingUsername) {
        throw new ConflictException("El nombre de usuario ya está en uso.");
      }
      tempPassword = generateTemporaryPassword(TEMP_PASSWORD_LENGTH);
      contrasenaHash = await hashPassword(tempPassword);
    }

    // 5. Registro único en una transacción
    const usuarioId = await this.usersRepository.registrarCuenta({
      personaId,
      nuevaPersona: personaId ? undefined : dto.persona,
      cargoId: dto.cargoId,
      rolIds,
      usuarioExistenteId: cuentaExistente?.id,
      nombreUsuario,
      contrasenaHash,
      actorId,
    });

    const user = (await this.usersRepository.findUserById(usuarioId))!;

    // 6. Auditoría
    await this.auditService.log({
      usuarioId: actorId,
      accion: cuentaExistente ? "actualizar" : "crear",
      tabla: "usuarios",
      registroId: user.id,
      valorNuevo: {
        nombreUsuario: user.nombreUsuario,
        personaId: user.persona.id,
        cargoId: dto.cargoId,
        rolIds,
        estado: user.estado,
      },
      direccionIp: ip,
    });

    return {
      usuario: user,
      tempPassword,
      cuentaExistente: Boolean(cuentaExistente),
    };
  }

  // ── Delegaciones a UserRolesService (RF-002 V2) ──

  async changeRole(
    id: string,
    dto: ChangeUserRoleDto,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserResponseDto> {
    return this.userRolesService.changeRole(id, dto, actorUser, ip);
  }

  async listRoles(id: string, includeRetired = false): Promise<UserRoleAssignmentDto[]> {
    return this.userRolesService.listRoles(id, includeRetired);
  }

  async addRole(
    id: string,
    dto: AddUserRoleDto,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.userRolesService.addRole(id, dto, actorUser, ip);
  }

  async setPrincipalRole(
    id: string,
    rolId: string,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.userRolesService.setPrincipalRole(id, rolId, actorUser, ip);
  }

  async retireRole(
    id: string,
    rolId: string,
    actorUser: AuthenticatedUser,
    ip?: string,
  ): Promise<UserRoleAssignmentDto[]> {
    return this.userRolesService.retireRole(id, rolId, actorUser, ip);
  }

  // ── Gestión del estado y credenciales de la cuenta ──

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
    dto: ResetPasswordDto = {},
    actorEsAdministrador = false,
  ): Promise<TempPasswordResetResponseDto> {
    await this.findUserById(id);
    // RF-007 V7: Soporte TI restablece cualquier cuenta, menos las de un Administrador
    if (!actorEsAdministrador && (await this.usersRepository.esAdministrador(id))) {
      throw new ForbiddenException(
        "Solo un Administrador puede cambiar la contraseña de un Administrador.",
      );
    }

    // Contraseña escrita por el administrador (validada con la política) o generada
    const manual = dto.contrasena !== undefined && dto.contrasena !== "";
    if (manual) {
      await this.validarPoliticaContrasena(dto.contrasena!);
    }
    const tempPassword = manual ? dto.contrasena! : generateTemporaryPassword(TEMP_PASSWORD_LENGTH);
    const newHash = await hashPassword(tempPassword);
    const debeCambiarContrasena = dto.debeCambiarContrasena ?? true;

    await this.usersRepository.update(id, {
      contrasenaHash: newHash,
      debeCambiarContrasena,
      intentosFallidos: 0,
    });

    // Cierra todas las sesiones abiertas
    await this.usersRepository.closeAllUserSessions(id);

    await this.auditService.log({
      usuarioId: actorId,
      accion: "actualizar",
      tabla: "usuarios",
      registroId: id,
      valorNuevo: {
        debeCambiarContrasena,
        claveRestablecida: true,
        origen: manual ? "manual" : "generada",
      },
      direccionIp: ip,
    });

    return {
      message: "Contraseña restablecida exitosamente",
      tempPassword,
    };
  }

  /** Misma política que el cambio de contraseña: longitud mínima configurable, letras y números. */
  private async validarPoliticaContrasena(contrasena: string): Promise<void> {
    let longitudMinima = DEFAULT_LONGITUD_CONTRASENA;
    try {
      const variable = await this.variablesRepository?.findByCodigoVigente(VAR_LONGITUD_CONTRASENA);
      const valor = Number(variable?.valor);
      if (variable && Number.isFinite(valor)) longitudMinima = valor;
    } catch {
      // sin variable configurada: se usa el valor por defecto
    }
    if (contrasena.length < longitudMinima || !PASSWORD_LETRAS_Y_NUMEROS.test(contrasena)) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${longitudMinima} caracteres, con letras y números.`,
      );
    }
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
