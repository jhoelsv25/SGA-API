import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthResponseDto } from "../../dto/auth-response.dto";
import { SwitchRoleDto } from "../../dto/switch-role.dto";
import { LoginDto } from "../../dto/login.dto";
import type { ImpersonatorInfo, JwtPayload } from "../../interfaces/jwt-payload.interface";
import type { AuthServiceDeps, AuthServiceCalls } from "./deps";

const TTL_CONTEXTO_CACHE_SEGUNDOS = 60;

export async function login(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  dto: LoginDto,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponseDto> {
  const normalizedUsername = dto.username.trim().toLowerCase();

  // 1. Buscar y validar existencia del usuario
  const user = await deps.authRepository.findUserByUsername(normalizedUsername);
  if (!user) {
    throw new UnauthorizedException("Usuario o contraseña incorrectos");
  }

  // 2. Validar estado de la cuenta
  calls.assertUserIsActive(user);

  // 3. Comparar contraseñas y gestionar intentos
  await deps.authPasswordService.verifyPassword(dto.password, user);

  // 4. Reiniciar intentos fallidos tras login exitoso
  await deps.authRepository.resetLoginAttempts(user.id);
  await calls.invalidarCacheUsuario(user.id);

  // 5. Cargar rol y menús: ingresa con su rol principal (RF-001 V2)
  const { userDto, modules, activeRole } = await calls.buildUserRole(user);

  // RF-001 V3: el paso 2 del login fija el rol; solo queda pendiente si el usuario tiene más de un rol
  const tieneMultiplesRoles = (userDto.roles?.length ?? 0) > 1;

  // 6. Generar token y persistir sesión mediante SessionService
  const payload: JwtPayload = {
    sub: user.id,
    username: user.nombreUsuario,
    roleId: activeRole.rolId,
    role: activeRole.nombre,
    personaId: user.personaId,
    rolPendiente: tieneMultiplesRoles,
    recordar: dto.rememberMe === true,
  };

  const accessToken = deps.sessionService.generateAccessToken(payload, dto.rememberMe);

  // Detectar si la IP es nueva para el usuario antes de persistir la sesión
  const esNuevaIp =
    Boolean(ipAddress) && deps.authRepository.hasPreviousSessionFromIp
      ? !(await deps.authRepository.hasPreviousSessionFromIp(user.id, ipAddress!))
      : false;

  await deps.sessionService.recordSession({
    userId: user.id,
    token: accessToken,
    rememberMe: dto.rememberMe,
    ipAddress,
    userAgent,
  });

  if (esNuevaIp && ipAddress) {
    await calls.despacharAlertaNuevoDispositivo(user.id, ipAddress);
  }

  await deps.auditService?.log({
    usuarioId: user.id,
    accion: "iniciar_sesion",
    tabla: "usuarios",
    registroId: user.id,
    valorNuevo: { rememberMe: dto.rememberMe },
    direccionIp: ipAddress,
  });

  return {
    message: "Inicio de sesión exitoso",
    accessToken,
    user: userDto,
    modules,
  };
}

export async function checkToken(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  userId: string,
  activeRoleId?: string,
  impersonatedBy?: ImpersonatorInfo,
): Promise<AuthResponseDto> {
  const claveCache = `auth:contexto:${userId}:${activeRoleId ?? "principal"}`;
  const respuestaBase = deps.cacheService
    ? await deps.cacheService.getOrSet<AuthResponseDto>(
        claveCache,
        () => calls.resolverRespuestaCheckToken(userId, activeRoleId),
        TTL_CONTEXTO_CACHE_SEGUNDOS,
      )
    : await calls.resolverRespuestaCheckToken(userId, activeRoleId);

  if (!impersonatedBy) {
    return respuestaBase;
  }

  return {
    ...respuestaBase,
    user: {
      ...respuestaBase.user,
      impersonatedBy: {
        userId: impersonatedBy.userId,
        username: impersonatedBy.username,
        role: impersonatedBy.role,
      },
    },
  };
}

export async function resolverRespuestaCheckToken(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  userId: string,
  activeRoleId?: string,
): Promise<AuthResponseDto> {
  if (deps.authRepository.obtenerContextoSesion) {
    const contexto = await deps.authRepository.obtenerContextoSesion(userId, activeRoleId);
    if (!contexto) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }
    calls.assertUserIsActive(contexto.usuario);
    const { userDto, modules } = calls.armarRespuestaDesdeContexto(contexto);
    return { user: userDto, modules };
  }

  const user = await deps.authRepository.findUserById(userId);
  if (!user) {
    throw new UnauthorizedException("Sesión inválida o expirada");
  }

  calls.assertUserIsActive(user);

  const { userDto, modules } = await calls.buildUserRole(user, activeRoleId);
  return {
    user: userDto,
    modules,
  };
}

export async function refreshToken(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  oldToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponseDto> {
  // 1. Verificar firma y vigencia del token previo (refresh_token o access_token vigente)
  const payload = deps.sessionService.verifyAccessToken(oldToken);

  // 1b. Rechazar si este token ya fue revocado por logout o rotación previa
  if (
    deps.authRepository.isSessionClosed &&
    (await deps.authRepository.isSessionClosed(deps.sessionService.hashToken(oldToken)))
  ) {
    throw new UnauthorizedException("La sesión fue cerrada o renovada. Ingrese nuevamente.");
  }

  // 2. Validar que la cuenta permanezca activa
  const user = await deps.authRepository.findUserById(payload.sub);
  if (!user) {
    throw new UnauthorizedException("Cuenta no encontrada o dada de baja");
  }

  calls.assertUserIsActive(user);

  // 3. Revocar sesión anterior
  await deps.sessionService.revokeSession(oldToken);

  const rememberMe = payload.recordar === true;

  // 4. Construir rol (conserva el rol activo si sigue asignado) y generar nuevo token
  const { userDto, modules, activeRole } = await calls.buildUserRole(user, payload.roleId);
  if (payload.impersonatedBy) {
    userDto.impersonatedBy = {
      userId: payload.impersonatedBy.userId,
      username: payload.impersonatedBy.username,
      role: payload.impersonatedBy.role,
    };
  }

  const newPayload: JwtPayload = {
    sub: user.id,
    username: user.nombreUsuario,
    roleId: activeRole.rolId,
    role: activeRole.nombre,
    personaId: user.personaId,
    rolPendiente: payload.rolPendiente === true,
    recordar: rememberMe,
    impersonatedBy: payload.impersonatedBy,
  };

  const newAccessToken = deps.sessionService.generateAccessToken(newPayload, rememberMe);
  await deps.sessionService.recordSession({
    userId: user.id,
    token: newAccessToken,
    rememberMe,
    ipAddress,
    userAgent,
  });

  return {
    message: "Token renovado exitosamente",
    accessToken: newAccessToken,
    user: userDto,
    modules,
  };
}

export async function switchRole(
  deps: AuthServiceDeps,
  calls: AuthServiceCalls,
  userId: string,
  dto: SwitchRoleDto,
  session: { rolPendiente?: boolean; recordar?: boolean },
  oldToken?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponseDto> {
  if (!session.rolPendiente) {
    throw new ForbiddenException(
      "El rol se elige al iniciar sesión. Cierre sesión para ingresar con otro rol.",
    );
  }

  const user = await deps.authRepository.findUserById(userId);
  if (!user) {
    throw new UnauthorizedException("Sesión inválida o expirada");
  }
  calls.assertUserIsActive(user);

  const roles = await calls.resolveRoles(user);
  const target = roles.find((p) => p.rolId === dto.roleId);
  if (!target) {
    throw new ForbiddenException("No tiene asignado ese rol.");
  }

  const { userDto, modules, activeRole } = await calls.buildUserRole(user, target.rolId);

  const payload: JwtPayload = {
    sub: user.id,
    username: user.nombreUsuario,
    roleId: activeRole.rolId,
    role: activeRole.nombre,
    personaId: user.personaId,
    recordar: session.recordar === true,
  };

  if (oldToken) {
    await deps.sessionService.revokeSession(oldToken);
  }
  await calls.invalidarCacheUsuario(user.id);
  const accessToken = deps.sessionService.generateAccessToken(payload, session.recordar);
  await deps.sessionService.recordSession({
    userId: user.id,
    token: accessToken,
    rememberMe: session.recordar,
    ipAddress,
    userAgent,
  });

  await deps.auditService?.log({
    usuarioId: user.id,
    accion: "actualizar",
    tabla: "usuario_roles",
    registroId: user.id,
    valorNuevo: { rolActivo: activeRole.nombre, rolActivoId: activeRole.rolId },
    direccionIp: ipAddress,
  });

  return {
    message: `Rol cambiado a ${activeRole.nombre}.`,
    accessToken,
    user: userDto,
    modules,
  };
}
