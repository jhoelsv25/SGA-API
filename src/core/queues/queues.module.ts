import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
  ],
  exports: [BullModule],
})
export class QueuesModule {}
