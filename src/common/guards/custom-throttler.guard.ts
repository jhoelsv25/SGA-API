import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";

interface RequestWithUser {
  ip?: string;
  user?: {
    id?: string | number;
    username?: string;
    role?: string;
  };
}

/**
 * Guard global de Throttler ubicado en common/guards.
 * Limita la tasa de peticiones de manera inteligente:
 * - Si el usuario está autenticado: combina IP + Username + Rol para aislar cuotas por usuario.
 * - Si es anónimo: utiliza la IP del cliente.
 * Emite errores claros y amigables en español al superar los límites.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as RequestWithUser;
    const ip = request.ip || "unknown-ip";

    if (request.user?.username || request.user?.id) {
      const userIdentifier = request.user.username || request.user.id;
      const role = request.user.role || "user";
      return Promise.resolve(`${ip}-${role}-${userIdentifier}`);
    }

    return Promise.resolve(ip);
  }

  protected override throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const seconds = Math.ceil(throttlerLimitDetail.ttl / 1000);
    throw new ThrottlerException(
      `Demasiadas peticiones. Has superado el límite permitido de ${throttlerLimitDetail.limit} peticiones en ${seconds}s. Por favor espera antes de intentar nuevamente.`,
    );
  }
}
