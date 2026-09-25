import { Module } from "@nestjs/common";
import { CacheModule } from "./cache";
import { HealthModule } from "./health";
import { QueuesModule } from "./queues";
import { RedisModule } from "./redis";
import { AppThrottlerModule } from "./throttler";

@Module({
  imports: [RedisModule, CacheModule, QueuesModule, AppThrottlerModule, HealthModule],
  exports: [RedisModule, CacheModule, QueuesModule, AppThrottlerModule, HealthModule],
})
export class CoreModule {}
