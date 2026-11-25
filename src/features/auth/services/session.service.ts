import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { hashSha256 } from "../../../common/utils";
import { CacheService } from "../../../core/cache/cache.service";
import { getJwtSecret } from "../utils/jwt-secret.util";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthRepository } from "../repositories/auth.repository";

const TTL_TOKEN_REVOCADO_SEGUNDOS = 86_400;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  generateAccessToken(payload: JwtPayload, rememberMe = false): string {
    try {
      const expiresIn = (rememberMe
        ? "30d"
        : this.configService.get<string>("JWT_EXPIRES_IN", "1d")) as unknown as number;

      return this.jwtService.sign(payload, { expiresIn });
    } catch (error) {
      this.logger.error(`Error al firmar token JWT: ${(error as Error).message}`);
      throw new InternalServerErrorException("No se pudo generar el token de acceso");
    }
  }

  /**
   * Genera un JWT de renovación con mayor vigencia (7 días, o 30 días con "Recordarme")
   * para almacenarse exclusivamente en cookie HttpOnly.
   */
  generateRefreshToken(payload: JwtPayload, rememberMe = false): string {
    try {
      const expiresIn = (rememberMe ? "30d" : "7d") as unknown as number;
      const {
        iat: _iat,
        exp: _exp,
        ...payloadLimpio
      } = payload as JwtPayload & { iat?: number; exp?: number };
      return this.jwtService.sign(payloadLimpio, { expiresIn });
    } catch (error) {
      this.logger.error(`Error al firmar token de renovación JWT: ${(error as Error).message}`);
      throw new InternalServerErrorException("No se pudo generar el token de renovación");
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: getJwtSecret(this.configService),
      });
    } catch (error) {
      this.logger.warn(`Token inválido o expirado: ${(error as Error).message}`);
      throw new UnauthorizedException("Token de sesión expirado o inválido");
    }
  }

  async recordSession(params: {
    userId: string;
    token: string;
    rememberMe?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const tokenHash = hashSha256(params.token);
      const days = params.rememberMe ? 30 : 1;
      const expiraEn = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await this.authRepository.createSession({
        usuarioId: params.userId,
        tokenHash,
        direccionIp: params.ipAddress ?? null,
        navegador: params.userAgent ? params.userAgent.substring(0, 255) : null,
        expiraEn,
      });
    } catch (error) {
      this.logger.error(
        `Error persistiendo sesión para el usuario ${params.userId}: ${(error as Error).message}`,
      );
    }
  }

  async revokeSession(token: string): Promise<void> {
    try {
      const tokenHash = hashSha256(token);
      await Promise.all([
        this.authRepository.closeSession(tokenHash),
        this.cacheService?.set(`auth:revoked:${tokenHash}`, true, TTL_TOKEN_REVOCADO_SEGUNDOS),
      ]);
    } catch (error) {
      this.logger.warn(`Error al revocar sesión en BD: ${(error as Error).message}`);
    }
  }

  async revokeOtherSessions(userId: string, currentToken: string): Promise<void> {
    try {
      const currentTokenHash = hashSha256(currentToken);
      await this.authRepository.closeOtherSessions(userId, currentTokenHash);
    } catch (error) {
      this.logger.warn(`Error al revocar otras sesiones en BD: ${(error as Error).message}`);
    }
  }

  hashToken(token: string): string {
    return hashSha256(token);
  }
}
