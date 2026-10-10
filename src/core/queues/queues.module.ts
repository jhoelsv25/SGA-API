import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditProcessor } from "./processors/audit.processor";
import { QUEUES } from "./queues.constants";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL", "redis://localhost:6379");
        return {
          connection: {
            url: redisUrl,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUES.AUDIT,
    }),
    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
    }),
  ],

  providers: [AuditProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
