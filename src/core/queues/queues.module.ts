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
            // Upstash: el usuario no tiene permiso para INFO (ready check de ioredis)
            enableReadyCheck: false,
            // BullMQ ejecuta INFO para validar la versión; Upstash lo deniega a este usuario
            skipVersionCheck: true,
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
