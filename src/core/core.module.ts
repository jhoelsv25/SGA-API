import { Module } from "@nestjs/common";
import { HealthModule } from "./health";
import { QueuesModule } from "./queues";
import { RedisModule } from "./redis";
import { AppThrottlerModule } from "./throttler";

@Module({
  imports: [RedisModule, QueuesModule, AppThrottlerModule, HealthModule],
  exports: [RedisModule, QueuesModule, AppThrottlerModule, HealthModule],
})
export class CoreModule {}
