import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redisService.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(
        `Error al obtener o deserializar clave de caché "${key}": ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.redisService.set(key, serialized, ttlSeconds);
      return result === "OK";
    } catch (error) {
      this.logger.error(
        `Error al guardar en caché clave "${key}": ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const deletedCount = await this.redisService.del(key);
      return deletedCount > 0;
    } catch (error) {
      this.logger.error(
        `Error al eliminar clave de caché "${key}": ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
      return false;
    }
  }

  /**
   * Patrón Cache-Aside (getOrSet):
   * Si la clave ya existe en caché, la retorna de inmediato.
   * Si no existe, invoca la función factory para calcular o consultar los datos (ej. DB),
   * los almacena en caché con el TTL especificado y los devuelve.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await factory();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }

  /**
   * Invalida todas las claves que coincidan con un patrón (ej. "users:*" o "reports:2026:*").
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await client.del(...keys);
    } catch (error) {
      this.logger.error(
        `Error al invalidar patrón de caché "${pattern}": ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
      return 0;
    }
  }
}
