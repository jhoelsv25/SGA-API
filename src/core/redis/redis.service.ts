import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL", "redis://localhost:6379");

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on("connect", () => {
      this.logger.log("Conectado exitosamente a Redis");
    });

    this.client.on("error", (err) => {
      this.logger.warn(`Error en conexión con Redis: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log("Desconectado de Redis");
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client no inicializado");
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<"OK" | null> {
    if (ttlSeconds) {
      return this.getClient().set(key, value, "EX", ttlSeconds);
    }
    return this.getClient().set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.getClient().del(key);
  }

  async exists(key: string): Promise<number> {
    return this.getClient().exists(key);
  }
}
