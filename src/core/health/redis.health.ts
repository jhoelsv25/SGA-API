import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.redisService.getClient();
      const status = client.status;

      if (status === "ready") {
        const ping = await client.ping();
        return this.getStatus(key, ping === "PONG", { status, ping });
      }

      // En desarrollo o tests con lazyConnect
      return this.getStatus(key, true, {
        status: status || "idle",
        note: "standby mode",
      });
    } catch (error) {
      throw new HealthCheckError(
        "Fallo en verificación de salud de Redis",
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : "Error desconocido",
        }),
      );
    }
  }
}
