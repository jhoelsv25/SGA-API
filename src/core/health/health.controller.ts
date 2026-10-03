import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly postgres: PostgresHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Verifica el estado de salud del sistema, memoria y conexiones",
  })
  @ApiResponse({
    status: 200,
    description: "Sistema en estado operativo y saludable",
  })
  @ApiResponse({
    status: 503,
    description: "Uno o más componentes del sistema están degradados",
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Verifica consumo de memoria Heap (300 MB)
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024),
      // Verifica consumo de memoria RSS (500 MB)
      () => this.memory.checkRSS("memory_rss", 500 * 1024 * 1024),
      // Verifica disponibilidad de Redis
      () => this.redis.isHealthy("redis"),
      // Verifica disponibilidad de PostgreSQL
      () => this.postgres.isHealthy("postgres"),
    ]);
  }
}
