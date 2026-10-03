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

    return {
      id: user.id,
      username: user.nombreUsuario,
      roleId: user.rolId,
      role: payload.role,
      personaId: user.personaId,
    };
  }
}
