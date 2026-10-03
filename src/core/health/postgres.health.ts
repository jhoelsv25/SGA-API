import { Inject, Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.constants";

@Injectable()
export class PostgresHealthIndicator extends HealthIndicator {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const inicio = Date.now();
    try {
      await this.pool.query("SELECT 1");
      return this.getStatus(key, true, { latenciaMs: Date.now() - inicio });
    } catch (error) {
      throw new HealthCheckError(
        "Fallo en verificación de salud de PostgreSQL",
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : "Error desconocido",
        }),
      );
    }
  }
}
