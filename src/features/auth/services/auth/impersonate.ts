import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthModuleDto, AuthResponseDto, CurrentUserDto } from "../../dto/auth-response.dto";
import { ImpersonateDto } from "../../dto/impersonate.dto";
import { ChangePasswordDto } from "../../dto/change-password.dto";
import { ForgotPasswordDto } from "../../dto/forgot-password.dto";
import type {
  ContextoSesionSqlResult,
  UsuarioRolRecord,
  UsuarioRecord,
} from "../../interfaces/auth-repository.interface";
import type {
  AuthenticatedUser,
  ImpersonatorInfo,
  JwtPayload,
} from "../../interfaces/jwt-payload.interface";
import type { AuthServiceDeps, AuthServiceCalls } from "./deps";

export async function impersonate(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  adminUser: AuthenticatedUser,
  dto: ImpersonateDto,
  oldToken?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponseDto> {
  if (!["Administrador", "Soporte TI"].includes(adminUser.role)) {
    throw new ForbiddenException(
      "Solo el Administrador o Soporte TI pueden ingresar en modo vista simulada.",
    );
  }

  if (adminUser.impersonatedBy) {
    throw new BadRequestException(
      "Ya se encuentra en una vista simulada. Vuelva a su cuenta original primero.",
    );
  }

  if (dto.userId === adminUser.id) {
    throw new BadRequestException("No puede simular su propia cuenta.");
  }

  const targetUser = await deps.authRepository.findUserById(dto.userId);
  if (!targetUser) {
    throw new NotFoundException("Usuario destino no encontrado.");
  }

  calls.assertUserIsActive(targetUser);

  const roles = await calls.resolveRoles(targetUser);
  let targetRoleId: string | undefined;

  if (dto.roleId) {
    const encontrado = roles.find((r) => r.rolId === dto.roleId);
    if (!encontrado) {
      throw new BadRequestException("El usuario destino no tiene asignado ese rol.");
    }
    targetRoleId = encontrado.rolId;
  }

  const { userDto, modules, activeRole } = await calls.buildUserRole(targetUser, targetRoleId);

  const impersonatedBy: ImpersonatorInfo = {
    userId: adminUser.id,
    username: adminUser.username,
    roleId: adminUser.roleId,
    role: adminUser.role,
  };

  userDto.impersonatedBy = {
    userId: impersonatedBy.userId,
    username: impersonatedBy.username,
    role: impersonatedBy.role,
  };

  const payload: JwtPayload = {
    sub: targetUser.id,
    username: targetUser.nombreUsuario,
    roleId: activeRole.rolId,
    role: activeRole.nombre,
    personaId: targetUser.personaId,
    impersonatedBy,
  };

  if (oldToken) {
    await deps.sessionService.revokeSession(oldToken);
  }

  const accessToken = deps.sessionService.generateAccessToken(payload, false);
  await deps.sessionService.recordSession({
    userId: targetUser.id,
    token: accessToken,
    rememberMe: false,
    ipAddress,
    userAgent,
  });

  await deps.auditService?.log({
    usuarioId: adminUser.id,
    accion: "iniciar_sesion",
    tabla: "usuarios",
    registroId: targetUser.id,
    valorNuevo: {
      vistaSimulada: true,
      usuarioSimulado: targetUser.nombreUsuario,
      rolSimulado: activeRole.nombre,
    },
    direccionIp: ipAddress,
  });

  return {
    message: `Vista simulada iniciada como ${targetUser.nombreUsuario} (${activeRole.nombre}).`,
    accessToken,
    user: userDto,
    modules,
  };
}

export async function stopImpersonate(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  currentUser: AuthenticatedUser,
  oldToken?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponseDto> {
  if (!currentUser.impersonatedBy) {
    throw new BadRequestException("La sesión actual no está en modo vista simulada.");
  }

  const adminInfo = currentUser.impersonatedBy;
  const adminUser = await deps.authRepository.findUserById(adminInfo.userId);
  if (!adminUser) {
    throw new UnauthorizedException("La cuenta administradora original ya no existe.");
  }

  calls.assertUserIsActive(adminUser);

  const { userDto, modules, activeRole } = await calls.buildUserRole(adminUser, adminInfo.roleId);

  const payload: JwtPayload = {
    sub: adminUser.id,
    username: adminUser.nombreUsuario,
    roleId: activeRole.rolId,
    role: activeRole.nombre,
    personaId: adminUser.personaId,
  };

  if (oldToken) {
    await deps.sessionService.revokeSession(oldToken);
  }

  const accessToken = deps.sessionService.generateAccessToken(payload, false);
  await deps.sessionService.recordSession({
    userId: adminUser.id,
    token: accessToken,
    rememberMe: false,
    ipAddress,
    userAgent,
  });

  await deps.auditService?.log({
    usuarioId: adminUser.id,
    accion: "cerrar_sesion",
    tabla: "usuarios",
    registroId: currentUser.id,
    valorAnterior: {
      vistaSimulada: true,
      usuarioSimulado: currentUser.username,
      rolSimulado: currentUser.role,
    },
    direccionIp: ipAddress,
  });

  return {
    message: `Sesión restaurada como ${adminUser.nombreUsuario} (${activeRole.nombre}).`,
    accessToken,
    user: userDto,
    modules,
  };
}

export async function logout(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  token?: string,
  ipAddress?: string,
): Promise<void> {
  if (!token) return;
  try {
    const payload = deps.sessionService.verifyAccessToken(token);
    if (payload?.sub) {
      await Promise.all([
        calls.invalidarCacheUsuario(payload.sub),
        deps.auditService?.log({
          usuarioId: payload.sub,
          accion: "cerrar_sesion",
          tabla: "usuarios",
          registroId: payload.sub,
          direccionIp: ipAddress,
        }),
      ]);
    }
  } catch {
    // Token may be expired or already revoked, continue to revoke
  }
  await deps.sessionService.revokeSession(token);
}

export async function forgotPassword(
  deps: AuthServiceDeps,
  dto: ForgotPasswordDto,
): Promise<{ message: string }> {
  return deps.authPasswordService.forgotPassword(dto);
}

export async function changePassword(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  userId: string,
  dto: ChangePasswordDto,
  currentToken?: string,
): Promise<{ message: string }> {
  const res = await deps.authPasswordService.changePassword(userId, dto, currentToken);
  await calls.invalidarCacheUsuario(userId);
  return res;
}

export async function invalidarCacheUsuario(deps: AuthServiceDeps, userId: string): Promise<void> {
  if (!deps.cacheService) return;
  await Promise.all([
    deps.cacheService.del(`auth:jwt:${userId}`),
    deps.cacheService.delByPattern(`auth:contexto:${userId}:*`),
  ]);
}

export function assertUserIsActive(user: Pick<UsuarioRecord, "estado">): void {
  if (user.estado === "bloqueado") {
    throw new UnauthorizedException(
      "Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Contacta al administrador.",
    );
  }
  if (user.estado !== "activo") {
    throw new UnauthorizedException("Tu cuenta se encuentra inactiva");
  }
}

export async function resolveRoles(
  deps: AuthServiceDeps,
  user: UsuarioRecord,
): Promise<UsuarioRolRecord[]> {
  const roles = await deps.authRepository.findUserRoles(user.id);
  if (roles.length > 0) return roles;

  const role = await deps.authRepository.findRoleById(user.rolId);
  return role
    ? [{ rolId: role.id, nombre: role.nombre, esSistema: role.esSistema, esPrincipal: true }]
    : [];
}

export function armarRespuestaDesdeContexto(contexto: ContextoSesionSqlResult): {
  userDto: CurrentUserDto;
  modules: AuthModuleDto[];
  activeRole: UsuarioRolRecord;
} {
  if (!contexto.activeRole) {
    throw new UnauthorizedException("La cuenta no tiene roles asignados.");
  }

  const { usuario, persona, institucion: inst, roles, activeRole, modules, menuRoutes } = contexto;
  const userDto: CurrentUserDto = {
    id: usuario.id,
    username: usuario.nombreUsuario,
    email: persona?.correo ?? undefined,
    firstName: persona?.nombres ?? undefined,
    lastName: persona
      ? `${persona.apellidoPaterno} ${persona.apellidoMaterno ?? ""}`.trim()
      : undefined,
    roles: roles.map((p) => p.nombre),
    userRoles: roles.map((p) => ({ id: p.rolId, name: p.nombre, isPrincipal: p.esPrincipal })),
    activeRoleId: activeRole.rolId,
    activeRoleName: activeRole.nombre,
    institutionId: inst?.id ?? undefined,
    institutionName: inst?.nombre ?? undefined,
    avatarUrl: persona?.fotoUrl ?? undefined,
    mustChangePassword: usuario.debeCambiarContrasena,
    menuRoutes,
  };

  return {
    userDto,
    modules: modules.map((mod) => ({ ...mod, icon: mod.icon ?? undefined })),
    activeRole,
  };
}

export async function buildUserRole(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  user: UsuarioRecord,
  requestedRoleId?: string,
): Promise<{
  userDto: CurrentUserDto;
  modules: AuthModuleDto[];
  activeRole: UsuarioRolRecord;
}> {
  if (deps.authRepository.obtenerContextoSesion) {
    const contexto = await deps.authRepository.obtenerContextoSesion(user.id, requestedRoleId);
    if (contexto) {
      return calls.armarRespuestaDesdeContexto(contexto);
    }
  }

  const [roles, persona, inst] = await Promise.all([
    calls.resolveRoles(user),
    deps.authRepository.findPersonaById(user.personaId),
    deps.authRepository.findInstitution(),
  ]);
  const activeRole =
    roles.find((p) => p.rolId === requestedRoleId) ?? roles.find((p) => p.esPrincipal) ?? roles[0];
  if (!activeRole) {
    throw new UnauthorizedException("La cuenta no tiene roles asignados.");
  }

  const [modules, menuRoutes] = await Promise.all([
    deps.authRepository.getUserModules(activeRole.rolId, activeRole.esSistema),
    deps.authRepository.getMenuRoutes(activeRole.rolId, activeRole.esSistema),
  ]);

  const userDto: CurrentUserDto = {
    id: user.id,
    username: user.nombreUsuario,
    email: persona?.correo ?? undefined,
    firstName: persona?.nombres ?? undefined,
    lastName: persona
      ? `${persona.apellidoPaterno} ${persona.apellidoMaterno ?? ""}`.trim()
      : undefined,
    roles: roles.map((p) => p.nombre),
    userRoles: roles.map((p) => ({ id: p.rolId, name: p.nombre, isPrincipal: p.esPrincipal })),
    activeRoleId: activeRole.rolId,
    activeRoleName: activeRole.nombre,
    institutionId: inst?.id ?? undefined,
    institutionName: inst?.nombre ?? undefined,
    avatarUrl: persona?.fotoUrl ?? undefined,
    mustChangePassword: user.debeCambiarContrasena,
    menuRoutes,
  };

  return { userDto, modules, activeRole };
}
