import { Module } from "@nestjs/common";
import { CacheModule } from "./cache";
import { DatabaseModule } from "./database";
import { HealthModule } from "./health";
import { QueuesModule } from "./queues";
import { RedisModule } from "./redis";
import { AppThrottlerModule } from "./throttler";

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    CacheModule,
    QueuesModule,
    AppThrottlerModule,
    HealthModule,
  ],
  exports: [
    DatabaseModule,
    RedisModule,
    CacheModule,
    QueuesModule,
    AppThrottlerModule,
    HealthModule,
  ],
})
export class CoreModule {}
