import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser, JwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthRepository } from "../repositories/auth.repository";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): string | null => {
          const cookies = request?.cookies as Record<string, string | undefined> | undefined;
          return cookies?.access_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        "JWT_SECRET",
        "sga_super_secret_jwt_key_2026_change_in_prod",
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user || user.eliminadoEn !== null) {
      throw new UnauthorizedException("Usuario no encontrado o dado de baja");
    }

    if (user.estado !== "activo") {
      throw new UnauthorizedException("La cuenta de usuario no se encuentra activa");
    }

    // RF-001 V2: el token lleva el rol activo; debe seguir asignado al usuario.
    // Sin filas en usuario_roles (datos previos a la migración 0002) se usa usuarios.rol_id.
    const roles = await this.authRepository.findUserRoles(user.id);
    const activeRole =
      roles.length > 0
        ? roles.find((p) => p.rolId === payload.roleId)
        : payload.roleId === user.rolId
          ? { rolId: user.rolId, nombre: payload.role }
          : undefined;

    if (!activeRole) {
      throw new UnauthorizedException("Su rol ya no está asignado. Ingrese nuevamente.");
    }

    return {
      id: user.id,
      username: user.nombreUsuario,
      roleId: activeRole.rolId,
      role: activeRole.nombre,
      personaId: user.personaId,
    };
  }
}
