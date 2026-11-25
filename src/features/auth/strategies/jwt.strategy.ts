import { Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { hashSha256 } from "../../../common/utils";
import { CacheService } from "../../../core/cache/cache.service";
import type { UsuarioRolRecord, UsuarioJwtRecord } from "../interfaces/auth-repository.interface";
import type { AuthenticatedUser, JwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthRepository } from "../repositories/auth.repository";
import { getJwtSecret } from "../utils/jwt-secret.util";

const TTL_JWT_CACHE_SEGUNDOS = 60;
const TTL_REVOCADO_CACHE_SEGUNDOS = 3_600;

interface JwtUsuarioCacheado {
  usuario: UsuarioJwtRecord;
  roles: UsuarioRolRecord[];
}

const extraerToken = ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  (request: Request): string | null => {
    const cookies = request?.cookies as Record<string, string | undefined> | undefined;
    return cookies?.access_token ?? null;
  },
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authRepository: AuthRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {
    super({
      jwtFromRequest: extraerToken,
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: getJwtSecret(configService),
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const token = extraerToken(request);
    const tokenHash = token ? hashSha256(token) : null;

    if (tokenHash && (await this.cacheService?.get<boolean>(`auth:revoked:${tokenHash}`))) {
      throw new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente.");
    }

    const claveUsuario = `auth:jwt:${payload.sub}`;
    const cacheado = await this.cacheService?.get<JwtUsuarioCacheado>(claveUsuario);

    let usuario: UsuarioJwtRecord | null = cacheado?.usuario ?? null;
    let roles: UsuarioRolRecord[] = cacheado?.roles ?? [];

    if (!usuario) {
      if (this.authRepository.validarJwtUsuario) {
        const validacion = await this.authRepository.validarJwtUsuario(payload.sub, tokenHash);
        if (validacion.sesionCerrada) {
          if (tokenHash) {
            await this.cacheService?.set(
              `auth:revoked:${tokenHash}`,
              true,
              TTL_REVOCADO_CACHE_SEGUNDOS,
            );
          }
          throw new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente.");
        }
        usuario = validacion.usuario;
        roles = validacion.roles;
      } else {
        if (tokenHash && (await this.authRepository.isSessionClosed(tokenHash))) {
          if (tokenHash) {
            await this.cacheService?.set(
              `auth:revoked:${tokenHash}`,
              true,
              TTL_REVOCADO_CACHE_SEGUNDOS,
            );
          }
          throw new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente.");
        }

        usuario = await this.authRepository.findUserById(payload.sub);
        roles = usuario ? await this.authRepository.findUserRoles(usuario.id) : [];
      }

      if (usuario && usuario.eliminadoEn === null && usuario.estado === "activo") {
        await this.cacheService?.set<JwtUsuarioCacheado>(
          claveUsuario,
          { usuario, roles },
          TTL_JWT_CACHE_SEGUNDOS,
        );
      }
    } else if (tokenHash && !this.cacheService) {
      // Sin Redis se mantiene la validación directa
      if (await this.authRepository.isSessionClosed(tokenHash)) {
        throw new UnauthorizedException("La sesión fue cerrada. Ingrese nuevamente.");
      }
    }

    if (!usuario || usuario.eliminadoEn !== null) {
      throw new UnauthorizedException("Usuario no encontrado o dado de baja");
    }

    if (usuario.estado !== "activo") {
      throw new UnauthorizedException("La cuenta de usuario no se encuentra activa");
    }

    // RF-001 V2: el token lleva el rol activo; debe seguir asignado al usuario.
    // Sin filas en usuario_roles (datos previos a la migración 0002) se usa usuarios.rol_id.
    const activeRole =
      roles.length > 0
        ? roles.find((p) => p.rolId === payload.roleId)
        : payload.roleId === usuario.rolId
          ? { rolId: usuario.rolId, nombre: payload.role }
          : undefined;

    if (!activeRole) {
      throw new UnauthorizedException("Su rol ya no está asignado. Ingrese nuevamente.");
    }

    return {
      id: usuario.id,
      username: usuario.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: usuario.personaId,
      rolPendiente: payload.rolPendiente === true,
      recordar: payload.recordar === true,
      impersonatedBy: payload.impersonatedBy,
    };
  }
}
